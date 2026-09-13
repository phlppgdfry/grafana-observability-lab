# Dag 7 — Voltooid

Datum: 13 september 2026.

## Resultaat

Een zelfstandige HTTP-controle doorloopt de volledige flow die de huidige demo aanbiedt. De controle importeert geen applicatiecode: zij roept een draaiende API aan zoals een externe client. Er is nog geen browserinterface, uploadopslag of asynchrone verwerkingsqueue; er is daarom geen browsertest toegevoegd.

```sh
npm run check:flow
```

Standaarddoel is `http://127.0.0.1:4310`. Voor een andere instantie: `API_URL=http://127.0.0.1:4311 npm run check:flow`. Met `FLOW_REQUIRE_TRACES=true` moet elke niet-health-response bovendien een geldige trace-ID bevatten.

## De 12 stappen

1. Healthcheck vóór de flow.
2. Geldige documentverwerking.
3. Ongeldige JSON afwijzen.
4. Ontbrekende naam afwijzen.
5. Naam met alleen spaties afwijzen.
6. Verkeerd datatype afwijzen.
7. Naam langer dan 120 tekens afwijzen.
8. Te grote payload afwijzen.
9. Onbekende route afwijzen.
10. Verkeerde HTTP-methode afwijzen (huidig API-contract: 404).
11. Opnieuw succesvol verwerken na de foutieve aanvragen, met een Unicode-naam.
12. Healthcheck na afloop.

Iedere stap controleert status, JSON-contenttype, no-store-header en een uniek request-ID. Succesvolle verwerkingen moeten `completed` en een geldig, uniek document-ID teruggeven; het request-ID in de body moet overeenkomen met de responseheader. Afwijzingen moeten de juiste foutmelding geven en mogen geen document-ID bevatten.

Een stap heeft een timeout van 5 seconden, ook voor het uitlezen van de responsebody. Redirects worden geweigerd. Bij de eerste fout stopt de controle met exitcode 1 en een veilige JSON-foutmelding met de stapnaam; willekeurige response-inhoud wordt niet afgedrukt.

## Automatische uitvoering

GitHub Actions voert de bestaande tests uit, start vervolgens een afzonderlijk API-proces en voert de volledige HTTP-flow uit. Dit gebeurt bij push, pull request en handmatige workflowstart. De flow is een verplichte stap: een mislukking laat de job falen. Het API-proces wordt bij afsluiten opgeruimd; de job heeft een limiet van 5 minuten.

Het JSON-rapport wordt bewaard als GitHub Actions-artifact `user-flow-report`, ook wanneer de flow faalt. CI gebruikt geen Cloud-credentials en vereist dus geen trace-ID. De bestaande continue private healthprobe in Grafana blijft afzonderlijk actief. Er is geen nieuwe periodieke flowmonitor of notificatieregel aangemaakt.

## Bewijs

[Lokale flowrapportage](evidence/day-07-user-flow.json): alle **12 stappen geslaagd**, op 13 september rond **12:04 CEST (10:04 UTC)**, tegen de draaiende Docker-API met tracing verplicht. Alle tien niet-health-aanvragen bevatten trace-ID's. De tweede geldige verwerking slaagt na alle afwijzingen.

`npm test`: **7 tests geslaagd**. Twee nieuwe negatieve tests bewijzen dat de flowcontrole HTTP 200 met een onjuist antwoordcontract afkeurt en een niet-afgeronde responsebody afbreekt op timeout.

Bron: [HTTP-flowcontrole](../tests/user-flow.mjs), [negatieve controles](../tests/user-flow-check.test.mjs), [CI-workflow](../.github/workflows/ci.yml).

## Betekenis en grenzen

Dag 1 controleerde bereikbaarheid en losse functies; deze controle beoordeelt nu de externe flow én herstel na verkeerde invoer tegen een echt draaiend proces. Dit is geen belastingtest en bewijst niet dat echte documenten inhoudelijk correct worden verwerkt: de verwerking blijft gesimuleerd. Dag 8 voegt een representatieve k6-nulmeting toe.
