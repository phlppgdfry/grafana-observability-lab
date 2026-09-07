# Dag 1 — Verbinden

Gestart: 7 september 2026.

## Geverifieerd

- `gcx 1.2.0` geïnstalleerd via Homebrew.
- Privé-repo: https://github.com/phlppgdfry/grafana-observability-lab
- GitHub Actions geslaagd: https://github.com/phlppgdfry/grafana-observability-lab/actions/runs/34117584309
- Grafana OAuth-context `lab` opgeslagen; `gcx config check --context lab` bevestigt geldige configuratie en online verbinding.
- Databronnen voor metrics, logs en traces gevonden. Prometheus en Loki als CLI-default ingesteld.
- Aanvullende Cloud OAuth-aanmelding geslaagd. Stack-API bevestigt `status: active`, `plan: free-trial`, aangemaakt op `2026-09-06T22:15:49Z` (7 september 00:15 Belgische tijd). Exacte trial-einddatum wordt niet geretourneerd.
- Zelfstandige Node.js-demo, geen afhankelijkheid van DocuRelay of YardExx.
- `npm test`: geslaagd (health, verwerking, ongeldige JSON, ontbrekende naam, te grote payload, onbekende route).
- `npm run check`: geslaagd op 2026-09-07 om 11:36 UTC; HTTP-healthcheck inclusief inhoudscontrole, 97 ms in deze ene meting.
- `docker compose config --quiet` en `docker compose build app`: geslaagd.
- Docker-runtime geverifieerd: container `healthy`, lokaal bereikbaar op poort 4310. Functionele tests opnieuw geslaagd; healthcheck op 7 september 12:59 UTC geslaagd (87 ms, één meting).
- Private-probe Compose-configuratie gevalideerd zonder secretbestand (`config --no-env-resolution --quiet`). De probe-image is gedownload en op digest vastgezet; activering en Cloud-resultaten wachten nog op de CAP-token.
- Trial-einddatum bevestigd door de gebruiker via de accountmelding: **21 september 2026**. De account schakelt die dag automatisch naar Free tenzij de gebruiker zelf voor Pro kiest. Geen upgrade uitgevoerd.

## Nog te verifiëren

- Een blijvende Cloud Synthetic Monitoring-check; lokale app is niet publiek bereikbaar. Na geslaagde Cloud OAuth-aanmelding faalt `probes list` met `publisher token is invalid` bij SM register/install. Er is een compatibele Cloud Access Policy-token nodig voordat deze product-API gebruikt kan worden.

De browserautomatisering kon niet starten (native pipe startup failed). De einddatum is daarom vastgelegd op basis van de accountmelding die de gebruiker aanleverde. Zie [Cloud-check](cloud-check.md) voor de voorbereide private-probe-opzet en resterende credentialstap.

## Wat deze check bewijst

De API draait en geeft binnen vijf seconden een correcte health-response. De check bewijst nog geen Cloud-ingestie, end-to-end documentopslag of continue beschikbaarheid. Dag 2 voegt OpenTelemetry toe.
