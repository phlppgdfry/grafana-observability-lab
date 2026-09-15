import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { setTimeout as sleep } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import { runUserFlow } from '../tests/user-flow.mjs';

process.chdir(fileURLToPath(new URL('../', import.meta.url)));
const execute = promisify(execFile);
const action = process.argv[2];
const local = process.argv.includes('--local');
assert.ok(['doctor', 'up', 'check', 'apply', 'stop'].includes(action), 'Use doctor, up, check, apply or stop');
assert.ok(process.argv.slice(3).every(arg => arg === '--local'), 'Unknown option');
const compose = ['compose', '-f', 'docker-compose.yml', ...(!local
  ? ['-f', 'docker-compose.monitoring.yml', '-f', 'docker-compose.telemetry.yml'] : [])];
const report = { action, mode: local ? 'local' : 'cloud', startedAt: new Date().toISOString(), checks: [] };
let stage = 'preflight';
async function command(file, args, timeout = 30_000) {
  return (await execute(file, args, { timeout, maxBuffer: 4 * 1024 * 1024 })).stdout;
}
async function step(name, work) {
  stage = name;
  const result = await work();
  report.checks.push({ name, status: 'pass' });
  console.log(`${name}: pass`);
  return result;
}
async function doctor() {
  await step('Node >=22', async () => assert.ok(Number(process.versions.node.split('.')[0]) >= 22));
  await step('dependencies installed', () => import('@opentelemetry/sdk-trace-node'));
  await step('Docker daemon', () => command('docker', ['info', '--format', '{{.ServerVersion}}']));
  if (!local) {
    await step('local credential files', async () => {
      const token = (await readFile('.local/cloud-token', 'utf8')).trim();
      assert.ok(token && !/\s/.test(token));
      assert.match(await readFile('.local/probe.env', 'utf8'), /^SM_AGENT_API_TOKEN=\S+/m);
    });
    await step('Grafana context', () => command('gcx', ['config', 'check', '--context', 'lab']));
  }
  await step('Compose configuration', () => command('docker', [...compose, 'config', '--quiet']));
}
async function verify() {
  report.flow = await step('12-step HTTP flow', () => runUserFlow({ requireTraces: !local }));
  if (local) return;
  const traceId = report.flow.results.find(r => r.step === 'valid-document').traceId;
  await step('trace and log delivered to Grafana', async () => {
    for (let attempt = 0; attempt < 8; attempt++) {
      try {
        const trace = JSON.parse(await command('gcx', ['traces', 'get', traceId, '-d', 'grafanacloud-traces', '--context', 'lab', '--since', '30m', '-o', 'json'], 15_000));
        const logs = JSON.parse(await command('gcx', ['logs', 'query', `{service_name="document-lab",deployment_environment_name="lab"} | trace_id="${traceId}"`, '-d', 'grafanacloud-logs', '--context', 'lab', '--since', '30m', '-o', 'json'], 15_000));
        const spans = trace.trace.resourceSpans.flatMap(r => r.scopeSpans.flatMap(s => s.spans));
        assert.equal(spans.length, 5);
        assert.ok(spans.every(s => Buffer.from(s.traceId, 'base64').toString('hex') === traceId));
        const entries = logs.data.result.flatMap(r => r.values);
        assert.ok(entries.some(v => v.structuredMetadata.trace_id === traceId && v.structuredMetadata.http_response_status_code === '200'));
        report.correlation = { traceId, spans: spans.length, matchingLog: true };
        return;
      } catch { if (attempt === 7) throw new Error('Telemetry unavailable'); await sleep(5000); }
    }
  });
}
try {
  if (action === 'stop') {
    await step('containers stopped', () => command('docker', [...compose, 'stop']));
  } else {
    await doctor();
    if (action === 'up') await step('containers healthy', () => command('docker', [...compose, 'up', '-d', '--build', '--wait', '--wait-timeout', '90'], 240_000));
    if (action === 'up' || action === 'check') await verify();
    if (action === 'apply') {
      assert.ok(!local, 'Apply requires the cloud mode');
      await step('Grafana manifests applied', () => command('gcx', ['resources', 'push',
        '-p', 'dashboards/day-01.json', '-p', 'dashboards/day-03.json', '-p', 'alerts/rules',
        '--context', 'lab', '--on-error', 'abort'], 120_000));
    }
  }
  report.status = 'pass';
} catch {
  // Never print CLI errors, config output or credentials from child processes.
  report.status = 'fail';
  report.failedStep = stage;
  console.error(`Failed: ${stage}. See docs/setup.md for recovery steps.`);
  process.exitCode = 1;
} finally {
  report.finishedAt = new Date().toISOString();
  await mkdir('test-results', { recursive: true });
  const path = `test-results/lab-${action}-${Date.now()}.json`;
  await writeFile(path, JSON.stringify(report, null, 2) + '\n');
  console.log(`Report: ${path}`);
}
