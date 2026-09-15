import test from 'node:test';
import assert from 'node:assert/strict';
import { request } from 'node:http';
import { once } from 'node:events';
import { setTimeout as sleep } from 'node:timers/promises';
import { NodeTracerProvider, SimpleSpanProcessor, InMemorySpanExporter } from '@opentelemetry/sdk-trace-node';
import { createServer } from '../app/server.mjs';

test('disconnect cancels ongoing work and records cancellation rather than a server fault', async t => {
  const exporter = new InMemorySpanExporter();
  const provider = new NodeTracerProvider({ spanProcessors: [new SimpleSpanProcessor(exporter)] });
  provider.register();
  const started = Promise.withResolvers();
  const settled = Promise.withResolvers();
  const logs = [];
  let signal;
  const server = createServer({ requestLogger: data => logs.push(data), processDocument: async s => {
    signal = s; started.resolve();
    try { await sleep(10_000, undefined, { signal: s }); return 'should-not-complete'; }
    finally { settled.resolve(); }
  } }).listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(async () => { server.closeAllConnections(); await new Promise(r => server.close(r)); await provider.shutdown(); });
  const req = request({ host: '127.0.0.1', port: server.address().port, path: '/api/documents/process', method: 'POST' });
  req.on('error', () => {});
  req.end('{"name":"cancel.pdf"}');
  await started.promise;
  req.destroy();
  await Promise.race([settled.promise, sleep(1000).then(() => { throw new Error('Work did not cancel'); })]);
  await new Promise(setImmediate);
  assert.equal(signal.aborted, true);
  assert.equal(logs.length, 1);
  assert.equal(logs[0].reason, 'client_disconnect');
  assert.equal(logs[0].status, undefined);
  const spans = exporter.getFinishedSpans();
  assert.equal(spans.length, 5);
  for (const name of ['document.process', 'POST /api/documents/process']) {
    const span = spans.find(s => s.name === name);
    assert.equal(span.attributes['error.type'], 'client_disconnect');
    assert.equal(span.status.code, 2);
  }
});
