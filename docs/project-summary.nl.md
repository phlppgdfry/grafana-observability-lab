# Projectsamenvatting — Grafana Observability Lab

**Philippe Godfroy · AI-assisted praktijkproject · september 2026**

## In dertig seconden

Dit project maakt zichtbaar wat er gebeurt wanneer een API-aanvraag traag wordt of mislukt. Een kleine Node.js-API is gekoppeld aan Grafana: dashboards tonen verkeer en bereikbaarheid, logs beschrijven individuele aanvragen en traces tonen de verwerkingsstappen. Waarschuwingen en herstel zijn met gecontroleerde fouten getest.

Het resultaat is een werkend lokaal lab met code, screenshots, meetrapporten, automatische tests en een herhaalbare installatie. De documentverwerking is gesimuleerd; de aanvragen en de monitoringgegevens zijn echt.

## Waarom dit relevant is

Voor backend- en operationswerk is het belangrijk om een storing niet alleen te zien, maar ook te kunnen verklaren en een wijziging te controleren. Dit project biedt concrete voorbeelden om die werkwijze te bespreken tijdens een gesprek over een junior backend-, DevOps- of cloud operationsfunctie.

| Praktijkvraag | Voorbeeld uit het project |
| --- | --- |
| Hoe merk je dat er iets misgaat? | Meldingsregels voor uitval, serverfouten en trage verwerking |
| Hoe vind je de oorzaak? | Eén trace-ID koppelt een aanvraaglog aan afzonderlijke verwerkingsstappen |
| Hoe bewijs je herstel? | Zowel nieuwe HTTP-aanvragen als de terugkeer van alerts naar normaal zijn gecontroleerd |
| Hoe toets je een verbetering? | De oude en nieuwe code zijn onder dezelfde omstandigheden vergeleken |
| Kan iemand anders het opnieuw draaien? | Vaste setupcommando's, lockfile, Docker-images met digest en CI vanaf een schone checkout |

## Drie concrete resultaten

1. **Belasting getest:** 1.000 aanvragen per seconde gedurende 20 seconden, zonder onverwachte HTTP-fouten of overgeslagen iteraties. De verwerking was een lichte simulatie; een maximale productiecapaciteit is niet vastgesteld. [Meetrapport](day-09.md)
2. **Oorzaak en herstel bewezen:** geïnjecteerde vertraging en interne fouten zijn in logs en traces teruggevonden. Beide bijbehorende alertregels werden actief en herstelden. [Incidentoefening](day-10.md)
3. **Onnodig werk verminderd:** na een verbroken clientverbinding bleef verwerking gemiddeld 29,73 ms doorlopen; met annulering was dat 1,04 ms. Dit betreft resterende verwerkingstijd, geen algemene snelheidswinst of CPU-besparing van 96,5%. [Voor/na-meting](day-11.md)

## Technologie, in gewone taal

- **JavaScript / Node.js:** de code en runtime van de API.
- **OpenTelemetry:** legt de stappen en gebeurtenissen van aanvragen vast.
- **Grafana, Tempo en Loki:** visualisatie, zoeken in traces en zoeken in logs.
- **Docker Compose:** start de API en monitoringprobe in een vaste lokale omgeving.
- **k6:** genereert gecontroleerd verkeer om gedrag onder belasting te meten.
- **GitHub Actions:** voert controles automatisch uit bij wijzigingen.

## Tekst voor een cv of portfolio

> **Grafana Observability Lab — AI-assisted praktijkproject**  
> Lokaal Node.js-lab met OpenTelemetry, Grafana Cloud, Docker en k6. Het project omvat trace/log-correlatie, geteste waarschuwingen en herstel, begrensde belastingtests en een herhaalbare CI-workflow. Een gecontroleerde voor/na-meting toont dat annulering de resterende verwerking na clientdisconnect terugbracht van 29,73 naar 1,04 ms gemiddeld.

## Werkwijze en AI-gebruik

Het project is met Codex ontwikkeld. AI heeft bijgedragen aan implementatie, tests en documentatie. De volledige ontwikkelgeschiedenis, broncode en meetbestanden zijn beschikbaar om keuzes en resultaten te beoordelen.

Voor een inhoudelijk gesprek kun je de [demonstratie](walkthrough.md) doorlopen en uitleggen waarom een verwachte HTTP 400 geen serverstoring is, waarom p95 verschilt van het gemiddelde en waarom een alert later herstelt dan de API zelf.

## Bekijk het resultaat

- [Screenshots en eindverslag](day-14.md)
- [Architectuur](architecture.md)
- [Lokaal starten](setup.md)
- [Broncode op GitHub](https://github.com/phlppgdfry/grafana-observability-lab)

De repository is bij de portfolio-update van 16 september 2026 privé. Recruiters hebben daarom expliciet toegang of een gedeelde kopie van de samenvatting nodig. Een Grafana-login is niet nodig om de opgeslagen screenshots en rapporten te beoordelen, zodra de repository toegankelijk is.
