# Dag 11 — stoppen met werk voor een verdwenen client

Datum: 15 september 2026.

## Probleem en wijziging

Dag 9 vond geen capaciteitsgrens tot 1.000 aanvragen/s. Daarom is er geen onderbouwde reden om de normale verwerking sneller te noemen of de gesimuleerde 40 ms simpelweg te verkorten. Bij code-inspectie bleek wel dat verwerking doorliep nadat de client de verbinding verbrak. De voor/na-test bevestigt dit gedrag met de echte oude code.

De HTTP-server maakt nu een `AbortController` per aanvraag. Als de responseverbinding sluit voordat het antwoord is voltooid, wordt het signaal geannuleerd. `processDocumentRequest` geeft dat signaal door aan `processDocument(signal)`. De standaardverwerking gebruikt een annuleerbare timer van nog steeds 40 ms. De server probeert na annulering geen HTTP 500 naar de verdwenen client te sturen.

Logs en traces krijgen `client_disconnect` als foutreden. De HTTP-span en de afgebroken verwerkingsspan krijgen ERROR-status; er is geen HTTP-statuscode voor een niet-afgeleverd antwoord. De bestaande 5xx-regel behandelt dit dus niet automatisch als een HTTP 500. Normale antwoorden, validatie en onverwachte interne fouten houden hun bestaande gedrag.

## Voor/na-meting

`npm run perf:cancellation` haalt de applicatie en telemetriecode van commit `53568c1b2503808d80db38ba2d20f90e65e5bd60` uit Git naar een nieuwe map onder `test-results/`. Deze oude code en de huidige code draaien binnen dezelfde Node-versie met dezelfde dependencies, zonder Cloud-export en met een stille requestlogger. Er wordt geen branch uitgecheckt of werk overschreven.

Elke versie krijgt gewone en afgebroken HTTP-aanvragen. De client verbreekt de verbinding circa 10 ms nadat de verwerking daadwerkelijk is begonnen. Per versie en geval zijn er twee opwarmmetingen en twintig opgeslagen metingen; de uitvoervolgorde wisselt. De meting volgt wanneer de verwerkingsfunctie eindigt, ook wanneer de client al weg is.

| Meting, gemiddeld | Voor | Na |
| --- | --- | --- |
| Verwerkingsduur bij normale aanvragen | 41,13 ms | 41,09 ms |
| Verwerking blijft actief na verbreken verbinding | 29,73 ms | 1,04 ms |
| Afgebroken aanvragen die toch verwerking voltooien | 20/20 | 0/20 |

De resterende actieve verwerkingstijd na verbreken daalde in deze proef met circa **96,5%**. Normale aanvragen bleven ongeveer even snel. Dit is geen 96,5% CPU-besparing of winst in maximale capaciteit: de demo wacht hoofdzakelijk op een timer. Het concrete voordeel is dat verlaten werk eerder stopt en minder lang als actieve verwerking blijft bestaan.

Zie [volledige meetgegevens](evidence/day-11-comparison.json). Deze geïsoleerde vergelijking is niet rechtstreeks vergelijkbaar met de k6-cijfers van dag 9: die gebruikten Docker en Cloud-telemetrie.

## Controle in het actieve lab

De Docker-image is opnieuw gebouwd en de API is gezond gestart met de bestaande Cloud-telemetrie. De [gebruikersflow van 12 stappen](evidence/day-11-user-flow.json) slaagde. De [k6-nulmeting](evidence/day-11-baseline.json) slaagde eveneens: 300 meetaanvragen, nul onverwachte fouten, nul overgeslagen iteraties en p95 58,99 ms voor geldige aanvragen. Dit bevestigt de labgrens van 250 ms; het bewijst geen verbetering van de normale responstijd ten opzichte van eerdere dagen.

Eén echte afgebroken aanvraag is uit Tempo en Loki teruggelezen: vijf spans, `client_disconnect` op zowel de HTTP-root als `document.process`, en één log met dezelfde foutreden. Zie [live annuleringsbewijs](evidence/day-11-cancellation.json). Tien lokale Node-tests zijn geslaagd, inclusief de nieuwe annuleringstest.

## Grenzen en vervolg

Annulering werkt alleen als de aangeroepen verwerkingsfunctie het signaal respecteert. Een toekomstige database-, HTTP- of opslagclient moet dat signaal ook ontvangen en ondersteunen. Reeds opgeslagen documenten of andere afgeronde neveneffecten worden hierdoor niet teruggedraaid. Synchrone CPU-intensieve code wordt niet automatisch onderbroken.

De nieuwe test gebruikt een lange annuleerbare verwerking en bewijst dat verbreken deze voortijdig stopt, dat beide spans eindigen en dat slechts één log met de juiste reden ontstaat. De bestaande tests blijven normale antwoorden en gesaneerde interne fouten controleren.
