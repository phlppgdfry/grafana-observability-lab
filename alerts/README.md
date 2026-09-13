# Labmeldingen — dag 6

Drie Grafana-managed regels staan in `alerts/rules`, in map **Grafana Observability Lab**. Ze evalueren elke minuut.

| Regel | Voorwaarde | Wachttijd |
| --- | --- | --- |
| API/probe onbereikbaar | Probe meldt mislukking, of 5 minuten geen probemetingen | 2 minuten |
| Aanhoudende serverfouten | Minstens 3 HTTP 5xx in de afgelopen 5 minuten | 2 minuten |
| Trage documentverwerking | p95 > 250 ms; minstens 10 geslaagde documentaanvragen in 5 minuten | 3 minuten |

De drempels zijn bedoeld voor dit lab, niet als productie-SLO. HTTP 400/404 zijn geen serverfouten. Logs zonder aanvragen leveren geen traagheidsalarm; de onafhankelijke probe controleert bereikbaarheid. Een gepauzeerde Docker of slapende Mac kan dus wel een bereikbaarheidswaarschuwing veroorzaken.

## Reageren op een melding

1. Controleer Docker/Mac en `npm run check` bij uitval. Herstart het lab met de drie Compose-bestanden en `up -d --build --wait`.
2. Zoek bij serverfouten in Loki: `{service_name="document-lab",deployment_environment_name="lab"} | severity_text="ERROR"`. Volg de trace-ID.
3. Controleer bij traagheid het dag-3-dashboard en de vier verwerkingsstappen in Tempo. De demo verwerkt normaal in circa 40 ms.
4. Controleer bij `DatasourceError` Grafana en de databron. Dit is geen bewijs dat de API zelf defect is.

## Notificaties

Alle drie de regels zijn rechtstreeks gekoppeld aan `document-lab-email`. Het door de gebruiker opgegeven accountadres is lokaal ingesteld. Grafana heeft de testverzending succesvol uitgevoerd; bevestiging van ontvangst in de inbox staat nog open. Bewaar contactpuntconfiguratie met persoonsgegevens uitsluitend in `.local/`, niet in Git. Pas na een geslaagde verzending én ontvangstcontrole geldt dag 6 als volledig voltooid.

Een specifiek labcontactpunt kan per regel worden gekoppeld met `notificationSettings` (`SimplifiedRouting`). Dat voorkomt wijzigingen aan de algemene notificatieroutering. Generator na configuratie:

```sh
LAB_ALERT_RECEIVER=document-lab-email node scripts/build-day-06-alerts.mjs
gcx resources push -p alerts/rules --context lab
```

Zonder `LAB_ALERT_RECEIVER` gebruikt de generator standaard `document-lab-email`, zodat opnieuw genereren de directe ontvanger behoudt. De gewenste standaard is 30 seconden groeperingswachttijd en maximaal één herhaling per 24 uur per aanhoudende melding; herstelmeldingen blijven mogelijk.

## Valideren en toepassen

```sh
node scripts/build-day-06-alerts.mjs
gcx resources validate -p alerts/rules --context lab
gcx resources push -p alerts/rules --context lab
gcx alert rules list --context lab -o json
```

Deze Grafana-resource ondersteunt geen server-side dry-run. `validate` controleert daarom alleen leesbaarheid en het beschikbare resourcetype; daadwerkelijke opslag en live evaluatie moeten apart worden gecontroleerd.

## Begrensde foutscenario's

`tests/alert-scenarios.mjs` start een aparte API op een vrije lokale poort, maakt 12 trage succesvolle aanvragen en 3 gecontroleerde HTTP 500-aanvragen, sluit de API af en flusht de telemetrie. Het vereist expliciet `RUN_LIVE_ALERT_TEST=true`, plus de bestaande OTLP-omgeving en lokale tokenfile. De fouten staan niet als publieke testendpoint in de normale API.

Deze test schrijft echte lablogs en traces en kan waarschuwingen versturen zodra een ontvanger is aangesloten. Gebruik hem dus bewust. Een uitvaltest vereist afzonderlijk kort stoppen en altijd weer starten van alleen de app-container; de probe moet blijven draaien.

Bron: [Grafana alerting provisioning](https://grafana.com/docs/grafana/latest/alerting/set-up/provision-alerting-resources/file-provisioning/).
