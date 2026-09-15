# Experimenten

Dag 10 gebruikt synthetische aanvragen op een afzonderlijke API die uitsluitend aan `127.0.0.1` op een vrije poort bindt. De normale Docker-API en probe blijven draaien. Er wordt geen foutknop of extra route in de applicatie toegevoegd.

```sh
npm run experiment:faults
```

Vereist: het actieve lab met telemetrie, Docker Compose, `gcx --context lab` met bestaande login, de twee dag-6-regels en de bestaande `.local/cloud-token`. De runner leest de OTLP-instellingen en tokenfilelocatie uit de Compose-configuratie; de tokeninhoud wordt niet in rapporten of Git opgenomen.

**Deze opdracht maakt echte lablogs en traces en kan via `document-lab-email` waarschuwingen en herstelmeldingen sturen.** De test begint alleen als de regels voor serverfouten en traagheid gezond en inactief zijn.

| Fase | Aanvragen | Verwacht |
| --- | --- | --- |
| Vooraf | 3 normaal | HTTP 200, circa 40 ms verwerking |
| Ongeldige invoer | 1 zonder naam | HTTP 400, WARN, geen ERROR-span |
| Vertraging | 12 met 350 ms extra wachttijd | HTTP 200, vertraging in `document.process`, latencyregel actief |
| Verwerkingsfout | 3 geïnjecteerde exceptions | Gesaneerde HTTP 500, ERROR-log en ERROR op root/verwerking |
| Herstel | 3 normaal | HTTP 200, verwerking onder 250 ms |

De tijdelijke server sluit in `finally` en flusht de exporters. Het kindproces heeft een deadline van 30 seconden. Daarna worden maximaal 24 keer, met 30 seconden tussenruimte, de regelstatussen gelezen. Beide regels moeten `firing` bereiken en vervolgens `inactive` worden. Queries hebben eigen timeouts; de totale doorlooptijd kan daardoor langer zijn dan twaalf minuten. Voor en na de oefening draait bovendien de dag-7-gebruikersflow tegen de normale API.

De runner haalt vier voorbeelden op uit Tempo en Loki. De verifier controleert trace-ID's, parentrelaties, statuscodes, ernst, de plaats van de vertraging en herstel van de verwerkingsduur. Een losse HTTP-status of aanwezige trace-ID is onvoldoende bewijs. Bij een ontbrekende observatie, queryfout of mislukt herstel geeft de opdracht een niet-nul exitcode.

Uitvoer: een nieuwe `test-results/day-10-<timestamp>/` met `requests.json`, `history.json`, vier trace/log-bestanden en `summary.json`. Een mislukte run kan gedeeltelijk bewijs bevatten; start niet blind opnieuw als een regel nog actief is. Er worden geen regels of wachttijden aangepast. Het bewaren van een bewijsbestand bevestigt geen e-mailontvangst.

Zie [resultaten en diagnose van dag 10](../docs/day-10.md).
