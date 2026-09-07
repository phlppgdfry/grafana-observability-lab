# Grafana Observability Lab

Een zelfstandig lab om in 14 werkdagen een documentverwerkings-API zichtbaar, meetbaar en testbaar te maken met Grafana Cloud.

## Dag 1

- Demo-API zonder externe dependencies, lokaal op poort 4310.
- Healthcheck met timeout, controle op HTTP-status én response-inhoud.
- Functionele tests voor verwerking, ongeldige invoer en onbekende routes.
- GitHub Actions voor tests en een echte bereikbaarheidscheck.
- Docker Compose-configuratie voor een reproduceerbare lokale omgeving.

Grafana-verbinding en trial-status: zie [dag-1-verslag](docs/day-01.md). De lokale check stuurt op dag 1 nog geen meetgegevens naar Grafana. OpenTelemetry volgt op dag 2.

## Starten

Vereist: Node.js 22 of hoger (Node.js 24 wordt gebruikt in CI en Docker).

```sh
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

Publieke Grafana-probes kunnen localhost niet bereiken. Een Cloud-check voor deze app vereist een private probe op de lokale omgeving of een bereikbare testdeployment. De dag-1-check draait lokaal en in GitHub Actions.

## Structuur

| Map | Inhoud |
| --- | --- |
| `app/` | Zelfstandige documentverwerkingsdemo |
| `dashboards/` | Dashboards vanaf dag 3 |
| `alerts/` | Meldingsregels vanaf dag 6 |
| `telemetry/` | OpenTelemetry vanaf dag 2 |
| `tests/` | Bereikbaarheidscheck en functionele tests; later k6 |
| `experiments/` | Gecontroleerde foutscenario’s vanaf dag 10 |
| `docs/` | Voortgang, architectuur en bewijs |
| `.github/workflows/` | Automatische controles |

Zie de [14-daagse roadmap](docs/roadmap.md). Dagnummer is een werkvolgorde; de werkelijke trial-einddatum bepaalt de beschikbare kalenderdagen.
