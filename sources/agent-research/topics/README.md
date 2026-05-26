# PILAR Agent Research Topics

Denne mappa inneheld research-tema for PILAR Research & Agent Strategy Agent.

Målet er å samle eksterne signal og omsetje dei til konkrete, trygge PILAR-agentar utan å endre produksjonskode direkte.

## Arbeidsregel

Kvart tema bør ende i eitt `Agent Opportunity Memo` basert på:

```txt
sources/agent-research/AGENT_OPPORTUNITY_MEMO_TEMPLATE.md
```

## Foreslåtte første tema

| Tema | Kvifor relevant for PILAR | Prioritet |
|---|---|---|
| AI QA agents for web apps | Kan gi Synthetic User / E2E-agent for input → rapport → PDF/Word | P0 |
| LLM eval systems | Kan gi Eval Agent og benchmarksett | P0 |
| Agent observability | Kan gi trace-/failure-analyse for kvar run | P1 |
| Guardrails for agent actions | Kan stoppe farleg output før brukaren ser det | P1 |
| Company brain / knowledge agent | Kan gjere feil, rettingar og fagreview til varig læringsdata | P2 |
| Standards monitoring | Kan varsle om endringar i standardar utan å finne på tabellverdiar | P2 |

## Viktig avgrensing

Research-agenten skal i v0.1 vere read-only:

```txt
- ikkje endre kode
- ikkje endre prompts
- ikkje endre database schema
- ikkje auto-merge
- ikkje auto-deploy
```
