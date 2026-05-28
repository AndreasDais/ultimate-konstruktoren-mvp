# Sprint 33.1 — Tolkar JSON contract hardening

Goal: prevent the interpreter from breaking the workbench when it returns markdown fences, prose before JSON, or minor JSON formatting mistakes.

## Included

- New helper: `lib/json/extract-json.ts`
- Unit tests: `lib/json/extract-json.test.ts`
- Patch script: `scripts/apply-sprint33-1-json-hardening.mjs`
- Tolkar system prompt hardening:
  - JSON only
  - no markdown fences
  - no prose before/after JSON
  - no translated schema keys
  - no trailing commas
- Runtime fallback parser:
  - direct JSON
  - fenced JSON
  - JSON embedded in prose
  - balanced object extraction
  - trailing comma repair
- Tolkar model settings:
  - `temperature: 0.1`
  - `max_tokens: 3072`

## Apply

```bash
node scripts/apply-sprint33-1-json-hardening.mjs
npm test -- lib/json/extract-json.test.ts
rm -rf .next
npm run debug:sweep
npm run build
npm run dev
```

## Acceptance criteria

- The W12x26 AISC/ASCE test no longer fails with `Klarte ikkje parse svaret som JSON`.
- If the model returns fenced JSON, the API still parses it.
- If the model returns prose around a JSON object, the API extracts the object.
- If the model returns invalid non-JSON, the API returns a controlled 502 with raw preview for debugging.
