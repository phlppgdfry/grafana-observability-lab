# Dag 3 — Voltooid

Datum: 8 september 2026. Dag-1- en dag-2-werk behouden; bestaande credentials gebruikt.

## Live dashboard

[Document Lab · API-overzicht](https://bronzemillipede944.grafana.net/d/document-lab-day-3) in **Grafana Observability Lab**.

Het dashboard toont totaal gemeten aanvragen, percentage HTTP 4xx + 5xx, aantal serverfouten (5xx), p95-responstijd, aanvraagtempo per statuscode en p50/p95 in de tijd. De bestaande private probe geeft apart de bereikbaarheid aan.

De vier bovenste kaarten gebruiken het hele gekozen tijdvenster. Grafieken gebruiken intervallen van 30 seconden. De standaardperiode is één uur; automatisch vernieuwen gebeurt elke minuut.

## Gecontroleerd resultaat

Om circa **18:56 CEST (16:56 UTC)** zijn 40 echte POST-aanvragen naar de lokale API gedaan: 32 geldige en 8 bewust ongeldige aanvragen. Alle verwachte statuscodes en response-trace-ID's zijn tijdens uitvoering gecontroleerd.

| Meting in Grafana | Resultaat |
| --- | --- |
| Ontvangen aanvragen | 40 |
| HTTP-fouten, inclusief afgewezen invoer | 20,0% |
| Serverfouten (5xx) | 0 |
| Geschatte p95-duur | 56,4 ms |
| Bereikbaarheidsprobe | ONLINE |

Dit is een functionele demonstratie, geen belastingtest of representatieve prestatienulmeting. De verwerking is nog gesimuleerd. Er is geen serverfout geïnjecteerd; dat hoort bij de latere experimenten.

Bewijs: [aantal](evidence/day-03-total.json), [foutaandeel](evidence/day-03-errors.json), [serverfouten](evidence/day-03-serverErrors.json), [p95](evidence/day-03-p95.json), [verkeer per statuscode](evidence/day-03-traffic.json) en [dashboardafbeelding](assets/document-lab-day-3.png). De gcx-weergave van een instantwaarde nul kan het veld `value` weglaten; de dashboardweergave bevestigt 0 serverfouten.

## Technische keuzes

- TraceQL metrics berekent de waarden rechtstreeks uit de dag-2-traces in `grafanacloud-traces`. Er is geen extra metric-exporter, collector of dependency toegevoegd.
- Selectie op service `document-lab`, omgeving `lab`, SERVER-spans en een aanwezige HTTP-response. Healthchecks, eventuele latere interne spans en afgebroken verbindingen zonder response tellen niet mee.
- Het foutaandeel is `(alle antwoorden - antwoorden onder 400) / alle antwoorden`; serverfouten zijn `alle antwoorden - antwoorden onder 500`.
- Lege responstijdvakken worden met `> 0` uit de latencyquery gefilterd. Dit is na de eerste screenshot gecorrigeerd: een leeg tijdvak hoort geen 0 ms-responstijd te suggereren.
- p95 is een geschat percentiel van ontvangen spans. Sampling, exportverlies en retentie beperken de volledigheid. Een ontbrekende of lege aanvraagmeting bewijst niet dat de API gezond is; gebruik daarvoor de aparte healthprobe.
- Zonder aanvragen is een foutpercentage ongedefinieerd. Geen vaste groene foutpercentagedrempel of fictieve nulwaarden toegevoegd.

## Herhalen

```sh
# Start Docker Desktop indien nodig.
docker compose -f docker-compose.yml -f docker-compose.monitoring.yml -f docker-compose.telemetry.yml up -d --wait
npm run demo:traffic
```

De demo stopt vanzelf na 40 aanvragen in circa 22 seconden. Hij draait niet op de achtergrond of volgens een schema. Open daarna het dashboard, kies het afgelopen uur en wacht kort op ingestie. Eerdere aanvragen in hetzelfde venster tellen ook mee.

Dashboardbron: [day-03.json](../dashboards/day-03.json). Opnieuw genereren: `node scripts/build-day-03-dashboard.mjs`. Alle gebruikte queries staan in [day-03-queries.json](../dashboards/day-03-queries.json).

Manifestvalidatie geslaagd; alle zes Tempo-queries live uitgevoerd; dashboard teruggelezen in de juiste map en via de Grafana-renderer visueel gecontroleerd. Voor dit dashboard is expliciet API-versie `dashboard.grafana.app/v1beta1` gebruikt. Applicatiecode en dependencies zijn op dag 3 niet gewijzigd.

Bron: [officiële TraceQL metrics-functies](https://grafana.com/docs/tempo/latest/metrics-from-traces/metrics-queries/functions/).
