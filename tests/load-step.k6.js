import { documentRequest } from './k6-document-flow.js';
export { setup } from './k6-document-flow.js';

const rate = Number(__ENV.LAB_RATE);
if (![5, 25, 100, 250, 500, 1000].includes(rate)) throw new Error('Unsupported bounded LAB_RATE');
const limit = rate * 20;
export const options = {
  scenarios: { load: { executor: 'constant-arrival-rate', rate, timeUnit: '1s',
    duration: '20s', preAllocatedVUs: Math.max(10, Math.ceil(rate / 2)),
    maxVUs: Math.max(10, Math.ceil(rate / 2)), gracefulStop: '5s' } },
  thresholds: {
    checks: ['rate==1'],
    http_req_failed: [{ threshold: 'rate==0', abortOnFail: true, delayAbortEval: '5s' }],
    dropped_iterations: ['count==0'],
    'http_req_duration{scenario:load,case:valid}': [
      { threshold: 'p(95)<250', abortOnFail: true, delayAbortEval: '10s' }],
    'http_reqs{scenario:load}': [`count==${limit}`],
    'http_reqs{scenario:load,case:valid}': [`count==${limit * 0.9}`],
    'http_reqs{scenario:load,case:invalid}': [`count==${limit * 0.1}`],
  },
  summaryTrendStats: ['avg', 'min', 'med', 'max', 'p(95)', 'p(99)'],
};
export default function () { documentRequest(limit); }
export function handleSummary(data) {
  return { [__ENV.LAB_REPORT]: JSON.stringify({ profile: 'day-09-v1', rate,
    finishedAt: new Date().toISOString(), ...data }, null, 2) };
}
