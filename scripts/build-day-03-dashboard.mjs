import { writeFileSync } from 'node:fs';
const ds = { type: 'tempo', uid: 'grafanacloud-traces' };
const scope = 'resource.service.name = "document-lab" && resource.deployment.environment.name = "lab" && kind = server && span.http.response.status_code >= 100';
const select = (extra = '') => `{ ${scope}${extra ? ` && ${extra}` : ''} }`;
const count = extra => `(${select(extra)} | count_over_time())`;
const total = count();
const queries = {
  total: `${select()} | count_over_time()`,
  errors: `(${total} - ${count('span.http.response.status_code < 400')}) / ${total}`,
  serverErrors: `${total} - ${count('span.http.response.status_code < 500')}`,
  p95: `${select()} | quantile_over_time(duration, .95)`,
  traffic: `${select()} | rate() by (span.http.response.status_code)`,
  latency: `${select()} | quantile_over_time(duration, .5, .95) > 0`,
};
const target = (query, instant = false) => ({ refId: 'A', datasource: ds, queryType: 'traceql', query,
  metricsQueryType: instant ? 'instant' : 'range', step: '30s', tableType: 'traces' });
const panels = [{ id: 1, type: 'text', title: 'Document Lab · API-overzicht', gridPos: { x: 0, y: 0, w: 24, h: 4 },
  options: { mode: 'markdown', content: '**Verkeer · fouten · responstijden** — document-lab / lab\n\nGebaseerd op ontvangen aanvraagtraces; healthchecks tellen niet mee. **4xx** = afgewezen aanvraag, **5xx** = serverfout. Geen traces betekent geen inzicht in API-verkeer. [Bereikbaarheidsdashboard](/d/document-lab-day-1) · Nieuwe demo: `npm run demo:traffic`' } }];
function stat(id, title, key, unit, x, description, color) {
  panels.push({ id, type: 'stat', title, description, datasource: ds, gridPos: { x, y: 4, w: 6, h: 5 },
    targets: [target(queries[key], true)],
    fieldConfig: { defaults: { unit, decimals: unit === 'short' ? 0 : 1, noValue: 'Geen meting', min: 0,
      color: { mode: 'fixed', fixedColor: color } }, overrides: [] },
    options: { reduceOptions: { calcs: ['lastNotNull'], fields: '', values: false }, colorMode: 'value', graphMode: 'none' } });
}
stat(2, 'Gemeten aanvragen', 'total', 'short', 0, 'Totaal ontvangen SERVER-spans met een HTTP-response in het gekozen tijdvenster. Geen healthchecks; geen schatting van verloren of niet-gesamplede traces.', 'blue');
stat(3, 'HTTP-fouten · 4xx + 5xx', 'errors', 'percentunit', 6, 'Aandeel antwoorden met HTTP-status >= 400 over het hele gekozen tijdvenster. Inclusief bewust ongeldige demo-invoer. Zonder aanvragen is dit ongedefinieerd.', 'orange');
stat(4, 'Serverfouten · 5xx', 'serverErrors', 'short', 12, 'Aantal HTTP 5xx-antwoorden in het gekozen tijdvenster. Verbindingsafbrekingen zonder HTTP-response tellen niet mee.', 'purple');
stat(5, 'Responstijd · p95', 'p95', 's', 18, 'Geschatte grens waaronder 95% van de gemeten aanvragen valt, over het hele gekozen tijdvenster. Bij weinig aanvragen geen prestatienulmeting.', 'green');
function chart(id, title, key, x, unit, description) {
 panels.push({ id, type: 'timeseries', title, description, datasource: ds, gridPos: { x, y: 9, w: 12, h: 9 }, targets: [target(queries[key])],
 fieldConfig: { defaults: { unit, min: 0, custom: { drawStyle: 'line', lineWidth: 2, fillOpacity: 10, spanNulls: false, showPoints: 'always', pointSize: 4 } }, overrides: [] },
 options: { legend: { displayMode: 'list', placement: 'bottom' }, tooltip: { mode: 'multi' } } });
}
chart(6, 'Aanvragen per seconde · per HTTP-status', 'traffic', 0, 'reqps', 'Aantal ontvangen aanvragen per seconde, in intervallen van 30 seconden, uitgesplitst per HTTP-status. Geen gegevens is geen bewijs van bereikbaarheid.');
chart(7, 'Responstijd · p50 en p95', 'latency', 12, 's', 'Geschatte mediaan en p95 per interval van 30 seconden. Lege intervallen worden niet verbonden.');
panels.find(p => p.id === 7).fieldConfig.overrides = ['0.5', '0.95'].map((name, i) => ({ matcher: { id: 'byName', options: name }, properties: [{ id: 'displayName', value: i ? 'p95' : 'p50' }] }));
const day1 = JSON.parse((await import('node:fs')).readFileSync('dashboards/day-01.json'));
const health = structuredClone(day1.spec.panels.find(p => p.id === 2));
health.id = 8; health.gridPos = { x: 0, y: 18, w: 6, h: 5 }; health.title = 'Bereikbaarheid · laatste probe'; panels.push(health);
panels.push({id:9,type:'text',title:'Zo lees je dit dashboard',gridPos:{x:6,y:18,w:18,h:5},options:{mode:'markdown',content:'**p50** is de mediaan; **p95** is de geschatte bovengrens voor 95% van de aanvragen. De bovenste kaarten gebruiken het hele gekozen tijdvenster.\n\n`npm run demo:traffic` doet 40 echte HTTP-aanvragen: 32 geldig en 8 bewust ongeldig (20% HTTP 400). Dit is een demonstratie, geen belastingtest. Grafana kan de traces met vertraging tonen. Sampling, exportverlies of een gestopte API beperken de volledigheid.'}});
writeFileSync('dashboards/day-03.json', JSON.stringify({ apiVersion:'dashboard.grafana.app/v1beta1',kind:'Dashboard',metadata:{name:'document-lab-day-3',annotations:{'grafana.app/folder':'grafana-observability-lab'}},spec:{title:'Document Lab · API-overzicht',tags:['observability-lab','day-3'],timezone:'browser',schemaVersion:39,refresh:'1m',time:{from:'now-1h',to:'now'},templating:{list:[]},panels}},null,2)+'\n');
writeFileSync('dashboards/day-03-queries.json',JSON.stringify(queries,null,2)+'\n');
