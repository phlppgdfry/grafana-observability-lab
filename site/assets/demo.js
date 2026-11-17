// Replays measurements saved in docs/evidence/ (day 08, 09, 10 and 11). Nothing here is synthetic:
// spans, log fields, alert states, k6 results and timings are copied from the recorded JSON.
const $ = id => document.getElementById(id);
const ev = await (await fetch('assets/evidence.json')).json();
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const views = {
  trace() {
    const root = ev.spans.find(s => !s.parent), total = root.durMs;
    const rows = [root, ...ev.spans.filter(s => s.parent)].map(s => {
      const left = s.startMs / total * 100, w = Math.max(s.durMs / total * 100, .4);
      return `<div class="go-span"><div class="go-sn ${s.parent ? 'child' : ''}">${esc(s.name)}</div><div class="go-bar"><i style="left:${left}%;width:${w}%" class="${s.durMs / total > .5 ? 'hot' : ''}"></i></div><div class="go-ms mono">${s.durMs.toFixed(2)} ms</div></div>`;
    }).join('');
    const m = ev.log.meta, pick = ['severity_text', 'http_response_status_code', 'request_duration_ms', 'request_outcome', 'request_id', 'trace_id', 'span_id'];
    return `<p class="small dim">Trace <span class="mono">${ev.traceId}</span> · ${ev.spans.length} spans recorded with OpenTelemetry and read back from Grafana Tempo.</p>
      <div class="go-wf">${rows}</div>
      <p class="go-call"><b>${(ev.spans.find(s => s.name === 'document.process').durMs / total * 100).toFixed(0)}%</b> of the request is spent in <code>document.process</code>; reading, parsing and validating the body together take under half a millisecond.</p>
      <div class="small dim" style="margin-top:14px">The correlated log line in Loki, found by the same trace ID</div>
      <pre class="go-log">${esc(ev.log.line)}\n${pick.map(k => `${k.padEnd(26)} ${esc(m[k])}`).join('\n')}</pre>`;
  },
  alerts() {
    const h = ev.alerts.history, t0 = Date.parse(h[0].at), t1 = Date.parse(h.at(-1).at) + 32e3, span = t1 - t0;
    const pct = t => (Date.parse(t) - t0) / span * 100;
    const names = ['Latency (p95 over a window)', 'Server errors (HTTP 5xx)'];
    const lanes = names.map((n, r) => `<div class="go-lane"><div class="go-ln">${n}</div><div class="go-track">${h.map((x, i) => {
      const end = i < h.length - 1 ? pct(h[i + 1].at) : 100; const st = x.rules[r].state;
      return `<i class="${st}" style="left:${pct(x.at)}%;width:${end - pct(x.at)}%" title="${x.at.slice(11, 19)} UTC · ${st}"></i>`; }).join('')}</div></div>`).join('');
    const [a, b] = ev.alerts.injection;
    const inj = `<div class="go-lane"><div class="go-ln">Fault injection</div><div class="go-track"><i class="inject" style="left:${Math.max(0, pct(a))}%;width:${Math.max(.8, pct(b) - pct(a))}%"></i></div></div>`;
    const ticks = h.filter((_, i) => i % 3 === 0).map(x => `<span style="left:${pct(x.at)}%">${x.at.slice(11, 16)}</span>`).join('');
    return `<p class="small dim">15 September 2026: 350 ms of extra processing and three controlled HTTP 500 errors were injected for six seconds. These are the alert-rule states Grafana reported, polled every ~32 seconds.</p>
      <div class="go-alerts">${inj}${lanes}<div class="go-ticks">${ticks}</div></div>
      <div class="go-legend"><span><i class="inactive"></i>inactive</span><span><i class="pending"></i>pending</span><span><i class="firing"></i>firing</span><span><i class="inject"></i>fault injected</span></div>
      <p class="go-call">The faults lasted six seconds, yet both alerts fired minutes later and the last one only cleared at 01:15:47. That is the look-back window at work: an alert describes the recent past, not the current state of the API.</p>`;
  },
  load() {
    const s = ev.load.steps, max = 60;
    const bars = s.map(x => `<div class="go-lb"><div class="go-lbv" style="height:${x.p95Ms / max * 100}%"><span>${x.p95Ms.toFixed(1)}</span></div><div class="go-lbl mono">${x.rate}/s</div><div class="small dim">${x.requests.toLocaleString('en')} req</div></div>`).join('');
    return `<p class="small dim">k6 in steps of 20 seconds, from 5 to 1,000 requests per second. Bars show the p95 response time in ms; every step had 0 failed requests and 0 dropped iterations.</p>
      <div class="go-lc">${bars}</div>
      <p class="go-call">p95 stayed between 45 and 55 ms all the way to 1,000 requests per second, where the test stopped at its planned ceiling (<code>${ev.load.stop}</code>). That proves bounded behaviour on one laptop, not a production capacity.</p>`;
  },
  cancel() {
    const r = ev.cancellation.results, g = (v, d) => r.find(x => x.version === v && x.disconnect === d);
    const b = g('before', true).meanAfterDisconnectMs, a = g('after', true).meanAfterDisconnectMs;
    const row = (l, v, m, c) => `<div class="go-cr"><div>${l}</div><div class="go-ct"><i class="${c}" style="width:${v / m * 100}%"></i></div><div class="mono">${v.toFixed(2)} ms</div></div>`;
    return `<p class="small dim">When a client disconnects mid-request, does the server keep working for nobody? Twenty runs per variant, telemetry disabled in both, Node ${ev.cancellation.node}.</p>
      <div class="go-cmp"><div class="small dim">Work done after the client left</div>${row('Before the fix', b, b, 'bad')}${row('After the fix', a, b, 'ok')}
      <div class="small dim" style="margin-top:14px">Normal requests (no disconnect), mean processing</div>${row('Before', g('before', false).meanProcessingMs, 45, 'n')}${row('After', g('after', false).meanProcessingMs, 45, 'n')}</div>
      <p class="go-call">Abandoned work fell from <b>${b.toFixed(2)} ms</b> to <b>${a.toFixed(2)} ms</b> on average, while normal requests stayed at about 41 ms. A targeted change, measured before and after, with the downside checked too.</p>`;
  },
};
function show(t) {
  document.querySelectorAll('#go-tabs button').forEach(b => b.setAttribute('aria-selected', b.dataset.t === t));
  $('go-body').innerHTML = views[t]();
}
$('go-tabs').addEventListener('click', e => { const b = e.target.closest('button'); if (b) show(b.dataset.t); });
show('trace');
