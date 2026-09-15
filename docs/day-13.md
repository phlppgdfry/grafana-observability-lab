# Dag 13 — verbruik passend bij Free

Datum: 15 september 2026. De trial eindigt volgens de eerdere accountcontrole op 21 september. Er is geen betaald abonnement geactiveerd of abonnementswijziging uitgevoerd.

## Werkelijk gemeten gebruik

De ingebouwde `grafanacloud-usage`-databron rapporteerde onderstaande organisatiebrede waarden. Dit zijn de billing-gebruiksmetingen van Grafana, geen handmatig getelde requests, voorspelling of factuur. Door aggregatie en verwerking kunnen metingen vertraagd zijn en ook fractionele aantallen bevatten.

| Onderdeel | Gemeten gebruik | Free-hoeveelheid | Aandeel |
| --- | --- | --- | --- |
| Metrics | 27 factureerbare reeksen | 10.000 | 0,27% |
| Logs | 0,026263 GB | 50 GB/maand | 0,053% |
| Traces | 0,009104 GB | 50 GB/maand | 0,018% |
| Synthetic API-checks | circa 4.713,48 factureerbare uitvoeringen | 100.000/maand | 4,71% |
| Cloud k6 | 0 VUh | 500 VUh/maand | 0% |

De openbare [Grafana-prijspagina](https://grafana.com/pricing/) bevestigt deze Free-hoeveelheden op de controledatum, plus 14 dagen retentie. De inbegrepen hoeveelheden in de accountmetingen kwamen hiermee overeen. De gemeten extra gebruikskosten (`grafanacloud_org_total_overage`) waren 0; dat is geen garantie over later gebruik of andere factuuronderdelen. Zie [het opgeslagen gebruiksrapport](evidence/day-13-usage.json).

## Gekozen instellingen

- **Traces:** expliciet `parentbased_always_on` in de Compose-overlay. Alle nieuwe roottraces blijven opgenomen; de samplingkeuze van een binnenkomende parent blijft gerespecteerd. Het API-dashboard telt traces. Sampling verlagen zou de aantallen en de nauwkeurigheid van verhoudingen beïnvloeden; het huidige kleine volume rechtvaardigt dat niet.
- **Logs:** alle requestlogs behouden. De latencyregel gebruikt succesvolle requestlogs en de serverfoutregel telt 5xx-logs. Filteren op alleen WARN/ERROR zou de latencyregel uitschakelen. Healthchecks blijven uitgesloten van applicatielogs en -traces.
- **Metrics:** de bestaande basic probe-metrics behouden. Request-ID's en documentnamen worden geen metriclabels. Er is geen extra hostexporter of permanente verkeersgenerator toegevoegd.
- **Frequentie:** de ene bestaande HTTP-check blijft iedere 60 seconden op één probe draaien. Bij continu draaien zijn dat ongeveer 43.200 uitvoeringen per 30 dagen, of 44.640 per 31 dagen: onder 100.000. Dat is een berekening voor deze korte check, geen garantie bij extra checks/probes. Deze frequentie houdt de bestaande uitvaldetectie bruikbaar.
- **Lokale logs:** app en probe gebruiken nu Docker `json-file` met `max-size: 5m` en `max-file: 2`. Dat begrenst de geroteerde logbestanden tot circa 10 MB per container, plus beperkte overhead. Dit beperkt schijfgebruik op de Mac; het vermindert niet het aantal naar Grafana verstuurde logs. Oude lokale logregels kunnen door rotatie verdwijnen.
- **Belastingtests:** blijven handmatig, lokaal en begrensd. Cloud k6 wordt niet gestart. De API-telemetrie van lokale tests telt wel mee als Cloud-inname.

## Herhaalbare gebruikscontrole

```sh
npm run lab:usage
```

Dit leest vijf bestaande organisatiebrede gebruiksmetingen, vergelijkt ze met [de vastgelegde Free-budgetten](../telemetry/budget.json) en bewaart een nieuw rapport onder `test-results/`. Vanaf 80% volgt status `review` en exitcode 1. Ontbrekende, dubbele, ongeldige of oude responsdata wordt `unknown`, nooit automatisch nul. De querytijd is niet de actualisatietijd van het billing-systeem; de bron kan achterlopen.

Dit is een handmatige controle, geen nieuw periodiek alarm en geen automatisch kostenplafond. Draai hem vóór en na grotere experimenten en opnieuw rond de overgang op 21 september. Controleer dan ook het daadwerkelijke accountplan en de retentie in Grafana; de lokale budgetfile wijzigt het abonnement niet.

## Verificatie

De nieuwe gebruikscontrole gaf `pass`. Alle elf Node-tests slaagden, inclusief grensoverschrijding en ontbrekende/ongeldige gebruiksdata. De volledige Cloud-startworkflow slaagde na toepassen: twaalf HTTP-stappen, vijf spans en een gekoppelde log teruggevonden. De actieve app- en probe-containers gebruiken beide de ingestelde logrotatie. Alle drie alertregels zijn gezond en inactief. De live check gebruikt één probe, 60 seconden interval en basic metrics.

Bewijs: [workflow](evidence/day-13-verification.json), [instellingen en regelstatus](evidence/day-13-settings.json), [accountgebruiksmetingen en inbegrepen hoeveelheden](evidence/day-13-billing-snapshot.json).

## Wanneer opnieuw afstellen?

Bij structureel meer verkeer eerst dagelijkse ingestie meten en een maandprognose maken. Voor trace-sampling eerst de dashboardtellingen loskoppelen van gesamplede traces. Voor logfiltering eerst alerting op onafhankelijke metrics baseren. Voeg niet zomaar meer probe-locaties of kortere checkintervallen toe: die vermenigvuldigen het verbruik.

De huidige lage momentopname past ruim binnen Free, maar voorspelt geen toekomstige intensieve of permanente belasting. Bewijsbestanden in Git blijven beschikbaar wanneer oudere gegevens na de retentieperiode uit Grafana verdwijnen.
