import http from 'node:http';
import { randomUUID } from 'node:crypto';
import { pathToFileURL } from 'node:url';

export function createServer() {
  const started = Date.now();
  return http.createServer(async (req, res) => {
    const requestId = randomUUID();
    const send = (status, data) => {
      res.writeHead(status, { 'content-type': 'application/json', 'cache-control': 'no-store', 'x-request-id': requestId });
      res.end(JSON.stringify(data));
    };
    const pathname = new URL(req.url, 'http://localhost').pathname;
    if (req.method === 'GET' && pathname === '/health') {
      return send(200, { status: 'ok', service: 'document-lab', version: '0.1.0', uptimeSeconds: Math.floor((Date.now() - started) / 1000) });
    }
    if (req.method === 'GET' && pathname === '/') {
      return send(200, { service: 'document-lab', endpoints: ['GET /health', 'POST /api/documents/process'], stage: 'day-1' });
    }
    if (req.method === 'POST' && pathname === '/api/documents/process') {
      let body = '';
      try {
        for await (const chunk of req) {
          body += chunk;
          if (Buffer.byteLength(body) > 16384) return send(413, { error: 'Payload too large' });
        }
        const input = JSON.parse(body);
        if (typeof input?.name !== 'string' || !input.name.trim() || input.name.length > 120) {
          return send(400, { error: 'name must be a non-empty string of at most 120 characters' });
        }
        // Synthetic processing only: no files, personal data or persistence.
        await new Promise(resolve => setTimeout(resolve, 40));
        return send(200, { documentId: randomUUID(), status: 'completed', requestId });
      } catch {
        return send(400, { error: 'Invalid JSON request' });
      }
    }
    send(404, { error: 'Not found' });
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const port = Number(process.env.PORT || 4310);
  const host = process.env.HOST || '127.0.0.1';
  const server = createServer();
  server.listen(port, host, () => console.log(`Document lab listening at http://${host}:${port}`));
  for (const signal of ['SIGTERM', 'SIGINT']) process.on(signal, () => server.close());
}
