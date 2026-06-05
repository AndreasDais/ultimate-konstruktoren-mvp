# PILAR Domain and Email Cutover Runbook

Status: RED for domain/email cutover until human/provider evidence is pasted back.

Mode: docs-only runbook. This file does not authorize DNS, email, Vercel,
Supabase, provider, DB, SQL, migration repair, `db push`, or dry-run changes.
Do not paste secrets into this file.

## Current Known State

- Production host: `https://pilar-mvp.vercel.app`
- P0.1 public launch pages: complete.
- P0.2 security headers: complete and live.
- P0.3 launch-security: GREEN/DONE at `a91022c`.
- `app/sitemap.ts` and `app/robots.ts` currently point at
  `https://pilar-mvp.vercel.app`.
- No custom launch-domain or branded email/auth provider evidence is closed in
  the repo yet.

## Current Verdict

```txt
RED
```

Cutover remains RED until the required domain, Vercel, DNS, Supabase Auth, and
email evidence below is pasted back and reviewed. The app can remain live on the
current Vercel host while this evidence is gathered.

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

## Repo-Only Prep List

Repo changes are allowed only in a separate implementation sprint after the
provider evidence above is ready.

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

Repo-only prep must preserve:

- `/heim` and `/vilkar` availability;
- `nb` and `nn` support;
- professional-review disclaimers;
- no final approval, compliance guarantee, or engineer-replacement claims.

## Cutover Sequence

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
