import { test } from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { createServer } from '../app/server.mjs';

test('health and document workflow', async t => {
  const server = createServer().listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(() => new Promise(resolve => server.close(resolve)));
  const base = `http://127.0.0.1:${server.address().port}`;
  const health = await fetch(`${base}/health`);
  assert.equal(health.status, 200);
  assert.equal((await health.json()).status, 'ok');
  const processDocument = body => fetch(`${base}/api/documents/process`, { method: 'POST', body });
  const result = await processDocument(JSON.stringify({ name: 'demo.pdf' }));
  assert.equal(result.status, 200);
  assert.equal((await result.json()).status, 'completed');
  assert.equal((await processDocument('{')).status, 400);
  assert.equal((await processDocument('{}')).status, 400);
  assert.equal((await processDocument(JSON.stringify({ name: 'x'.repeat(17000) }))).status, 413);
  assert.equal((await fetch(`${base}/missing`)).status, 404);
});
