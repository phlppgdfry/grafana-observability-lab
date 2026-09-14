# Grafana Observability Lab

Een zelfstandig lab om tijdens een 14-daagse trial een documentverwerkings-API zichtbaar, meetbaar en testbaar te maken met Grafana Cloud.

**Trial-einde: 21 september 2026.** Daarna schakelt de account automatisch naar Free. We ronden de evaluatie uiterlijk 20 september af.

## Dag 1

- Demo-API, lokaal op poort 4310.
- Healthcheck met timeout, controle op HTTP-status én response-inhoud.
- Functionele tests voor verwerking, ongeldige invoer en onbekende routes.
- GitHub Actions voor tests en een echte bereikbaarheidscheck.
- Docker Compose-configuratie voor een reproduceerbare lokale omgeving.

**Live:** [Document Lab · Bereikbaarheid](https://bronzemillipede944.grafana.net/d/document-lab-day-1). De private probe stuurt elke minuut echte healthcheckmetingen naar Grafana. Zie het [dag-1-verslag](docs/day-01.md). Applicatie-interne OpenTelemetry is aangesloten op dag 2; zie [het verslag](docs/day-02.md).

## Dag 2

OpenTelemetry-traces van echte API-aanvragen komen aan in Grafana Tempo, inclusief route, statuscode en duur. De API geeft een `x-trace-id` terug. Zie [starten met telemetrie](telemetry/README.md) en [verificatiebewijs](docs/day-02.md).

```sh
docker compose -f docker-compose.yml -f docker-compose.monitoring.yml -f docker-compose.telemetry.yml up -d --build --wait
npm run check:traces
```

## Dag 3

**Live:** [Document Lab · API-overzicht](https://bronzemillipede944.grafana.net/d/document-lab-day-3): aanvragen, HTTP-foutpercentage, serverfouten en responstijden op basis van echte traces. Zie [het dag-3-verslag](docs/day-03.md).

Met het lab actief genereert `npm run demo:traffic` één begrensde demonstratie van 40 aanvragen. Dit is geen permanente verkeersgenerator.

## Dag 4

Applicatielogs staan in Grafana Loki met omgeving, release, vaste foutreden en trace-ID. De bestaande telemetrie-overlay activeert zowel logs als traces. Zie [zoekopdrachten en live bewijs](docs/day-04.md) en [logconfiguratie](telemetry/logs.md).

## Dag 5

De trace toont nu afzonderlijk het lezen, ontleden, valideren en verwerken van een documentaanvraag. Onverwachte verwerkingsfouten geven HTTP 500 en een ERROR-log; ongeldige invoer blijft HTTP 400. Zie [bewijs en uitleg](docs/day-05.md).

## Dag 6

Drie meldingsregels voor bereikbaarheid, serverfouten en traagheid zijn aangemaakt in Grafana. E-mail is ingesteld; testverzending en ontvangst zijn bevestigd. De testmail kwam in de spammap aan. Zie [dag 6](docs/day-06.md) en [het meldingsrunbook](alerts/README.md).

## Dag 7

`npm run check:flow` controleert de volledige documentflow via 12 HTTP-stappen, inclusief antwoorden, IDs, invoerfouten en herstel. Dezelfde controle draait automatisch in GitHub Actions bij iedere push en pull request. Zie [dag 7](docs/day-07.md).

## Dag 8

`npm run perf:baseline` voert een begrensde lokale k6-test uit: opwarmen, daarna één minuut 5 aanvragen/s, met 90% geldige documenten en 10% verwachte afwijzingen. Het rapport controleert correctheid en p95-responstijd. Vereist k6 en een actieve API met telemetrie. Zie [profiel, nulmeting en herhalen](docs/day-08.md).

## Starten

Vereist: Node.js 22 of hoger (Node.js 24 wordt gebruikt in CI en Docker).

```sh
npm ci
npm start
```

Open http://127.0.0.1:4310/health. In een tweede terminal:

```sh
npm run check
npm test
curl -X POST http://127.0.0.1:4310/api/documents/process \
  -H 'Content-Type: application/json' \
  -d '{"name":"demo.pdf"}'
```

Of start via Docker (stop eerst een eventueel lokaal draaiende API):

```sh
docker compose up --build -d
npm run check
docker compose down
```

De demo simuleert verwerking; er worden geen documenten opgeslagen. HOST en PORT kunnen als omgevingsvariabelen worden ingesteld. `.env.example` beschrijft de opties; `.env` wordt niet automatisch geladen.

## Grafana verbinden

```sh
gcx login lab --server https://bronzemillipede944.grafana.net --oauth --yes
gcx config check --context lab
gcx datasources list --context lab
```

OAuth-credentials worden door gcx buiten deze repo bewaard. De extra Cloud-productaanmelding is een afzonderlijke stap als Synthetic Monitoring die vereist.

De actieve private Grafana-probe bereikt de demo via de Docker-alias `document-lab.test`. Er draait daarnaast een lokale check en een check in GitHub Actions.

De actieve private-probe-configuratie staat in `docker-compose.monitoring.yml` en `tests/grafana-healthcheck.yaml`. Start met `docker compose -f docker-compose.yml -f docker-compose.monitoring.yml up -d --wait`. Lokale credentials zijn vereist. Zie [Cloud-check instellen](docs/cloud-check.md).

## Structuur

| Map | Inhoud |
| --- | --- |
| `app/` | Zelfstandige documentverwerkingsdemo |
| `dashboards/` | Live dashboards voor bereikbaarheid en API-verkeer |
| `alerts/` | Meldingsregels vanaf dag 6 |
| `telemetry/` | OpenTelemetry-tracing en startinstructies |
| `tests/` | Bereikbaarheidscheck, functionele gebruikersflow en k6-nulmeting |
| `experiments/` | Gecontroleerde foutscenario’s vanaf dag 10 |
| `docs/` | Voortgang, architectuur en bewijs |
| `.github/workflows/` | Automatische controles |

Zie de [14-daagse roadmap](docs/roadmap.md). Dagnummer is een werkvolgorde; de werkelijke trial-einddatum bepaalt de beschikbare kalenderdagen.
