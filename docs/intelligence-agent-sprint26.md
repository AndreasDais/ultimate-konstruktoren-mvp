# Sprint 26 — Daily automation and Markdown export

Sprint 26 gjer PILAR Intelligence-agenten meir operasjonell utan å gi han autonom produksjonstilgang.

## Lagt til

- Cron-klar route: `app/api/admin/intelligence/cron/route.ts`
- Markdown-eksport: `app/api/admin/intelligence/daily/markdown/route.ts`
- Markdown-renderer: `lib/intelligence/render-markdown.ts`
- Admin-knappar på `/admin/intelligence`:
  - `Køyr dagleg agent`
  - `Last ned Markdown`
  - `Eksporter rapport som Markdown`

## Cron-route

Route:

```txt
/api/admin/intelligence/cron
```

Query-parametrar:

```txt
date=YYYY-MM-DD
force=1
planApproved=1
secret=<INTELLIGENCE_CRON_SECRET>
```

Alternativt kan token sendast som:

```txt
Authorization: Bearer <INTELLIGENCE_CRON_SECRET>
```

I produksjon bør `INTELLIGENCE_CRON_SECRET` setjast i Vercel/Supabase miljøvariablar. Dersom secret manglar i production, returnerer routen 401.

## Tryggleik

Cron-routen køyrer berre observerande/anbefalande arbeid:

- lagar eller hentar dagleg intelligence-rapport
- kan valfritt lage implementeringsplanar for godkjente/planlagde lågrisiko-forslag
- endrar ikkje produksjonskode
- pusher ikkje commits
- endrar ikkje Supabase RLS, prisar eller betalingslogikk

Responsen returnerer alltid:

```txt
autonomousExecutionAllowed: false
```

## Markdown-eksport

Route:

```txt
/api/admin/intelligence/daily/markdown?reportId=<id>
/api/admin/intelligence/daily/markdown?date=YYYY-MM-DD
```

Eksporten inneheld:

- sammendrag
- nøkkeltal
- funn per kategori
- anbefalingar
- carryover frå førre rapport
- forbedringsboard
- implementeringsplanar

Dette kan brukast som internt arkiv, Notion/Obsidian-logg eller manuelt beslutningsgrunnlag.

## Forslag til Vercel Cron

Legg til seinare i `vercel.json` dersom du vil køyre dagleg:

```json
{
  "crons": [
    {
      "path": "/api/admin/intelligence/cron?secret=$INTELLIGENCE_CRON_SECRET",
      "schedule": "0 6 * * *"
    }
  ]
}
```

Vercel støttar ikkje nødvendigvis shell-style variabelsubstitusjon direkte i `path`. Dersom ikkje, bruk Authorization-header via ekstern scheduler, eller lag ein intern proxy som sjekkar Vercel Cron-header.

## Test

```bash
npm run debug:sweep
npm run build
npm run dev
```

Opne:

```txt
/admin/intelligence
```

Test:

1. Køyr dagleg agent.
2. Last ned Markdown.
3. Opne Markdown-fila og sjekk at funn, forslag og planar er med.
