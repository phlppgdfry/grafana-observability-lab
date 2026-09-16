# Projectstatus en vervolg

Bijgewerkt: 16 september 2026.

## Afgerond

Alle veertien werkstappen zijn uitgevoerd. De [roadmap](roadmap.md) bewaart de ontwikkeling per stap; het [eindverslag](day-14.md) bundelt de verificatie. De README en [Nederlandse projectsamenvatting](project-summary.nl.md) presenteren het resultaat voor reviewers, recruiters en hiring managers.

De historische verslagen en meetwaarden blijven ongewijzigd als bewijs van hun uitvoeringsdatum. Een nieuwe documentatie-update betekent niet dat alle historische experimenten opnieuw zijn uitgevoerd.

De repository is op 16 september 2026 op uitdrukkelijk verzoek openbaar gemaakt. Code en opgeslagen bewijs zijn publiek; de live Grafana-stack en lokale API zijn daarmee niet publiek beschikbaar.

## Openstaande beheeracties

| Actie | Wanneer | Hoe |
| --- | --- | --- |
| Werkelijk accountplan en verbruik controleren | Rond trial-einde op 21 september 2026 | Grafana-account controleren en `npm run lab:usage` uitvoeren; niet automatisch ingepland |
| Demonstratie zelf doorlopen | Voor een gesprek of presentatie | De [walkthrough](walkthrough.md) volgen en de ontwerpkeuzes uitleggen |
| Dependencies, credentials en gebruik beheren | Bij wijzigingen en periodiek | CI, setupchecks en gebruiksrapporten controleren |

De Mac en Docker moeten actief blijven voor de lokale API en probe. Stoppen of slaapstand kan bereikbaarheidsmeldingen veroorzaken. De opgeslagen screenshots blijven zichtbaar, ook als de live omgeving niet draait.

## Mogelijke volgende fase — nog niet gebouwd

Echte PDF-upload en tekstextractie zijn een mogelijke uitbreiding. Daarvoor zijn nieuwe eisen nodig voor bestandsgrootte, toegestane bestandstypen, opslag, toegang, verwerking en foutafhandeling. Authenticatie, duurzame opslag, een publieke deployment en hoge beschikbaarheid vallen buiten het afgeronde lab.

De volgende stap is dus een afzonderlijke productuitbreiding, niet een onafgeronde stap van het observability-plan. Er is voor deze portfolio-update geen nieuwe documentverwerkingsfunctie of betaald Cloud-plan toegevoegd.
