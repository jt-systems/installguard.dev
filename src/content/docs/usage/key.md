---
title: key
description: Generate Sigstore-compatible Ed25519 keypairs for signing.
---

```sh
installguard key generate [--priv-out cosign.key] [--pub-out cosign.pub]
```

`key` generates and inspects Ed25519 keypairs in the **PKCS#8 PEM** format
that `cosign` uses by convention. The defaults (`cosign.key` / `cosign.pub`)
are deliberately the same filenames cosign picks up automatically — you can
swap InstallGuard's signer in or out of an existing cosign workflow without
touching paths.

## When to use it

- **Bootstrap a signing identity** for [`sign`](/usage/sign/) without
  installing cosign.
- **Local dev signing** that interoperates with your team's cosign-based
  verification pipeline.
- **Throw-away keys for tests** — the generator is stdlib-clean, no HSM or
  KMS dependency.

## `key generate`

| Flag | Meaning |
|---|---|
| `--priv-out <path>` | Private key output. Default: `cosign.key`. PKCS#8 PEM, **unencrypted**. |
| `--pub-out <path>` | Public key output. Default: `cosign.pub`. PKCS#8 PEM. |

```sh
installguard key generate
# wrote cosign.key (PRIVATE)
# wrote cosign.pub
```

> **Security note.** The private key is written **unencrypted**. Do not
> commit `cosign.key` and do not leave it readable by other users. For
> production signing, prefer a KMS-backed cosign workflow over local key
> material.

## Workflow

```sh
# 1. Generate.
installguard key generate

# 2. Produce an attestation.
installguard attest --out statement.json

# 3. Sign with the generated key.
installguard sign statement.json

# 4. Anyone with cosign.pub can verify.
installguard verify --bundle statement.sig.json --key cosign.pub
# or
cosign verify-blob --key cosign.pub --bundle statement.sig.json statement.json
```

## Related

- [`sign`](/usage/sign/) — uses the private key.
- [`verify --bundle`](/usage/verify/) — uses the public key.
- [`attest`](/usage/attest/) — produces the typical payload to sign.
