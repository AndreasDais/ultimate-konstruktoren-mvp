# PILAR Domain and Email Cutover Runbook

Status: DONE/GREEN for P0.4 domain/email readiness at `061e4ea`.

Mode: docs-only runbook. This file does not authorize DNS, email, Vercel,
Supabase, provider, DB, SQL, migration repair, `db push`, or dry-run changes.
Do not paste secrets into this file.

## Current Known State

- Production host: `https://pilar-mvp.vercel.app`
- Canonical launch host: `https://www.pilarcalc.com`
- Apex host: `https://pilarcalc.com`, redirecting 308 to the canonical `www`
  host.
- P0.1 public launch pages: complete.
- P0.2 security headers: complete and live.
- P0.3 launch-security: GREEN/DONE at `a91022c`.
- `app/sitemap.ts`, `app/robots.ts`, live `sitemap.xml`, and live `robots.txt`
  now point at `https://www.pilarcalc.com`.
- Branded email/auth provider evidence is closed for P0.4.
- `https://pilar-mvp.vercel.app` remains a valid fallback host.

## Current Verdict

```txt
GREEN
```

P0.4 domain/email readiness is DONE/GREEN. Future domain, DNS, email, Vercel,
or Supabase Auth changes must reuse this runbook and paste back fresh evidence
before mutation.

## Closed P0.4 Evidence

Latest main/prod commit: `061e4ea`.

Domain and Vercel:

- Launch domain: `pilarcalc.com`.
- Canonical host: `https://www.pilarcalc.com`.
- Apex `https://pilarcalc.com` redirects 308 to `https://www.pilarcalc.com`.
- Vercel configuration is valid for apex, `www`, and
  `https://pilar-mvp.vercel.app` fallback.

DNS:

| Record | Observed value |
|---|---|
| A `@` | `216.198.79.1` |
| CNAME `www` | `3bd164a41359b88c.vercel-dns-017.com` |
| MX | Present |
| SPF | `v=spf1 include:spf.privateemail.com ~all` |
| DKIM | TXT present at `privateemail._domainkey.pilarcalc.com` |
| DMARC | Present at `_dmarc.pilarcalc.com`; `p=none` for launch monitoring |

Supabase Auth:

- Site URL: `https://www.pilarcalc.com`.
- Redirect URLs include localhost, Vercel fallback, `www.pilarcalc.com`
  callback, and apex `pilarcalc.com` callback.

Email:

- Provider: Namecheap Private Email.
- `pilot@pilarcalc.com` created and ON.
- DKIM generated/enabled.
- Gmail to `pilot@pilarcalc.com` receive smoke: PASS.
- `pilot@pilarcalc.com` to Gmail send/reply smoke: PASS.
- Message appeared in inbox, not spam.

Repo/prod:

- `sitemap.xml` and `robots.txt` reference `https://www.pilarcalc.com`.
- Old Vercel base URL is absent from live sitemap/robots output.
- `/contact`, `/privacy`, `/terms`, and `/vilkar` show
  `pilot@pilarcalc.com` in mailto and visible text.
- `pilot@pilar.no` is absent.

No DNS, email, provider, Vercel, Supabase, DB, SQL, migration repair, `db push`,
or dry-run mutation was performed while recording this evidence.

## Final Domain Decision Needed

Paste back before any mutation:

```txt
launch_domain:
canonical_policy: apex | www
canonical_host:
fallback_vercel_host_policy: keep_active | redirect_after_stability_window | other
old_domain_redirect_policy:
decision_owner:
decision_timestamp:
```

Required decision points:

- final launch domain;
- whether apex or `www` is canonical;
- whether the non-canonical host redirects to the canonical host;
- whether `https://pilar-mvp.vercel.app` remains a fallback during the stability
  window;
- whether old/current links keep working during and after cutover.

P0.4 closed values:

```txt
launch_domain: pilarcalc.com
canonical_policy: www
canonical_host: https://www.pilarcalc.com
fallback_vercel_host_policy: keep_active
old_domain_redirect_policy: apex redirects 308 to canonical www
decision_owner: human/operator + Integrator
decision_timestamp: closed in repo at 061e4ea
```

## Vercel Evidence Needed

Paste provider evidence without secrets:

```txt
vercel_project:
domain_added: yes | no
apex_domain_status:
www_domain_status:
verification_records_present: yes | no
https_issued: yes | no
canonical_redirect_policy:
preview_or_production_target:
evidence_owner:
evidence_timestamp:
```

Required evidence:

- launch domain added to the correct Vercel project;
- Vercel verification records visible in the provider UI;
- HTTPS certificate issued for apex and/or `www`;
- canonical redirect policy documented;
- current Vercel fallback host policy documented.

P0.4 status: CLOSED/GREEN. Apex, `www`, and fallback Vercel host were reported
valid; `www.pilarcalc.com` is Production.

## DNS Evidence Needed

Paste DNS evidence without secret values:

```txt
registrar_or_dns_provider:
apex_record_type:
apex_record_target_category:
www_record_type:
www_record_target_category:
verification_record_present: yes | no
ttl_seconds:
rollback_target:
rollback_ttl_seconds:
evidence_owner:
evidence_timestamp:
```

Required evidence:

- apex record shape;
- `www` record shape;
- Vercel verification record presence, if required;
- TTL before cutover;
- rollback target and rollback TTL;
- owner with registrar/DNS access.

P0.4 status: CLOSED/GREEN. Namecheap DNS was reported as A `@` to
`216.198.79.1`, CNAME `www` to
`3bd164a41359b88c.vercel-dns-017.com`, old parking/URL redirect removed, and
Private Email untouched.

## Supabase Auth Evidence Needed

Do not run Supabase CLI, SQL, repair, `db push`, or dry-run for this step. Use
provider UI evidence only, with no secrets copied.

Paste back:

```txt
supabase_project_ref:
site_url:
allowed_redirect_urls:
  - https://<launch-domain>/auth/callback
  - https://<fallback-host>/auth/callback
otp_magic_link_smoke_plan:
admin_login_smoke_plan:
consumer_login_smoke_plan:
rollback_auth_url_plan:
evidence_owner:
evidence_timestamp:
```

Required evidence:

- Site URL matches the intended canonical launch host;
- allowed redirect/callback URLs include the launch domain and the temporary
  fallback host;
- OTP/magic-link smoke plan covers both consumer login and admin login;
- rollback plan says how auth redirects return to the Vercel host if cutover is
  stopped.

P0.4 status: CLOSED/GREEN. Site URL is `https://www.pilarcalc.com`; redirect
URLs include localhost, Vercel fallback, canonical `www` callback, and apex
callback.

## Email Evidence Needed

Paste back provider evidence without DKIM private keys, API keys, SMTP
passwords, or token values:

```txt
email_provider:
sender_domain:
from_address:
reply_to_address:
support_inbox:
contact_inbox:
admin_inbox:
inbox_owner:
spf_verified_by_provider: yes | no
dkim_verified_by_provider: yes | no
dmarc_verified_by_provider: yes | no
send_receive_smoke_result:
auth_link_smoke_result:
rollback_sender_plan:
evidence_owner:
evidence_timestamp:
```

Required evidence:

- final provider selected;
- sender From and Reply-To addresses selected;
- support/contact/admin inbox ownership confirmed;
- SPF, DKIM, and DMARC verified by the provider;
- send/receive smoke completed;
- auth-link smoke completed with the launch domain;
- rollback sender plan documented.

P0.4 status: CLOSED/GREEN. Namecheap Private Email is active for
`pilot@pilarcalc.com`; SPF, DKIM, and DMARC were verified; send/receive smoke
passed. DMARC remains `p=none` intentionally for launch monitoring.

## Repo-Only Prep List

Repo changes are allowed only in a separate implementation sprint after the
provider evidence above is ready.

P0.4 repo prep is CLOSED/GREEN at `061e4ea` for sitemap/robots and contact/legal
email copy.

Likely repo files:

- `app/sitemap.ts` - replace temporary Vercel base URL with launch-domain source
  of truth.
- `app/robots.ts` - replace temporary Vercel host and sitemap URL.
- `app/layout.tsx` - metadata/title/description or metadataBase if introduced.
- `app/contact/page.tsx` - contact email copy if sender/contact address changes.
- `app/privacy/page.tsx` - privacy contact copy if inbox changes.
- `app/terms/page.tsx` - legal contact copy if inbox changes.
- `app/vilkar/page.tsx` - Norwegian legal contact copy if inbox changes.
- `next.config.ts` or middleware - only if canonical redirects are implemented
  in repo rather than provider settings.

Closed repo evidence:

- `app/sitemap.ts` and `app/robots.ts` now emit `https://www.pilarcalc.com`.
- `/contact`, `/privacy`, `/terms`, and `/vilkar` now use
  `pilot@pilarcalc.com` and no longer use `pilot@pilar.no`.

Repo-only prep must preserve:

- `/heim` and `/vilkar` availability;
- `nb` and `nn` support;
- professional-review disclaimers;
- no final approval, compliance guarantee, or engineer-replacement claims.

## Cutover Sequence

P0.4 sequence is complete for the current launch domain. Keep this sequence for
future domain/email changes.

1. Confirm final launch domain, canonical apex/`www` policy, and fallback
   Vercel host policy.
2. Confirm owner access for Vercel, DNS/registrar, Supabase Auth, and email
   provider.
3. Lower DNS TTL if needed and wait for the previous TTL window.
4. Add the launch domain to the correct Vercel project.
5. Add/verify DNS records exactly as Vercel requests.
6. Wait for Vercel HTTPS issuance on every in-scope host.
7. Configure canonical redirect policy.
8. Configure Supabase Auth Site URL and allowed redirect/callback URLs through
   the provider UI.
9. Verify email sender domain in the provider UI: SPF, DKIM, and DMARC.
10. Run send/receive smoke and auth OTP/magic-link smoke.
11. Apply repo-only base URL/contact copy changes in a separate PR.
12. Deploy repo-only prep and run production canary:
    - `/api/health`;
    - `/`;
    - `/home`;
    - `/heim`;
    - `/terms`;
    - `/vilkar`;
    - `/privacy`;
    - `/contact`;
    - `/sitemap.xml`;
    - `/robots.txt`;
    - login/auth callback smoke.
13. Keep the Vercel fallback host active until the stability window is complete.

## Rollback Sequence

Rollback must be owned before cutover starts.

1. Stop the line and announce rollback owner.
2. Restore DNS apex/`www` records to the documented rollback target.
3. Restore Supabase Auth Site URL and redirect URLs to the fallback host.
4. Restore email sender/provider config if auth-link sending is affected.
5. Re-run fallback-host smoke:
   - `/api/health`;
   - public pages;
   - auth login;
   - admin login;
   - robots/sitemap if applicable.
6. Keep incident notes with timestamps, owner, provider screens, and observed
   user impact.

## STOP Conditions

These remain active for any future provider or repo change after P0.4.

Stop before mutation if any of these are true:

- final launch domain is not decided;
- apex/`www` canonical policy is not decided;
- Vercel domain is not added or not verified;
- HTTPS is not issued for all in-scope hosts;
- DNS TTL or rollback target is unknown;
- Supabase Auth Site URL or callback URLs are unknown;
- email provider, From, Reply-To, or inbox owner is unknown;
- SPF, DKIM, or DMARC is not verified by the email provider;
- OTP/magic-link smoke cannot be run;
- sitemap/robots would still point at the Vercel host after launch-domain
  cutover;
- `/heim`, `/vilkar`, `nb`, or `nn` support would be removed;
- any step requires DB/Supabase CLI, SQL, repair, `db push`, or dry-run;
- any step asks to paste secrets, API keys, DKIM private keys, SMTP passwords,
  or token values into docs or chat;
- marketing/legal copy implies final professional approval, compliance
  guarantee, or engineer replacement.

## Owner Table

| Area | Owner | Evidence owner |
| --- | --- | --- |
| Final domain decision | Human/operator + Integrator | Human/operator |
| Vercel custom domain | Integrator | Integrator |
| DNS/registrar records | Human/operator | Human/operator |
| Supabase Auth settings | Runtime B + Ops C review | Runtime B / operator |
| Email provider and sender domain | Human/operator + Ops C | Human/operator |
| Support/contact/admin inboxes | Human/operator | Human/operator |
| Repo base URL and metadata prep | UI/Integrator + Ops C review | Integrator |
| Cutover GO/NO-GO | Integrator + Ops C | Integrator |
| Rollback execution | Integrator + Human/operator | Integrator |

## No-Mutation Confirmation

This runbook is a planning artifact only. It does not change DNS, email,
provider settings, Supabase Auth settings, app code, libraries, package files,
database schema, migrations, or production data.
