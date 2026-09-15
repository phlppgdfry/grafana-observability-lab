import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
import { assessUsage } from '../telemetry/usage-report.mjs';
process.chdir(fileURLToPath(new URL('../', import.meta.url)));
const budget = JSON.parse(await readFile('telemetry/budget.json', 'utf8'));
const report = { checkedAt: new Date().toISOString(), source: budget.source,
  scope: 'organization-wide billing usage; not a forecast or invoice', warningPercent: budget.warningPercent };
try {
  const query = `{__name__=~"${budget.items.map(i => i.metric).join('|')}"}`;
  const { stdout } = await promisify(execFile)('gcx', ['metrics', 'billing', 'query', query, '--context', 'lab', '-o', 'json'], { timeout: 30_000 });
  const response = JSON.parse(stdout);
  if (response.data?.resultType !== 'vector') throw new Error('Unexpected response');
  report.items = assessUsage(budget, response.data.result);
  report.status = report.items.every(i => i.status === 'within-budget') ? 'pass' : 'review';
  if (report.status !== 'pass') process.exitCode = 1;
} catch {
  report.status = 'unknown';
  process.exitCode = 1;
}
await mkdir('test-results', { recursive: true });
const path = `test-results/usage-${Date.now()}.json`;
await writeFile(path, JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report, null, 2));
console.log(`Report: ${path}`);
