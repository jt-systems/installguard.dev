---
title: Your first scan
description: Run InstallGuard against an existing JavaScript project in 30 seconds.
---

In any directory that contains `package-lock.json`, `pnpm-lock.yaml`, or `yarn.lock`:

```sh
installguard scan
```

You will see one of three verdicts.

## ✓ OK

```
✓ InstallGuard — OK
  1276 packages — 1273 allow · 3 warn · 0 block
```

Nothing blocked the install. Warnings are advisory; they do not affect the exit code by default.

## ! WARN

```
! InstallGuard — WARNINGS
  1276 packages — 1270 allow · 6 warn · 0 block

WARN
  some-package@1.2.3
    • published 18 hours ago — below 24h cooling-off threshold
```

A signal fired but your policy demoted it from `block` to `warn`. The install will proceed; the warning is recorded in `installguard.lock` for audit.

## ✗ BLOCKED

```
✗ InstallGuard — BLOCKED
  1276 packages — 1273 allow · 0 warn · 3 block

BLOCK
  fsevents@2.3.3
    • install-time lifecycle script `install` declared
```

InstallGuard exits non-zero. Your CI step fails. Investigate, then either:

1. Fix the underlying issue (downgrade, swap dependency).
2. Add a per-package exception to your `installguard.yaml` if the block is a false positive.

## Next steps

- [Concepts › Signals](/concepts/signals/) — what each detector looks for.
- [Concepts › Policy](/concepts/policy/) — how to write `installguard.yaml`.
- [Recipes › GitHub Actions](/recipes/github-actions/) — wire it into CI.
