# Sprint 28 — Admin locale + theme polish

Denne sprinten gjer admin-sidene meir konsistente med resten av PILAR.

## Endringar

- `/admin` use no aktivt språkval frå `useLocale()`.
- `/admin/intelligence` har norsk bokmål/nynorsk UI-copy for knappar, labels, statusar, feedback-felt og tomtilstandar.
- `ThemeToggle` er lokalisert og viser Graphite som aktivt val.
- `report_export` er lagt til som gyldig intelligence-kategori, slik at implementeringsplanar for PDF/Word/LaTeX/beregningsark ikkje stoppar TypeScript-build.

## Test

1. Byt språk i headeren til bokmål og nynorsk.
2. Opne `/admin` og sjå at intro, kort og CTA-ar følgjer språkvalet.
3. Opne `/admin/intelligence` og sjå at admin-UI, statusar og knappar følgjer språkvalet.
4. Byt tema mellom Slate, Stone og Graphite.
5. Køyr:

```bash
rm -rf .next
npm run debug:sweep
npm run build
```
