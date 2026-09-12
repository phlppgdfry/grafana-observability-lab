# Dag 5 — Voltooid

Datum: 12 september 2026.

## Resultaat

De documentaanvraag heeft nu vier INTERNAL-spans onder één HTTP SERVER-span. [Open de succesvolle trace in Grafana](https://bronzemillipede944.grafana.net/explore?schemaVersion=1&panes=%7B%22trace%22%3A%7B%22datasource%22%3A%22grafanacloud-traces%22%2C%22queries%22%3A%5B%7B%22refId%22%3A%22A%22%2C%22queryType%22%3A%22traceql%22%2C%22query%22%3A%22916ddda60b2d31a4a3485649b7cfba3e%22%2C%22datasource%22%3A%7B%22type%22%3A%22tempo%22%2C%22uid%22%3A%22grafanacloud-traces%22%7D%7D%5D%2C%22range%22%3A%7B%22from%22%3A%222026-09-12T03%3A40%3A00Z%22%2C%22to%22%3A%222026-09-12T03%3A50%3A00Z%22%7D%7D%7D). Het vaste tijdvenster blijft bruikbaar binnen de Cloud-retentie; JSON-bewijs staat hieronder.

| Stap | Gemeten duur in de succesvolle trace |
| --- | --- |
| Volledige HTTP-aanvraag | 57,960 ms |
| document.read_body | 4,814 ms |
| document.parse_json | 0,075 ms |
| document.validate | 0,047 ms |
| document.process | 41,874 ms |

Het verschil tussen de totale duur en de som van de stappen omvat onder andere overige aanvraagafhandeling en instrumentatie. Dit is één functionele meting, geen prestatiebenchmark. De verwerking blijft een simulatie van circa 40 ms, expliciet gemarkeerd met `document.processing.mode=simulation`. Er is geen database of externe dependency toegevoegd.

## Aanpassingen

- Documentflow uit `server.mjs` gehaald naar `app/documents.mjs`, zodat HTTP-afhandeling en verwerkingsstappen afzonderlijk leesbaar zijn.
- Alle deelspans delen de trace-ID van de aanvraag en hebben de HTTP-span als ouder. Gestarte spans eindigen via `finally`, ook bij fouten.
- Verwachte invoerfouten gebruiken een `InputError` met vaste status en reden. Bij ontbrekende naam volgt geen verwerking; bij ongeldige JSON stopt de flow al na het ontleden.
- Een onverwachte fout wordt voortaan correct HTTP 500 met een ERROR-span en het bestaande ERROR-requestlog. De oude brede catch kon zo'n fout ten onrechte als ongeldige JSON (400) classificeren.
- De body wordt als bytes begrensd en na samenvoegen als UTF-8 gedecodeerd.
- Geen documentnamen, bodies, credentials of ruwe exceptionteksten in spans. De trace werkt optioneel: zonder ingeschakelde tracing blijft de API functioneel.
- Het dag-3-dashboard selecteert al `kind = server`, dus interne stappen verhogen het aantal gemeten aanvragen niet.

## Verificatie

Vijf lokale tests geslaagd: basisflow, privacy/logging, foutniveau, tracecontext/parentrelaties en onverwachte verwerkingsfout. In de geïsoleerde fouttest is HTTP 500, afsluiting van alle vijf spans en een gekoppeld ERROR-log bewezen. Er is geen foutinjectieroute aan de live API toegevoegd.

Echte aanvragen rond **05:41 CEST (03:41 UTC)** teruggelezen uit Grafana:

- [Succes: vijf spans](evidence/day-05-success.json), trace `916ddda60b2d31a4a3485649b7cfba3e`.
- [Ontbrekende naam: vier spans](evidence/day-05-invalid-name.json), zonder verwerkingsspan.
- [Ongeldige JSON: drie spans](evidence/day-05-invalid-json.json), zonder validatie/verwerking.
- [API-responses](evidence/day-05-requests.jsonl) en [Tempo-zoekresultaten](evidence/day-05-search.json).
- [Loki-log](evidence/day-05-log.json): trace-ID en span-ID komen overeen met de HTTP SERVER-span, niet met een willekeurige interne stap.

Teruglezen zonder tijdvenster gaf HTTP 503; met `--since 30m` konden de volledige traces worden opgehaald. Grafana- en Tempo-healthcheck waren in orde.

## Lokale uitvoering en herstarten

Docker Desktop was handmatig gepauzeerd. Die pauze is behouden. Voor de live verificatie is de API tijdelijk rechtstreeks met Node.js op poort **4311** gestart, met dezelfde lokale credentials en OTLP-endpoints. De tijdelijke instantie is na verificatie gestopt. De Docker-image is in deze sessie niet opnieuw gebouwd; na hervatten moet de nieuwe versie nog worden gebouwd:

```sh
docker compose -f docker-compose.yml -f docker-compose.monitoring.yml -f docker-compose.telemetry.yml up -d --build --wait
npm run check:traces
gcx traces get <trace-id> -d grafanacloud-traces --context lab --since 30m -o json
```

Dag 6 voegt meldingen toe. Dag 4 leverde de gebeurtenissen en foutredenen; dag 5 laat zien in welke verwerkingsstap de tijd of fout zit.
