import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { once } from 'node:events';
import { request } from 'node:http';
import { setTimeout as sleep } from 'node:timers/promises';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';

// Compare the actual pre-change code to the current implementation, without Cloud export.
assert.ok(!process.env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT && !process.env.OTEL_EXPORTER_OTLP_LOGS_ENDPOINT);
const beforeCommit = '53568c1b2503808d80db38ba2d20f90e65e5bd60';
const directory = `test-results/day-11-${Date.now()}`;
for (const folder of ['app', 'telemetry']) await mkdir(`${directory}/before/${folder}`, { recursive: true });
for (const file of ['app/server.mjs', 'app/documents.mjs', 'telemetry/config.mjs', 'telemetry/logging.mjs', 'telemetry/tracing.mjs', 'package.json']) {
  await writeFile(`${directory}/before/${file}`, execFileSync('git', ['show', `${beforeCommit}:${file}`]));
}
const before = await import(pathToFileURL(resolve(directory, 'before/app/server.mjs')));
const oldProcessing = (await import(pathToFileURL(resolve(directory, 'before/app/documents.mjs')))).simulateProcessing;
const after = await import('../app/server.mjs');
const newProcessing = (await import('../app/documents.mjs')).simulateProcessing;
async function measure(createServer, processDocument, disconnect) {
  const started = Promise.withResolvers();
  const settled = Promise.withResolvers();
  let disconnectedAt;
  const server = createServer({ requestLogger: () => {}, processDocument: async signal => {
    const start = performance.now();
    started.resolve();
    let completed = false;
    try { const id = await processDocument(signal); completed = true; return id; }
    finally { settled.resolve({ completed, processingMs: performance.now() - start,
      afterDisconnectMs: disconnectedAt === undefined ? null : performance.now() - disconnectedAt }); }
  } }).listen(0, '127.0.0.1');
  await once(server, 'listening');
  try {
    const done = Promise.withResolvers();
    const req = request({ host: '127.0.0.1', port: server.address().port, path: '/api/documents/process', method: 'POST' }, res => {
      let body = '';
      res.on('data', chunk => { body += chunk; });
      res.on('end', () => done.resolve({ status: res.statusCode, body }));
    });
    req.on('error', error => disconnect ? done.resolve({ disconnected: true }) : done.reject(error));
    req.setTimeout(2000, () => req.destroy(new Error('Request timeout')));
    req.end('{"name":"compare-demo.pdf"}');
    await started.promise;
    if (disconnect) { await sleep(10); disconnectedAt = performance.now(); req.destroy(); }
    const response = await done.promise;
    if (!disconnect) { assert.equal(response.status, 200); assert.equal(JSON.parse(response.body).status, 'completed'); }
    return await settled.promise;
  } finally { server.closeAllConnections(); await new Promise(r => server.close(r)); }
}
const report = { beforeCommit, node: process.version, platform: `${process.platform}/${process.arch}`,
  startedAt: new Date().toISOString(), telemetry: 'disabled in both versions', samples: [] };
for (let i = 0; i < 22; i++) {
  // Alternate execution order; discard two warmup pairs for each case.
  for (const disconnect of [false, true]) {
    for (const version of i % 2 ? ['after', 'before'] : ['before', 'after']) {
      const value = await measure(version === 'before' ? before.createServer : after.createServer,
        version === 'before' ? oldProcessing : newProcessing, disconnect);
      if (i >= 2) report.samples.push({ version, disconnect, ...value });
    }
  }
}
report.results = [];
for (const version of ['before', 'after']) for (const disconnect of [false, true]) {
  const rows = report.samples.filter(r => r.version === version && r.disconnect === disconnect);
  assert.equal(rows.length, 20);
  assert.ok(rows.every(r => r.completed === !(version === 'after' && disconnect)));
  report.results.push({ version, disconnect, count: rows.length,
    completed: rows.filter(r => r.completed).length,
    meanProcessingMs: rows.reduce((n,r) => n + r.processingMs, 0) / rows.length,
    meanAfterDisconnectMs: disconnect ? rows.reduce((n,r) => n + r.afterDisconnectMs, 0) / rows.length : null });
}
report.finishedAt = new Date().toISOString();
await writeFile(`${directory}/comparison.json`, JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({ file: `${directory}/comparison.json`, results: report.results }, null, 2));
