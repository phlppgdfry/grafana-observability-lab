# Dag 2 — Voltooid

Datum: 8 september 2026. Bestaande lokale Grafana-credentials hergebruikt.

## Live resultaat

Echte HTTP-aanvragen naar de draaiende Docker-API zijn als OpenTelemetry SERVER-spans teruggelezen uit Grafana Cloud Tempo. Service: `document-lab`, omgeving: `lab`, release: `0.1.0`.

[Open de verificatieaanvragen in Grafana Explore](https://bronzemillipede944.grafana.net/explore?schemaVersion=1&panes=%7B%22lab%22%3A%7B%22datasource%22%3A%22grafanacloud-traces%22%2C%22queries%22%3A%5B%7B%22refId%22%3A%22A%22%2C%22queryType%22%3A%22traceql%22%2C%22query%22%3A%22%7B+resource.service.name+%3D+%5C%22document-lab%5C%22+%7D%22%2C%22datasource%22%3A%7B%22type%22%3A%22tempo%22%2C%22uid%22%3A%22grafanacloud-traces%22%7D%7D%5D%2C%22range%22%3A%7B%22from%22%3A%222026-09-08T01%3A20%3A00Z%22%2C%22to%22%3A%222026-09-08T01%3A30%3A00Z%22%7D%7D%7D). Dit vaste tijdvenster bevat het bewijs; kies voor nieuwe aanvragen het afgelopen uur. Cloud-traces blijven beschikbaar binnen de retentie van de stack; de JSON-bewijzen hieronder blijven lokaal bewaard.

| Aanvraag | HTTP | Trace-ID uit API-response |
| --- | --- | --- |
| Geldige verwerking | 200 | `0db35182ede5a4b3866354cc5ae0c262` |
| Ontbrekende documentnaam | 400 | `91d9664646d651ad58bd011f50ff449d` |
| Ongeldige JSON | 400 | `4242ca26b33257ce5a8867571f09ebed` |
| Onbekende route | 404 | `50b46b8ecbd12b660826cf26217115c5` |

Verificatie rond **03:22 CEST (01:22 UTC)**. De succesvolle aanvraag duurde 48,6 ms, inclusief circa 40 ms gesimuleerde documentverwerking. Dit is een functionele controle, geen prestatienulmeting.

## Bewijs

- [Tempo-zoekresultaat met alle vier aanvragen](evidence/day-02-traces.json).
- [Volledige succesvolle trace](evidence/day-02-success.json), inclusief HTTP 200, route, service en omgeving.
- [Volledige afgewezen aanvraag](evidence/day-02-invalid-request.json), inclusief HTTP 400.
- De zoek-API laat de voorloopnul van de eerste trace-ID weg; de volledige trace bevestigt dezelfde 16-byte identifier.
- `npm test`: functionele API-tests en telemetrietest geslaagd; controle op tracecontext, duur, statuscodes, healthfilter en afwezigheid van gevoelige invoer.
- Docker-build geslaagd; API gezond. Lokale bereikbaarheidscheck geslaagd.
- Bestaande Cloud-healthcheck `12093`: **OK, 100%**, circa 9 ms in het gecontroleerde venster.

## Implementatie en herhalen

Zie [telemetrie-instructies](../telemetry/README.md). De optionele Compose-overlay activeert OTLP/HTTP-export. Credentials worden als lokaal Docker-secret gemount en niet in Git of de image opgenomen. Dependencies staan vast in `package-lock.json`; Docker en CI gebruiken `npm ci`.

`npm run check:traces` produceert nieuwe aanvragen en trace-ID's. Zoek die daarna terug in Grafana. Healthprobes krijgen geen spans; documentnamen, bodies, querystrings en credentials worden niet geëxporteerd.

Dag 3 voegt een overzicht van verkeer, fouten en responstijden toe. Logexport en interne verwerkingsspans volgen op dag 4 en 5. De huidige exporter heeft een geheugenbuffer en vereist een actieve Mac, Docker en netwerkverbinding.
