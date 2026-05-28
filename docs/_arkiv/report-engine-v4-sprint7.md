# PILAR Report Engine v4 — Sprint 7

## Mål

Sprint 7 er ein polish-/stabiliseringssprint for rapportmotoren etter at Word og deler av web/PDF er kopla på `ReportModel`.

Fokuset er:

1. betre print-rytme i PDF
2. eigen forside i PDF
3. mindre rå teknisk notasjon i prosa
4. betre prioritering av nøkkelresultat på forsida
5. meir robuste labelar i tabellar

## Endringar

### 1. Notasjonsnormalisering

`cleanReportText()` normaliserer no vanlege rå agent-nøklar i prosa, til dømes:

- `Ed_dim` → `E_d,dim`
- `Ed_6_10a` → `E_d,6.10a`
- `psi0_q` → `ψ_0,q`
- `gamma_G_6_10a` → `γ_G,6.10a`
- `MEd` → `M_Ed`
- `VEd` → `V_Ed`

Dette reduserer inntrykket av at rapporten er ein rå JSON-/agentdump.

### 2. Betre nøkkelresultat på forsida

Forsida prioriterer no hovudresultat og grunninput framfor interne kontrollvariantar.

For lastkombinasjon betyr det typisk:

- `E_d,dim`
- `q_k`
- `g_k`
- `s_k`

framfor å bruke plass på fleire interne `6.10a/6.10b`-variantar.

### 3. PDF-forsida

Print-CSS tvingar no første seksjon etter forsida til ny side:

```css
.rapport-forside + .rapport-section {
  break-before: page;
}
```

Dette gjer forsida meir bevisst som ein rapportforside med QR, metadata, nøkkelresultat, tillit og disclaimer.

### 4. Tabell- og labelpolish

Resultat- og kontrolltabellar i PDF toler lengre etikettar betre og skal ikkje skape like mange rare linjeskift.

## Test

Etter installering:

```bash
rm -rf .next
npm run debug:sweep
npm run build
npm run dev
```

Kontroller særleg:

- PDF side 1 er ei rein forside.
- QR/pipeline-kort er synleg på forsida.
- Sammendrag startar på neste side.
- Prosa viser ikkje rå `Ed_dim`, `psi0_q`, `gamma_G` osv.
- Word har framleis kort kontrolltabell.
