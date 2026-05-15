---
title: What is InstallGuard?
description: Understand what InstallGuard does, what it doesn't, and where it fits.
---

InstallGuard is a **cross-ecosystem supply-chain policy gate** for `npm install`, `pnpm install`, `yarn install`, and `pip install` / `uv sync` / `poetry install`.

It reads your lockfile, asks a fixed set of trust signals about every resolved package, then renders a single decision per dependency: **allow**, **warn**, or **block**. The decision is driven by a YAML policy you check into the repo. If anything blocks, InstallGuard exits non-zero and your CI step fails — *before* the install ever runs.

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
- Not a replacement for pnpm's built-in install-time controls. See below.

## How does this compare to pnpm 11?

A fair question, and one we get a lot. As of pnpm 11.x, the installer itself ships strong supply-chain defaults: [`minimumReleaseAge`](https://pnpm.io/settings#minimumreleaseage) (default 1440 minutes), [`allowBuilds`](https://pnpm.io/settings#allowbuilds) and [`pnpm approve-builds`](https://pnpm.io/cli/approve-builds) for lifecycle-script gating, [`blockExoticSubdeps`](https://pnpm.io/settings#blockexoticsubdeps), and [`trustPolicy: no-downgrade`](https://pnpm.io/settings#trustpolicy). If your team is all-in on pnpm and your bar is "delay fresh packages, approve postinstalls, block weird sources," pnpm largely covers it.

InstallGuard is positioned **above** that layer, not against it. The differences are:

| | pnpm 11 | InstallGuard |
|---|---|---|
| **Ecosystem coverage** | pnpm only | npm, pnpm, yarn, PyPI (`uv.lock`, `poetry.lock`, pinned `requirements.txt`) under one policy |
| **External risk signals** | Installer rules only | OSV / GHSA exact-version match, deps.dev metadata, OpenSSF Scorecard, publisher account-age, dist-tag rollback, version-surface drift, PyPI sdist inspection |
| **Identity attacks** | — | Typosquat distance-1 + Unicode homoglyph detection against a curated high-traffic list |
| **Script analysis** | Approve / deny | Pattern-based body scanning for obfuscated payloads in shell *and* Python `setup.py` |
| **Evidence** | Installer config | `installguard.lock` (per-decision audit trail), `--frozen` replay, in-toto attestation, CycloneDX SBOM, OpenVEX |
| **Triage UX** | — | `explain`, `doctor`, `simulate`, JUnit XML, GitHub PR sticky comment, GitLab report |
| **Org policy plane** | Per-repo `pnpm-workspace.yaml` | Single YAML policy schema applied across mixed npm / pnpm / yarn / PyPI repos in one org |

The sharpest one-liner: **pnpm is the installer with strong built-in guardrails; InstallGuard is the policy-and-evidence layer that sits across pnpm, npm, yarn, and PyPI.**

If your team standardised on pnpm and only ships JavaScript, you may not need InstallGuard. If you have a mixed estate, want OSV / Scorecard / publisher-change gating that pnpm doesn't try to provide, or need auditable evidence per CI run, that's the gap we fill.

## Where it fits

| Surface | What InstallGuard does |
|---|---|
| Local dev | `installguard scan` before commit, optional pre-commit hook |
| CI | `installguard ci` step that exits non-zero on `block` |
| Pull requests | `installguard report` posts a sticky Markdown comment |
| Audit | `installguard.lock` records every decision for replay |

## Trust model

Single static binary, deterministic output. No daemon, no account, no telemetry. Reads your lockfile plus your choice of registry metadata (npm, PyPI), advisory feed (OSV), project metadata (deps.dev), and OpenSSF Scorecard — every provider has a `--no-…` opt-out, and `--frozen` runs entirely from `installguard.lock` with zero network. Releases are signed via [Sigstore cosign keyless](https://docs.sigstore.dev/cosign/signing/overview/) and ship SLSA v1.0 build provenance — see [Verify a downloaded binary](/start/install/#verify-a-downloaded-binary) for the verification command.
