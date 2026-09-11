import { test } from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { NodeTracerProvider } from '@opentelemetry/sdk-trace-node';
import { LoggerProvider, SimpleLogRecordProcessor, InMemoryLogRecordExporter } from '@opentelemetry/sdk-logs';
import { createRequestLogger } from '../telemetry/logging.mjs';
import { resource } from '../telemetry/config.mjs';
import { createServer } from '../app/server.mjs';

test('request logs correlate with traces and contain only safe metadata', async t => {
  const traceProvider = new NodeTracerProvider();
  traceProvider.register();
  const exporter = new InMemoryLogRecordExporter();
  const provider = new LoggerProvider({ resource, processors: [new SimpleLogRecordProcessor({ exporter })] });
  const lines = [];
  const server = createServer({ requestLogger: createRequestLogger({ logger: provider.getLogger('test'), write: line => lines.push(JSON.parse(line)) }) }).listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(async () => { await new Promise(resolve => server.close(resolve)); await provider.shutdown(); await traceProvider.shutdown(); });
  const base = `http://127.0.0.1:${server.address().port}`;
  const cases = [
    ['/api/documents/process?secret=private', JSON.stringify({ name: 'private-document.pdf' }), 200, 'completed'],
    ['/api/documents/process', '{}', 400, 'invalid_name'],
    ['/api/documents/process', '{private', 400, 'invalid_json'],
    ['/api/documents/process', JSON.stringify({ name: 'private'.repeat(3000) }), 413, 'payload_too_large'],
    ['/private-route', undefined, 404, 'route_not_found'],
  ];
  for (const [path, body, status, reason] of cases) {
    const r = await fetch(base + path, { method: body ? 'POST' : 'GET', body, headers: { authorization: 'private-token' } });
    await r.text();
    assert.equal(r.status, status);
    const log = lines.at(-1);
    assert.equal(log['request.outcome'], reason);
    assert.equal(log['request.id'], r.headers.get('x-request-id'));
    assert.equal(log.trace_id, r.headers.get('x-trace-id'));
    assert.equal(log.severity, status === 200 ? 'INFO' : 'WARN');
    assert.equal(log['service.version'], '0.1.0');
    assert.equal(log['deployment.environment.name'], 'lab');
  }
  await (await fetch(base + '/health')).text();
  await provider.forceFlush();
  const records = exporter.getFinishedLogRecords();
  assert.equal(lines.length, 5);
  assert.equal(records.length, 5);
  assert.equal(records[0].spanContext.traceId, lines[0].trace_id);
  assert.equal(records[0].resource.attributes['service.version'], '0.1.0');
  assert.doesNotMatch(JSON.stringify(lines), /private/);
  assert.doesNotMatch(JSON.stringify(records.map(r => ({ body: r.body, attributes: r.attributes }))), /private/);
});

test('server failures are ERROR; unavailable logging sinks do not throw', () => {
  const output = [];
  const log = createRequestLogger({ logger: { emit: r => output.push(r) }, write: () => { throw new Error('unavailable'); } });
  log({ method: 'GET', status: 500, reason: 'internal_error', requestId: 'test', durationMs: 1 });
  log({ method: 'GET', reason: 'client_disconnect', requestId: 'test', durationMs: 1 });
  assert.deepEqual(output.map(r => r.severityText), ['ERROR', 'ERROR']);
});
