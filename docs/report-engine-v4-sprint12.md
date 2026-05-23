# PILAR Report Engine v4 — Sprint 12

## Mål

Rapportane skal ha ein konkret fagleg tittel i staden for generisk «Beregningsnotat».

## Endringar

- `ReportModel.cover.title` blir no bygd frå `inputReview.parsed_data.report_title` når Tolkar har levert dette.
- Dersom eldre run manglar `report_title`, blir tittel generert frå `calculation_type`, resultat og forespørsel.
- `ReportModel.cover.subtitle` blir bygd frå `report_subtitle` eller frå sentrale resultat/inputverdiar.
- Web/PDF-forsida brukar no `reportModel.cover.title` og `reportModel.cover.subtitle`, slik at web, PDF og Word får same tittel.
- `/mine` viser `report_title` frå input-review når dette finst for request-rader, og har betre fallback-titlar for kjende calculation types.

## Typiske titlar

- `Fritt opplagd stålbjelke — moment og skjær`
- `Lastkombinasjon i bruddgrense`
- `Kapasitetskontroll av stålbjelke IPE 300`
- `Bjelke — moment og skjær`

## Merk

For eksisterande gamle run utan `report_title` vil PILAR bruke heuristisk fallback. Nye run bør få best tittel direkte frå Tolkar-agenten.
