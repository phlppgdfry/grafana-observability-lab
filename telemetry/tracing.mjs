import { readFileSync } from 'node:fs';
import { NodeTracerProvider, BatchSpanProcessor } from '@opentelemetry/sdk-trace-node';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-proto';

// Opt-in: ordinary tests and local development never need Cloud credentials.
let provider;
if (process.env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT && process.env.OTEL_SDK_DISABLED !== 'true') {
  const headers = {};
  if (process.env.GRAFANA_CLOUD_TOKEN_FILE) {
    const token = readFileSync(process.env.GRAFANA_CLOUD_TOKEN_FILE, 'utf8').trim();
    if (!token || /\s/.test(token) || !process.env.GRAFANA_CLOUD_STACK_ID) {
      throw new Error('Invalid local Grafana telemetry configuration');
    }
    headers.Authorization = `Basic ${Buffer.from(`${process.env.GRAFANA_CLOUD_STACK_ID}:${token}`).toString('base64')}`;
  }
  const exporter = new OTLPTraceExporter({ headers, timeoutMillis: 5000 });
  // Report failures without printing exporter objects, URLs or credentials.
  const safeExporter = {
    export(spans, callback) {
      exporter.export(spans, result => {
        if (result.code !== 0) console.error('OpenTelemetry trace export failed; check endpoint and credentials.');
        callback(result);
      });
    },
    shutdown: () => exporter.shutdown(),
  };
  provider = new NodeTracerProvider({
    resource: resourceFromAttributes({
      'service.name': process.env.OTEL_SERVICE_NAME || 'document-lab',
      'service.version': '0.1.0',
      'deployment.environment.name': process.env.DEPLOYMENT_ENVIRONMENT || 'lab',
    }),
    spanProcessors: [new BatchSpanProcessor(safeExporter, { scheduledDelayMillis: 1000, exportTimeoutMillis: 6000 })],
  });
  provider.register();
}
export async function shutdownTracing() { await provider?.shutdown(); }
