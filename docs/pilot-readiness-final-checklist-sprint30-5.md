# Sprint 30.5 — Pilot readiness final checklist

## Mål

Denne sprinten gjer `/admin/pilot` til eit tydeleg kontrollrom før ekstern pilot. I staden for ei rein manuell sjekkliste viser sida no ein kombinert pilotstatus basert på:

- test-agent / golden-set
- daily-agent / dagleg overvaking
- Supabase-migrasjonar og pilotfeedback
- datakjeldevarsel
- admin-dashboard
- manuelle sistekontrollar for eksport, språk/tema og production deploy

## Endra filer

```txt
app/admin/pilot/page.tsx
app/admin/pilot/pilot.css
app/api/admin/pilot/qa-status/route.ts
package.json
docs/pilot-readiness-final-checklist-sprint30-5.md
```

## Kva som er nytt

### Automatisk pilotstatus

`/admin/pilot` viser no ei eiga blokk: **Klar for pilot?**

Statusen kan vere:

- Klar for kontrollert pilot
- Nesten klar — manuell sjekk gjenstår
- Ikke klar — blokkering må løses

### Automatiske sjekkar

Sida vurderer automatisk:

- om test-agenten er grøn
- om det finst farlege regresjonar
- om daily-agenten har fersk rapport
- om pilotfeedback/Supabase fungerer
- om admin-dashboardet svarar
- om datakjelder gir varsel

### Manuelle sjekkar

Sida viser også manuelle sistekontrollar:

- rapporteksport: PDF, Word, LaTeX og beregningsark
- språk og tema: bokmål/nynorsk og Slate/Stone/Graphite
- production deploy: lenke, login og miljøvariablar

## Kommandoar

```bash
npm test
npm run lint
npm run build
npm run qa:smoke
npm run test:golden
npm run daily:report
```

## Viktig

Denne sprinten gjer ikkje PILAR autonom. Den samlar status og gjer det lettare å sjå om systemet er klart før du inviterer 5–15 pilotusear.
