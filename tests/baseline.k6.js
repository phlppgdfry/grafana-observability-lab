import http from 'k6/http';
import exec from 'k6/execution';
import { check, fail } from 'k6';

// Fixed, local-only profile so repeated runs are comparable.
const base = 'http://127.0.0.1:4310';
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export const options = {
  scenarios: {
    warmup: { executor: 'constant-arrival-rate', exec: 'request', rate: 5,
      timeUnit: '1s', duration: '10s', preAllocatedVUs: 5, maxVUs: 10, gracefulStop: '5s' },
    baseline: { executor: 'constant-arrival-rate', exec: 'request', rate: 5,
      timeUnit: '1s', startTime: '15s', duration: '60s', preAllocatedVUs: 5, maxVUs: 10, gracefulStop: '5s' },
  },
  thresholds: {
    'checks': ['rate==1'],
    'http_req_failed': ['rate==0'],
    'dropped_iterations': ['count==0'],
    'http_reqs{scenario:baseline}': ['count==300'],
    'http_reqs{scenario:baseline,case:valid}': ['count==270'],
    'http_reqs{scenario:baseline,case:invalid}': ['count==30'],
    'http_req_duration{scenario:baseline,case:valid}': ['p(95)<250'],
  },
  summaryTrendStats: ['avg', 'min', 'med', 'max', 'p(90)', 'p(95)', 'p(99)'],
};

export function setup() {
  const r = http.get(`${base}/health`, { timeout: '5s', redirects: 0 });
  let body;
  try { body = r.json(); } catch { fail('Health response is not JSON'); }
  if (r.status !== 200 || body.status !== 'ok' || body.service !== 'document-lab') fail('Lab is not healthy');
  return { startedAt: new Date().toISOString() };
}

export function request() {
  // k6 can schedule an iteration on the duration boundary; cap actual requests.
  const limit = exec.scenario.name === 'warmup' ? 50 : 300;
  if (exec.scenario.iterationInTest >= limit) return;
  const invalid = exec.scenario.iterationInTest % 10 === 9;
  const r = http.post(`${base}/api/documents/process`, invalid ? '{}' : '{"name":"baseline-demo.pdf"}', {
    headers: { 'Content-Type': 'application/json' }, timeout: '5s', redirects: 0,
    tags: { case: invalid ? 'invalid' : 'valid' },
    responseCallback: http.expectedStatuses(invalid ? 400 : 200),
  });
  let body = {};
  try { body = r.json(); } catch { /* checks below record the failure */ }
  check(r, {
    'expected status': () => r.status === (invalid ? 400 : 200),
    'JSON response': () => /^application\/json/.test(r.headers['Content-Type'] || ''),
    'request ID': () => uuid.test(r.headers['X-Request-Id'] || ''),
    'trace ID': () => /^[a-f0-9]{32}$/.test(r.headers['X-Trace-Id'] || ''),
    'response contract': () => invalid
      ? body.error === 'name must be a non-empty string of at most 120 characters' && body.documentId === undefined
      : body.status === 'completed' && uuid.test(body.documentId || '') && body.requestId === r.headers['X-Request-Id'],
  });
  // A single sample per scenario allows correlation without high-cardinality metric tags.
  if (exec.scenario.iterationInTest === 0) console.log(JSON.stringify({
    scenario: exec.scenario.name, timestamp: new Date().toISOString(), traceId: r.headers['X-Trace-Id'],
  }));
}

export function handleSummary(data) {
  const report = JSON.stringify({ finishedAt: new Date().toISOString(), profile: 'day-08-v1', ...data }, null, 2);
  return { [__ENV.BASELINE_REPORT || 'test-results/baseline.json']: report, stdout: report + '\n' };
}
