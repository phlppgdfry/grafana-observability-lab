# Dag 4 — Voltooid

Datum: 11 september 2026. Bestaande lokale credentials hergebruikt.

## Live resultaat

Applicatielogs worden via OpenTelemetry/HTTP protobuf naar Grafana Cloud Loki gestuurd. Iedere niet-health-aanvraag levert één log op met service `document-lab`, omgeving `lab`, release uit `package.json` (`0.1.0`), statuscode, vaste uitkomst, duur, request-ID en tracecontext.

[Open de geverifieerde waarschuwingen in Grafana Explore](https://bronzemillipede944.grafana.net/explore?schemaVersion=1&panes=%7B%22logs%22%3A%7B%22datasource%22%3A%22grafanacloud-logs%22%2C%22queries%22%3A%5B%7B%22refId%22%3A%22A%22%2C%22expr%22%3A%22%7Bservice_name%3D%5C%22document-lab%5C%22%2C+deployment_environment_name%3D%5C%22lab%5C%22%7D+%7C+service_version%3D%5C%220.1.0%5C%22+%7C+severity_text%3D%5C%22WARN%5C%22%22%2C%22queryType%22%3A%22range%22%2C%22datasource%22%3A%7B%22type%22%3A%22loki%22%2C%22uid%22%3A%22grafanacloud-logs%22%7D%7D%5D%2C%22range%22%3A%7B%22from%22%3A%222026-09-11T04%3A50%3A00Z%22%2C%22to%22%3A%222026-09-11T05%3A00%3A00Z%22%7D%7D%7D). De link gebruikt het vaste bewijsvenster. Kies voor nieuwe aanvragen het afgelopen uur. Cloud-retentie beperkt hoe lang dit bewijs online blijft; de JSON-bestanden blijven in de repo.

## Verificatie

Vier echte HTTP-aanvragen rond **06:53 CEST (04:53 UTC)** zijn uitgevoerd en teruggelezen uit Loki:

| HTTP | Logbericht | Niveau |
| --- | --- | --- |
| 200 | HTTP request completed | INFO |
| 400 | HTTP request invalid_name | WARN |
| 400 | HTTP request invalid_json | WARN |
| 404 | HTTP request route_not_found | WARN |

Alle vier trace-ID's in Loki komen overeen met de API-response. Voor de afgewezen naam is ook de volledige Tempo-trace teruggelezen: `caf28a3775003c5b7c35498729204c40`. De log bevat dezelfde trace-ID en span-ID. Dit bewijst de koppeling tussen aanvraag, log en trace.

Bewijs: [API-responses](evidence/day-04-requests.jsonl), [alle logs](evidence/day-04-logs.json), [filter op omgeving/release/WARN](evidence/day-04-warnings.json), [log op trace-ID](evidence/day-04-correlated-log.json), [bijbehorende trace](evidence/day-04-trace.json).

`npm test`: vier tests geslaagd, waaronder echte HTTP-tests voor logging, privacy, tracecorrelatie en healthuitsluiting. Logmetadata voor 500 en verbroken verbinding is afzonderlijk getest; er is geen echte serverfout in de live demo geïnjecteerd. Docker-build en lokale bereikbaarheidscheck geslaagd. Na de eerste ingestievertraging waren alle logs terugvindbaar.

## Zelf gebruiken

```sh
docker compose -f docker-compose.yml -f docker-compose.monitoring.yml -f docker-compose.telemetry.yml up -d --build --wait
npm run check:traces
```

Kies in Grafana Explore de Loki-databron `grafanacloud-bronzemillipede944-logs`. Alle aanvraaglogs:

```logql
{service_name="document-lab", deployment_environment_name="lab"}
```

Waarschuwingen van deze release:

```logql
{service_name="document-lab", deployment_environment_name="lab"} | service_version="0.1.0" | severity_text="WARN"
```

Eén aanvraag onderzoeken:

```logql
{service_name="document-lab"} | trace_id="caf28a3775003c5b7c35498729204c40"
```

Deze metadatafilters hebben geen `| json` nodig: Loki ontvangt de velden als OTLP structured metadata. De lokale stdout-logs zijn wel JSON.

Zie [logconfiguratie en velddefinities](../telemetry/logs.md). Geen documentnamen, bodies, querystrings, onbekende URL-paden, headers of exceptionteksten in de aanvraaglogs. Healthchecks blijven uitgesloten. INFO, WARN en ERROR hebben verschillende betekenissen; afgewezen invoer is geen servercrash.

## Grenzen en volgende stap

Versie `0.1.0` is de pakketversie, geen Git-commit-ID. Log- en tracebuffers staan in geheugen: abrupt stoppen of langdurige netwerkuitval kan metingen verliezen. Zonder actieve Docker/Mac draait de API niet. De eerste zoekopdracht kan leeg zijn terwijl ingestie nog bezig is.

Dag 5 breidt de trace uit met stappen binnen de verwerking; dag 4 voegt nog geen meldingen of permanente verkeersgenerator toe.
