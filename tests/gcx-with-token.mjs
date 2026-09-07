// Pass the local CAP token to gcx via its environment, never argv or console.
import { readFileSync, chmodSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
const tokenPath = new URL('../.local/cloud-token', import.meta.url);
let token;
try {
  chmodSync(tokenPath, 0o600);
  token = readFileSync(tokenPath, 'utf8').trim();
  if (!token || /\s/.test(token)) throw new Error();
} catch {
  console.error('Bewaar een geldige Cloud Access Policy-token in .local/cloud-token (alleen de token).');
  process.exit(1);
}
const args = process.argv.slice(2);
if (!args.length) {
  console.error('Gebruik: npm run grafana -- synthetic-monitoring probes list');
  process.exit(1);
}
const result = spawnSync('gcx', ['--context', 'lab', ...args], {
  env: { ...process.env, GRAFANA_CLOUD_TOKEN: token },
  stdio: 'inherit',
});
if (result.error) console.error('gcx kon niet worden gestart; controleer de installatie.');
process.exitCode = result.status ?? 1;
