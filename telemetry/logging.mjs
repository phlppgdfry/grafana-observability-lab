import { context, trace, isSpanContextValid } from '@opentelemetry/api';
import { LoggerProvider, BatchLogRecordProcessor } from '@opentelemetry/sdk-logs';
import { OTLPLogExporter } from '@opentelemetry/exporter-logs-otlp-proto';
import { cloudHeaders, resource, serviceAttributes } from './config.mjs';
let provider;
if (process.env.OTEL_EXPORTER_OTLP_LOGS_ENDPOINT && process.env.OTEL_SDK_DISABLED !== 'true') {
  const exporter = new OTLPLogExporter({ headers: cloudHeaders(), timeoutMillis: 5000 });
  const safeExporter = {
    export(records, callback) {
      exporter.export(records, result => {
        if (result.code !== 0) console.error('OpenTelemetry log export failed; check endpoint and credentials.');
        callback(result);
      });
    },
    shutdown: () => exporter.shutdown(),
  };
  provider = new LoggerProvider({ resource, processors: [new BatchLogRecordProcessor({ exporter: safeExporter,
    scheduledDelayMillis: 1000, exportTimeoutMillis: 6000,
  })] });
}
// Structured allowlist: never pass request bodies, URLs, headers or exception text.
export function createRequestLogger({ logger = provider?.getLogger('document-lab.http'), write = line => console.log(line) } = {}) {
  return ({ method, route, status, reason, requestId, durationMs, span }) => {
    const severityText = !status || status >= 500 ? 'ERROR' : status >= 400 ? 'WARN' : 'INFO';
    const severityNumber = { INFO: 9, WARN: 13, ERROR: 17 }[severityText];
    const attributes = { 'http.request.method': method, 'request.id': requestId,
      'request.duration_ms': Math.round(durationMs * 1000) / 1000, 'event.name': 'http.request.completed', 'request.outcome': reason,
      ...(route ? { 'http.route': route } : {}), ...(status ? { 'http.response.status_code': status } : {}),
    };
    const spanContext = span?.spanContext();
    const valid = spanContext && isSpanContextValid(spanContext);
    const body = `HTTP request ${reason}`;
    const record = { timestamp: new Date().toISOString(), severity: severityText, message: body,
      ...serviceAttributes, ...attributes, ...(valid ? { trace_id: spanContext.traceId, span_id: spanContext.spanId } : {}),
    };
    try { write(JSON.stringify(record)); } catch { /* Logging must not break the response lifecycle. */ }
    try { logger?.emit({ body, severityText, severityNumber, attributes,
      context: span ? trace.setSpan(context.active(), span) : context.active() }); }
    catch { console.error('OpenTelemetry log emission failed'); }
  };
}
export const logRequest = createRequestLogger();
export async function shutdownLogging() { await provider?.shutdown(); }
