---
title: What is InstallGuard?
description: Understand what InstallGuard does, what it doesn't, and where it fits.
---

InstallGuard is a **policy gate** for `npm install`, `pnpm install`, and `yarn install`.

It reads your lockfile, asks a handful of trust signals about every resolved package, then renders a single decision per dependency: **allow**, **warn**, or **block**. The decision is driven by a YAML policy you check into the repo. If anything blocks, InstallGuard exits non-zero and your CI step fails — *before* the install ever runs.

## What it catches

The patterns that ship malware before the public advisory feeds notice:

- **Typosquats and homoglyphs** — `axois` next to `axios`, `ｒeact` (Cyrillic) next to `react`.
- **Brand-new versions** — a package version published 18 minutes ago, downloaded by your CI 19 minutes later.
- **Suspicious lifecycle scripts** — `postinstall` that pipes `curl` into `bash`, registry tarballs that ship new `bin` entries between patch releases.
- **Dist-tag rollbacks** — `latest` moving backwards across a major boundary.
- **Publisher changes** — a different npm account publishing the next patch release.
- **Known advisories** — OSV / GHSA matched at the exact resolved version.

## What it isn't

- Not a runtime sandbox. (See [the roadmap](https://github.com/jt-systems/installguard/blob/main/ROADMAP.md) — install-time hardening is M5.)
- Not a vulnerability database. It uses OSV; it doesn't try to be one.
- Not a replacement for `npm audit`. It runs *alongside* it — `npm audit` tells you about known CVEs in your tree; InstallGuard tells you which packages you should never have installed in the first place.

## Where it fits

| Surface | What InstallGuard does |
|---|---|
| Local dev | `installguard scan` before commit, optional pre-commit hook |
| CI | `installguard ci` step that exits non-zero on `block` |
| Pull requests | `installguard report` posts a sticky Markdown comment |
| Audit | `installguard.lock` records every decision for replay |

## Trust model

Single static binary, deterministic output. No daemon, no account, no telemetry. Reads your lockfile plus your choice of registry metadata (npm, PyPI), advisory feed (OSV), project metadata (deps.dev), and OpenSSF Scorecard — every provider has a `--no-…` opt-out, and `--frozen` runs entirely from `installguard.lock` with zero network. Releases ship SHA-256 checksums; Cosign-signed binaries are on the v0.3 roadmap.
