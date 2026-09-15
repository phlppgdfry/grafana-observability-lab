# Herhaalbare setup

## Vereisten

Node.js >=22, Git en Docker met Compose. `npm ci` installeert de exacte dependencyversies uit de lockfile. De API-basisimage en probe-image zijn vastgezet op een digest; bij een bewuste upgrade worden de digests en controles opnieuw bekeken. k6 2.2.0 is alleen nodig voor de handmatige prestatietests.

Voor Grafana: bestaande `gcx`-login met context `lab`, `.local/cloud-token` en `.local/probe.env` met `SM_AGENT_API_TOKEN`. Deze bestanden staan buiten Git. Neem ze op een nieuwe computer over via een veilige eigen overdracht; commit ze nooit. De huidige Compose-overlay is bewust gekoppeld aan de bestaande labstack, niet aan een automatisch aangemaakte nieuwe account.

```sh
npm ci
npm run lab:doctor
npm run lab:up
```

`lab:doctor` controleert Node, dependencies, Docker, de credentialbestanden, de Grafana-context en de samengevoegde Compose-configuratie. Een geslaagde doctor bewijst nog geen aflevering van telemetrie.

`lab:up` voert eerst doctor uit, bouwt/start de API en probe en wacht op gezonde containers. Daarna voert het de 12-stappen-gebruikersflow uit en leest één nieuwe trace met vijf spans en de bijbehorende HTTP 200-log terug uit Grafana. Herhalen gebruikt dezelfde Compose-services; het maakt geen extra stack of probe aan.

## Beheeropdrachten

| Opdracht | Werking |
| --- | --- |
| `npm run lab:doctor` | Vereisten en configuratie controleren |
| `npm run lab:up` | Bouwen, starten, gezondheid en telemetrie controleren |
| `npm run lab:check` | Gebruikersflow en trace/log-aflevering controleren |
| `npm run lab:usage` | Cloud-gebruik vergelijken met de vastgelegde Free-budgetten |
| `npm run lab:apply` | De twee dashboards en drie alertregels uit Git toepassen |
| `npm run lab:stop` | Containers stoppen, configuratie behouden |

Stoppen kan een bereikbaarheidsmelding veroorzaken. `lab:up` start het lab weer. Er worden geen credentials, volumes of Cloud-resources verwijderd.

Iedere opdracht schrijft een nieuw JSON-verslag in `test-results/`, met geslaagde stappen of de eerste mislukte stap. Child-processuitvoer en credentialwaarden worden niet in het verslag opgenomen. Een mislukte stap geeft een niet-nul exitcode; startfouten worden niet als een geslaagde setup gemeld. Gedeeltelijk gestarte containers blijven inspecteerbaar.

## Grafana-configuratie opnieuw toepassen

`lab:apply` gebruikt uitsluitend de twee expliciete dashboardmanifesten en `alerts/rules/`. Queryvoorbeelden worden niet als resources verstuurd. De vaste resource-IDs voorkomen duplicaten. De bestaande map `grafana-observability-lab`, databronnen, private probe/check en het contactpunt `document-lab-email` zijn vereisten. De opdracht maakt geen ontvanger of account aan en verstuurt geen afzonderlijke testmail.

Dit is de gewenste configuratie uit Git: handmatige wijzigingen aan dezelfde dashboards of regels kunnen worden overschreven. Andere resources blijven buiten de opdracht. Toepassen is niet atomair; na een gedeeltelijke fout herstel je de gemelde oorzaak en herhaal je de opdracht. De alert-API ondersteunt geen volledige server-side dry-run; een dry-run wordt daarom niet als bewijs gebruikt.

Voor een volledig nieuwe Grafana-stack blijven [Cloud-onboarding](cloud-check.md), [dag 6/contactpunt](day-06.md) en het aanpassen van stack-ID, endpoints en datasource-IDs nodig. Deze workflow reproduceert het bestaande lab, niet een onafhankelijke nieuwe Cloud-organisatie.

## Alleen lokaal / CI

```sh
npm ci
npm run lab:up -- --local
npm run lab:check -- --local
npm run lab:stop -- --local
```

Lokale modus gebruikt alleen `docker-compose.yml`, zonder probe of Cloud-credentials. Gebruik deze modus in een aparte checkout/CI-omgeving: in dezelfde checkout deelt hij dezelfde app-service en poort met Cloud-modus. Terug naar Cloud-modus gaat met `npm run lab:up`.

## Bij een fout

- Docker daemon: start/hervat Docker Desktop en herhaal doctor.
- Credentialbestanden: herstel de lokale bestanden; de inhoud wordt bewust niet getoond.
- Grafana-context: controleer `gcx config check --context lab`; log zo nodig opnieuw in volgens de README.
- Containers: inspecteer `docker compose ps` en de app-logs; controleer of poort 4310 vrij is.
- HTTP-flow: gebruik `npm run check:flow` voor de mislukte stap.
- Telemetrie: controleer [OTLP-configuratie](../telemetry/README.md), exporterfouten en de Grafana-instance. De controle probeert acht keer met korte pauzes; blijvende uitval blijft een fout.
- Manifests: controleer de bestaande map, databronnen, contactpunt en gcx-rechten. Bewaar eventuele debuguitvoer met accountgegevens alleen lokaal.
