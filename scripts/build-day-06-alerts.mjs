import { mkdirSync, writeFileSync } from 'node:fs';
const logs = '{service_name="document-lab",deployment_environment_name="lab"}';
const probe = 'probe_success{job="document-lab-health",probe="document-lab-local"}';
const definitions = [
  ['availability', 'Document Lab · API of probe onbereikbaar', 'grafanacloud-prom', `(1 - max(${probe})) or max(absent_over_time(${probe}[5m]))`, 0, '2m', 'Uitval gedurende 2 minuten, of minstens 5 minuten geen probemetingen plus 2 minuten wachttijd. Controleer Docker, Mac-slaapstand en API.'],
  ['server-errors', 'Document Lab · Aanhoudende serverfouten', 'grafanacloud-logs', `sum(count_over_time(${logs} | http_response_status_code >= 500 [5m])) or vector(0)`, 2, '2m', 'Minstens 3 HTTP 5xx-antwoorden in 5 minuten, gedurende 2 minuten. Zoek ERROR-logs en bijbehorende traces. HTTP 4xx telt niet mee.'],
  ['latency', 'Document Lab · Trage documentverwerking', 'grafanacloud-logs', `(quantile_over_time(0.95, ${logs} | http_route="/api/documents/process" | http_response_status_code="200" | unwrap request_duration_ms | __error__="" [5m]) by ()) and (sum(count_over_time(${logs} | http_route="/api/documents/process" | http_response_status_code="200" [5m])) >= 10)`, 250, '3m', 'p95 boven 250 ms gedurende 3 minuten, met minstens 10 geslaagde verwerkingen in 5 minuten. Labdrempel; nog geen productie-SLO.'],
];
mkdirSync('alerts/rules', { recursive: true });
for (const [key,title,ds,expr,threshold,pending,description] of definitions) {
 const model = { refId:'A', expr, instant:true, range:false, queryType:'instant', intervalMs:1000,maxDataPoints:43200 };
 const spec = { title, trigger:{interval:'1m'}, for:pending, noDataState: key==='availability'?'NoData':'Ok', execErrState:'Error', paused:false,
  labels:{project:'document-lab',environment:'lab',severity:'warning'},
  annotations:{summary:title,description,runbook_url:'https://github.com/phlppgdfry/grafana-observability-lab/blob/main/alerts/README.md'},
  expressions:{
   A:{datasourceUID:ds,relativeTimeRange:{from:'10m',to:'0s'},model},
   B:{datasourceUID:'__expr__',source:true,model:{refId:'B',type:'threshold',expression:'A',conditions:[{type:'query',query:{params:['A']},reducer:{type:'last',params:[]},evaluator:{type:'gt',params:[threshold]},operator:{type:'and'}}]}},
 }};
 spec.notificationSettings={type:'SimplifiedRouting',receiver:process.env.LAB_ALERT_RECEIVER || 'document-lab-email',groupBy:['alertname','grafana_folder'],groupWait:'30s',groupInterval:'5m',repeatInterval:'24h'};
 writeFileSync(`alerts/rules/${key}.json`,JSON.stringify({apiVersion:'rules.alerting.grafana.app/v0alpha1',kind:'AlertRule',metadata:{name:`document-lab-${key}`,annotations:{'grafana.app/folder':'grafana-observability-lab'}},spec},null,2)+'\n');
}
