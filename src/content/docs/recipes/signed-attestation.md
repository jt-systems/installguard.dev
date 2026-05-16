---
title: Signed attestation pipeline
description: Generate an InstallGuard in-toto statement, sign it, and verify it downstream before promotion.
---

`installguard lock` is a good offline snapshot. A signed attestation adds
one more property: **who** asserted that verdict.

This recipe signs InstallGuard's policy evaluation as a DSSE envelope:

1. The build job performs a normal CI evaluation.
2. It emits an unsigned in-toto statement with [`attest`](/usage/attest/).
3. It signs that statement with [`sign`](/usage/sign/).
4. A downstream job verifies the signed bundle against the current repo
   state with [`verify --bundle`](/usage/verify/).

## Prerequisites

Generate a keypair once:

```sh
installguard key generate
```

Then:

- commit the public key somewhere stable in the repo, for example
  `.installguard/cosign.pub`
- store the private key as a repository or organization secret, for
  example `INSTALLGUARD_COSIGN_KEY`

Do **not** commit `cosign.key`. The generated private key is unencrypted.

## The workflow

```yaml
# .github/workflows/installguard-attestation.yml
name: InstallGuard attestation

on:
  push:
    branches: [main]
  workflow_dispatch:

jobs:
  sign:
    runs-on: ubuntu-latest
    permissions:
      contents: read
    env:
      INSTALLGUARD_VERSION: v0.3.4
    steps:
      - uses: actions/checkout@v4

      - name: Install InstallGuard
        run: |
          curl -fsSL "https://github.com/jt-systems/installguard/releases/download/${INSTALLGUARD_VERSION}/installguard-x86_64-unknown-linux-musl" \
            -o /usr/local/bin/installguard
          chmod +x /usr/local/bin/installguard

      - name: Cache signals
        uses: actions/cache@v4
        with:
          path: ~/.cache/installguard
          key: installguard-${{ runner.os }}-${{ hashFiles('**/package-lock.json', '**/pnpm-lock.yaml', '**/yarn.lock', '**/uv.lock', '**/poetry.lock', '**/requirements.txt', '**/pyproject.toml') }}
          restore-keys: |
            installguard-${{ runner.os }}-

      - name: Gate the build
        run: installguard ci --summary-file installguard-summary.json

      - name: Emit unsigned statement
        run: installguard attest --out installguard.intoto.json

      - name: Materialize signing key
        run: |
          umask 077
          printf '%s' '${{ secrets.INSTALLGUARD_COSIGN_KEY }}' > cosign.key

      - name: Sign statement
        run: installguard sign installguard.intoto.json --key cosign.key --out installguard.intoto.sig.json

      - name: Remove private key
        if: always()
        run: rm -f cosign.key

      - name: Upload signed evidence
        uses: actions/upload-artifact@v4
        with:
          name: installguard-attestation
          path: |
            installguard-summary.json
            installguard.intoto.json
            installguard.intoto.sig.json

  verify:
    needs: sign
    runs-on: ubuntu-latest
    permissions:
      contents: read
    env:
      INSTALLGUARD_VERSION: v0.3.4
    steps:
      - uses: actions/checkout@v4

      - name: Download signed evidence
        uses: actions/download-artifact@v4
        with:
          name: installguard-attestation
          path: .installguard-artifacts

      - name: Install InstallGuard
        run: |
          curl -fsSL "https://github.com/jt-systems/installguard/releases/download/${INSTALLGUARD_VERSION}/installguard-x86_64-unknown-linux-musl" \
            -o /usr/local/bin/installguard
          chmod +x /usr/local/bin/installguard

      - name: Verify signed bundle
        run: installguard verify --bundle .installguard-artifacts/installguard.intoto.sig.json --key .installguard/cosign.pub
```

## What the verify job proves

The downstream verification checks both:

- the DSSE signature matches the trusted public key
- the signed predicate still matches the current repo's lockfile and
  policy digests

That means a consumer is not just trusting "someone signed something" -
it is trusting that the signed policy evaluation matches the current
project state.

## Production guidance

This example uses InstallGuard's built-in signer because it is the
simplest end-to-end flow. For high-assurance production signing:

- keep the public key in the repo or another trusted distribution point
- keep the private key in a secret manager or KMS-backed signer
- or swap step 3 out for your existing cosign/KMS workflow and keep
  `installguard attest` as the payload generator

## Related

- [`attest`](/usage/attest/) - unsigned in-toto statement.
- [`sign`](/usage/sign/) - DSSE envelope generation.
- [`verify`](/usage/verify/) - downstream bundle verification.
- [Air-gapped promotion](/recipes/air-gapped-promotion/) - unsigned snapshot variant.
