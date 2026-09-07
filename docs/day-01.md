# Dag 1 — Voltooid

Datum: 7 september 2026. Trial eindigt **21 september 2026**, bevestigd via de accountmelding van de gebruiker. Geen betaald plan geactiveerd.

## Live resultaat

- [Dashboard: Document Lab · Bereikbaarheid](https://bronzemillipede944.grafana.net/d/document-lab-day-1), in map **Grafana Observability Lab**.
- Private probe **document-lab-local**, ID **170**, draait naast de demo in Docker.
- Cloud-check **document-lab-health**, ID **12093**, controleert elke 60 seconden `http://document-lab.test:4310/health` en verwacht HTTP 200 binnen 5 seconden.
- Grafana rapporteert **OK**, 100% geslaagde metingen in het korte verificatievenster. Gemeten duur circa 6–7 ms vanuit de lokale probe; dit is geen internetlatentiebenchmark.
- Prometheus bevat echte `probe_success=1`, `probe_http_status_code=200` en `probe_duration_seconds`-metingen voor deze check.
- CLI-stackverbinding en Cloud-authenticatie werken. De CAP-policy vereist `stacks:read`, `metrics:write`, `logs:write` én `traces:write`.

## Verificatie

- Functionele Node-tests geslaagd: health, verwerking, ongeldige JSON, ontbrekende naam, te grote payload en onbekende route.
- Docker-image gebouwd; API-container gezond; lokale bereikbaarheidscheck geslaagd.
- Check teruggelezen uit Grafana en status gecontroleerd via gcx.
- Dashboardmanifest gevalideerd, aangemaakt en gerenderd. Kleurcorrectie: HTTP 200 wordt groen weergegeven.
- Credentials staan uitsluitend lokaal in de uitgesloten `.local/`-map en in de gcx-gebruikersconfiguratie, niet in Git.

## Grenzen

De probe werkt zolang Docker en de Mac actief zijn. Slaapstand of een gestopte probe leidt tot ontbrekende metingen. Er zijn nog geen applicatie-interne OpenTelemetry-traces, applicatielogs of meldingen ingesteld. Dat volgt op de volgende dagen.

De Docker-hostnaam `app` werd door de Cloud-checkvalidatie afgewezen; de lokale DNS-alias `document-lab.test` wordt geaccepteerd en is succesvol gemeten.
