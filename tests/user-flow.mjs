import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// Black-box HTTP contract check: does not import application code.
export async function runUserFlow({ base = 'http://127.0.0.1:4310', timeoutMs = 5000, requireTraces = false } = {}) {
  const startedAt = new Date().toISOString();
  const results = [];
  const requestIds = new Set();
  const documentIds = new Set();
  let currentStep;
  async function check(name, path, { method = 'GET', body, status = 200, error, success = false } = {}) {
    currentStep = name;
    const start = performance.now();
    const r = await fetch(new URL(path, base), { method, body, redirect: 'error',
      headers: body === undefined ? {} : { 'content-type': 'application/json' }, signal: AbortSignal.timeout(timeoutMs) });
    assert.equal(r.status, status);
    assert.match(r.headers.get('content-type') || '', /^application\/json(?:;|$)/);
    assert.equal(r.headers.get('cache-control'), 'no-store');
    const data = await r.json();
    const id = r.headers.get('x-request-id');
    assert.match(id || '', uuid);
    assert.ok(!requestIds.has(id));
    requestIds.add(id);
    const traceId = r.headers.get('x-trace-id');
    if (requireTraces && path !== '/health') assert.match(traceId || '', /^[a-f0-9]{32}$/);
    if (error) { assert.equal(data.error, error); assert.equal(data.documentId, undefined); }
    if (success) {
      assert.equal(data.status, 'completed');
      assert.equal(data.requestId, id);
      assert.match(data.documentId || '', uuid);
      assert.ok(!documentIds.has(data.documentId));
      documentIds.add(data.documentId);
    }
    if (path === '/health') {
      assert.equal(data.status, 'ok'); assert.equal(data.service, 'document-lab');
      assert.equal(typeof data.version, 'string'); assert.ok(data.version.length > 0);
    }
    results.push({ step: name, status: r.status, durationMs: Math.round(performance.now() - start), requestId: id, ...(traceId ? { traceId } : {}) });
  }
  const post = (name, body, options) => check(name, '/api/documents/process', { method: 'POST', body, ...options });
  const invalidName = 'name must be a non-empty string of at most 120 characters';
  try {
    await check('health-before', '/health');
    await post('valid-document', '{"name":"flow-demo.pdf"}', { success:true });
    await post('invalid-json', '{', { status:400,error:'Invalid JSON request' });
    await post('missing-name', '{}', { status:400,error:invalidName });
    await post('blank-name', '{"name":"  "}', { status:400,error:invalidName });
    await post('wrong-name-type', '{"name":42}', { status:400,error:invalidName });
    await post('name-too-long', JSON.stringify({name:'x'.repeat(121)}), {status:400,error:invalidName});
    await post('payload-too-large', JSON.stringify({name:'x'.repeat(17000)}), {status:413,error:'Payload too large'});
    await check('unknown-route', '/flow-missing', {status:404,error:'Not found'});
    await check('wrong-method', '/api/documents/process', {status:404,error:'Not found'});
    await post('recovery-unicode', '{"name":"factuur-é-東京.pdf"}', {success:true});
    await check('health-after', '/health');
    return { check:'document-user-flow',status:'pass',startedAt,finishedAt:new Date().toISOString(),steps:results.length,results };
  } catch {
    // Do not print arbitrary response bodies, URLs, credentials or assertion values.
    throw Object.assign(new Error(`User flow failed at ${currentStep}`), { step:currentStep, completedSteps:results.length });
  }
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    console.log(JSON.stringify(await runUserFlow({ base:process.env.API_URL, requireTraces:process.env.FLOW_REQUIRE_TRACES === 'true' }),null,2));
  } catch (error) {
    console.error(JSON.stringify({check:'document-user-flow',status:'fail',step:error.step,completedSteps:error.completedSteps}));
    process.exitCode=1;
  }
}
