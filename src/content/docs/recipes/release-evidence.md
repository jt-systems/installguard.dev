---
title: SBOM + VEX release bundle
description: Attach a CycloneDX SBOM, OpenVEX document, and InstallGuard summary to every tagged release.
---

Most release pipelines stop at "the build passed." Security and
compliance teams usually need the evidence too:

- an SBOM that says what shipped
- a VEX document that says how you triaged what shipped
- the CI summary that shows the dependency policy verdict at release time

InstallGuard can generate all three from the same locked dependency
graph, so the release bundle stays consistent.

## What this recipe produces

For every tagged release, the workflow below publishes:

- `installguard-summary.json` - the machine-readable CI verdict
- `installguard.cdx.json` - CycloneDX 1.5 SBOM
- `installguard.vex.json` - OpenVEX 0.2.0 statements for blocked or
  warned packages

Those three files are enough for most downstream consumers:

- release assets in GitHub
- customer evidence requests
- Dependency-Track or GUAC ingestion
- internal audit archives

## The workflow

```yaml
# .github/workflows/installguard-release-evidence.yml
name: InstallGuard release evidence

on:
  push:
    tags:
      - "v*"

jobs:
  evidence:
    runs-on: ubuntu-latest
    permissions:
      contents: write
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

      - name: Gate the release
        run: installguard ci --summary-file installguard-summary.json

      - name: Generate SBOM
        run: installguard sbom --out installguard.cdx.json

      - name: Generate VEX
        run: installguard vex --out installguard.vex.json --author "Acme Platform Security"

      - name: Upload release assets
        uses: softprops/action-gh-release@v2
        with:
          files: |
            installguard-summary.json
            installguard.cdx.json
            installguard.vex.json
```

## Why pair SBOM and VEX?

An SBOM alone answers "what is in the release?" but not "what is the
security posture of those components?" The VEX document carries the
triage state for the same graph, so downstream tooling can distinguish a
known clean release from an unresolved finding.

## Operational notes

- Keep the `installguard ci` step in front of the evidence generation so
  a blocked dependency never gets a polished release bundle by mistake.
- Set the VEX `--author` string to the team or function that owns the
  security decision, not an individual engineer.
- If your build already produces a release workflow, these steps can drop
  straight into it after checkout and before the final publish step.

## Optional next step: sign the evidence

If the consumer of the SBOM or VEX documents needs provenance, pair this
bundle with [Signed attestation pipeline](/recipes/signed-attestation/).
That gives you a signed in-toto statement for the same release.

## Related

- [`sbom`](/usage/sbom/) - CycloneDX output.
- [`vex`](/usage/vex/) - OpenVEX output.
- [`ci`](/usage/ci/) - release gate that produces the summary JSON.
