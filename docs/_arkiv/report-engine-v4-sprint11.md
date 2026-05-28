# PILAR Report Engine v4 — Sprint 11

Mål: gjere utrekningssyntaksen meir presentabel og fjerne rå `_`-notasjon frå rapportvisinga, spesielt i PDF/print.

Endringar:

- Utrekningstekst blir normalisert med `normalizeCalculationSyntaxText()`.
- PDF viser deterministisk tekstversjon av utrekningssteg i staden for KaTeX-rendering i printmodus.
- Web behaldar interaktiv/matematisk vising, men PDF får stabil tekstsyntaks utan fragmenterte subscripts.
- Formlar i Word blir normaliserte til same rapportsyntaks.
- Typiske rå symbol blir viste som `MEd`, `VEd`, `qEd`, `γG`, `ψ0`, `Mpl,Rd`, `Vpl,Rd`, `ηM`, `ηV`.

Test spesielt oppgåve 2, 3 og 5 og søk visuelt etter `_` i PDF/Word.
