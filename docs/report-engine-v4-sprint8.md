# Report Engine v4 — Sprint 8

Mål: bruke testpakken med PDF/Word frå oppgåve 1, 2, 3 og 5 til å rydde dei siste typografi-problema.

## Endringar

- Hindrar at PDF-tabellar deler symbol som `M_Ed`, `E_d,dim`, `γ_G,6.10a` og `ψ_0,q` opp i enkeltteikn.
- Normaliserer fleire nøkkeltypar frå agentane:
  - `F_Ed,dim` → `E_d,dim`
  - `q_Ed_NA_6_10a` → `q_Ed,NA 6.10a`
  - `psi_0_snolast` → `ψ_0,s`
  - `psi_0_nyttelast_B` → `ψ_0,q`
  - `eta_M` / `eta_V` → `η_M` / `η_V`
  - `M_pl_Rd` / `V_pl_Rd` → `M_pl,Rd` / `V_pl,Rd`
- Forsida prioriterer kapasitetsrapportar betre ved å løfte fram utnyttingsgrader dersom dei finst.
- Små avrundingsavvik, til dømes `15,075` mot `15,08`, blir behandla som samsvar i kontrolltabellen.

## Test

Køyr:

```bash
npm run debug:sweep
npm run build
npm run dev
```

Last ned PDF/Word for oppgåve 1, 2, 3 og 5 på nytt. Sjekk særleg resultattabellar og kontrolltabellar i PDF.
