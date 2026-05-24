# PILAR Intelligence Agent — Sprint 25

## Mål

Sprint 25 legg til ein trygg implementeringsplan for forbedringsforslag. Agenten skal framleis ikkje endre kode autonomt. Han kan derimot gjere eit forslag om til ein konkret plan med:

- anbefalt branch
- område som blir påverka
- filer som bør lesast først
- stegvis gjennomføring
- testar
- akseptansekriterier
- rollback-plan
- eksplisitt human approval gate

## Nye filer

```txt
lib/intelligence/implementation-plan.ts
app/api/admin/intelligence/actions/[id]/plan/route.ts
docs/intelligence-agent-sprint25.md
```

## Endra filer

```txt
app/admin/intelligence/page.tsx
app/admin/intelligence/intelligence.css
lib/intelligence/types.ts
lib/intelligence/metrics.ts
```

## Viktig typefix

Sprint 25 fikser også TypeScript-feilen frå `lib/intelligence/metrics.ts`, der Supabase-genererte `GenericStringError[]` kunne kollidere med `AnyRow[]`.

Før:

```ts
return { rows: (data ?? []) as AnyRow[] };
```

Etter:

```ts
const rows = Array.isArray(data) ? (data as unknown as AnyRow[]) : [];
return { rows };
```

## Bruk

1. Gå til `/admin/intelligence`.
2. Lag eller hent dagleg rapport.
3. Finn eit forbedringsforslag.
4. Trykk `Lag implementeringsplan`.
5. Les planen før noko blir implementert.
6. Implementer manuelt eller send planen til ein coding-agent.
7. Marker tiltaket som implementert/verifisert og legg inn feedback.

## Sikkerheitsgrense

Planen inneheld alltid:

```txt
humanApprovalRequired: true
autonomousExecutionAllowed: false
```

Det betyr at denne sprinten ikkje gir agenten autonom skrive- eller deploy-rett. Han er framleis ein planleggjar og læringsagent.

## Neste sprintforslag

Sprint 26 bør leggje til eit backlog-/vekeplan-view:

- topp 5 tiltak for denne veka
- tiltak gruppert etter risk/effort/impact
- “klar for implementering”-filter
- eksport av implementeringsplan som markdown
