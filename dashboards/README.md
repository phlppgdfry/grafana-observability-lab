# Dashboards

`day-01.json` bevat het live dashboard **Document Lab · Bereikbaarheid** in map **Grafana Observability Lab**.

Open https://bronzemillipede944.grafana.net/d/document-lab-day-1.

Databron: `grafanacloud-prom`. Panels gebruiken geverifieerde healthcheckmetrics; geen gesimuleerde dashboardwaarden. Dag 3 breidt dit uit met applicatieverkeer en fouten.

Bij updates: lees de live dashboardversie met gcx terug en voeg de actuele `metadata.resourceVersion` aan een lokale kopie van het manifest toe vóór `gcx dashboards update`.
