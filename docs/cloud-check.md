# Private Cloud-bereikbaarheidscheck

## Ontwerp

De demo draait in Docker. Een private Grafana Synthetic Monitoring-probe controleert `http://document-lab.test:4310/health` op hetzelfde Docker-netwerk en stuurt resultaten naar Grafana Cloud. Er is geen publieke deployment of tunnel nodig. De probe meet elke 60 seconden en verwacht HTTP 200 binnen vijf seconden. De lokale Node-check controleert daarnaast de response-inhoud.

De probe draait zolang Docker en de Mac actief zijn. Slaapstand of een gestopte probe betekent ontbrekende metingen, niet automatisch een defecte applicatie. Dit is een labopstelling, geen onafhankelijke 24/7-monitor.

## Status

**Actief en geverifieerd.** Probe `document-lab-local` (170), check `document-lab-health` (12093). Grafana ontvangt succesvolle metingen. Dashboard: https://bronzemillipede944.grafana.net/d/document-lab-day-1. De opgeslagen CAP-token heeft nu alle vier vereiste scopes.

## Credentials

Maak in Grafana Cloud Access Policies een token met `stacks:read`, `metrics:write`, `logs:write`, `traces:write` en toegang tot deze stack. Bewaar alleen de token in `.local/cloud-token`. Deze map wordt door Git en Docker uitgesloten. `npm run grafana` leest de token lokaal en geeft hem als omgevingsvariabele aan gcx, zonder hem in het commando of terminaloutput te schrijven.

```sh
npm run grafana -- synthetic-monitoring probes list
```

Een private probe krijgt een eigen, afzonderlijke probe-token. Bewaar die na registratie in `.local/probe.env` als `SM_AGENT_API_TOKEN=<probe-token>`, met bestandsrechten 600. De Cloud Access Policy-token hoort niet in de probe-container.

## Activering na authenticatie

1. Controleer of `document-lab-local` al bestaat; maak hem alleen aan als hij ontbreekt. Bewaar de tokenrespons direct in een afgeschermd lokaal bestand; deel hem niet in Git of screenshots.
2. Controleer de geregistreerde probenaam en of de regio overeenkomt met de stack (`prod-gb-south-1`). De server in de Compose-configuratie volgt de officiële UK/AWS-regiotabel.
3. Start de probe:

```sh
docker compose -f docker-compose.yml -f docker-compose.monitoring.yml up -d --wait
```

4. Controleer of de probe online is en of `document-lab-health` al bestaat. Maak de check bij afwezigheid aan:

```sh
npm run grafana -- synthetic-monitoring checks create -f tests/grafana-healthcheck.yaml
npm run grafana -- synthetic-monitoring checks list
```

5. Controleer met `checks status <id>` dat er succesvolle metingen zijn. Pas daarna geldt de Cloud-check als voltooid. Het YAML-bestand in deze repo is op zichzelf geen bewijs van activering.

## Stoppen

```sh
docker compose -f docker-compose.yml -f docker-compose.monitoring.yml stop probe
```

Pauzeer ook de Cloud-check wanneer het lab langere tijd uitstaat. Wijzig hiervoor `enabled` naar `false` en gebruik `checks update <id> -f tests/grafana-healthcheck.yaml`.

Bronnen: [Private probes](https://grafana.com/docs/grafana-cloud/testing/synthetic-monitoring/set-up/set-up-private-probes/), [officiële agentbroncode voor SM_AGENT_API_TOKEN](https://github.com/grafana/synthetic-monitoring-agent/blob/main/cmd/synthetic-monitoring-agent/main.go).
