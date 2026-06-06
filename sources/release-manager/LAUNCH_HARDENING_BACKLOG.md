# PILAR Launch Hardening Backlog

**Status:** docs-only inventory sprint.
**Owner:** Ops C / Release Manager.
**Mode:** Plan only. No code, route, DNS, email, provider, DB, Supabase, SQL,
repair, `db push`, or dry-run changes.

## Launch Readiness Verdict

```txt
GREEN
```

PILAR has a GREEN controlled public-launch posture for P0 launch hardening.
This is an operational launch readiness verdict only; it is not professional
engineering approval.

P0.4 domain/email readiness is DONE/GREEN at `061e4ea`. P0.5
footer/public-shell is DONE/GREEN at `ddd6dbd`.

This document is not a launch approval and not professional engineering
approval.

## Current Known State

Known:

- current production launch/canary evidence has been GREEN in recent Ops checks;
- `/api/health` has been used as the read-only dependency health surface;
- existing public routes include `/`, `/heim`, `/international`, and `/vilkar`;
- P0.5 footer/public-shell is GREEN on production at `ddd6dbd`;
- P0.4 domain/email readiness is DONE/GREEN on production at `061e4ea`;
- canonical launch domain is `https://www.pilarcalc.com`;
- apex `https://pilarcalc.com` redirects 308 to the canonical `www` host;
- `https://pilar-mvp.vercel.app` remains a valid fallback host;
- `sitemap.xml` and `robots.txt` reference `https://www.pilarcalc.com`;
- old Vercel base URL is absent from live sitemap/robots output;
- `/contact`, `/privacy`, `/terms`, and `/vilkar` show
  `pilot@pilarcalc.com` in mailto and visible text;
- `pilot@pilar.no` is absent from the reviewed repo/prod contact/legal copy;
- the global non-admin footer is landed;
- exactly one footer appears on user-facing routes;
- `/admin` and `/admin/login` show zero footer instances;
- downloadable artifact QA trust-boundary blocker is CLOSED/GREEN on production
  at `43a74c2`;
- Norwegian Bokmal/Nynorsk support must be preserved;
- Agent LiveOps remains admin-only and manual live-read only;
- DB/Supabase migration repair remains outside launch hardening.

Unknown or not yet hardened:

- DMARC is intentionally `p=none` for launch monitoring and should be hardened
  later after mail stability is confirmed;
- SEO/social preview ownership remains P1/P2 polish;
- analytics and privacy posture remains P1/P2 unless analytics is enabled.

## P0.4 Domain/Email Readiness Evidence

**Verdict:** DONE/GREEN.

**Latest main/prod commit:** `061e4ea`.

Domain/Vercel evidence:

- Canonical domain: `https://www.pilarcalc.com`.
- Apex `https://pilarcalc.com` redirects 308 to `https://www.pilarcalc.com`.
- Vercel configuration is valid for `pilarcalc.com`.
- Vercel configuration is valid for `www.pilarcalc.com` and targets Production.
- `https://pilar-mvp.vercel.app` remains a valid fallback.

DNS evidence:

| Record | Observed value |
|---|---|
| A `@` | `216.198.79.1` |
| CNAME `www` | `3bd164a41359b88c.vercel-dns-017.com` |
| MX | Present |
| SPF | `v=spf1 include:spf.privateemail.com ~all` |
| DKIM | TXT present at `privateemail._domainkey.pilarcalc.com` |
| DMARC | Present at `_dmarc.pilarcalc.com`; `p=none` for launch monitoring |

Supabase Auth evidence:

- Site URL: `https://www.pilarcalc.com`.
- Redirect URLs include canonical `www`, apex callback, Vercel fallback, and
  localhost.

Email evidence:

- Provider: Namecheap Private Email.
- `pilot@pilarcalc.com` created and ON.
- DKIM generated/enabled.
- Gmail to `pilot@pilarcalc.com` receive smoke: PASS.
- `pilot@pilarcalc.com` to Gmail send/reply smoke: PASS.
- Message appeared in inbox, not spam.

Repo/prod evidence:

- `sitemap.xml` and `robots.txt` reference `https://www.pilarcalc.com`.
- Old Vercel base URL is absent from live sitemap/robots output.
- `/contact`, `/privacy`, `/terms`, and `/vilkar` show
  `pilot@pilarcalc.com` in mailto and visible text.
- `pilot@pilar.no` is absent.

No DNS/provider/Supabase mutations were performed by Ops C while recording this
evidence. No DB/Supabase CLI/SQL/repair/`db push`/dry-run was run.

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

Domain/email readiness is DONE/GREEN in P0.4 at `061e4ea`.

## Downloadable Artifact QA Evidence

**Verdict:** CLOSED/GREEN.

**Retest target:** public report `a769c891-1a2c-4b3b-b8f1-415e58a56eab`.

**Prod/main commit:** `43a74c2`.

Artifact results:

- PDF report clean.
- DOCX report clean.
- Raw request/prompt block absent.
- No `raw_text`, `structured_output`, provider payload, chain-of-thought, or
  secrets observed.
- No `PRELIMINARILY APPROVED` or `DECISION PRELIMINARILY APPROVED` text
  observed.
- Professional-review framing remains intact.

PDF/DOCX fact parity:

| Fact | Observed value |
|---|---|
| Span | `L = 5,0 m` |
| Design line load | `qEd = 8,0 kN/m` |
| Design bending moment | `MEd = 25,0 kNm` |
| Design shear force | `VEd = 20,0 kN` |

Caveats:

- Calculation-sheet SSR/downloadable verification remains deferred; this is not
  a blocker for the artifact trust-boundary fix.
- P3 DOCX language polish remains: `Controller / Completeness` labels.
- P3 DOCX language polish remains: Bokmal `Forelopig godkjent` appears in a
  Nynorsk report.

## P0 Checklist

| Area | Required work | Owner | Evidence needed |
|---|---|---|---|
| Domain/DNS | Choose final domain; configure Vercel custom domain; decide apex vs `www`; enable HTTPS; document old-domain redirects. | Integrator + Ops C + domain owner | DONE/GREEN in P0.4 at `061e4ea`; canonical `https://www.pilarcalc.com`, apex 308 to `www`, fallback Vercel host valid |
| Domain/DNS | Review environment variables and allowed origins for the new domain. | Runtime B + Ops C | DONE/GREEN in P0.4 at `061e4ea`; Supabase Auth Site URL and redirect URLs include canonical, apex, fallback, and localhost |
| Email/Auth | Configure sender domain DNS: SPF, DKIM, DMARC. | Ops C + email/domain owner | DONE/GREEN in P0.4 at `061e4ea`; SPF exact, DKIM TXT present, DMARC present with `p=none` monitoring posture |
| Email/Auth | Decide transactional email provider if auth/contact flows require it. | Integrator + Ops C | DONE/GREEN in P0.4 at `061e4ea`; Namecheap Private Email |
| Email/Auth | Create admin/contact inbox and confirm ownership. | Human/operator | DONE/GREEN in P0.4 at `061e4ea`; `pilot@pilarcalc.com` created and ON |
| Email/Auth | Review auth/email redirect URLs for new domain and old-domain redirects. | Runtime B + Ops C | DONE/GREEN in P0.4 at `061e4ea`; redirect URL evidence pasted back |
| Security | Run secret scan and confirm no secrets in repo, logs, or public bundles. | Ops C / Security | Scan output summary |
| Security | Run dependency audit and triage critical/high issues. | Ops C / Security | Audit output and owner map |
| Security | Review admin route protection and middleware for `/admin/**` and `/api/admin/**`. | Runtime B + Ops C | Route protection note |
| Security | Verify service-role boundary remains server-only and never imported by client components. | Runtime B + Ops C | Search/audit output |
| Security | Review Supabase RLS and ownership for user/report/admin data. | Runtime B + Ops C | Read-only audit summary; no SQL mutation |
| Security | Confirm rate limits on cost-bearing or abuse-sensitive routes. | Runtime B | Route/rate-limit matrix |
| Security | Define CSP/security header plan before broad public traffic. | Ops C + UI | Header inventory and implementation owner |
| Security | Confirm Sentry/logging redacts raw prompts, provider payloads, PII, secrets, and stack context with sensitive data. | Ops C + Runtime B | Logging safety note |
| Security | Document backup/recovery posture and rollback contacts. | Ops C + Integrator | Backup/PITR/recovery runbook reference |
| English routes | Approve canonical English route list: `/home`, `/terms`, `/privacy`, `/about`, `/roadmap`, `/guide`, `/safety`, `/contact`. | UI + Integrator + Ops C | P0.5 shell evidence GREEN at `ddd6dbd`; launch-domain redirect policy closed in P0.4 at `061e4ea` |
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
  final_domain: CLOSED - pilarcalc.com
  apex_www_policy: CLOSED - canonical www, apex redirects 308 to www
  vercel_domain_status: CLOSED - apex/www/fallback valid
  https_status: CLOSED
  old_domain_redirects: CLOSED - pilar-mvp fallback valid
  allowed_origins_review: CLOSED - Supabase Auth callback evidence pasted back

email_auth:
  sender_domain: CLOSED - pilarcalc.com
  spf: CLOSED - v=spf1 include:spf.privateemail.com ~all
  dkim: CLOSED - privateemail._domainkey.pilarcalc.com TXT present
  dmarc: CLOSED - p=none for launch monitoring
  transactional_provider: CLOSED - Namecheap Private Email
  contact_inbox: CLOSED - pilot@pilarcalc.com
  auth_redirect_urls: CLOSED - www, apex, fallback, localhost

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

1. Ops C / Security runs read-only security inventory: secrets, deps, admin
   routes, service-role boundary, RLS/ownership, logs, rate limits.
2. UI creates minimum footer/legal pages with Ops truth review.
3. UI/Integrator implements English canonical route strategy while preserving
   `/heim`, `/vilkar`, and nb/nn support.
4. Ops C runs route/link/canary checklist and refreshes launch checklist.
5. UI/Ops adds SEO, sitemap, robots, and social preview.
6. Domain/email P0.4 is now closed; future provider changes must use the
   cutover runbook and paste-back evidence again.

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
GREEN for P0 public-launch readiness.
```

No item in this backlog authorizes code changes, DNS changes, email changes,
DB/Supabase work, route changes, or public claims beyond the current reviewed
product truth.
