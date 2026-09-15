import assert from 'node:assert/strict';
import { once } from 'node:events';
import { writeFile } from 'node:fs/promises';
import { setTimeout as sleep } from 'node:timers/promises';
import { createServer } from '../app/server.mjs';
import { simulateProcessing } from '../app/documents.mjs';
import { shutdownTracing } from '../telemetry/tracing.mjs';
import { shutdownLogging } from '../telemetry/logging.mjs';

assert.equal(process.env.RUN_LIVE_ALERT_TEST, 'true', 'Explicit live exercise opt-in required');
assert.ok(process.env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT && process.env.OTEL_EXPORTER_OTLP_LOGS_ENDPOINT);
assert.notEqual(process.env.OTEL_SDK_DISABLED, 'true');
assert.ok(process.env.EXPERIMENT_REPORT);
let mode = 'normal';
const server = createServer({ processDocument: async () => {
  if (mode === 'error') throw new Error('Controlled day-10 failure; never export this message');
  if (mode === 'slow') await sleep(350);
  return simulateProcessing();
} }).listen(0, '127.0.0.1');
await once(server, 'listening');
const report = { startedAt: new Date().toISOString(), requests: [] };
const base = `http://127.0.0.1:${server.address().port}`;
async function request(phase, status = 200, body = '{"name":"fault-exercise.pdf"}') {
  const started = performance.now();
  const r = await fetch(`${base}/api/documents/process`, {
    method: 'POST', headers: { 'content-type': 'application/json' }, body,
    signal: AbortSignal.timeout(5000), redirect: 'error',
  });
  const result = await r.json();
  assert.equal(r.status, status);
  if (status === 500) assert.deepEqual(result, { error: 'Internal server error' });
  if (status === 200) {
    assert.equal(result.status, 'completed');
    assert.equal(result.requestId, r.headers.get('x-request-id'));
    assert.match(result.documentId, /^[a-f0-9-]{36}$/);
  }
  const traceId = r.headers.get('x-trace-id');
  assert.match(traceId || '', /^[a-f0-9]{32}$/);
  report.requests.push({ phase, status, traceId, requestId: r.headers.get('x-request-id'),
    timestamp: new Date().toISOString(), durationMs: performance.now() - started });
}
try {
  for (let i = 0; i < 3; i++) await request('before');
  await request('invalid-input', 400, '{}');
  mode = 'slow';
  for (let i = 0; i < 12; i++) await request('slow');
  mode = 'error';
  for (let i = 0; i < 3; i++) await request('error', 500);
  mode = 'normal';
  for (let i = 0; i < 3; i++) await request('recovered');
  report.status = 'pass';
} finally {
  mode = 'normal';
  server.closeAllConnections();
  await new Promise(resolve => server.close(resolve));
  await Promise.all([shutdownTracing(), shutdownLogging()]);
  report.finishedAt = new Date().toISOString();
  await writeFile(process.env.EXPERIMENT_REPORT, JSON.stringify(report, null, 2) + '\n');
}
