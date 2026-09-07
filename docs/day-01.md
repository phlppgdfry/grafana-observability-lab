# Dag 1 — Verbinden

Gestart: 7 september 2026.

## Geverifieerd

- `gcx 1.2.0` geïnstalleerd via Homebrew.
- Privé-repo: https://github.com/phlppgdfry/grafana-observability-lab
- GitHub Actions geslaagd: https://github.com/phlppgdfry/grafana-observability-lab/actions/runs/34117584309
- Grafana OAuth-context `lab` opgeslagen; `gcx config check --context lab` bevestigt geldige configuratie en online verbinding.
- Databronnen voor metrics, logs en traces gevonden. Prometheus en Loki als CLI-default ingesteld.
- Zelfstandige Node.js-demo, geen afhankelijkheid van DocuRelay of YardExx.
- `npm test`: geslaagd (health, verwerking, ongeldige JSON, ontbrekende naam, te grote payload, onbekende route).
- `npm run check`: geslaagd op 2026-09-07 om 11:36 UTC; HTTP-healthcheck inclusief inhoudscontrole, 97 ms in deze ene meting.
- `docker compose config --quiet`: geslaagd. Containerbuild/runtime nog niet getest.

## Nog te verifiëren

- Exacte trial-einddatum in Grafana Cloud-account/billing. Niet afgeleid uit de welkomstmail of startdatum van dit lab.
- Een blijvende Cloud Synthetic Monitoring-check; lokale app is niet publiek bereikbaar. `probes list` meldt ontbrekende Cloud/SM-authenticatie. Aanvullende Cloud OAuth-aanmelding gestart; vereist browsergoedkeuring en mogelijk een CAP-token als OAuth niet door de product-API wordt ondersteund.

De browserautomatisering kon niet starten (native pipe startup failed), waardoor de billingpagina niet rechtstreeks kon worden gecontroleerd.

## Wat deze check bewijst

De API draait en geeft binnen vijf seconden een correcte health-response. De check bewijst nog geen Cloud-ingestie, end-to-end documentopslag of continue beschikbaarheid. Dag 2 voegt OpenTelemetry toe.
