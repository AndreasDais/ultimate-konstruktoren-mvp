# PILAR Agent Research Memos

Denne mappa inneheld memo generert av eller for **PILAR Research & Agent Strategy Agent**.

I v0.1 er research-agenten **read-only/suggest-only**:

```txt
- kan lese topic-filer
- kan lage Agent Opportunity Memo
- kan foreslå sprintar
- kan foreslå eval-kriterium
- skal ikkje endre app-kode
- skal ikkje endre prompts i produksjon
- skal ikkje endre database schema
```

## Standard kommando

```bash
node scripts/create-agent-opportunity-memo.mjs ai-agent-testing
```

Dette lagar til dømes:

```txt
sources/agent-research/memos/agent-opportunity-ai-agent-testing.md
```

## Memo-regel

Kvart memo skal skilje mellom:

```txt
Fakta        = ting som er sett i kjelder eller repo
Tolking      = PILAR-spesifikk mapping
Anbefaling   = kva vi bør bygge eller ikkje bygge
Risiko       = kva som kan gå gale
Aksepttest   = korleis vi veit om sprinten fungerte
```

## Human-in-the-loop

Memo kan brukast som planleggingsgrunnlag, men ikkje som automatisk godkjenning for kodeendring.
