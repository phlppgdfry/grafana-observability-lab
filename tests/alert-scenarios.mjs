// Explicit, bounded live lab exercise. Requires the opt-in flag and OTLP endpoints.
// No fault injection endpoint is added to the normal application.
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { createServer } from '../app/server.mjs';
import { shutdownTracing } from '../telemetry/tracing.mjs';
import { shutdownLogging } from '../telemetry/logging.mjs';
if (process.env.RUN_LIVE_ALERT_TEST !== 'true') throw new Error('Set RUN_LIVE_ALERT_TEST=true for this explicit live lab exercise');
let fail = false;
const server = createServer({ processDocument: async () => {
  if (fail) throw new Error('Controlled lab processing failure');
  await new Promise(resolve => setTimeout(resolve, 350));
  return 'alert-test-document';
} }).listen(0, '127.0.0.1');
await once(server, 'listening');
try {
 const base = `http://127.0.0.1:${server.address().port}`;
 for (let index = 0; index < 15; index++) {
  fail = index >= 12;
  const response = await fetch(base + '/api/documents/process', {
   method:'POST',body:'{"name":"alert-test.pdf"}',signal:AbortSignal.timeout(5000),
  });
  await response.text();
  assert.equal(response.status, fail ? 500 : 200);
  console.error(JSON.stringify({scenario:fail?'server-error':'slow-success',status:response.status,traceId:response.headers.get('x-trace-id')}));
 }
} finally {
 await new Promise(resolve => server.close(resolve));
 await Promise.all([shutdownTracing(),shutdownLogging()]);
}
