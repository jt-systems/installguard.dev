---
title: lock
description: Snapshot a deterministic policy-evaluation result for offline verify.
---

```sh
installguard lock [--out installguard.lock] [--policy installguard.yaml] [--audit-log <path>]
```

`lock` runs the same evaluation as [`scan`](/usage/scan/) and writes a
deterministic `installguard.lock` snapshot of the result. The lock file pins:

* The lockfile digest (so the project's transitive graph is fingerprinted).
* The policy digest (so the rules under evaluation are fingerprinted).
* The per-package decision (allow / warn / block) and reason set.

A downstream consumer can then [`verify`](/usage/verify/) the lock **offline** —
no signal-provider network calls needed. This is the foundation of the
InstallGuard offline / air-gapped CI story.

## When to use it

- **Air-gapped CI.** Run `lock` on a build host with internet, ship the
  `installguard.lock` into the air-gap, run `verify --frozen` there.
- **Reproducibility.** Capture a "this is the security verdict on this exact
  commit" artefact alongside your build output.
- **Attestation pipeline.** `lock` is the canonical input for [`attest`](/usage/attest/) +
  [`sign`](/usage/sign/) — the lock fingerprint is what cosign ends up signing.

## Output shape

`installguard.lock` is JSON with a stable `schemaVersion`:

```json
{
  "schemaVersion": 1,
  "tool": { "name": "installguard", "version": "0.1.18" },
  "lockfile": { "path": "package-lock.json", "digest": "sha256:..." },
  "policy":   { "path": "installguard.yaml",  "digest": "sha256:..." },
  "decisions": [
    { "name": "lodash", "version": "4.17.21", "decision": "allow", "reasons": [] },
    { "name": "danger", "version": "1.2.3",   "decision": "block", "reasons": ["disallowed-lifecycle-script"] }
  ]
}
```

Output is byte-stable — re-running `lock` on an unchanged project produces
identical bytes (same SHA-256). Safe to commit, diff, and review.

## Flags

The standard evaluation flags (`--path`, `--policy`, `--cache-dir`,
`--no-cache`, `--no-osv`, `--no-deps-dev`, `--no-scorecard`,
`--ignore-scripts`, `--concurrency`, `--frozen`, `--audit-log`) all apply —
see [`scan`](/usage/scan/) for definitions.

| Flag | Meaning |
|---|---|
| `--out <path>` | Output path. Default: `<path>/installguard.lock`. |

## Workflow

```sh
# 1. Generate the lock on a host with network access.
installguard lock

# 2. Commit it.
git add installguard.lock && git commit -m "snapshot policy verdict"

# 3. In air-gapped CI, verify without any network calls.
installguard verify --frozen
```

## Related

- [`verify`](/usage/verify/) — the downstream check.
- [`attest`](/usage/attest/) — wrap the lock as in-toto for signing.
- [`sign`](/usage/sign/) — produce a DSSE envelope cosign can verify.
