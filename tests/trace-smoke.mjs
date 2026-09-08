import assert from 'node:assert/strict';
const base = process.env.API_URL || 'http://127.0.0.1:4310';
for (const [path, body, expected] of [
  ['/api/documents/process', JSON.stringify({ name: 'day-02-demo.pdf' }), 200],
  ['/api/documents/process', '{}', 400],
  ['/api/documents/process', '{', 400],
  ['/missing', undefined, 404],
]) {
  const response = await fetch(new URL(path, base), {
    method: body === undefined ? 'GET' : 'POST',
    headers: { 'content-type': 'application/json' }, body,
    signal: AbortSignal.timeout(5000),
  });
  await response.text();
  assert.equal(response.status, expected);
  const traceId = response.headers.get('x-trace-id');
  assert.match(traceId || '', /^[a-f0-9]{32}$/);
  console.log(JSON.stringify({ path, status: response.status, traceId }));
}
