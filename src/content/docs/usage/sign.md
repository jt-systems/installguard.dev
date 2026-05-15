---
title: sign
description: Produce a DSSE v1 envelope cosign can verify.
---

```sh
installguard sign <payload> [--key cosign.key] [--out <payload>.sig.json]
```

`sign` wraps an arbitrary payload — typically a previously-emitted
[`installguard.intoto.json`](/usage/attest/) — in a [DSSE
v1](https://github.com/secure-systems-lab/dsse) envelope using an Ed25519
PKCS#8-PEM key. The output is byte-identical to what `cosign sign-blob`
produces for the same payload + key, so `cosign verify-blob` validates it
unchanged.

## When to use it

- **Sign InstallGuard's policy-evaluation attestation** ([`attest`](/usage/attest/)) for downstream
  verification.
- **Sign anything else** — `sign` doesn't care what the payload is. Pass a
  build manifest, an SBOM, a CSV of decisions; whatever the verifier expects
  to receive.
- **CI-friendly cosign-compatible signing** without pulling in cosign as a
  dependency. The output works with cosign verifiers in the wild.

## Arguments

| Argument | Meaning |
|---|---|
| `<payload>` | Payload file to sign. Use `-` to read from stdin. |

## Flags

| Flag | Meaning |
|---|---|
| `--key <path>` | Ed25519 PKCS#8-PEM private key. Default: `cosign.key`. Honours `$COSIGN_KEY`. |
| `--payload-type <mime>` | DSSE `payloadType`. Default: `application/vnd.in-toto+json` (matches cosign's attestation default). |
| `--out <path>` | Envelope output path. Default: `<input>.sig.json`. Use `-` for stdout. |

## Output shape

```json
{
  "payloadType": "application/vnd.in-toto+json",
  "payload": "<base64 of the original bytes>",
  "signatures": [
    {
      "keyid": "",
      "sig": "<base64 ed25519 signature over the DSSE PAE>"
    }
  ]
}
```

## Workflow

```sh
# 1. Generate a keypair.
installguard key generate

# 2. Produce an attestation.
installguard attest --out statement.json

# 3. Sign it.
installguard sign statement.json
# wrote statement.sig.json

# 4a. Verify with InstallGuard.
installguard verify --bundle statement.sig.json --key cosign.pub

# 4b. Or with cosign — same envelope shape.
cosign verify-blob \
  --key cosign.pub \
  --bundle statement.sig.json \
  statement.json
```

## Related

- [`key`](/usage/key/) — generate the signing key.
- [`attest`](/usage/attest/) — the typical payload to sign.
- [`verify --bundle`](/usage/verify/) — the InstallGuard-native verifier.
