---
title: Install
description: How to install InstallGuard.
---

## macOS / Linux (Homebrew)

```sh
brew install jt-systems/installguard/installguard
```

The tap installs a single static binary; no Ruby, Python, or Node runtime is required.

## From source (any platform with Rust ≥ 1.86)

```sh
cargo install --git https://github.com/jt-systems/installguard installguard --locked
```

## Pre-built binaries

Every release publishes static binaries for:

- `aarch64-apple-darwin`
- `x86_64-apple-darwin`
- `aarch64-unknown-linux-musl`
- `x86_64-unknown-linux-musl`
- `x86_64-pc-windows-msvc`

Download the latest from [GitHub Releases](https://github.com/jt-systems/installguard/releases/latest), verify against `checksums.txt` (also published per-release), drop into your `$PATH`.

:::note[Binary signing]
The release workflow ships SHA-256 checksums alongside each
binary, but the binaries themselves are not yet Cosign-signed and
the checksums file is not yet attested. Sigstore signing of
release binaries is on the [v0.3 roadmap](https://github.com/jt-systems/installguard/blob/main/ROADMAP.md);
until it lands, treat the GitHub Releases artefacts as
"trust-on-first-use" relative to the repository's signed git tag.
SLSA L3 attestations are produced for the SBOM and policy
evaluation predicates today (see [Attestations](/usage/attest/));
binary provenance is the next step.
:::

## Verify

```sh
installguard --version
```

Expected output is the version number. If you get "command not found", make sure `$(brew --prefix)/bin` (or wherever your binary lives) is on `$PATH`.
