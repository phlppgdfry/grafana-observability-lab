# Het project begrijpen en zelf uitleggen

Deze uitleg bereidt je voor op de [demonstratie van tien minuten](walkthrough.md). Je hoeft niet alle code uit je hoofd te kennen. Je moet kunnen uitleggen welk probleem wordt opgelost, wat een aanvraag doorloopt, welk bewijs je laat zien en waar de grenzen liggen.

## Je openingsverhaal

> “Dit is een observability-lab dat ik met hulp van Codex heb opgebouwd. Het laat zien hoe je merkt dat een API traag is of fouten geeft, hoe je de oorzaak terugvindt en hoe je controleert dat een verbetering werkt. De documentverwerking is gesimuleerd, maar de API-aanvragen, logs, traces en waarschuwingen zijn echt. De tests en meetrapporten staan in de repository.”

Het relevante probleem is: een systeem kan bereikbaar zijn terwijl een bepaalde handeling toch mislukt. Alleen controleren of de server aanstaat is dus niet genoeg.

## De bouwstenen

| Begrip | Betekenis in dit project |
| --- | --- |
| Repository / repo | De map met code, documentatie en wijzigingsgeschiedenis op GitHub |
| Git / commit / push | Git bewaart versies; een commit legt wijzigingen vast; push stuurt die naar GitHub |
| JavaScript | De programmeertaal waarin de API en veel scripts geschreven zijn |
| Node.js | Het programma dat JavaScript buiten de browser uitvoert; hier draait het de API |
| API | Een ingang waar software een aanvraag naartoe stuurt en een antwoord terugkrijgt |
| HTTP | Het communicatieprotocol; GET haalt iets op, POST dient hier een verwerkingsaanvraag in |
| JSON | Het gegevensformaat van de aanvraag en het antwoord, bijvoorbeeld `{"name":"demo.pdf"}` |
| npm | Installeert Node-dependencies en voert de opdrachten uit die in `package.json` staan |
| Docker | Draait de API in een container met een vastgelegde omgeving |
| Compose | Beschrijft hoe de API-container en monitoringprobe samen starten |
| OpenTelemetry | Instrumentatie die gebeurtenissen en stappen vastlegt en exporteert |
| Grafana | De omgeving waarin dashboards, zoekopdrachten en meldingsregels samenkomen |
| Tempo / Loki | De opslag- en zoeksystemen voor respectievelijk traces en logs |
| k6 | Maakt gecontroleerd veel HTTP-aanvragen om gedrag onder belasting te testen |
| CI / GitHub Actions | Voert automatisch controles uit na een push of pull request |

Een openbare repository is geen openbare hosting. Iemand kan de code bekijken en lokaal uitvoeren. De API op jouw Mac wordt daardoor niet bereikbaar vanaf het internet en je Grafana-account wordt niet gedeeld.

## Eén aanvraag van begin tot einde

Een client stuurt `POST /api/documents/process` met een documentnaam. De API:

1. Leest de requestbody, met een limiet van 16 KiB.
2. Zet de JSON-tekst om naar gegevens.
3. Controleert of de naam geldig is.
4. Wacht bij normale verwerking ongeveer 40 ms en maakt een document-ID.
5. Geeft een antwoord terug en legt de aanvraag vast.

Dit zijn echte HTTP-stappen. Er wordt echter geen PDF ingelezen, tekst geëxtraheerd of bestand opgeslagen. De naam in de aanvraag is testinvoer.

Een geldige aanvraag levert 200 op. Ongeldige invoer kan 400 opleveren, een te grote body 413 en een onbekende route 404. Een onverwachte interne fout geeft 500 met een algemene foutmelding. Het systeem publiceert daarbij niet de oorspronkelijke exceptiontekst of documentinhoud.

## Metrics, logs en traces uit elkaar houden

**Metrics** zijn getallen over de werking: hoeveel aanvragen, hoe lang ze duren en of de probe succes rapporteert. Ze helpen trends en afwijkingen te zien. In dit lab komen de bereikbaarheidscijfers van de probe; de API-dashboardcijfers worden berekend uit traces.

**Logs** beschrijven afzonderlijke gebeurtenissen: een aanvraag is afgerond, afgewezen of mislukt. Een log bevat onder andere route, duur, ernst en IDs. INFO past bij succes, WARN bij verwachte invoerafwijzing en ERROR bij een interne fout of afgebroken verbinding.

**Traces** verdelen een aanvraag in stappen. Een stap heet een span. Een geslaagde aanvraag heeft hier één HTTP SERVER-span en vier interne spans: lezen, JSON ontleden, valideren en verwerken. Ze delen één trace-ID. De responseheader `x-trace-id` helpt je dezelfde aanvraag terug te vinden in Tempo en Loki.

OpenTelemetry legt dit vast en verstuurt het. Grafana helpt je het te bekijken en te onderzoeken. Deze rollen zijn verschillend.

## De demo zelf uitvoeren

**Voorbereiding:** start Docker Desktop. Open een terminal in de projectmap. Voor de bestaande Cloud-omgeving gebruik je:

```sh
npm ci
npm run lab:up
```

De tweede opdracht controleert de vereisten, start de containers, controleert twaalf HTTP-stappen en leest een nieuwe trace en log terug. Is het lab al actief, gebruik dan `npm run lab:check`.

**Toon één geldige aanvraag:**

```sh
curl -i -X POST http://127.0.0.1:4310/api/documents/process \
  -H 'Content-Type: application/json' \
  -d '{"name":"demo.pdf"}'
```

Wijs op HTTP 200, de document-ID, request-ID en de `x-trace-id`-header. Kopieer de trace-ID en zoek hem in Tempo. Gebruik eventueel de CLI-opdrachten in de [walkthrough](walkthrough.md). Laat vervolgens dezelfde ID in Loki zien.

**Toon een verwachte afwijzing:**

```sh
curl -i -X POST http://127.0.0.1:4310/api/documents/process \
  -H 'Content-Type: application/json' \
  -d '{}'
```

De ontbrekende naam geeft 400. Leg uit dat de API hier juist doet wat hoort: ongeldige invoer weigeren. Er is geen reden om elke 400 als een interne serverstoring te behandelen.

**Vul het dashboard:** voer `npm run demo:traffic` uit. Dit maakt 40 aanvragen, waarvan acht bewust ongeldig. Het stopt vanzelf. Open het API-dashboard en kies het afgelopen halfuur. De teller bevat ook andere aanvragen in dat venster. De screenshot met 32% afwijzingen bevat bovendien de functionele gebruikersflow; er waren nul serverfouten.

**Toon een diagnose:** gebruik het bewijs van [dag 10](day-10.md). Bij de vertraagde aanvraag zat ongeveer 95% van de traceduur in `document.process`. Dat wijst de verwerkingsstap aan; alleen een totale responstijd had die locatie niet verteld.

**Toon de verbetering:** open [dag 11](day-11.md). De oude code werkte door als een client afhaakte. De nieuwe code geeft een `AbortSignal` door, zodat ondersteunde verwerking stopt. De gemiddelde resterende tijd ging van 29,73 naar 1,04 ms. Normale aanvragen werden ongeveer even snel afgehandeld. De timer van 40 ms is niet verkort.

**Toon de controle achter het resultaat:** open GitHub Actions. Eén job test de code en gebruikersflow; de andere start de Docker-omgeving tweemaal vanaf een schone checkout. Dat maakt de claim “het werkt” beter controleerbaar dan alleen een screenshot.

Voor deze demo hoef je geen nieuwe 500-fouten of waarschuwingsmails op te wekken. Een herhaling van de volledige foutoefening kan bewust met `npm run experiment:faults`, maar duurt langer en kan notificaties sturen.

## Meetwaarden juist uitleggen

- **Gemiddelde:** alle gemeten tijden opgeteld en gedeeld door het aantal metingen. Kan uitschieters verbergen.
- **p95:** de grens waar ongeveer 95% van de gemeten tijden onder ligt. De langzaamste 5% kan hoger zijn.
- **Aanvragen per seconde:** hoeveel aanvragen de test aanbiedt. Controleer ook hoeveel werkelijk uitgevoerd zijn; overgeslagen iteraties kunnen een limiet van de generator aangeven.
- **1.000 aanvragen/s:** gehaald gedurende twintig seconden met deze lichte demo. Dit bewijst geen maximale of langdurige productiecapaciteit.
- **96,5% minder resterende tijd:** geldt voor verlaten verwerking na disconnect in de gecontroleerde proef. Het betekent niet dat de hele API 96,5% sneller is of evenveel minder CPU gebruikt.
- **Groene healthcheck:** de probe kon zijn eenvoudige check uitvoeren. Dat garandeert niet dat alle andere routes of externe afhankelijkheden werken.

## Waarschuwingen en herstel

De probe controleert elke minuut. Drie regels volgen bereikbaarheid, serverfouten en trage succesvolle aanvragen. Ze hebben drempels en wachttijden. Een afwijking begint als `Pending` en wordt bij voldoende aanhouden `Firing`. Oude foutmetingen blijven nog enige tijd in het vijfminutenvenster; de API kan daarom al hersteld zijn terwijl de alert nog actief is.

De Mac en Docker moeten draaien om de lokale probe te laten werken. De standaard healthcheck veroorzaakt geen applicatietraces en requestlogs. Dat voorkomt nutteloze dubbele telemetrie. Logs en roottraces van andere aanvragen worden behouden omdat dashboards en meldingsregels daarop steunen.

## Een technisch gesprek voorbereiden

Oefen deze onderwerpen totdat je ze zonder voorlezen kunt uitleggen:

- Volg één aanvraag door `app/server.mjs`, `app/documents.mjs` en de telemetrie.
- Leg de verschillen uit tussen een geldige aanvraag, invoerfout, interne fout en clientdisconnect.
- Verklaar waarom je logs én traces gebruikt en waarom een healthcheck niet voldoende is.
- Laat zien hoe de voor/na-meting en de automatische tests de verbetering ondersteunen.
- Benoem wat nog ontbreekt voor echte PDF-verwerking en een productieomgeving.

Wees precies over AI-gebruik: Codex hielp met implementatie, tests en documentatie. Vertel welke onderdelen je inmiddels zelf kunt verklaren of aanpassen. Je hoeft niet te doen alsof je alle gebruikte libraries uit het hoofd hebt geschreven.

Een bruikbaar afsluitend verhaal is: “De waarde zit in de hele keten: iets laten draaien, meetbaar maken, een fout terugvinden en met bewijs controleren dat herstel of een wijziging werkt. Het lab is afgebakend en reproduceerbaar. Een volgende fase zou echte documentverwerking toevoegen.”
