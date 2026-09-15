# 14-daagse roadmap

| Dag | Werk | Bewijs |
| --- | --- | --- |
| 1 | Eigen repo, demo, CLI-login, trial controleren, healthcheck | Repo + geslaagde check + verbindingsstatus |
| 2 | OpenTelemetry op API-flow — voltooid | Echte 200/400/404-aanvragen in Grafana Tempo; [bewijs](day-02.md) |
| 3 | Verkeer, fouten en responstijden — voltooid | [Live dashboard en bewijs](day-03.md): 40 aanvragen, 20% afwijzingen, p95 56,4 ms |
| 4 | Logs met omgeving en release — voltooid | [Logs en tracecorrelatie geverifieerd in Loki](day-04.md) |
| 5 | Traces uitbreiden naar verwerking — voltooid | [Vier interne stappen en foutpaden geverifieerd](day-05.md) |
| 6 | Meldingen configureren en testen — voltooid | [Regels geactiveerd, hersteld en testmail ontvangen](day-06.md), in spammap |
| 7 | Gebruikersflow automatisch testen — voltooid | [12 HTTP-stappen en automatische CI-controle](day-07.md) |
| 8 | Begrensde k6-test — voltooid | [Nulmeting: 5 aanvragen/s, p95 56,6 ms, geen onverwachte fouten](day-08.md) |
| 9 | Gecontroleerd belasting verhogen — voltooid | [Tot 1.000 aanvragen/s getest; binnen de testlimiet geen prestatiegrens gevonden](day-09.md) |
| 10 | Tijdelijke fouten en vertraging — voltooid | [Twee regels geactiveerd en hersteld; vier trace/log-diagnoses geverifieerd](day-10.md) |
| 11 | Onnodige verwerking stoppen — voltooid | [Annulering: 29,73 → 1,04 ms resterende verwerking na verbreken verbinding](day-11.md) |
| 12 | Configuratie reproduceerbaar toepassen — voltooid | [Vaste lab-commando's, herhaalde Cloud-start/toepassing en schone Docker-setup in CI](day-12.md) |
| 13 | Logs, metrics, sampling en frequenties afstellen | Verbruik afgestemd op blijvend plan |
| 14 | Walkthrough, screenshots en architectuur | Toonbaar project |

De trial eindigt op **21 september 2026**, bevestigd via de accountmelding door de gebruiker. Rond de evaluatie en afstemming op Free uiterlijk 20 september af. Geen automatische dagelijkse uitvoering ingepland.
