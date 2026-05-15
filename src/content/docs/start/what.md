---
title: What is InstallGuard?
description: Understand what InstallGuard does, what it doesn't, and where it fits.
---

InstallGuard is a **cross-ecosystem supply-chain policy gate** for npm, pnpm, yarn, and PyPI.

It reads your lockfile, evaluates a fixed set of trust signals against every resolved package, and renders one decision per dependency: **allow**, **warn**, or **block**. The decision is driven by a YAML policy in your repo. A single block exits non-zero — *before* the install runs.

## What it catches

The patterns that ship malware before public advisory feeds notice:

- **Typosquats and homoglyphs** — `axois` next to `axios`, `ｒeact` (Cyrillic) next to `react`.
- **Brand-new versions** — published 18 minutes ago, downloaded by your CI 19 minutes later.
- **Suspicious lifecycle scripts** — `postinstall` piping `curl` into `bash`; new `bin` entries between patch releases.
- **Dist-tag rollbacks** — `latest` moving backwards across a major boundary.
- **Publisher changes** — a different npm account publishing the next patch.
- **Known advisories** — OSV / GHSA at the exact resolved version.

## What it isn't

- Not a runtime sandbox. Install-time hardening is [ROADMAP M5](https://github.com/jt-systems/installguard/blob/main/ROADMAP.md).
- Not a vulnerability database. It uses OSV; it doesn't try to be one.
- Not a replacement for `npm audit`. Runs alongside: `npm audit` flags known CVEs in your tree; InstallGuard flags packages you should never have installed in the first place.
- Not a replacement for pnpm's built-in install-time controls — see below.

## How does this compare to pnpm 11?

pnpm 11 ships strong install-time defaults: [`minimumReleaseAge`](https://pnpm.io/settings#minimumreleaseage), [`allowBuilds`](https://pnpm.io/settings#allowbuilds) + [`pnpm approve-builds`](https://pnpm.io/cli/approve-builds), [`blockExoticSubdeps`](https://pnpm.io/settings#blockexoticsubdeps), and [`trustPolicy: no-downgrade`](https://pnpm.io/settings#trustpolicy). For an all-pnpm JS shop with a "delay fresh, approve postinstalls, block weird sources" bar, that mostly covers it.

InstallGuard sits **above** that layer:

| | pnpm 11 | InstallGuard |
|---|---|---|
| **Ecosystems** | pnpm | npm, pnpm, yarn, PyPI (`uv.lock`, `poetry.lock`, pinned `requirements.txt`) under one policy |
| **External signals** | — | OSV / GHSA, deps.dev metadata, OpenSSF Scorecard, publisher account-age, dist-tag rollback, version-surface drift, PyPI sdist inspection |
| **Identity attacks** | — | Typosquat distance-1 + Unicode homoglyph detection |
| **Script analysis** | Approve / deny | Pattern-based body scanning for obfuscated payloads (shell + Python `setup.py` / in-tree PEP 517 backend code) |
| **Evidence** | Installer config | `installguard.lock` audit trail, `--frozen` replay, in-toto attestation, CycloneDX SBOM, OpenVEX |
| **Triage UX** | — | `explain`, `doctor`, `simulate`, JUnit XML, GitHub PR sticky comment, GitLab report |
| **Org policy** | Per-repo `pnpm-workspace.yaml` | One YAML policy across mixed npm / pnpm / yarn / PyPI repos |

In one line: pnpm is the installer with strong built-in guardrails. InstallGuard is the policy-and-evidence layer that sits across pnpm, npm, yarn, and PyPI.

All-pnpm JS shop? You probably don't need InstallGuard. Mixed estate, OSV / Scorecard / publisher-change gating, or auditable per-CI-run evidence? That's our lane.

## Where it fits

| Surface | What InstallGuard does |
|---|---|
| Local dev | `installguard scan` before commit, optional pre-commit hook |
| CI | `installguard ci` step that exits non-zero on `block` |
| Pull requests | `installguard report` posts a sticky Markdown comment |
| Audit | `installguard.lock` records every decision for replay |

## Trust model

Single static binary, deterministic output. No daemon, no account, no telemetry. Reads your lockfile plus optional registry metadata (npm, PyPI), OSV, deps.dev, and Scorecard — every provider has a `--no-…` opt-out, and `--frozen` runs entirely from `installguard.lock` with zero network. Releases are signed via [Sigstore cosign keyless](https://docs.sigstore.dev/cosign/signing/overview/) and ship SLSA v1.0 build provenance — see [Verify a downloaded binary](/start/install/#verify-a-downloaded-binary).
