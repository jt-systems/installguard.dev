---
title: explain
description: Explain why a single package received its decision — signals, reasons, trust score.
---

```sh
installguard explain <name>@<version> [--policy installguard.yaml] [--format pretty|json]
```

`explain` runs the same evaluation pipeline as [`scan`](/usage/scan/) and
[`doctor`](/usage/doctor/), but instead of summarising the whole project
it produces the full per-package audit trail for one coordinate already
present in the lockfile: every signal a provider returned, every reason
the policy produced, and the trust-score breakdown with each weighted
contribution.

It is **informational only** — it always exits `0`. Use `scan` or `ci`
to gate.

## When to use it

- Triaging a single finding from `scan` or a PR comment without
  re-reading the whole audit log.
- Answering "why was this package blocked?" with the exact signals,
  not just the reason code.
- Understanding a trust score: which signals dragged it down, by how
  much, and with what rationale.
- Pairing with [`doctor`](/usage/doctor/) — `doctor` tells you *what*
  to allow, `explain` tells you *why* it fired.

## Arguments

| Argument | Meaning |
|---|---|
| `<name>@<version>` | Package coordinate. Bare names (`lodash@4.17.21`) and scoped names (`@firebase/util@1.10.0`) both work. The package must be present in the project's lockfile. |

## Formats

| Format | Meaning |
|---|---|
| `pretty` | Default. Grouped sections (Reasons / Signals / Trust score) with ANSI colour, remediation hints, and the per-contribution score breakdown. |
| `json` | Stable machine-readable shape (`schemaVersion: 1`) extending the `ci` per-decision schema with the full `signals` array and `trustScore` breakdown. |

## Example

```sh
$ installguard explain danger@1.2.3
✗ InstallGuard — danger@1.2.3  BLOCKED
  lockfile package-lock.json (package-lock.json) · direct: true

Reasons
  • disallowed-lifecycle-script  install-time lifecycle script `postinstall` declared
      ↳ allowlist with `scripts.allow: [danger]` after vetting the script body

Signals (1 observed)
  • {"kind":"lifecycle_scripts","scripts":["postinstall"]}

Trust score 35/100
   -15  lifecycle_scripts           lifecycle scripts present
```

The same coordinate as JSON:

```sh
$ installguard explain danger@1.2.3 --format json
{
  "schemaVersion": 1,
  "tool": { "name": "installguard", "version": "0.1.13" },
  "package": { "name": "danger", "version": "1.2.3", "direct": true, "source": { ... } },
  "decision": "block",
  "details": { "outcome": "block", "reasons": [ ... ] },
  "reasons": [
    {
      "code": "disallowed-lifecycle-script",
      "summary": "install-time lifecycle script `postinstall` declared",
      "remediation": "allowlist with `scripts.allow: [<name>]` after vetting the script body"
    }
  ],
  "signals": [ { "kind": "lifecycle_scripts", "scripts": ["postinstall"] } ],
  "trustScore": {
    "value": 35,
    "contributions": [
      { "signal": "lifecycle_scripts", "delta": -15, "rationale": "lifecycle scripts present" }
    ]
  }
}
```

## Workflow

```sh
# 1. scan flags a package.
installguard scan
# → BLOCK  danger@1.2.3  install-time lifecycle script ...

# 2. explain the finding to see the full signal trail.
installguard explain danger@1.2.3

# 3. If intentional, ask doctor for a paste-ready policy snippet.
installguard doctor

# 4. Vet the suggestion, paste into installguard.yaml, re-run scan.
```

## Exit codes

`explain` always exits `0` for informational output. Errors in the
underlying evaluation (unparseable lockfile, bad policy file, package
coordinate not present in the lockfile) still surface as non-zero.
