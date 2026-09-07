# Dag 1 — Verbinden

Gestart: 7 september 2026.

## Geverifieerd

- `gcx 1.2.0` geïnstalleerd via Homebrew.
- Zelfstandige Node.js-demo, geen afhankelijkheid van DocuRelay of YardExx.
- `npm test`: geslaagd (health, verwerking, ongeldige JSON, ontbrekende naam, te grote payload, onbekende route).
- `npm run check`: geslaagd op 2026-09-07 om 11:36 UTC; HTTP-healthcheck inclusief inhoudscontrole, 97 ms in deze ene meting.
- `docker compose config --quiet`: geslaagd. Containerbuild/runtime nog niet getest.

## Nog te verifiëren

- Grafana OAuth-context opgeslagen en bereikbaarheid van de stack bevestigd.
- Exacte trial-einddatum in Grafana Cloud-account/billing. Niet afgeleid uit de welkomstmail of startdatum van dit lab.
- Een blijvende Cloud Synthetic Monitoring-check; lokale app is niet publiek bereikbaar.

## Wat deze check bewijst

De API draait en geeft binnen vijf seconden een correcte health-response. De check bewijst nog geen Cloud-ingestie, end-to-end documentopslag of continue beschikbaarheid. Dag 2 voegt OpenTelemetry toe.
