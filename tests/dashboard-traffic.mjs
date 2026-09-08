// Bounded demonstration traffic, not a load test or background generator.
import assert from 'node:assert/strict';
const base = process.env.API_URL || 'http://127.0.0.1:4310';
const startedAt = new Date().toISOString();
const requests = [];
for (let index = 0; index < 40; index++) {
  const invalid = index % 5 === 4;
  const response = await fetch(new URL('/api/documents/process', base), {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify(invalid ? {} : { name: 'dashboard-demo.pdf' }),
    signal: AbortSignal.timeout(5000),
  });
  await response.text();
  assert.equal(response.status, invalid ? 400 : 200);
  const traceId = response.headers.get('x-trace-id');
  assert.match(traceId || '', /^[a-f0-9]{32}$/);
  requests.push({ status: response.status, traceId });
  await new Promise(resolve => setTimeout(resolve, 500));
}
console.log(JSON.stringify({ startedAt, finishedAt: new Date().toISOString(),
  total: requests.length, successful: 32, rejected: 8, rejectedPercent: 20, requests }, null, 2));
