import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';
import { runUserFlow } from '../tests/user-flow.mjs';
import { verifyEvidence } from '../experiments/verify-evidence.mjs';

const execute = promisify(execFile);
const directory = `test-results/day-10-${Date.now()}`;
await mkdir(directory, { recursive: true });
const targets = ['document-lab-latency', 'document-lab-server-errors'];
const report = { startedAt: new Date().toISOString(), history: [] };
async function command(file, args, options = {}) {
  return (await execute(file, args, { timeout: 30_000, maxBuffer: 2 * 1024 * 1024, ...options })).stdout;
}
async function state() {
  const groups = JSON.parse(await command('gcx', ['alert', 'rules', 'list', '--context', 'lab', '-o', 'json']));
  const rules = groups.flatMap(g => g.rules).filter(r => targets.includes(r.uid));
  assert.equal(rules.length, targets.length, 'Both day-6 rules must exist');
  return { at: new Date().toISOString(), rules: rules.map(r => ({ uid: r.uid, state: r.state, health: r.health })) };
}
try {
  report.before = await runUserFlow({ requireTraces: true });
  const initial = await state();
  report.history.push(initial);
  assert.ok(initial.rules.every(r => r.state === 'inactive' && r.health === 'ok'), 'Start only with healthy inactive target alerts');
  const config = JSON.parse(await command('docker', ['compose', '-f', 'docker-compose.yml', '-f', 'docker-compose.telemetry.yml', 'config', '--format', 'json']));
  const environment = config.services.app.environment;
  await command(process.execPath, ['experiments/fault-requests.mjs'], { env: {
    ...process.env, ...environment, GRAFANA_CLOUD_TOKEN_FILE: resolve(config.secrets.grafana_cloud_token.file),
    RUN_LIVE_ALERT_TEST: 'true', EXPERIMENT_REPORT: resolve(directory, 'requests.json'),
  } });
  console.log('22 requests completed; temporary server closed. Observing alert activation and recovery.');
  const fired = new Set();
  for (let index = 0; index < 24; index++) {
    await sleep(30_000);
    const sample = await state();
    report.history.push(sample);
    console.log(JSON.stringify(sample));
    await writeFile(`${directory}/history.json`, JSON.stringify(report.history, null, 2) + '\n');
    assert.ok(sample.rules.every(r => r.health === 'ok'), 'Grafana evaluation failure is not an application failure');
    for (const r of sample.rules) if (r.state === 'firing') fired.add(r.uid);
    if (fired.size === targets.length && sample.rules.every(r => r.state === 'inactive')) {
      report.detectionAndRecovery = 'pass';
      break;
    }
  }
  assert.equal(report.detectionAndRecovery, 'pass', 'Activation and recovery not observed within 12 minutes');
  const requests = JSON.parse(await readFile(`${directory}/requests.json`, 'utf8'));
  report.diagnosis = [];
  for (const phase of ['slow', 'error', 'invalid-input', 'recovered']) {
    const { traceId } = requests.requests.find(r => r.phase === phase);
    const trace = JSON.parse(await command('gcx', ['traces', 'get', traceId, '-d', 'grafanacloud-traces', '--context', 'lab', '--since', '30m', '-o', 'json']));
    const logs = JSON.parse(await command('gcx', ['logs', 'query', `{service_name="document-lab",deployment_environment_name="lab"} | trace_id="${traceId}"`, '-d', 'grafanacloud-logs', '--context', 'lab', '--since', '30m', '-o', 'json']));
    const evidence = { phase, traceId, trace: trace.trace, logs: logs.data.result };
    await writeFile(`${directory}/${phase}.json`, JSON.stringify(evidence, null, 2) + '\n');
    report.diagnosis.push(verifyEvidence(evidence));
  }
  report.status = 'pass';
} catch (error) {
  // Child-process errors may contain environments; never dump the error object.
  report.status = 'fail';
  console.error('Exercise incomplete; inspect saved evidence and Grafana status.');
  process.exitCode = 1;
} finally {
  try { report.after = await runUserFlow({ requireTraces: true }); }
  catch { report.after = { status: 'fail' }; report.status = 'fail'; process.exitCode = 1; }
  report.finishedAt = new Date().toISOString();
  await writeFile(`${directory}/summary.json`, JSON.stringify(report, null, 2) + '\n');
  console.log(`Report: ${directory}/summary.json`);
}
