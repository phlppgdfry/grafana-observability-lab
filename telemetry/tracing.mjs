import { cloudHeaders, resource } from './config.mjs';
import { NodeTracerProvider, BatchSpanProcessor } from '@opentelemetry/sdk-trace-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-proto';

// Opt-in: ordinary tests and local development never need Cloud credentials.
let provider;
if (process.env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT && process.env.OTEL_SDK_DISABLED !== 'true') {
  const exporter = new OTLPTraceExporter({ headers: cloudHeaders(), timeoutMillis: 5000 });
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
    resource,
    spanProcessors: [new BatchSpanProcessor(safeExporter, { scheduledDelayMillis: 1000, exportTimeoutMillis: 6000 })],
  });
  provider.register();
}
export async function shutdownTracing() { await provider?.shutdown(); }
