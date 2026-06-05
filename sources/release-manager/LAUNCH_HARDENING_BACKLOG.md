# PILAR Launch Hardening Backlog

**Status:** docs-only inventory sprint.
**Owner:** Ops C / Release Manager.
**Mode:** Plan only. No code, route, DNS, email, provider, DB, Supabase, SQL,
repair, `db push`, or dry-run changes.

## Launch Readiness Verdict

```txt
YELLOW
```

PILAR has a GREEN controlled launch posture, but public/international launch
hardening is not complete until domain, email, security, English canonical
routes, legal/footer pages, SEO, and analytics/privacy decisions have explicit
owners and evidence.

P0.5 footer/public-shell is DONE/GREEN at `ddd6dbd`. Domain/email cutover
remains RED until provider evidence is pasted back and reviewed.

This document is not a launch approval and not professional engineering
approval.

## Current Known State

Known:

- current production launch/canary evidence has been GREEN in recent Ops checks;
- `/api/health` has been used as the read-only dependency health surface;
- existing public routes include `/`, `/heim`, `/international`, and `/vilkar`;
- P0.5 footer/public-shell is GREEN on production at `ddd6dbd`;
- the global non-admin footer is landed;
- exactly one footer appears on user-facing routes;
- `/admin` and `/admin/login` show zero footer instances;
- Norwegian Bokmal/Nynorsk support must be preserved;
- Agent LiveOps remains admin-only and manual live-read only;
- DB/Supabase migration repair remains outside launch hardening.

Unknown or not yet hardened:

- final public domain and apex/www routing policy;
- email sender domain and DNS authentication;
- launch-domain/provider cutover evidence;
- final redirect/canonical-host implementation for the launch domain;
- SEO/social preview ownership;
- analytics and privacy posture.

## P0.5 Footer/Public Shell Evidence

**Verdict:** DONE/GREEN.

**Final main/prod commit:** `ddd6dbd`.

Production browser-console pass:

- GREEN.
- No console errors.
- No hydration warnings.

Footer evidence:

- Global non-admin footer landed.
- Exactly one footer on user-facing routes.
- Zero footer instances on `/admin` and `/admin/login`.

Footer link smoke:

| Route | Result |
|---|---|
| `/about` | 200 |
| `/guide` | 200 |
| `/safety` | 200 |
| `/roadmap` | 200 |
| `/vilkar` | 200 |
| `/privacy` | 200 |
| `/contact` | 200 |
| `/terms` | 200 |

Public-shell language evidence:

| Surface | Routes | Result |
|---|---|---|
| English shell | `/home`, `/international`, `/privacy`, `/terms`, `/about` | Clean |
| Norwegian shell | `/heim`, `/vilkar` | Clean |

Trust-framing evidence:

- No final professional approval claim observed.
- No compliance guarantee observed.
- No engineer-replacement claim observed.
- Professional-review framing remains visible.

Domain/email cutover remains RED until provider evidence is pasted back.

## P0 Checklist

| Area | Required work | Owner | Evidence needed |
|---|---|---|---|
| Domain/DNS | Choose final domain; configure Vercel custom domain; decide apex vs `www`; enable HTTPS; document old-domain redirects. | Integrator + Ops C + domain owner | Vercel domain status, HTTPS proof, redirect map, rollback note |
| Domain/DNS | Review environment variables and allowed origins for the new domain. | Runtime B + Ops C | Env/origin checklist with no secret values copied |
| Email/Auth | Configure sender domain DNS: SPF, DKIM, DMARC. | Ops C + email/domain owner | DNS screenshots or provider verification output |
| Email/Auth | Decide transactional email provider if auth/contact flows require it. | Integrator + Ops C | Provider decision, sender identity, test email evidence |
| Email/Auth | Create admin/contact inbox and confirm ownership. | Human/operator | Inbox address, access owner, escalation path |
| Email/Auth | Review auth/email redirect URLs for new domain and old-domain redirects. | Runtime B + Ops C | Redirect URL checklist; no open redirect behavior |
| Security | Run secret scan and confirm no secrets in repo, logs, or public bundles. | Ops C / Security | Scan output summary |
| Security | Run dependency audit and triage critical/high issues. | Ops C / Security | Audit output and owner map |
| Security | Review admin route protection and middleware for `/admin/**` and `/api/admin/**`. | Runtime B + Ops C | Route protection note |
| Security | Verify service-role boundary remains server-only and never imported by client components. | Runtime B + Ops C | Search/audit output |
| Security | Review Supabase RLS and ownership for user/report/admin data. | Runtime B + Ops C | Read-only audit summary; no SQL mutation |
| Security | Confirm rate limits on cost-bearing or abuse-sensitive routes. | Runtime B | Route/rate-limit matrix |
| Security | Define CSP/security header plan before broad public traffic. | Ops C + UI | Header inventory and implementation owner |
| Security | Confirm Sentry/logging redacts raw prompts, provider payloads, PII, secrets, and stack context with sensitive data. | Ops C + Runtime B | Logging safety note |
| Security | Document backup/recovery posture and rollback contacts. | Ops C + Integrator | Backup/PITR/recovery runbook reference |
| English routes | Approve canonical English route list: `/home`, `/terms`, `/privacy`, `/about`, `/roadmap`, `/guide`, `/safety`, `/contact`. | UI + Integrator + Ops C | P0.5 shell evidence GREEN at `ddd6dbd`; launch-domain redirect policy still depends on P0.4 |
| Norwegian aliases | Preserve `/heim` and `/vilkar` as redirects, aliases, or locale routes. | UI + Integrator | P0.5 shell evidence GREEN at `ddd6dbd`; aliases remain preserved |
| Footer/legal | Ship minimum footer pages: Terms, Privacy, Contact, Safety/professional-review disclaimer. | UI + Ops C review | DONE/GREEN in P0.5 at `ddd6dbd` |

## P1 Checklist

| Area | Required work | Owner | Evidence needed |
|---|---|---|---|
| Footer/info | About PILAR page. | UI + Founder | Reviewed page copy |
| Footer/info | Roadmap page with uncertainty and no auto-roadmap claims. | UI + Product | Reviewed roadmap copy |
| Footer/info | How it works / user guide page. | UI + Runtime B + Ops C | User-guide copy with professional-review boundary |
| Footer/info | Bruksanvisning/Norwegian support path where needed. | UI + Locale reviewer | nb/nn route or content plan |
| English routes | Implement canonical route redirects without breaking existing links. | UI + Integrator | Route smoke matrix |
| SEO | Metadata for canonical pages. | UI | Title/description review |
| SEO | Sitemap and robots policy. | UI + Ops C | Generated/served sitemap and robots check |
| SEO | Social preview image/text. | UI + Founder | Preview card check |
| Analytics/privacy | Decide analytics provider or no-analytics posture. | Integrator + Ops C | Privacy decision record |
| Analytics/privacy | Cookie/consent posture if analytics is enabled. | Ops C + UI | Privacy/legal review |

## P2 Checklist

| Area | Required work | Owner | Evidence needed |
|---|---|---|---|
| Domain/DNS | Clean up old-domain references after redirect stability window. | Ops C + Integrator | Link inventory |
| Email | Add team aliases or role inboxes if support volume requires it. | Human/operator | Inbox ownership map |
| Security | Add scheduled security review cadence. | Ops C | Calendar/process note |
| SEO | Structured data if useful and truthful. | UI + Ops C | Search preview review |
| Content | International launch copy polish and examples. | UI + RESONANS/Vaktar | Vaktar review packet |
| Analytics/privacy | Add launch metrics dashboard only after privacy posture is approved. | Ops C + Product | Read-only dashboard plan |

## Evidence Needed Before Public/International Launch GREEN

```txt
domain_dns:
  final_domain:
  apex_www_policy:
  vercel_domain_status:
  https_status:
  old_domain_redirects:
  allowed_origins_review:

email_auth:
  sender_domain:
  spf:
  dkim:
  dmarc:
  transactional_provider:
  contact_inbox:
  auth_redirect_urls:

security:
  secret_scan:
  dependency_audit:
  admin_route_protection:
  service_role_boundary:
  supabase_rls_ownership:
  rate_limits:
  csp_security_headers:
  sentry_logging_redaction:
  backup_recovery:

routes_content:
  english_canonical_routes:
  norwegian_aliases:
  no_broken_links:
  nb_nn_support:
  footer_pages:
  professional_review_disclaimer:

seo_privacy:
  metadata:
  sitemap:
  robots:
  social_preview:
  analytics_privacy_decision:
```

## First Safe Implementation Order

1. Human/Integrator decides final domain, email sender domain, and provider
   owners.
2. Ops C writes a domain/email cutover runbook with rollback and no secret
   values.
3. Ops C / Security runs read-only security inventory: secrets, deps, admin
   routes, service-role boundary, RLS/ownership, logs, rate limits.
4. UI creates minimum footer/legal pages with Ops truth review.
5. UI/Integrator implements English canonical route strategy while preserving
   `/heim`, `/vilkar`, and nb/nn support.
6. Ops C runs route/link/canary checklist and refreshes launch checklist.
7. UI/Ops adds SEO, sitemap, robots, and social preview.
8. Integrator performs final domain cutover only after P0 evidence is complete.

## STOP Conditions

Stop and route to Ops/Integrator if any proposed sprint:

- edits routes before the English canonical route decision is approved;
- removes `/heim`, `/vilkar`, or nb/nn support before redirects or aliases are
  tested;
- changes DNS, email provider, sender domain, or Vercel domain without a
  rollback plan;
- launches email without SPF, DKIM, and DMARC evidence;
- changes auth redirect URLs without reviewing allowed origins;
- imports service-role Supabase clients into client components;
- weakens admin route protection;
- exposes raw prompts, raw provider payloads, PII, secrets, or unsafe stack
  context in Sentry/logs;
- runs DB/Supabase CLI, SQL, repair, `db push`, or dry-run;
- implies final professional approval, compliance guarantee, or engineer
  replacement in footer/legal/marketing copy;
- adds analytics without a privacy decision.

## Owner Map

| Owner | Responsibility |
|---|---|
| Integrator / release owner | Domain cutover decision, final GO/NO-GO, rollback ownership |
| Ops C / Release Manager | Hardening backlog, security/process gates, launch evidence, STOP conditions |
| Runtime B | Auth redirects, service-role boundary, rate limits, RLS/ownership evidence |
| UI lane | Footer/legal/info pages, route implementation, redirects, metadata, social preview |
| Human/operator | Domain registrar, email inbox ownership, provider accounts |
| RESONANS/Vaktar | Future public-copy review only; no auto-posting or route implementation |

## Current Verdict

```txt
YELLOW until P0 evidence is complete.
```

No item in this backlog authorizes code changes, DNS changes, email changes,
DB/Supabase work, route changes, or public claims beyond the current reviewed
product truth.
