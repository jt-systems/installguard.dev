---
title: Decisions
description: The three verdicts InstallGuard renders for every package.
---

For every dependency in your lockfile, InstallGuard renders exactly one decision:

## `Allow`

No reason fired. The package is fine for this install.

## `Warn { reasons }`

At least one reason fired, but its policy severity is `warn` (or the reason was demoted via `severity:`). The install proceeds; the warning is recorded in `installguard.lock` and surfaced in `scan` / `report` output.

## `Block { reasons }`

At least one reason fired with `block` severity. `installguard scan` exits non-zero; `installguard ci` fails the build. Multiple reasons can stack on a single package.

## Audit trail

Every decision is recorded in `installguard.lock` with the full set of contributing signals and the policy version that produced it. Re-running `installguard scan` against an unchanged lockfile and policy is deterministic and produces the same `installguard.lock`.

This means:

- Reviewers see *exactly* which signals justified a block.
- A new policy can be tested against the historical `installguard.lock` to see what would have changed without re-running the network.
- Compliance can answer "why did we install package X@Y?" from the lockfile alone.
