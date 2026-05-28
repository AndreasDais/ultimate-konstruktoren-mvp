# Sprint 32 — Engineering context kobla til Workbench og agent-pipeline

## Mål

Koble konteksten frå `/international` inn i faktisk pipeline, utan å love full internasjonal kode-støtte.

## Implementert

- Workbench les `pilar-engineering-context-v2` frå `localStorage`.
- Tolkar får `engineering_context` både ved tekstinput og filinput.
- Init-run får konteksten i payloaden for vidare utviding.
- Engineer A/B får same kontekst som Tolkar.
- Comparator og Controller får same kontekst.
- Rapportør får same kontekst frå rapportloading-komponenten.
- Agentane får ein felles promptblokk med:
  - språkregel: svar på same språk som useen sin prompt
  - fallback: engelsk ved uklart/blanda språk
  - region
  - vald standardprofil
  - supportnivå
  - einingar og notasjon
  - eksplisitt forbod mot å blande Eurokode/US-standardar stille
- Eksisterande norsk flyt er uendra når ingen engineering context er lagra.

## Filer

- `lib/engineering-context/agent.ts`
- `lib/engineering-context/client.ts`
- `lib/engineering-context/prompt.ts`
- `app/page.tsx`
- `app/rapport/[run_id]/RapportLoadingPilelinja.tsx`
- `app/api/input-agent/route.ts`
- `app/api/agent-a/route.ts`
- `app/api/agent-b/route.ts`
- `app/api/agent-c/route.ts`
- `app/api/agent-d/route.ts`
- `app/api/agent-e/route.ts`

## Test

1. Gå til `/international`.
2. Vel United States + AISC / ASCE / ACI.
3. Lagre context.
4. Gå til `/pilot` eller `/`.
5. Skriv ein enkel prompt på engelsk.
6. Sjekk at agentane svarar på engelsk og markerer standarden som experimental.
7. Vel Norway + Eurocode Norway.
8. Skriv ein norsk prompt.
9. Sjekk at norsk pilotflyt framleis fungerer.

## Viktig avgrensing

Dette er ikkje full støtte for internasjonale standardar. Det er kontekst-gating og språk-/standardpolicy for pilot.
