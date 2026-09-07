import { performance } from 'node:perf_hooks';
const target = process.env.CHECK_URL || 'http://127.0.0.1:4310/health';
const start = performance.now();
try {
  const response = await fetch(target, { signal: AbortSignal.timeout(5000), redirect: 'error' });
  const body = await response.json();
  if (response.status !== 200 || body.status !== 'ok' || body.service !== 'document-lab') {
    throw new Error(`Unexpected health response (HTTP ${response.status})`);
  }
  console.log(JSON.stringify({ check: 'document-lab-health', status: 'pass', target, durationMs: Math.round(performance.now() - start), checkedAt: new Date().toISOString() }));
} catch (error) {
  console.error(JSON.stringify({ check: 'document-lab-health', status: 'fail', target, error: error.message }));
  process.exitCode = 1;
}
