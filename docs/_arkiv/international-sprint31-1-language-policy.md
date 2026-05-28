# Sprint 31.1 — International language policy cleanup

This sprint adjusts the international pilot model.

## Decision

The international version defaults to English UI, but agent output should follow the user's prompt language.

Language and engineering standards are separate:

- UI/default language: English
- Agent output: same language as the user's prompt
- Fallback language: English if the prompt is unclear or mixed
- Engineering standard: selected by the user and stored separately

## Why

A user may write in Norwegian while selecting a US standard profile, or write in English while selecting Eurocode/Norway. The language must not decide the engineering code.

## Files changed

- `app/international/page.tsx`
- `app/international/international.css`
- `app/api/engineering-context/route.ts`
- `lib/engineering-context/types.ts`
- `lib/engineering-context/profiles.ts`
- `lib/engineering-context/prompt.ts`
- `supabase/migrations/20260524000001_engineering_context_language_policy.sql`

## Safety rule

Agents must not silently use Eurocode, AISC/ASCE/ACI or any other regional standard unless that standard profile is selected or explicitly supplied by the user.
