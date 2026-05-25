# PILAR Debugging Skill

Dette er arbeidsflyten eg skal bruke når eg debuggar PILAR-koden. Målet er å finne minste trygge endring, ikkje redesigne.

## 1. Start med trygg kartlegging

1. Les `AGENTS.md` før endringar.
2. Identifiser stack frå `package.json`, `next.config.ts`, `tsconfig.json` og relevante route-/component-filer.
3. Skriv ned:
   - kva filer som sannsynlegvis må endrast
   - kva åtferd som skal endrast
   - risiko
   - om DB/schema må endrast

## 2. Reproduser feilen før koding

Køyr alltid i denne rekkjefølgja:

```bash
npm ci
npm test
npm run lint
npx tsc --noEmit --pretty false
npm run build
```

Dersom `npm run build` heng, køyr separat:

```bash
npx tsc --noEmit --pretty false
npm run lint
```

og noter nøyaktig kvar build stoppar.

## 3. Klassifiser funn

Bruk desse kategoriane:

- **Blocker:** hindrar deploy/build/runtime.
- **Sikkerheit:** hemmeligheiter, service-role-lekkasje, manglande ownership/RLS-kontroll.
- **Datakonsistens:** fleire kjelder for same rapport-/agentdata.
- **AI-tillit:** output kan sjå ut som fagleg godkjenning utan review.
- **UI/UX:** feilvising, locale, tema, responsivitet.
- **Teknisk gjeld:** lint-warningar, deprecated API, ubrukte import.

## 4. Endringsreglar

- Endre minst mogleg.
- Ikkje endre agentpromptar utan at feilen faktisk ligg der.
- Ikkje endre Supabase-schema utan eksplisitt grunn.
- Ikkje legg service-role-klient i client components.
- Ikkje hardkod språkstrengar om eksisterande locale-system dekkjer behovet.
- Sørg for at webrapport, Word-export og print/PDF held same canonical report data.
- Respekter `blocked_fields` i alle useflater.

## 5. Verifikasjon etter endring

Etter patch:

```bash
npm test
npm run lint
npx tsc --noEmit --pretty false
```

Prøv også `npm run build`. Dersom build heng i Next sin interne TypeScript-fase while `tsc` er grønt, noter dette som eige build-tooling-problem.

## 6. Sluttrapport-format

Rapporter alltid:

- filer endra
- kva som er fiksa
- kommandoar køyrde og resultat
- kjende risikoar
- neste beste steg
