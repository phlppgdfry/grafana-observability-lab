import { logRequest, shutdownLogging } from '../telemetry/logging.mjs';
import { serviceAttributes } from '../telemetry/config.mjs';
import { shutdownTracing } from '../telemetry/tracing.mjs';
import { context, propagation, trace, SpanKind, SpanStatusCode, isSpanContextValid } from '@opentelemetry/api';
import http from 'node:http';
import { randomUUID } from 'node:crypto';
import { pathToFileURL } from 'node:url';

export function createServer({ requestLogger = logRequest } = {}) {
  const started = Date.now();
  return http.createServer((req, res) => {
    const pathname = new URL(req.url, 'http://localhost').pathname;
    const route = ['/health', '/', '/api/documents/process'].includes(pathname) ? pathname : undefined;
    const requestId = randomUUID();
    const requestStarted = performance.now();
    let outcome = 'completed';
    const handle = async () => {
      const send = (status, data, reason = 'completed') => {
        outcome = reason;
        res.writeHead(status, { 'content-type': 'application/json', 'cache-control': 'no-store', 'x-request-id': requestId });
        res.end(JSON.stringify(data));
      };
      if (req.method === 'GET' && pathname === '/health') {
        return send(200, { status: 'ok', service: 'document-lab', version: serviceAttributes['service.version'], uptimeSeconds: Math.floor((Date.now() - started) / 1000) });
      }
      if (req.method === 'GET' && pathname === '/') {
        return send(200, { service: 'document-lab', endpoints: ['GET /health', 'POST /api/documents/process'], stage: 'day-4' });
      }
      if (req.method === 'POST' && pathname === '/api/documents/process') {
        let body = '';
        try {
          for await (const chunk of req) {
            body += chunk;
            if (Buffer.byteLength(body) > 16384) return send(413, { error: 'Payload too large' }, 'payload_too_large');
          }
          const input = JSON.parse(body);
          if (typeof input?.name !== 'string' || !input.name.trim() || input.name.length > 120) {
            return send(400, { error: 'name must be a non-empty string of at most 120 characters' }, 'invalid_name');
          }
          // Synthetic processing only: no files, personal data or persistence.
          await new Promise(resolve => setTimeout(resolve, 40));
          return send(200, { documentId: randomUUID(), status: 'completed', requestId });
        } catch {
          return send(400, { error: 'Invalid JSON request' }, 'invalid_json');
        }
      }
      send(404, { error: 'Not found' }, 'route_not_found');
    };
    // Health probes already have their own monitoring; avoid duplicate idle traffic.
    if (pathname === '/health') return handle();
    const method = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'].includes(req.method) ? req.method : '_OTHER';
    const parent = propagation.extract(context.active(), req.headers);
    return trace.getTracer('document-lab.http').startActiveSpan(
      route ? `${method} ${route}` : method,
      { kind: SpanKind.SERVER, attributes: {
        'http.request.method': method,
        ...(route ? { 'http.route': route } : {}),
      } }, parent, async span => {
        if (isSpanContextValid(span.spanContext())) res.setHeader('x-trace-id', span.spanContext().traceId);
        let ended = false;
        const end = () => {
          if (ended) return;
          ended = true;
          if (!res.writableFinished) {
            span.setAttribute('error.type', 'client_disconnect');
            span.setStatus({ code: SpanStatusCode.ERROR });
          } else {
            span.setAttribute('http.response.status_code', res.statusCode);
            if (res.statusCode >= 500) span.setStatus({ code: SpanStatusCode.ERROR });
          }
          requestLogger({ method, route, status: res.writableFinished ? res.statusCode : undefined,
            reason: res.writableFinished ? outcome : 'client_disconnect', requestId,
            durationMs: performance.now() - requestStarted, span });
          span.end();
        };
        res.once('finish', end);
        res.once('close', end);
        try { await handle(); }
        catch {
          outcome = 'internal_error';
          span.setStatus({ code: SpanStatusCode.ERROR });
          span.setAttribute('error.type', 'internal_error');
          if (!res.headersSent) res.writeHead(500, { 'content-type': 'application/json' });
          res.end(JSON.stringify({ error: 'Internal server error' }));
        }
      },
    );
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const port = Number(process.env.PORT || 4310);
  const host = process.env.HOST || '127.0.0.1';
  const server = createServer();
  server.listen(port, host, () => console.log(`Document lab listening at http://${host}:${port}`));
  let stopping = false;
  for (const signal of ['SIGTERM', 'SIGINT']) process.on(signal, () => {
    if (stopping) return;
    stopping = true;
    const deadline = setTimeout(() => process.exit(1), 9000);
    deadline.unref();
    server.close(async () => {
      try { await Promise.all([shutdownTracing(), shutdownLogging()]); }
      catch { console.error('OpenTelemetry shutdown failed'); process.exitCode = 1; }
      clearTimeout(deadline);
    });
  });
}
