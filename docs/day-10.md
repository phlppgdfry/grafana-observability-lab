# Dag 10 — fouten vinden en verklaren

Datum: 15 september 2026.

## Uitgevoerde oefening

Alle 22 aanvragen van de tijdelijke API hadden de verwachte status:

| Fase | Aantal | HTTP | Gemeten clientduur |
| --- | --- | --- | --- |
| Vooraf normaal | 3 | 200 | 61,7–114,6 ms |
| Ongeldige invoer | 1 | 400 | 24,4 ms |
| 350 ms extra verwerking | 12 | 200 | 396,1–480,1 ms |
| Gecontroleerde exception | 3 | 500 | 5,1–8,3 ms |
| Weer normaal | 3 | 200 | 44,9–50,4 ms |

Een fout kan dus sneller terugkomen dan een succesvol antwoord. Alleen naar responstijd kijken is onvoldoende: status, inhoud en foutsignalen horen erbij.

Beide regels begonnen gezond en `inactive`. De runner zag de serverfoutregel voor het eerst `firing` om **01:12:36 UTC** en de traagheidsregel om **01:13:07 UTC**. Beide hadden evaluatiegezondheid `ok`. De ingestelde drempels en wachttijden zijn niet verkort.

De traagheidsregel werd weer `inactive` gezien om **01:15:15 UTC**; om **01:15:47 UTC** waren beide regels weer `inactive` en gezond. De injectie zelf liep slechts van 01:09:15 tot 01:09:21 UTC. Dit toont het verschil tussen actuele API-toestand en een melding op basis van een terugkijkvenster.

## Diagnose uit Grafana

| Voorbeeld | HTTP | Verwerking in trace | Log | Conclusie |
| --- | --- | --- | --- | --- |
| Vertraging | 200 | 390,94 ms van 411,22 ms totaal | INFO | Circa 95% van de traceduur zit in `document.process` |
| Interne fout | 500 | 2,49 ms, ERROR | ERROR | Zowel verwerking als HTTP-root staan op ERROR |
| Ongeldige invoer | 400 | Geen verwerkingsspan | WARN | Gestopt tijdens validatie, geen interne ERROR |
| Herstel | 200 | 41,57 ms van 43,95 ms totaal | INFO | Normale verwerking hervat, onder de 250 ms-labgrens |

Voor alle vier voorbeelden zijn de trace-ID, parentrelaties, HTTP-status en gekoppelde log gecontroleerd. De foutantwoorden bevatten uitsluitend `Internal server error`; de geïnjecteerde exceptiontekst is niet aangetroffen in het trace/log-bewijs. Clientduur en server-span meten verschillende intervallen en hoeven niet gelijk te zijn.

De gewone API slaagde zowel vooraf als achteraf voor de volledige gebruikersflow van 12 stappen. De oefenrunner eindigde met exitcode 0. De aparte diagnoseverifier is ook op het opgeslagen live bewijs uitgevoerd: alle vier voorbeelden slaagden. Negen Node-tests slaagden, waaronder controles die een verkeerde correlatie en onterecht geclaimde vertraging/fout afwijzen.

Bewijs: [aanvragen](evidence/day-10-faults/requests.json), [meldingsgeschiedenis](evidence/day-10-faults/history.json), [diagnose](evidence/day-10-faults/diagnosis.json), [voor/na-gebruikersflow](evidence/day-10-faults/summary.json), en de vier ruwe trace/log-bestanden in [de bewijsmap](evidence/day-10-faults/).

## Wat is toegevoegd?

Een herhaalbare [foutoefening](../experiments/README.md), gestart met `npm run experiment:faults`. Een tijdelijke API gebruikt dezelfde HTTP-, log- en tracecode als de normale demo. Alleen de geïnjecteerde verwerkingsfunctie verandert: twaalf keer 350 ms extra wachttijd en drie keer een gecontroleerde exception. Vooraf en achteraf wordt normaal verwerkt; ongeldige invoer dient als vergelijking.

De normale Docker-API blijft beschikbaar. Er is geen nieuwe publieke foutroute en er worden geen bestanden opgeslagen. De bestaande credentials en alertregels blijven ongewijzigd. De oefening kan echte waarschuwingen en herstelmeldingen via het eerder ingestelde e-mailcontactpunt veroorzaken.

## Hoe lees je de signalen?

1. **Alert:** vertelt dat het vijfminutenvenster genoeg trage antwoorden of serverfouten bevat. De wachttijd voorkomt een onmiddellijke waarschuwing bij elk incident.
2. **Log:** vertelt welke aanvraag, status en ernst erbij horen. Via de trace-ID zoek je dezelfde aanvraag in Tempo.
3. **Trace:** laat zien in welke stap tijd of een fout ontstaat. Bij deze oefening moet de vertraging in `document.process` zitten; JSON lezen en valideren zijn niet de oorzaak.
4. **Herstel:** nieuwe aanvragen werken al normaal voordat de alert verdwijnt. Oude foutmetingen blijven nog even in het venster staan. `Firing` betekent dus niet altijd dat de fout op datzelfde moment nog optreedt.

HTTP 400 is hier een correcte afwijzing met WARN-log, geen interne verwerkingsfout. HTTP 500 moet een gesaneerd antwoord geven, met ERROR-log en ERROR-status op de HTTP-span én de verwerkingsspan. De echte exceptiontekst hoort niet in het antwoord of de telemetrie.

## Betekenis en grenzen

Dit bewijst diagnose van bewust geïnjecteerde fouten. Het bewijst niet dat een echte database, OCR-service of opslagdienst betrouwbaar is; die bestaan niet in deze demo. De API-availabilityregel wordt hier niet bewust geactiveerd: uitval en probeherstel zijn op dag 6 getest. De twee toepasselijke regels delen dezelfde lab-servicegegevens met de normale API, zodat de bestaande configuratie wordt geoefend.

De regelstatus wordt periodiek bemonsterd. De vastgelegde tijd is het moment waarop de runner een toestand zag, niet het exacte tijdstip van de interne overgang. Ontvangst van nieuwe e-mails wordt niet automatisch vastgesteld.

Voor dag 11 is er op basis van dag 9 nog geen aangetoonde capaciteitsbeperking. De 350 ms in deze oefening is opzettelijk toegevoegd en geen ontdekt productieknelpunt. Een verbetering moet daarom met een expliciete hypothese en een eerlijke voor/na-meting worden gekozen.
