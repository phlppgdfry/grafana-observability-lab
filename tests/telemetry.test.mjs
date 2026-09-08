import { test } from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { NodeTracerProvider, SimpleSpanProcessor, InMemorySpanExporter } from '@opentelemetry/sdk-trace-node';
import { createServer } from '../app/server.mjs';

test('HTTP spans preserve context, status and privacy without tracing probes', async t => {
  const exporter = new InMemorySpanExporter();
  const provider = new NodeTracerProvider({ spanProcessors: [new SimpleSpanProcessor(exporter)] });
  provider.register();
  const server = createServer().listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(async () => { await new Promise(resolve => server.close(resolve)); await provider.shutdown(); });
  const base = `http://127.0.0.1:${server.address().port}`;
  const traceId = '1234567890abcdef1234567890abcdef';
  const response = await fetch(`${base}/api/documents/process?secret=private`, {
    method: 'POST', headers: { traceparent: `00-${traceId}-1234567890abcdef-01`, authorization: 'private-token' },
    body: JSON.stringify({ name: 'private-document.pdf' }),
  });
  await response.json();
  assert.equal(response.headers.get('x-trace-id'), traceId);
  await (await fetch(`${base}/api/documents/process`, { method: 'POST', body: '{}' })).text();
  await (await fetch(`${base}/unknown-private-path`)).text();
  const health = await fetch(`${base}/health`);
  await health.text();
  assert.equal(health.headers.get('x-trace-id'), null);
  await provider.forceFlush();
  const spans = exporter.getFinishedSpans();
  assert.equal(spans.length, 3);
  assert.deepEqual(spans.map(s => s.attributes['http.response.status_code']), [200, 400, 404]);
  assert.equal(spans[0].spanContext().traceId, traceId);
  assert.equal(spans[0].parentSpanContext.spanId, '1234567890abcdef');
  assert.equal(spans[0].kind, 1);
  assert.equal(spans[0].name, 'POST /api/documents/process');
  assert.ok(spans[0].duration[0] * 1e9 + spans[0].duration[1] >= 30e6);
  assert.equal(spans[1].status.code, 0); // HTTP server 4xx is not a server fault.
  assert.equal(spans[2].attributes['http.route'], undefined);
  assert.doesNotMatch(JSON.stringify(spans.map(s => ({ name: s.name, attributes: s.attributes }))), /private/);
});
