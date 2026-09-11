# OpenTelemetry — dag 2

De API maakt één SERVER-span per HTTP-aanvraag (behalve `/health`). De NodeTracerProvider registreert W3C-contextpropagatie en een BatchSpanProcessor verstuurt OTLP/HTTP protobuf via TLS naar de Grafana Cloud OTLP-gateway. Voor dit lokale lab is geen collector nodig.

## Starten met bestaande credentials

```sh
npm ci
docker compose -f docker-compose.yml -f docker-compose.monitoring.yml -f docker-compose.telemetry.yml up -d --build --wait
npm run check
npm run check:traces
```

De laatste opdracht doet vier echte aanvragen (200, 400, 400, 404) en print hun trace-ID's. De demo verwerkt fictieve invoer; er is geen echte documentopslag. De dag-1-probe blijft actief.

Compose mount `.local/cloud-token` als read-only secret. De API leest die bij opstarten en combineert hem met stack-ID `1820535` voor Basic-authenticatie naar de OTLP-gateway. De token staat niet in de image, repository, commandoregel of Compose-environment. De ingest-token heeft `traces:write` nodig; teruglezen gebruikt de bestaande gcx-login.

Zonder Docker: gebruik de optionele waarden uit `.env.example` in `.env`, stop eerst de container die poort 4310 gebruikt en start met `node --env-file=.env app/server.mjs`. `npm start` laadt `.env` niet automatisch. Zonder trace-endpoint blijft tracing uit.

## Terugzoeken in Grafana

Open Grafana Explore, kies `grafanacloud-bronzemillipede944-traces`, selecteer het afgelopen uur en voer uit:

```traceql
{ resource.service.name = "document-lab" }
```

Voor afgewezen invoer:

```traceql
{ resource.service.name = "document-lab" && span.http.response.status_code = 400 }
```

Of gebruik de CLI, kort na de smokecheck:

```sh
gcx traces query '{ resource.service.name = "document-lab" }' -d grafanacloud-traces --context lab --since 1h
gcx traces get <trace-id-uit-response> -d grafanacloud-traces --context lab -o json
```

Ingestie en de zoekindex kunnen enige vertraging hebben. Een geslaagde API-aanvraag bewijst op zichzelf geen aflevering; controleer de trace in Tempo. Exportfouten geven een generieke melding in `docker compose logs app` zonder credentials.

## Vastgelegde gegevens en grenzen

- Resource: `service.name=document-lab`, `service.version=0.1.0`, `deployment.environment.name=lab`.
- Span: methode, bekende route, HTTP-status en begin-/eindtijd. Onbekende paden krijgen geen route-attribuut.
- `x-trace-id` in de response koppelt de aanvraag aan Grafana. Inkomende W3C `traceparent` wordt overgenomen.
- Geen requestbody, documentnaam, querystring, authorization-header of willekeurig URL-pad in spans.
- HTTP 4xx blijft een afwijzing door de API en krijgt geen SERVER-errorstatus; HTTP 5xx en verbroken verbindingen wel.
- De standaard sampler bewaart alle roottraces en respecteert de samplingkeuze van een bovenliggende trace. Healthchecks worden uitgesloten om continu nutteloos traceverkeer te vermijden.
- Bij SIGTERM/SIGINT sluit de server eerst aanvragen af en flusht daarna de exporter, binnen een afsluitlimiet van 9 seconden.
- De buffer staat in geheugen. Langdurige netwerkuitval of abrupt stoppen kan traces verliezen. Er zijn nog geen afzonderlijke applicatiemetrics of interne verwerkingsspans. Logexport is toegevoegd op dag 4; zie [logging](logs.md).

Bronnen: [OpenTelemetry JS-instrumentatie](https://opentelemetry.io/docs/languages/js/instrumentation/) en [Grafana OTLP-inname](https://grafana.com/docs/grafana-cloud/send-data/otlp/).


Dag 4: [applicatielogs met omgeving, release en tracecontext](logs.md). De Compose-overlay activeert nu ook `OTEL_EXPORTER_OTLP_LOGS_ENDPOINT`.
