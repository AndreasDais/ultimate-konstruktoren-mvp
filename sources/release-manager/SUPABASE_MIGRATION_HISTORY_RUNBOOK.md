# Supabase Migration History Runbook

**Status:** Operator guide  
**Audience:** Project owner / Big Brain / future integrator  
**Current main:** `d2783f0`  
**Primary audit file:** `sources/release-manager/SUPABASE_MIGRATION_HISTORY_AUDIT.md`  
**Rule:** Repair execution remains NO-GO unless a new, explicit repair-execution protocol is opened.

This guide explains what the Ops 68C migration-history work created, why it is
powerful, and how to use it safely.

## 1. What We Built

We built a production-safety decision system around Supabase migration history.

The original problem was not "run a command and hope." The problem was that the
production migration ledger and the local migration files did not line up in a
way that was safe to repair blindly. A wrong repair can make future database
operations lie about what has actually happened.

The 68C run turned that risky situation into an auditable safety case:

- a baseline plan
- a prepared audit checkpoint
- read-only SQL request packets
- Package A/B/C evidence capture
- a per-migration classification matrix
- repair-readiness and repair-decision reviews
- Gate 0 for future execution
- evidence paste-back fields
- final STOP closeout

The result is a controlled decision boundary:

- the ledger is still unrepaired
- no migration repair is approved
- no DB mutation has happened
- future repair is possible only through a new explicit protocol

## 2. Why This Is Powerful

This is powerful because it changes the failure mode.

Without this run, a future agent or human could see "migration history mismatch"
and reach for a broad command like `db push`, a speculative repair, or a manual
SQL change. That would be fast, but unsafe.

With this run, the system now has:

- exact candidate classification
- hard STOP rules
- evidence requirements before mutation
- explicit separation between documentation, audit, and execution
- a record of which commands were not run
- a clear handoff for future humans and agents

In plain language: we built a lock around the dangerous button, labelled the
button, documented why it is dangerous, and wrote the checklist for the only
safe way to open the lock later.

The "1000/1000" score applies to this non-execution decision-boundary workflow.
It does not mean the database repair is complete. It means the system correctly
stopped before mutation and preserved the conditions for a safe future choice.

## 3. What You Can Use It For

Use this runbook and the audit file when you want to:

- understand the migration-history state without reading the whole thread
- brief a human reviewer or future agent
- decide whether repair should remain stopped
- prepare a human GO package
- prevent accidental `db push`, mutating SQL, or unapproved repair
- start a future repair-execution protocol with the right preconditions
- prove that no repair has been approved or executed yet

Do not use this as proof that the ledger is repaired. It is proof that the
ledger repair has been carefully bounded and remains blocked.

## 4. Current State

| Item | State |
|---|---|
| Main | `d2783f0` |
| Ops source closeout | `94354ac` |
| PR | `#41` merged, canary GREEN, branch cleaned |
| Primary audit doc | `SUPABASE_MIGRATION_HISTORY_AUDIT.md` |
| Repair execution | NO-GO |
| Ledger | unrepaired |
| Paste-back fields | empty / required |
| Approved repairs | none |
| `diagnostic_only` | `true` |
| Release-proof mode | disabled |
| `provider_message_id` | omitted |
| 68C continuation | STOP; no 68C.51 without new Big Brain plan |

## 5. Final Candidate State

| Decision | Versions |
|---|---|
| DO NOT REPAIR | `20260524000001` |
| NEEDS MORE EVIDENCE | `20260523000000`, `20260523000002`, `20260524000000`, `20260527000000`, `20260528000000`, `20260528000002` |
| EXACT-EVIDENCE CANDIDATE but still NO-GO | `20260527000001`, `20260528000001`, `20260528000003`, `20260531000000` |
| PROVISIONAL | none |

Important: "exact-evidence candidate" does not mean approved. It means the
candidate has enough evidence to be considered later if every higher-level
safety gate is satisfied.

## 6. Hard Rules

These rules are active until a new explicit repair-execution protocol replaces
them.

### Always Allowed

- Read the audit docs.
- Update docs with new read-only evidence.
- Run `npm run release:check`.
- Run read-only git, GitHub, Vercel, and HTTP canary checks.
- Ask for human evidence.
- Prepare a future protocol.

### Always Forbidden In This State

- `supabase db push`
- `supabase db push --dry-run`
- mutating SQL
- schema push
- repair of excluded versions
- speculative repair
- repair without backup/PITR evidence
- repair without rollback/recovery plan
- repair without fresh ledger check
- repair without exact command-list approval
- repair without explicit Big Brain GO

### Only Possible In A Future Protocol

The only repair shape that may be considered later is:

```bash
supabase migration repair --status applied <version>
```

Even that is only possible for versions explicitly approved inside a new
repair-execution protocol.

## 7. Required Human GO Package

Before any future repair protocol can move from NO-GO to GO, the human must
paste a complete evidence package.

```text
timestamp/timezone:
Supabase project ref:
backup/PITR evidence:
rollback/recovery plan:
fresh ledger check output:
exact command list reviewed:
GO/NO-GO decision:
approver / Big Brain note:
```

Expected project ref:

```text
uiogylrpclamffhgkjki
```

If any field is empty, the state remains NO-GO.

## 8. STOP Conditions

Stop immediately if any of these happen:

- the Supabase project ref is not `uiogylrpclamffhgkjki`
- fresh ledger output differs from the expected state
- an excluded version appears in the repair command list
- `db push`, `db push --dry-run`, mutating SQL, or schema push appears in the plan
- `diagnostic_only=false`
- release-proof mode is enabled
- `provider_message_id` appears
- backup/PITR evidence is missing
- rollback/recovery plan is missing
- Big Brain GO is missing

STOP means do not improvise. Record the finding and ask for a new plan.

## 9. How To Use This Safely

### If You Just Want Status

Read:

1. this runbook
2. `SUPABASE_MIGRATION_HISTORY_AUDIT.md`
3. the monitor scorecard if you need PR/canary history

Current answer should be:

```text
Repair execution remains NO-GO. Ledger remains unrepaired. Ops 68C is closed at
the decision boundary.
```

### If You Want To Continue Without Repair

You may keep collecting read-only evidence and documenting it, but do not call it
68C.51 unless Big Brain creates a new plan. Prefer a new named track such as:

```text
Supabase migration repair execution protocol - Gate A
```

### If You Want To Consider Repair

Do not run commands yet.

First collect the human GO package in section 7. Then create a new protocol that
re-checks the fresh ledger immediately before any command.

### If You Want To Stop

Do nothing. This is a valid safe state.

The ledger can remain unrepaired until there is a real operational need and a
complete human GO package.

## 10. What The Meters Mean

### Safety-Case Operational Autonomy: 1000/1000

This means the non-execution workflow did its job:

- it gathered evidence
- separated unknowns from facts
- classified candidates
- blocked unsafe execution
- preserved human control
- stopped at the decision boundary

It does not mean the system should execute repair autonomously.

### World-Class Agent Ecosystem: 1000/1000 for Ops 68C

This means the agent workflow around this specific Ops 68C run is world-class:

- small docs-only increments
- strict gates
- PR-by-PR integration
- canary after merge
- cleanup after canary
- monitor scorecard after cleanup
- no DB mutation hidden inside documentation work

## 11. Practical Operator Checklist

Before asking for any future repair, answer all of these:

```text
Is main clean/synced?
Is the target project ref uiogylrpclamffhgkjki?
Is backup/PITR evidence pasted?
Is rollback/recovery plan pasted?
Is fresh ledger output pasted?
Does command list contain only approved exact candidates?
Does command list exclude DO NOT REPAIR and NEEDS MORE EVIDENCE versions?
Does command list avoid db push, dry-run, mutating SQL, and schema push?
Is Big Brain GO explicit?
Is repair execution protocol newly named and separate from 68C?
```

If any answer is "no", the decision is NO-GO.

## 12. Copy/Paste Prompt For Future Repair Consideration

Use this only after the human evidence package exists.

```text
Start a new Supabase migration repair-execution protocol.

Inputs pasted:
- backup/PITR evidence:
- rollback/recovery plan:
- fresh ledger check output:
- exact command list reviewed:
- explicit Big Brain GO/NO-GO:

Rules:
- re-check fresh ledger immediately before any command
- no db push
- no db push --dry-run
- no mutating SQL
- no excluded versions
- only consider explicitly approved:
  supabase migration repair --status applied <version>
- abort on drift
- report before execution

If any evidence is missing or inconsistent, return NO-GO and stop.
```

## 13. Short Version

We built a safety case, not a repair.

It is powerful because it lets you say exactly what is known, what is unknown,
what is forbidden, and what evidence is required before a dangerous production
operation can even be considered.

Current answer:

```text
STOP. Keep ledger unrepaired unless a complete human GO package is provided and
a new repair-execution protocol is opened.
```
