---
title: verify
description: Re-evaluate the project and check it matches a previously generated installguard.lock.
---

```sh
installguard verify [--against installguard.lock] [--frozen] [--bundle <sig> --key <pub>]
```

`verify` is the downstream half of [`lock`](/usage/lock/). It re-runs the
evaluation pipeline and confirms the result matches what was previously
recorded. Exits non-zero on any drift in lockfile content, policy content, or
per-package decisions.

## When to use it

- **PR gate** that catches policy drift between commits — run
  `verify --against installguard.lock`. If any decision differs, the build
  fails.
- **Air-gapped CI** with `--frozen`. Skips every signal provider and reads
  decisions straight out of the lock; only the lockfile + policy digests are
  recomputed and compared. No network calls.
- **Signature verification** with `--bundle` + `--key`. Validates a
  [DSSE-signed](/usage/sign/) [in-toto attestation](/usage/attest/) against
  the project's current state — proves the verdict you're trusting was signed
  by the expected key *and* matches the project right now.

## Modes

`verify` has three modes, ordered from strictest to most permissive:

### 1. Signed bundle (`--bundle` + `--key`)

```sh
installguard verify --bundle installguard.intoto.json.sig.json --key cosign.pub
```

Verifies the DSSE signature, unwraps the in-toto predicate, and checks the
predicate's lockfile + policy digests against the current project. Skips the
`installguard.lock` round-trip entirely.

### 2. Frozen (`--frozen`)

```sh
installguard verify --frozen
```

Reads decisions from `installguard.lock`. Aborts with exit 2 if the recorded
lockfile or policy digest no longer matches the project. **No network calls.**

### 3. Live re-evaluation (default)

```sh
installguard verify
```

Re-runs every signal provider and compares the fresh decision set against the
recorded one. Catches the case where a fresh advisory has changed a verdict
since the lock was generated.

## Flags

The standard evaluation flags apply — see [`scan`](/usage/scan/).
`verify`-specific flags:

| Flag | Meaning |
|---|---|
| `--against <path>` | Path to the existing lock. Default: `<path>/installguard.lock`. |
| `--bundle <path>` | DSSE envelope from [`sign`](/usage/sign/) to verify against `--key`. Skips the `installguard.lock` round-trip. |
| `--key <path>` | Ed25519 PKCS#8 PEM public key (cosign's `cosign.pub` format). Required when `--bundle` is set. |
| `--frozen` | Read decisions from the lock instead of contacting providers. Aborts on digest drift. |

## Exit codes

| Code | Meaning |
|---|---|
| `0` | Lockfile, policy, and every decision match. |
| `1` | Decision drift (a verdict changed). |
| `2` | Digest drift (lockfile or policy file changed since the lock was generated). |
| `3` | Signature verification failed (`--bundle` mode). |

See [Reference › Exit codes](/reference/exit-codes/) for the canonical table.

## Related

- [`lock`](/usage/lock/) — produces the artefact `verify` checks.
- [`sign`](/usage/sign/) + [`attest`](/usage/attest/) — produce the bundle for `--bundle` mode.
