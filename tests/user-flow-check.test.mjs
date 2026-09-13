import { test } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { once } from 'node:events';
import { runUserFlow } from './user-flow.mjs';

test('flow check rejects HTTP 200 with a broken response contract', async t => {
  const server=http.createServer((req,res)=>{res.writeHead(200,{'content-type':'application/json'});res.end('{"status":"ok"}');}).listen(0,'127.0.0.1');
  await once(server,'listening');
  t.after(()=>new Promise(r=>server.close(r)));
  await assert.rejects(runUserFlow({base:`http://127.0.0.1:${server.address().port}`}), {step:'health-before',completedSteps:0});
});
test('flow check times out when response body never completes', async t => {
  const server=http.createServer((req,res)=>{res.writeHead(200,{'content-type':'application/json','cache-control':'no-store'});res.write('{');}).listen(0,'127.0.0.1');
  await once(server,'listening');
  t.after(()=>{server.closeAllConnections();return new Promise(r=>server.close(r));});
  await assert.rejects(runUserFlow({base:`http://127.0.0.1:${server.address().port}`,timeoutMs:100}), {step:'health-before'});
});
