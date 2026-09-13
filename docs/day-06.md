# Dag 6 — Voltooid

Test: 12 september 2026. Herstelcontrole: 13 september 2026.

## Uitgevoerd

Docker Desktop herstart vanuit de gepauzeerde toestand. De nieuwste dag-5-image is gebouwd en de API plus private probe zijn weer actief. De lokale healthcheck is geslaagd.

Drie Grafana-managed meldingsregels zijn aangemaakt in **Grafana Observability Lab**:

| Regel | Trigger | Aanhouden |
| --- | --- | --- |
| document-lab-availability | Probe faalt of probedata ontbreekt minstens 5 minuten | 2 minuten |
| document-lab-server-errors | Minstens 3 HTTP 5xx in 5 minuten | 2 minuten |
| document-lab-latency | p95 > 250 ms en minstens 10 geslaagde verwerkingen in 5 minuten | 3 minuten |

De regels evalueren elke minuut. HTTP 4xx telt niet als serverfout; onvoldoende verkeer triggert geen traagheidsalarm. De getallen zijn voorlopige labdrempels en geen productie-SLO. Queryfouten krijgen een aparte Error-status.

Open [Grafana Alerting](https://bronzemillipede944.grafana.net/alerting/list) en filter op `project=document-lab`.

## Test en bewijs

Een begrensde test stopt alleen de normale app-container; de probe blijft actief. Een afzonderlijke tijdelijke API maakt 12 vertraagde succesvolle aanvragen en 3 gecontroleerde HTTP 500-aanvragen. De tijdelijke API sluit daarna af. De normale app wordt in een `finally`-blok hersteld, ook als de test faalt.

Zie [uitgevoerde scenario's](evidence/day-06-scenarios.jsonl) en [evaluatiegeschiedenis](evidence/day-06-evaluation-history.json). Alle drie de regels zijn tijdens de test van normaal via `Pending` naar `Firing` gegaan, met health `ok`. De normale API is daarna automatisch hersteld en gezond bevonden. De regels zijn door de Grafana-server geaccepteerd en evalueren zonder queryfouten. `gcx resources validate` ondersteunt voor dit type geen server-side dry-run; daarom is daadwerkelijke live evaluatie gebruikt als verificatie.

Op 13 september zijn alle drie de regels weer `inactive` met health `ok`; de API-healthcheck slaagt en de app-container is gezond. Zie [herstelstatus](evidence/day-06-restored-state.json).

## E-mailverzending en ontvangst bevestigd

Op 13 september is het door de gebruiker opgegeven e-mailadres als contactpunt `document-lab-email` ingesteld. Het komt overeen met het e-mailadres van de aangemelde Grafana-gebruiker. Alle drie de regels zijn rechtstreeks gekoppeld aan dit contactpunt, zonder de algemene routeringsboom te vervangen.

Een herkenbare testmelding **Document Lab - dag 6 TEST** is verstuurd. Grafana antwoordde `status: success` (1,350 seconde). Zie [verzendresultaat](evidence/day-06-email-test-result.json) en [teruggelezen regelroutering](evidence/day-06-routing.json). Groeperingswachttijd: 30 seconden; herhaling: 24 uur; herstelmeldingen ingeschakeld.

De gebruiker heeft op 13 september bevestigd dat de testmail is ontvangen in de spammap. Daarmee zijn configuratie, regelactivatie, herstel, testverzending en ontvangst gecontroleerd. Dag 6 is volledig afgerond. De mail als geen spam markeren helpt de waarschuwingen terug te vinden; plaatsing in de inbox wordt daarmee niet gegarandeerd. Het e-mailadres is uitsluitend lokaal en in Grafana opgeslagen, niet in de repo.

## Bron en beheer

[Regelbestanden](../alerts/rules), [generator](../scripts/build-day-06-alerts.mjs), [runbook en beheerinstructies](../alerts/README.md). Adressen en eventuele contactpuntsecrets horen alleen in `.local/`, niet in Git.
