import { test } from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { NodeTracerProvider, SimpleSpanProcessor, InMemorySpanExporter } from '@opentelemetry/sdk-trace-node';
import { createServer } from '../app/server.mjs';
import { createRequestLogger } from '../telemetry/logging.mjs';

test('unexpected processing failure is a sanitized 500, with ended child/root spans and correlated ERROR log', async t => {
  const exporter = new InMemorySpanExporter();
  const provider = new NodeTracerProvider({ spanProcessors: [new SimpleSpanProcessor(exporter)] });
  provider.register();
  const logs = [];
  const server = createServer({ processDocument: async () => { throw new Error('private-database-password'); },
    requestLogger: createRequestLogger({ write: line => logs.push(JSON.parse(line)) }),
  }).listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(async () => { await new Promise(r => server.close(r)); await provider.shutdown(); });
  const response = await fetch(`http://127.0.0.1:${server.address().port}/api/documents/process`, { method: 'POST', body: '{"name":"private.pdf"}' });
  const body = await response.text();
  assert.equal(response.status, 500);
  assert.equal(JSON.parse(body).error, 'Internal server error');
  await provider.forceFlush();
  const spans = exporter.getFinishedSpans();
  assert.equal(spans.length, 5);
  const root = spans.find(s => s.kind === 1);
  const processing = spans.find(s => s.name === 'document.process');
  assert.equal(root.status.code, 2);
  assert.equal(processing.status.code, 2);
  assert.equal(processing.parentSpanContext.spanId, root.spanContext().spanId);
  assert.equal(logs.length, 1);
  assert.equal(logs[0].severity, 'ERROR');
  assert.equal(logs[0].trace_id, root.spanContext().traceId);
  assert.equal(logs[0]['request.id'], response.headers.get('x-request-id'));
  assert.doesNotMatch(body + JSON.stringify(logs) + JSON.stringify(spans.map(s => ({ attributes: s.attributes, events: s.events, status: s.status }))), /private/);
});
