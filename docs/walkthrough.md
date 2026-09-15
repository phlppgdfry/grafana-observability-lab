# Demonstratie in ongeveer tien minuten

## 1. Leg het probleem uit — één minuut

“Een API kan een antwoord geven, maar daarmee weet je nog niet waar vertraging of een fout ontstaat. Dit lab verbindt echte HTTP-aanvragen met metrics, logs, traces en waarschuwingen. De documentverwerking zelf is een simulatie.”

Toon het [architectuuroverzicht](architecture.md). Leg uit: JavaScript is de programmeertaal, Node.js voert de API-code uit, OpenTelemetry legt de gebeurtenissen vast en Grafana maakt ze doorzoekbaar en zichtbaar. Docker verpakt de lokale API en probe.

## 2. Start en controleer — twee minuten

```sh
npm ci
npm run lab:up
```

Laat zien dat de uitvoer niet alleen “container gestart” zegt, maar ook twaalf HTTP-stappen en echte trace/log-aflevering controleert. Bij een reeds actief lab volstaat `npm run lab:check`. De eerste installatie kan langer duren. Credentials en onboarding staan in [setup](setup.md).

Open [Bereikbaarheid](https://bronzemillipede944.grafana.net/d/document-lab-day-1). De private probe controleert de API iedere minuut. Dit is bereikbaarheid vanuit de lokale Docker-omgeving, geen wereldwijd gemeten uptime.

## 3. Maak zichtbaar verkeer — twee minuten

```sh
npm run demo:traffic
```

De opdracht maakt 40 echte aanvragen: 32 geldige en 8 bewust ongeldige. Hij stopt vanzelf. Open [API-overzicht](https://bronzemillipede944.grafana.net/d/document-lab-day-3) en kies het afgelopen halfuur. Verwachte 400-antwoorden tellen mee in het HTTP-foutpercentage, maar zijn geen 5xx-serverfouten. Andere aanvragen in hetzelfde venster tellen ook mee; het dashboard hoeft dus niet exact 40 te tonen.

Leg p95 uit: 95% van de gemeten aanvragen was sneller dan die waarde. Dat is iets anders dan het gemiddelde. Deze demonstratie is geen nieuwe prestatienulmeting; die staat in [dag 8](day-08.md).

## 4. Volg één aanvraag — twee minuten

Neem een verse trace-ID uit de uitvoer. Zoek die in Grafana Explore/Tempo. Of vervang de placeholder en gebruik:

```sh
gcx traces get <trace-id> -d grafanacloud-traces --context lab --since 30m -o json
gcx logs query '{service_name="document-lab",deployment_environment_name="lab"} | trace_id="<trace-id>"' -d grafanacloud-logs --context lab --since 30m -o json
```

Toon de HTTP-span met daaronder lezen, JSON ontleden, valideren en verwerken. Bij een geldige aanvraag zit de gesimuleerde wachttijd in `document.process`. Toon vervolgens dezelfde trace-ID in de log. Een fout in de invoer stopt eerder in de flow.

## 5. Toon bewezen fouten en herstel — twee minuten

Gebruik [dag 10](day-10.md) en het [diagnosebewijs](evidence/day-10-faults/diagnosis.json): extra wachttijd zat in de verwerking, een interne fout gaf ERROR en na herstel werd de verwerking weer normaal. Beide meldingsregels zijn van normaal naar `Firing` en terug gegaan.

Voor deze korte presentatie hoef je geen nieuwe waarschuwingen op te wekken. Een volledige herhaling kan bewust met `npm run experiment:faults`; die duurt meerdere minuten en kan e-mails sturen. Alertwachttijden en terugkijkvensters verklaren waarom de melding later komt en later herstelt dan de fout zelf.

## 6. Sluit af met resultaten en beheer — één minuut

- Dag 9: tot 1.000 aanvragen/s gedurende 20 seconden getest, zonder een capaciteitsgrens te vinden. Geen claim dat dit de maximale of langdurige productiecapaciteit is.
- Dag 11: verlaten verwerking bleef na disconnect gemiddeld nog 29,73 ms lopen; na annulering 1,04 ms. Gewone aanvragen bleven ongeveer even snel.
- Dag 12: dezelfde setup tweemaal geslaagd, ook vanaf een schone checkout in GitHub Actions.
- Dag 13: `npm run lab:usage` controleert het gebruik tegen Free-budgetten. Het is geen automatisch kostenplafond.

De belangrijkste vaardigheid die je hiermee demonstreert: een vermoeden formuleren, echt verkeer meten, logs aan traces koppelen, een oorzaak aanwijzen, een wijziging testen en het bewijs bewaren. Zie [het eindverslag](day-14.md) voor screenshots en de laatste controle.
