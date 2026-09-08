# Dashboards

`day-01.json` bevat het live dashboard **Document Lab · Bereikbaarheid** in map **Grafana Observability Lab**.

Open https://bronzemillipede944.grafana.net/d/document-lab-day-1.

Databron: `grafanacloud-prom`. Panels gebruiken geverifieerde healthcheckmetrics; geen gesimuleerde dashboardwaarden. Dag 3 staat in een afzonderlijk API-dashboard.

Bij updates: lees de live dashboardversie met gcx terug en voeg de actuele `metadata.resourceVersion` aan een lokale kopie van het manifest toe vóór `gcx dashboards update`.


`day-03.json` bevat [Document Lab · API-overzicht](https://bronzemillipede944.grafana.net/d/document-lab-day-3) in dezelfde map. De Tempo-queries staan in `day-03-queries.json`. Generator: `node scripts/build-day-03-dashboard.mjs`. Zie [dag 3](../docs/day-03.md) voor bewijs, definities en beperkingen.

Valideren: `gcx resources validate -p dashboards/day-03.json --context lab`.
Bij create/update moet `--api-version dashboard.grafana.app/v1beta1` expliciet worden meegegeven. Gebruik voor updates de actuele `metadata.resourceVersion` uit `gcx dashboards get document-lab-day-3 --api-version dashboard.grafana.app/v1beta1 --context lab -o json` in een lokale kopie van het manifest.
