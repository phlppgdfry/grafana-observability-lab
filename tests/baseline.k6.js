import exec from 'k6/execution';
import { documentRequest } from './k6-document-flow.js';

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

export { setup } from './k6-document-flow.js';
export function request() { documentRequest(exec.scenario.name === 'warmup' ? 50 : 300); }

export function handleSummary(data) {
  const report = JSON.stringify({ finishedAt: new Date().toISOString(), profile: 'day-08-v1', ...data }, null, 2);
  return { [__ENV.BASELINE_REPORT || 'test-results/baseline.json']: report, stdout: report + '\n' };
}
