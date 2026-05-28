# Sprint 30.4 — Test-agent readiness + admin integration

## Mål

Denne sprinten koplar den eksisterande test-agenten og daily-agenten inn i pilotdashboardet, slik at `/admin/pilot` blir eit reelt kontrollrom før ekstern pilot.

## Nytt

### API

- `app/api/admin/pilot/qa-status/route.ts`

API-et les siste JSON-rapport frå:

- `qa/reports/*.json`
- `daily/reports/*.json`

og returnerer ei kompakt statuspakke med:

- QA Port 1-status
- QA Port 2-status
- tal på beståtte golden-cases
- feila cases
- regresjonar i kjende funn
- daily-agent signal
- anomalier
- største klynger

### Typar

- `lib/pilot/qa-status.ts`

Definerer delte typar for QA-status, daily-status og pilot readiness-response.

### Admin UI

- `/admin/pilot` viser no:
  - test-agent-status
  - daily monitoring-status
  - kommando for å køyre test-agent
  - kommando for daily-agent
  - feila cases
  - anomalier
  - operativ anbefaling

Alt er lagt inn med bokmål/nynorsk-copy og Stone/Graphite-støtte.

### Scripts

`package.json` får:

```json
{
  "test:golden": "tsx qa/test-agent.ts",
  "qa:golden": "tsx qa/test-agent.ts",
  "qa:smoke": "tsx qa/test-agent.ts -- --case A1 --runs 1"
}
```

## Bruk

Køyr vanlege statiske testar:

```bash
npm test
npm run lint
npm run build
```

Køyr test-agent smoke-test mot lokal server:

```bash
npm run dev
npm run qa:smoke
```

Køyr heile golden-settet:

```bash
npm run test:golden
```

Køyr daily-agent:

```bash
npm run daily:report
```

Opne så:

```txt
/admin/pilot
```

## Avgrensing

Denne sprinten køyrer ikkje QA-agenten frå browseren. Han les siste rapport frå filsystemet. Det er tryggare for pilot-MVP fordi test-agenten kan vere dyr og krev levande server + Supabase.
