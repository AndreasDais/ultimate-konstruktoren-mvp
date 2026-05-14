# PILAR agent/coding rules

## Product context

PILAR is a Norwegian AI-assisted structural calculation platform.
It uses a multi-agent pipeline:

1. Input-agent / Tolkar
2. Konstruktør A
3. Konstruktør B
4. Samanliknar
5. Kontrollør
6. Rapportør

The product must never present AI output as final professional approval.
All outputs require professional review.

## Tech stack

- Next.js App Router
- React
- TypeScript
- Supabase
- Anthropic SDK
- docx
- KaTeX
- Upstash rate limiting
- Sentry

## Critical rules

1. Make the smallest safe change.
2. Do not redesign UI unless explicitly asked.
3. Do not rename database columns unless explicitly asked.
4. Do not change agent prompt behavior unless the task is about agents.
5. Preserve Bokmål/Nynorsk locale behavior.
6. Do not hardcode user-facing strings if an existing locale label system exists.
7. Preserve theme token architecture. Avoid hardcoded Tailwind colors in new UI.
8. Do not import service-role Supabase clients into client components.
9. Do not expose SUPABASE_SERVICE_ROLE_KEY or other secrets.
10. Do not create duplicate sources of truth for report data.
11. Web report, Word export, and PDF print must represent the same canonical report data.
12. Respect controller blocked_fields in every user-facing output.
13. If unsure, produce an audit/plan before coding.

## Locale rules

- Default locale is nb.
- Supported locales currently: nb, nn.
- UI locale may change after report generation.
- AI-generated report prose should stay in the original report locale.
- JSON keys must stay schema-stable and should not be translated.
- Technical terms like MEd, fcd, kNm, EC2, EC3 are language-neutral.

## Trust/Tillit rules

- Tillit is AI-pipeline confidence, not professional approval.
- Do not show "Godkjent" alone in a way that implies final engineering approval.
- Prefer "Foreløpig godkjent" / "Førebels godkjent".
- Fagperson-signering is a separate future dimension.

## Supabase rules

- Use anon/SSR clients for user-scoped access.
- Use service-role/admin client only in server-only files.
- RLS and ownership checks must be respected.
- API routes that expose user data must verify ownership or admin status.

## Before coding

List:
- files you will change
- intended behavior change
- risks
- whether DB/schema changes are needed

## After coding

Summarize:
- files changed
- behavior changed
- manual tests
- known risks