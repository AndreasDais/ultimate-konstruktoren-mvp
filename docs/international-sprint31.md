# Sprint 31 — Engineering Context + English Pilot Mode

## Goal

Add the foundation for international PILAR without claiming full international code compliance.

This sprint introduces a reusable `EngineeringContext` model and a public `/international` page where users can select:

- report language: Bokmål, Nynorsk or English
- country / region
- standard profile
- unit preference
- notation style
- standard support level

## Added files

```txt
lib/engineering-context/types.ts
lib/engineering-context/profiles.ts
lib/engineering-context/prompt.ts
lib/engineering-context/index.ts
app/international/page.tsx
app/international/international.css
app/api/engineering-context/route.ts
supabase/migrations/20260524000000_engineering_context_events.sql
docs/international-sprint31.md
```

## Safety principle

The selected standard profile is context, not proof of full support.

PILAR should not claim full compliance with AISC, ASCE, ACI, UK NA, Canadian or Australian standards until dedicated calculation logic and verification has been implemented.

## Standard support levels

```txt
supported      Fully supported for relevant pilot workflow
partial        Partially supported; manual verification required
experimental   Workflow feedback only; not validated for design
not_supported  Ask clarifying questions; avoid code-specific claims
```

## Agent integration

The new helper:

```ts
buildEngineeringContextPromptBlock(context)
```

produces a strict prompt block for agents:

- answer in selected language
- do not silently mix standards
- do not claim full compliance for experimental standards
- always require professional verification

## Install

Run the SQL migration in Supabase:

```txt
supabase/migrations/20260524000000_engineering_context_events.sql
```

Then locally:

```bash
rm -rf .next
npm run debug:sweep
npm run build
npm run dev
```

Open:

```txt
/international
```

## Next sprint

Sprint 32 should connect the selected context to the workbench and agent pipeline.
