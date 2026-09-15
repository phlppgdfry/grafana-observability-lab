# Dag 12 — setup reproduceerbaar uitvoeren

Datum: 15 september 2026.

## Uitgevoerde verificatie

- De volledige Cloud-startworkflow is tweemaal geslaagd, inclusief preflight, gezonde containers, twaalf HTTP-stappen en teruggelezen trace/log-correlatie.
- Beide dashboards doorstonden de server-side dry-run. Een eerste CLI-aanroep moest opnieuw worden uitgevoerd doordat een andere gcx-aanroep tegelijk de lokale loginconfiguratie bijwerkte; de herhaling is geslaagd. Gebruik de beheeropdrachten daarom na elkaar.
- De twee dashboards en drie alertregels zijn tweemaal met dezelfde expliciete manifestpaden toegepast.
- De vaste dashboard- en regel-IDs zijn daarna teruggelezen; de drie regels evalueren gezond.
- Alle tien bestaande Node-tests zijn geslaagd.

Zie de [eerste start](evidence/day-12-setup/up-first.json), [herhaalde start](evidence/day-12-setup/up-repeat.json), [eerste toepassing](evidence/day-12-setup/apply-first.json), [herhaalde toepassing](evidence/day-12-setup/apply-repeat.json) en [teruggelezen resources](evidence/day-12-setup/resources.json).

## Wat is veranderd?

De losse Compose- en controleopdrachten zijn gebundeld in `lab:doctor`, `lab:up`, `lab:check`, `lab:apply` en `lab:stop`. Zie [het setup-runbook](setup.md) voor de volledige volgorde, vereisten en herstelstappen.

De workflow gebruikt de drie bestaande Compose-bestanden en lokale credentials. Hij toont geen tokenwaarden of volledige Compose-environment. Elke opdracht schrijft een eigen JSON-rapport buiten Git. Fouten geven een niet-nul exitcode met de mislukte stap. Starten wacht op gezonde containers; daarna moet de hele gebruikersflow slagen én moet één nieuwe aanvraag in Tempo en Loki worden teruggevonden.

De API-basisimage is nu vastgezet op de digest die voor dag 11 daadwerkelijk is gebouwd. De probe had al een vaste digest; dependencies blijven via `npm ci` en de lockfile vastgelegd. Een digest voorkomt dat dezelfde image-tag bij een volgende build ongemerkt andere inhoud oplevert. Het hostbesturingssysteem en externe Grafana-diensten zijn hiermee niet bevroren.

## Automatische setupcontrole

Een nieuwe GitHub Actions-job start het Docker-lab vanaf een schone checkout in lokale modus, voert de gebruikersflow uit en herhaalt vervolgens dezelfde startopdracht. Daarna stopt hij de containers en bewaart de rapporten als `compose-setup-reports`. Dit test ook dat het lab zonder Cloud-credentials kan draaien. De bestaande job met de tien Node-tests en gebruikersflow blijft bestaan.

De Cloud-setup gebruikt dezelfde scripts, met extra preflightcontroles en trace/log-verificatie. De Cloud-controle blijft lokaal met de bestaande credentials; deze zijn niet aan GitHub toegevoegd.

## Afbakening

Reproduceerbaar betekent hier: de bestaande labomgeving opnieuw kunnen starten en de beheerde dashboards/regels opnieuw kunnen toepassen. Een nieuwe Grafana-organisatie, databronnen, probe-inschrijving en e-mailcontactpunt worden niet automatisch aangemaakt. De vereiste onboarding en stackgebonden waarden staan expliciet in het runbook.

De manifests hebben vaste IDs. Opnieuw toepassen werkt dezelfde resources bij; het is geen transactie over alle vijf resources. Handmatige wijzigingen aan die resources kunnen worden overschreven. Voor dashboards is een server-side dry-run uitgevoerd; voor alertregels biedt de API die garantie niet en is echte toepassing nodig.
