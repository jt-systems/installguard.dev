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
cargo install --git https://github.com/jt-systems/installguard installguard-cli
```

## Pre-built binaries

Every release publishes signed binaries for:

- `aarch64-apple-darwin`
- `x86_64-apple-darwin`
- `aarch64-unknown-linux-musl`
- `x86_64-unknown-linux-musl`
- `x86_64-pc-windows-msvc`

Download the latest from [GitHub Releases](https://github.com/jt-systems/installguard/releases/latest), verify against `checksums.txt`, drop into your `$PATH`.

## Verify

```sh
installguard --version
```

Expected output is the version number. If you get "command not found", make sure `$(brew --prefix)/bin` (or wherever your binary lives) is on `$PATH`.
