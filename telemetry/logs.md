# Applicatielogs — dag 4

Iedere niet-health-aanvraag levert één gestructureerde JSON-log op stdout en, indien geconfigureerd, één OTLP-log in Grafana Loki. De bestaande Docker-overlay activeert beide signalen:

```sh
docker compose -f docker-compose.yml -f docker-compose.monitoring.yml -f docker-compose.telemetry.yml up -d --build --wait
npm run check:traces
```

Voor lokaal starten zonder Docker: voeg `OTEL_EXPORTER_OTLP_LOGS_ENDPOINT` uit `.env.example` toe aan `.env` en gebruik `node --env-file=.env app/server.mjs`. Zonder logendpoint blijven de lokale JSON-logs beschikbaar, maar vindt geen Cloud-logexport plaats. `OTEL_SDK_DISABLED=true` stopt beide Cloud-exporters; lokale logging blijft actief.

De exporter gebruikt de bestaande `.local/cloud-token` via een read-only Docker-secret, met `logs:write`. De resource bevat service, versie uit `package.json` en omgeving. Traces en logs gebruiken dezelfde resourceconfiguratie en authenticatiehelper. Bij SIGTERM/SIGINT worden beide buffers parallel geflusht binnen de bestaande afsluitlimiet.

## Logvelden

| Veld | Betekenis |
| --- | --- |
| service.name | `document-lab` |
| service.version | Versie uit `package.json`, momenteel `0.1.0` |
| deployment.environment.name | `lab` |
| request.id | Zelfde ID als responseheader `x-request-id` |
| request.outcome | Vaste reden: completed, invalid_name, invalid_json, payload_too_large, route_not_found, internal_error of client_disconnect |
| http.request.method / http.route | Methode en bekende route; onbekende paden worden weggelaten |
| http.response.status_code | HTTP-status indien de response is afgerond |
| request.duration_ms | Totale aanvraagtijd in milliseconden |
| trace_id / span_id | Koppeling met de span, indien tracing actief is |

INFO = succesvol antwoord; WARN = HTTP 4xx; ERROR = HTTP 5xx of verbroken verbinding. Een geldige afwijzing is dus geen servercrash. Geen bodies, documentnamen, querystrings, willekeurige paden, headers of ruwe exceptionteksten. `/health` produceert geen aanvraaglogs.

Loki normaliseert punten in OTLP-attribuutnamen naar underscores. Trace- en request-ID's blijven metadata, geen zelf ingestelde indexlabels. OTLP bewaart de tracecontext in het logrecord; stdout heeft expliciete `trace_id` en `span_id`-velden.

De buffers staan in geheugen. Exportuitval of abrupt stoppen kan logs verliezen. Logfouten worden generiek gemeld zonder de credential of het exporterobject te printen. Er is geen duurzame lokale wachtrij; sampling en retentie worden op dag 13 afgesteld.

Bron: [OpenTelemetry Logs SDK](https://opentelemetry.io/docs/specs/otel/logs/sdk/).
