# Dag 8 — k6-nulmeting

Datum: 14 september 2026.

## Resultaat

De definitieve run van 01:17:55–01:19:10 UTC is geslaagd (k6 exitcode 0). De meetfase begon om 01:18:10 UTC.

| Meting | Resultaat |
| --- | --- |
| Aanvragen in meetfase | 300: 270 geldig, 30 verwacht afgewezen |
| Gemiddelde / p95 / p99 geldige aanvragen | 48,72 / 56,60 / 62,20 ms |
| Maximum geldige aanvragen | 73,07 ms |
| Onverwachte HTTP-fouten | 0 |
| Overgeslagen iteraties | 0 |
| Antwoordcontroles inclusief opwarming | 1.750 geslaagd, 0 mislukt |

Zie het [ruwe k6-rapport](evidence/day-08-baseline.json). De `rate` in de JSON-counter gebruikt de totale testduur inclusief opwarming en pauze; voor het aanbod in de meetfase geldt 300 / 60 = 5 aanvragen/s.

Trace `a359bdf27d0e6ad82ff945e3591e8817` is uit Tempo teruggelezen met één HTTP SERVER-span en vier interne stappen. De bijbehorende Loki-log heeft dezelfde trace-ID, HTTP 200 en serverduur 49,141 ms. Zie [correlatiebewijs](evidence/day-08-correlation.json). Grafana moest eerst via de browser laden nadat de CLI HTTP 503 teruggaf; daarna werkten beide queries.

Een eerste run faalde terecht op de exacte aantallen: k6 startte op de tijdgrens één extra aanvraag (301 in plaats van 300). Het script begrenst nu ook expliciet het aantal HTTP-aanvragen per scenario; daarna is de hele meting opnieuw uitgevoerd. De aanvankelijke grensoverschrijding is geen serverfout.

## Doel en profiel

Dag 7 controleert of de API correct werkt. Dag 8 controleert datzelfde gedrag terwijl meerdere aanvragen binnenkomen, en legt de responstijd vast voor latere vergelijkingen.

De [k6-test](../tests/baseline.k6.js) draait lokaal tegen Docker op `127.0.0.1:4310`. Eerst 10 seconden opwarmen met 5 aanvragen/s, daarna 5 seconden ruimte om die aanvragen af te maken, vervolgens 60 seconden meten met 5 aanvragen/s. Iedere tiende aanvraag mist de documentnaam: 270 geldige aanvragen en 30 verwachte HTTP 400-antwoorden in de meetfase. Dit is een gekozen labprofiel voor de huidige documentflow, geen uit productie afgeleide verkeersverdeling.

De [constant-arrival-rate executor](https://grafana.com/docs/k6/latest/using-k6/scenarios/executors/constant-arrival-rate/) plant aanvragen onafhankelijk van de antwoordtijd. Per scenario staan 5 virtuele gebruikers klaar, maximaal 10. Beide scenario's lopen na elkaar. Aanvragen hebben een timeout van 5 seconden; de test stopt vanzelf. Er draait geen permanente verkeersgenerator en er worden geen echte documenten opgeslagen.

## Herhalen

Vereist: k6 (deze meting gebruikt 2.2.0), Docker en de bestaande lokale Grafana-credentials.

```sh
brew install k6
docker compose -f docker-compose.yml -f docker-compose.monitoring.yml -f docker-compose.telemetry.yml up -d --build --wait
npm run perf:baseline
```

Het [JSON-eindrapport](https://grafana.com/docs/k6/latest/results-output/end-of-test/custom-summary/) wordt opgeslagen in `test-results/baseline.json` (buiten Git). Een volgende run overschrijft dat bestand. De vastgelegde nulmeting staat apart in `docs/evidence/day-08-baseline.json`. k6 draait lokaal; de API stuurt via de bestaande OpenTelemetry-configuratie wel logs en traces naar Grafana.

## Wat wordt beoordeeld?

- Alle antwoorden: verwachte status, JSON, request-ID, trace-ID en correcte response-inhoud.
- Geen onverwachte HTTP-fouten; een verwachte 400 is geen testfout.
- Geen overgeslagen iteraties (`dropped_iterations`) en precies 300 aanvragen in de meetfase met de afgesproken verdeling.
- p95 van **geldige aanvragen in de meetfase** onder 250 ms. Dit is een labgrens, geen afgesproken productie-SLO. Opwarmverkeer en snelle 400-antwoorden verlagen deze p95 niet.

Een mislukte check of drempel geeft een niet-nul exitcode. Deze belastingtest draait handmatig: GitHub Actions blijft de functionele tests en de gebruikersflow van dag 7 uitvoeren zonder Cloud-credentials.

## Meetomstandigheden en grenzen

De API-code komt uit commit `3d3957f0edb926fd9a40fd54d8ad332c7f4a3248`, Node.js 24.21.0 in Docker, met logs en traces ingeschakeld en standaard 100% root-sampling. Docker meldt 10 CPUs en 8.321.712.128 bytes geheugen; er is geen afzonderlijke CPU- of geheugenlimiet op de API. De Mac rapporteert arm64; de via Homebrew geïnstalleerde k6-binary is darwin/amd64. Generator en API delen dezelfde computer. Andere activiteit en Docker-/architectuuroverhead kunnen de uitkomst beïnvloeden.

De verwerking simuleert ongeveer 40 ms wachttijd. De test meet geen bestandsoverdracht, OCR, database of opslag. De k6 HTTP-duur betreft verzenden, wachten en ontvangen; een interne Grafana-span meet een ander deel van dezelfde aanvraag. Vergelijk die waarden niet alsof ze identiek moeten zijn.

Voor dag 9 houden we payloadmix, omgeving en telemetrie gelijk en verhogen we gecontroleerd het aanbod. Deze nulmeting op 5 aanvragen/s bewijst nog geen maximale capaciteit.
