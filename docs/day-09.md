# Dag 9 — gecontroleerd meer belasting

Datum: 14 september 2026. **Geen prestatiegrens gevonden binnen de ingestelde testlimiet.** De API haalde ook 1.000 aanvragen/s gedurende 20 seconden binnen alle criteria. Dit is de hoogste geteste belasting, geen gemeten maximumcapaciteit.

## Resultaten

De ladder liep van 01:24:54 tot 01:26:55 UTC. Alle stappen gaven k6-exitcode 0, zonder onverwachte HTTP-fouten, mislukte antwoordcontroles of overgeslagen iteraties.

| Aanbod per seconde | Aanvragen in 20 s | p95 geldige aanvragen |
| --- | --- | --- |
| 5 | 100 | 54,03 ms |
| 25 | 500 | 51,59 ms |
| 100 | 2.000 | 49,73 ms |
| 250 | 5.000 | 45,53 ms |
| 500 | 10.000 | 48,78 ms |
| 1.000 | 20.000 | 46,34 ms |

De 37.600 aanvragen leverden 188.000 geslaagde antwoordcontroles op. De 90/10-verdeling bleef bij iedere stap exact behouden. Dag 8 had p95 56,60 ms bij 5 aanvragen/s over 60 seconden. Kleine verschillen en de lagere p95 bij hogere belasting bewijzen geen versnelling: warmere code, scheduling, steekproefduur en gedeelde machinebelasting verschillen.

De meetomgeving is dezelfde als [dag 8](day-08.md): Node 24.21.0 in Docker, k6 2.2.0 darwin/amd64 op een arm64-Mac, Docker met 10 CPUs en ongeveer 7,75 GiB geheugen, zonder gewijzigde API-limieten. Een korte lokale functionele testrun viel binnen de eerste 5-aanvragen/s-stap; de hogere stappen hadden die extra testactiviteit niet. De eerste stap is daarom alleen een korte referentie.

Losse `docker stats`-momentopnamen tijdens de ladder rapporteerden voor de API 23,28% CPU / 98,11 MiB en later 40,26% CPU / 165,8 MiB. Dit zijn geen maxima of continue profielmetingen en ze zeggen niets over het totale CPU-gebruik van k6 op de host. Een groot deel van de documentverwerking is asynchroon wachten: meerdere aanvragen kunnen tegelijk op hun 40 ms timer wachten. Er is geen database of CPU-intensieve documentverwerking die hier wordt belast.

Trace `6cc226cc43808b2c64e32a975cabb6f7` uit de 1.000-aanvragen/s-stap is teruggelezen uit Tempo met alle vijf spans. De gekoppelde Loki-log toont HTTP 200 en 40,448 ms serverduur. In de bekeken containerlogs over het testvenster stonden geen exportfoutmeldingen. Dit steekproefbewijs bewijst geen volledige aflevering van alle spans.

Zie [ruwe meetrapporten](evidence/day-09-load/) en [trace/log-correlatie](evidence/day-09-correlation.json).

## Herstel en controles

De volledige dag-8-test na de ladder eindigde om 01:28:10 UTC met exitcode 0: opnieuw 300 meetaanvragen, p95 53,07 ms, geen onverwachte fouten of overgeslagen iteraties en alle antwoordcontroles geslaagd. Alle drie Grafana-meldingsregels waren daarna `inactive`, met evaluatiegezondheid `ok`. De zeven functionele Node-tests zijn geslaagd.

De applicatiecode is niet veranderd. De dag-8-test gebruikt nu dezelfde aanvraagfunctie als de belastingladder; de geslaagde herstelrun controleert ook dat deze verplaatsing het gedrag van de nulmeting bewaart. Dag 10 kan hierop voortbouwen met bewust geïnjecteerde vertraging en fouten om detectie en diagnose te oefenen.

## Werkwijze

`npm run perf:ladder` voert achtereenvolgens 5, 25, 100, 250, 500 en maximaal 1.000 aanvragen/s uit, per stap 20 seconden. Elke stap heeft eigen meetwaarden, zodat rustige stappen de p95 van een drukke stap niet verdunnen. De eerste stap is een korte referentie; de volledige nulmeting van dag 8 draait daarna als herstelcontrole.

De API, Docker-configuratie en telemetrie zijn ongewijzigd. De [gedeelde aanvraagcode](../tests/k6-document-flow.js) houdt de 90/10-verdeling, payload, status- en inhoudscontroles gelijk aan dag 8. De test stuurt alleen naar de lokale API en heeft een bovengrens van 37.600 documentaanvragen voor de ladder, plus 350 bij herstel en healthchecks. Werkelijke aantallen kunnen lager zijn door vroegtijdig stoppen.

Per stap staan `max(10, rate / 2)` virtuele gebruikers klaar, maximaal 500 bij de hoogste stap. De vaste reservering voorkomt dynamisch opstarten van extra gebruikers tijdens een stap. Dat is geen garantie dat de gedeelde Mac het aanbod kan genereren.

## Stoppen en interpreteren

- p95 voor geldige aanvragen moet onder 250 ms blijven, met afbreken vanaf 10 seconden als de grens wordt overschreden.
- Onverwachte HTTP-fouten breken de stap vanaf 5 seconden af.
- Alle antwoordcontroles moeten slagen; aantallen en 90/10-verdeling moeten kloppen; nul `dropped_iterations`.
- Zodra een stap faalt, start geen hogere stap. De volledige dag-8-test controleert vervolgens of de API weer normaal werkt.
- Een mislukte stap blijft een niet-nul exitcode van de runner, ook wanneer herstel slaagt. Het rapport bewaart afzonderlijk de stopreden en herstelstatus.

Zie de officiële documentatie over [afbreken bij drempeloverschrijding](https://grafana.com/docs/k6/latest/using-k6/thresholds/) en [overgeslagen iteraties](https://grafana.com/docs/k6/latest/using-k6/scenarios/concepts/dropped-iterations/). Overgeslagen iteraties bewijzen op zichzelf geen API-capaciteitsgrens: de generator of het aantal beschikbare virtuele gebruikers kan ook de beperking zijn.

## Herhalen

```sh
docker compose -f docker-compose.yml -f docker-compose.monitoring.yml -f docker-compose.telemetry.yml up -d --build --wait
npm run perf:ladder
```

Vereist dezelfde k6 2.2.0-installatie als dag 8. Elke uitvoering krijgt een eigen `test-results/day-09-<timestamp>/` met k6-logs, ruwe JSON per stap, herstelrapport en `summary.json`. Dit blijft buiten Git; het geselecteerde bewijs staat in `docs/evidence/`.

De korte stappen zijn een verkenning, geen langdurige capaciteitstest of productiegarantie. 1.000 aanvragen/s is een bewuste testlimiet. Als alle stappen slagen is de conclusie: geen grens gevonden binnen deze test, niet dat 1.000 de maximale capaciteit is. Sampling staat op 100%, maar de exporters hebben begrensde buffers: trace-ID's in HTTP-antwoorden garanderen geen volledige aflevering in Grafana onder belasting. k6 blijft de bron voor de aantallen van deze test.
