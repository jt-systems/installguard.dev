---
title: doctor
description: Triage findings and emit a paste-ready installguard.yaml block.
---

```sh
installguard doctor [--policy installguard.yaml]
```

`doctor` runs the same evaluation pipeline as [`scan`](/usage/scan/), but
instead of printing a verdict it groups the actionable findings by class
and emits a ready-to-paste `installguard.yaml` block that resolves the
false positives we have a known fix for.

It is **advisory only** — it always exits `0`. Use `scan` or `ci` to gate.

## When to use it

- First run on a new repo: you got a wall of blocks and want a starting
  policy you can iterate on.
- After upgrading InstallGuard: a new heuristic flagged a long tail of
  packages and you want to sweep them into one config block.
- Onboarding a new monorepo workspace: produce a per-workspace policy
  scaffold without hand-walking the output of `scan`.

## What it suggests

| Block class | Suggested fix |
|---|---|
| `disallowed-lifecycle-script` | `scripts.allow` entry per package, commented with the scripts seen so reviewers vet before allowing. |
| `name-squat` | `defaults.nameSquatAllow` entry per package, commented with the package each one resembles. **Verify legitimacy before allowing.** |
| `dist-tag-anomaly` (blocking) | `severity: dist-tag-anomaly: warn` — its default since 0.1.6. Surfacing this means the operator had locally promoted it. |
| `signal-unavailable` (blocking) | `severity: signal-unavailable: warn` — its default since 0.1.7. Same pattern. |

Other block classes (`vulnerable-version`, `withdrawn-version`,
`suspicious-script`, etc.) are not suggested — these are the classes
where the right answer is almost never "allowlist it" and `doctor` will
not paper over them.

## Example

```sh
$ installguard doctor
InstallGuard doctor — pnpm
  1276 packages — 3 block · 0 warn

Lifecycle scripts (2 packages):
  • core-js (postinstall)
  • @firebase/util (postinstall)
  Review each package's install script before allowing — see
  https://www.npmjs.com/package/<name> and the package's source.

Name-squat allowlist candidates (1):
  • gaxios (resembles `axios`)
  Add ONLY if you've confirmed each package is the legitimate one
  you intended (e.g. `gaxios` is Google's official HTTP client).

Suggested installguard.yaml additions:
─────────────────────────────────────────
policyVersion: 1

defaults:
  nameSquatAllow:
    - gaxios                       # resembles `axios` — verify before allowing

scripts:
  allow:
    - core-js                      # postinstall — review the script before allowing
    - "@firebase/util"             # postinstall — review the script before allowing
```

Paste the block (or the parts you've vetted) into your `installguard.yaml`
and re-run `scan` to confirm it goes green.

## Workflow

```sh
# 1. Run doctor and review the suggestions.
installguard doctor

# 2. Vet each entry against the package's source and the
#    advisory you triggered. Don't blanket-paste.

# 3. Append the parts you accept to installguard.yaml, then verify.
installguard scan
```

## Exit codes

`doctor` always exits `0`. Errors in the underlying evaluation
(unparseable lockfile, bad policy file, etc.) still surface as
non-zero — but a non-empty list of blocks is **not** an error.
