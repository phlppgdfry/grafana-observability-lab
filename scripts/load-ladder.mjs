import { spawn } from 'node:child_process';
import { mkdir, readFile, writeFile, open } from 'node:fs/promises';

const directory = `test-results/day-09-${Date.now()}`;
await mkdir(directory, { recursive: true });
const report = { profile: 'day-09-v1', startedAt: new Date().toISOString(), steps: [] };
async function run(script, name, env) {
  const log = await open(`${directory}/${name}.log`, 'w');
  try {
    return await new Promise((resolve, reject) => {
      const child = spawn('k6', ['run', '--no-usage-report', script], {
        env: { ...process.env, ...env }, stdio: ['ignore', log.fd, log.fd], timeout: 100_000,
      });
      child.on('error', reject);
      child.on('exit', (code, signal) => resolve({ code, signal }));
    });
  } finally { await log.close(); }
}
try {
  for (const rate of [5, 25, 100, 250, 500, 1000]) {
    const file = `${directory}/${rate}.json`;
    console.log(`Testing ${rate} requests/s for 20s`);
    const exit = await run('tests/load-step.k6.js', String(rate), { LAB_RATE: String(rate), LAB_REPORT: file });
    const data = JSON.parse(await readFile(file, 'utf8'));
    const failed = Object.entries(data.metrics).flatMap(([metric, value]) =>
      Object.entries(value.thresholds || {}).filter(([, result]) => !result.ok).map(([threshold]) => ({ metric, threshold })));
    const step = { rate, ...exit, failed, requests: data.metrics['http_reqs{scenario:load}']?.values.count,
      p95Ms: data.metrics['http_req_duration{scenario:load,case:valid}']?.values['p(95)'],
      dropped: data.metrics.dropped_iterations?.values.count };
    report.steps.push(step);
    console.log(JSON.stringify(step));
    if (exit.code !== 0 || failed.length) { report.stop = 'threshold-or-execution-failure'; break; }
  }
  report.stop ||= 'bounded-ceiling-reached';
} catch (error) {
  report.stop = 'runner-error';
  console.error(error.message);
} finally {
  console.log('Checking recovery with the full day-08 baseline');
  try {
    report.recovery = await run('tests/baseline.k6.js', 'recovery', { BASELINE_REPORT: `${directory}/recovery.json` });
  } catch {
    report.recovery = { code: null, error: 'Could not execute recovery test' };
  }
  report.finishedAt = new Date().toISOString();
  await writeFile(`${directory}/summary.json`, JSON.stringify(report, null, 2) + '\n');
  console.log(`Report: ${directory}/summary.json`);
  // A found boundary remains a failed performance check, not an application regression to hide.
  if (report.stop !== 'bounded-ceiling-reached' || report.recovery.code !== 0) process.exitCode = 1;
}
