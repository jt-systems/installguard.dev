---
title: attest
description: Emit an unsigned in-toto v1 Statement wrapping the policy evaluation.
---

```sh
installguard attest [--out installguard.intoto.json] [--pretty]
```

`attest` runs the evaluation pipeline and emits an **unsigned [in-toto v1
Statement](https://github.com/in-toto/attestation/blob/main/spec/v1/statement.md)**
wrapping the result. The predicate type is
`https://installguard.dev/policy-evaluation/v1` and the predicate body is the
same shape `lock` produces.

The output is the canonical input for any DSSE signer — pair with
[`sign`](/usage/sign/) for InstallGuard's built-in cosign-compatible flow, or
pipe into `cosign attest --predicate` directly.

## When to use it

- **SLSA L3 attestation pipelines.** Drop `attest` between your build step
  and your signer to get a policy-evaluation attestation alongside your
  provenance attestation.
- **Cosign-blob attestations.** `installguard attest | cosign attest-blob
  --predicate -` produces a Sigstore-transparency-log-backed attestation of
  the policy verdict.
- **Custom verifiers.** The unsigned statement is plain in-toto JSON — any
  policy-as-code engine that consumes in-toto can ingest it.

## Output shape

```json
{
  "_type": "https://in-toto.io/Statement/v1",
  "subject": [
    { "name": "package-lock.json", "digest": { "sha256": "..." } }
  ],
  "predicateType": "https://installguard.dev/policy-evaluation/v1",
  "predicate": {
    "tool": { "name": "installguard", "version": "0.1.18" },
    "policy": { "path": "installguard.yaml", "digest": "sha256:..." },
    "decisions": [ ... ]
  }
}
```

Default output is **compact single-line JSON** — exactly what DSSE wants as
the payload-to-sign. Use `--pretty` only when reading the statement by hand.

## Flags

The standard evaluation flags apply — see [`scan`](/usage/scan/).
`attest`-specific flags:

| Flag | Meaning |
|---|---|
| `--out <path>` | Output path. Default: `<path>/installguard.intoto.json`. Use `-` for stdout. |
| `--pretty` | Pretty-print (indented). Default is compact. |

## Workflow

```sh
# 1. Produce the unsigned statement.
installguard attest --out statement.json

# 2a. InstallGuard built-in signer.
installguard key generate
installguard sign statement.json --out statement.sig.json

# 2b. Or sign with cosign directly.
cosign attest-blob --predicate statement.json --type custom --bundle bundle.json package-lock.json

# 3. Verify downstream.
installguard verify --bundle statement.sig.json --key cosign.pub
```

## Related

- [`sign`](/usage/sign/) — the InstallGuard-native DSSE signer.
- [`key`](/usage/key/) — generate the keypair.
- [`verify --bundle`](/usage/verify/) — the downstream check.
- [`lock`](/usage/lock/) — same predicate body, different envelope (no in-toto wrapper).
