---
title: simulate
description: Preview the per-package decision drift between the project's current policy and a candidate policy file.
---

```sh
installguard simulate <candidate.yaml> [--policy installguard.yaml] [--format pretty|json]
```

`simulate` runs the same evaluation pipeline as [`scan`](/usage/scan/)
once against the project's *current* policy, then re-evaluates every
dependency against the *candidate* policy using the **same signals** —
no second network round-trip — and prints the per-package decision
diff: which packages would be newly blocked, newly warned, newly
allowed, or have their reasons change while staying in the same
decision class.

It is **informational only** — it always exits `0`. Use `scan` or `ci`
to gate.

## When to use it

- Before merging a `installguard.yaml` change: "if I add this
  `scripts.allow` entry, what else does it unblock?"
- Reviewing a vendor-supplied policy template against your own
  lockfile to see what would be enforced.
- Tightening a previously-permissive policy: "what would break if I
  promote `dist-tag-anomaly` from `warn` to `block`?"
- Completing the [`explain`](/usage/explain/) (why was this blocked?) /
  [`doctor`](/usage/doctor/) (what should I add?) / `simulate` (what
  would happen if I added this?) triad — the propose → preview → merge
  loop for policy changes without spinning up a scratch repo.

## Arguments

| Argument | Meaning |
|---|---|
| `<candidate.yaml>` | Path to the candidate policy YAML to simulate. The current policy is loaded the same way `scan` loads it (`--policy`, else `installguard.yaml` at `--path`, else built-in defaults). |

## Formats

| Format | Meaning |
|---|---|
| `pretty` | Default. Grouped sections (Newly blocked / Newly warned / Newly allowed / Reasons changed) with ANSI colour and a `+`/`-` reason-code delta per package. |
| `json` | Stable machine-readable shape (`schemaVersion: 1`) with `totals` and a `changes` array; each entry carries `before`/`after` `decision`, `details`, and `reasonCodes`. |

## Example

```sh
$ installguard simulate proposed.yaml
∆ InstallGuard simulate — package-lock.json
  lockfile package-lock.json
  427 packages evaluated · 3 changed
  + 0 newly blocked   ~ 1 newly warned   - 2 newly allowed   ≈ 0 reasons changed

Newly warned
  • flaky-pkg@1.2.3 (direct)
      allow → warn (1 reason)
      + dist-tag-anomaly

Newly allowed
  • core-js@3.36.1
      block (1 reason) → allow
      - disallowed-lifecycle-script
  • protobufjs@7.4.0
      block (1 reason) → allow
      - disallowed-lifecycle-script
```

The same diff as JSON:

```sh
$ installguard simulate proposed.yaml --format json
{
  "schemaVersion": 1,
  "tool": { "name": "installguard", "version": "0.1.14" },
  "totals": {
    "evaluated": 427,
    "changed": 3,
    "newlyBlocked": 0,
    "newlyWarned": 1,
    "newlyAllowed": 2,
    "reasonsChanged": 0
  },
  "changes": [
    {
      "name": "core-js",
      "version": "3.36.1",
      "direct": false,
      "class": "newly_allowed",
      "before": { "decision": "block", "reasonCodes": ["disallowed-lifecycle-script"], "details": { ... } },
      "after":  { "decision": "allow", "reasonCodes": [], "details": { ... } }
    }
  ]
}
```

## Change classes

| Class | Meaning |
|---|---|
| `newly_blocked` | Was `allow` or `warn` under the current policy, becomes `block` under the candidate. |
| `newly_warned` | Was `allow` or `block` under the current policy, becomes `warn` under the candidate. |
| `newly_allowed` | Was `block` or `warn` under the current policy, becomes `allow` under the candidate. |
| `reasons_changed` | Same decision class on both sides, but the reason set differs — useful when a candidate policy resolves *part* of a multi-reason block. |

Packages with an identical decision (same class, same reasons) under
both policies are omitted from the output entirely.

## Workflow

```sh
# 1. doctor proposes a paste-ready policy block.
installguard doctor > proposed.yaml

# 2. simulate the candidate to see what would actually change.
installguard simulate proposed.yaml

# 3. If the diff matches expectations, merge into installguard.yaml
#    and re-run scan.
mv proposed.yaml installguard.yaml
installguard scan
```

## Restrictions

`--frozen` is rejected with a clear error: the
[`installguard.lock`](/usage/verify/) stores per-package
*decisions*, not raw signals, so a candidate policy cannot be
re-evaluated against it. Run simulate against the live lockfile
instead.

## Exit codes

`simulate` always exits `0` for informational output. Errors in the
underlying evaluation (unparseable lockfile, bad policy file,
unreadable candidate) still surface as non-zero.
