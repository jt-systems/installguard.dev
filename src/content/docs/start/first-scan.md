---
title: Your first scan
description: Run InstallGuard against an existing npm, pnpm, yarn, or PyPI project in 30 seconds.
---

In any directory that contains `package-lock.json`, `pnpm-lock.yaml`, or `yarn.lock`:

```sh
installguard scan
```

No config required. InstallGuard auto-detects the lockfile, applies its
built-in defaults, and prints a grouped verdict. Drop an
`installguard.yaml` next to the lockfile when you want to tune
thresholds — see [Concepts › Policy](/concepts/policy/).

You will see one of three verdicts.

## ✓ Clean

```
✓ InstallGuard — Clean
  1276 packages — 1273 allow · 3 warn · 0 block

  All 1276 dependencies passed policy.
```

Nothing tripped a `block` rule. Warnings are advisory; they don't change
the exit code on `scan`. Exit `0`.

## ! Warnings

```
! InstallGuard — Warnings
  1276 packages — 1270 allow · 6 warn · 0 block

WARN
  some-package@1.2.3
    • published 18 hours ago — below 24h cooling-off threshold
      ↳ wait it out, or lower minimumReleaseAge in installguard.yaml

Next steps
  • Investigate each finding on its registry page
  • If intentional, allowlist in installguard.yaml (see `installguard schema`)
  • Once green, freeze decisions with `installguard lock` for reproducible CI
  • If you believe this is a real attack, report to https://github.com/advisories/new
```

A signal fired but your policy demoted it from `block` to `warn`. The
install proceeds and exit code stays `0`. To make `scan` exit non-zero on
any warning, use `installguard ci --max-warn 0` instead — see
[Usage › ci](/usage/ci/).

## ✗ BLOCKED

```
✗ InstallGuard — BLOCKED
  1276 packages — 1273 allow · 0 warn · 3 block

BLOCK
  fsevents@2.3.3
    • install-time lifecycle script `install` declared
      ↳ allowlist the package under scripts.allow if you trust the publisher

Next steps
  • Investigate the package on its registry page (e.g. https://www.npmjs.com/package/fsevents/v/2.3.3)
  • If intentional, allowlist in installguard.yaml (see `installguard schema`)
  • Once green, freeze decisions with `installguard lock` for reproducible CI
  • If you believe this is a real attack, report to https://github.com/advisories/new
```

InstallGuard exits `1`. Your CI step fails. Three ways forward:

1. **Fix the underlying issue** — downgrade, swap dependency, wait out a
   cooling-off period.
2. **Triage with `installguard doctor`** — it inspects the same project,
   classifies findings as actionable false positives, and prints a
   ready-to-paste `installguard.yaml` snippet that resolves them. See
   [Usage › doctor](/usage/doctor/).
3. **Hand-edit `installguard.yaml`** — add a per-package exception or
   relax a threshold. The [policy schema](/usage/policy-yaml/) is also
   available via `installguard schema` for editor autocomplete.

## Other useful flags

```sh
# Use an explicit policy file
installguard scan --policy ./.installguard/strict.yaml

# JSON output for piping
installguard scan --format json | jq '.summary'

# Fully offline / air-gapped (requires a previously-generated lock)
installguard lock              # one time, with network
installguard scan --frozen     # then forever, no network calls
```

See [Usage › scan](/usage/scan/) for the full flag reference and exit codes.

## Next steps

- [Concepts › Signals](/concepts/signals/) — what each detector looks for.
- [Concepts › Policy](/concepts/policy/) — how to write `installguard.yaml`.
- [Usage › doctor](/usage/doctor/) — turn a noisy first run into a green one.
- [Recipes › GitHub Actions](/recipes/github-actions/) — wire it into CI.
