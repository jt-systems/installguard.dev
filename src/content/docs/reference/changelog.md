---
title: Changelog
description: What shipped in each InstallGuard release.
---

The canonical changelog lives in the repo at [`CHANGELOG.md`](https://github.com/jt-systems/installguard/blob/main/CHANGELOG.md). This page mirrors the user-facing highlights.

## 0.3.1 — 2026-05-15

Three small correctness fixes — none change a verdict on existing fixtures, but each closes a "silent in the wrong direction" hole.

* **`--frozen` replay no longer loses the PyPI source kind.** The lock format records `source: "pypi"` since 0.2.7, but the rebuild path was missing the `pypi` arm and collapsed it back to `Source::Registry`. Decisions were unaffected (both are non-exotic), but JSON / explain output mis-attributed PyPI deps as generic registry entries when reading a v2 lock.

* **Scorecard repo discovery no longer fails open.** Transport, 5xx, and decode failures on the npm packument / PyPI metadata fetch (used to discover the upstream repo URL) used to collapse to "no signal". They now surface as `Signal::Unavailable`. "No `repository` field recorded" is still silent (legitimate absence). Matters most if you've disabled the dedicated `npm-registry` / `pypi-registry` providers and rely on Scorecard alone.

* **`requireProvenance` honesty pass extended to user-facing docs.** The 0.2.6 cleanup fixed the code-level overclaims; this round fixes the [`requireProvenance`](/usage/policy-yaml/) row on the Policy YAML reference and the trust-score factor list in the [whitepaper](/whitepaper/) so neither implies the cryptographic DSSE / Rekor verification we don't yet perform. M9 still tracks the verified upgrade.

## 0.3.0 — 2026-05-15

**Release-binary signing and SLSA Build Level 3 provenance.** The release workflow now Cosign-signs every published binary plus `checksums.txt`, and emits a SLSA v1.0 Build Level 3 provenance attestation covering the same artefacts. This closes the "known-pending" item from 0.2.9 and the long-standing v0.3 Sigstore signing milestone.

* **Cosign keyless signing.** The release job runs [`cosign sign-blob`](https://docs.sigstore.dev/cosign/signing/signing_with_blobs/) against every binary in the matrix and against `checksums.txt`, producing a `*.cosign.bundle` Sigstore bundle (DSSE envelope + Fulcio cert chain + Rekor inclusion proof) for each. Signing is *keyless*: cosign exchanges the ambient GitHub OIDC token for a 10-minute Fulcio code-signing certificate whose SAN is bound to the workflow file at the published tag, signs, submits to Rekor, and writes the bundle. There are no long-lived signing keys for an attacker to steal. See [Verify a downloaded binary](/start/install/#verify-a-downloaded-binary) for the verification command.

* **SLSA v1.0 Build Level 3 provenance.** A new `provenance` job invokes the [slsa-github-generator](https://github.com/slsa-framework/slsa-github-generator) reusable workflow on a hardened GitHub-hosted builder. The generator emits a SLSA v1.0 provenance attestation (`installguard-<TAG>.intoto.jsonl`) covering every binary plus `checksums.txt`, signed via the same Fulcio/Rekor path, and uploads it to the same release. Consumers verify with [slsa-verifier](https://github.com/slsa-framework/slsa-verifier) pinned to the source repo + tag — see [SLSA Build Level 3 provenance](/start/install/#slsa-build-level-3-provenance).

* **What this *does not* change:** the `requireProvenance` policy gate still validates *npm and PyPI* publisher attestations structurally (in-toto subject digest match against the tarball's `dist.integrity`, or a 200 from PyPI's Integrity API); cryptographic verification of those bundles against a pinned Sigstore Fulcio root is a separate piece of work tracked under ROADMAP M9. See the 0.2.6 entry for the current honest scope of `requireProvenance`. The `cosign verify-blob` command above verifies *InstallGuard's own release artefacts* — the binary you downloaded was built by this repo's release workflow at the published tag — not the dependencies it scans.

## 0.2.9 — 2026-05-15

**Honesty pass on the README and the public docs site.** No behaviour change; this release closes three documentation overclaims that an external review surfaced.

* **Landing page no longer claims InstallGuard "never opens an outbound socket".** The card describing zero side-effects was correct on `--frozen` and incorrect everywhere else (registry metadata, advisory lookups, project metadata, and Scorecard pulls all open sockets in the default scan path). Replaced with the truthful description plus an explicit pointer to the `--frozen` mode for true zero-network runs. The full lockfile coverage list (`uv.lock`, `poetry.lock`, pinned `requirements.txt`) was added at the same time so the card doesn't accidentally undercount our PyPI support.

* **Install page no longer says "signed binaries".** Releases ship SHA-256 checksums and SLSA L3 attestations are produced for the SBOM and policy-evaluation predicates today, but the binaries themselves are not yet Cosign-signed and `checksums.txt` is not yet attested. The page now documents the present state plus the v0.3 roadmap item. The trust-model section on the [What is InstallGuard?](/start/what/) page carries the same correction.

* **README quick-start reflects the current `0.2.x` series**, with the network-provider defaults spelled out so users can size the network blast radius before they invoke us.

**Known pending (tracked, not blocking this release):** the release workflow itself does not yet Cosign-sign the published binaries or attest the checksums file. That work is captured in the ROADMAP under the v0.3 milestone alongside Sigstore Fulcio verification of npm/PyPI provenance bundles.

## 0.2.8 — 2026-05-15

**Yarn workspace member `package.json` files are now walked for direct-dep detection.** The Yarn Berry adapter previously only read the root `package.json`. In a typical monorepo the root has only `devDependencies` (or is entirely empty under `private: true` with everything declared in `packages/*/package.json`); every member dep was therefore demoted to "transitive" and any `directOnly` policy rule silently no-op'd against them.

The adapter now reads the root's `workspaces` field (both shapes — bare array `["packages/*", "apps/web"]` and the Yarn-1 nohoist-compatibility object form `{ "packages": [...] }`), expands each pattern under the lockfile's parent directory, and unions direct-dep specs across the root and every member. Two glob shapes are supported: literal segments (`packages/web`) and trailing single-star (`packages/*`); these cover the overwhelming majority of real workspaces. `**` and other exotic globs are deliberately not supported.

The pnpm and npm adapters were already at parity — pnpm records the workspace member graph in `pnpm-lock.yaml`'s `importers` map, and `package-lock.json` v3 stores the workspace tree under its `packages` field. This release brings yarn level with them.

## 0.2.7 — 2026-05-15

**purl is now ecosystem-aware, and the lock format records each entry's ecosystem.** Two related correctness fixes that an external review surfaced.

* **`purl_for` distinguishes PyPI from npm.** Until this release, every component in a CycloneDX SBOM and every product reference in a generated VEX document was emitted as `pkg:npm/<name>@…`, including PyPI deps. Downstream tooling (Dependency-Track, GUAC, OSV-Scanner ingestion of our SBOMs) couldn't tell a Python `requests` from an npm `requests` and would either match the wrong advisory set or skip the dep entirely. `purl_for` now produces `pkg:pypi/<name>@<version>` for any PyPI dep, with the name normalised per [PEP 503](https://peps.python.org/pep-0503/#normalized-names) (lowercased; runs of `_`, `-`, and `.` collapsed to a single `-`) as the purl spec requires for the `pypi` type. `npm` / `pnpm` / `yarn` deps still emit `pkg:npm/…` (they share the npm registry, so the purl spec keeps the type the same). Smoke: `pyyaml@6.0.1` now appears in the SBOM as `pkg:pypi/pyyaml@6.0.1` instead of `pkg:npm/pyyaml@6.0.1`.

* **`installguard.lock` schema bumped to v2 with a per-entry `ecosystem` field.** The frozen-policy rebuild (`installguard scan --frozen` and friends) used to hardcode every reconstructed dependency to `npm`, so an offline run replayed PyPI decisions against the wrong policy family and could mis-attribute reasons in the audit log. Each lock entry now carries an `ecosystem` field; frozen rebuilds use it directly. v1 locks (written by ≤0.2.6) still load — the field defaults to absent, which the rebuild treats as `npm` (the only ecosystem v1 locks could have contained), then re-emits as v2 on the next `installguard lock`. Forward-incompatible schema versions still abort with exit 2.

## 0.2.6 — 2026-05-15

**Honesty pass on the provenance gate, fail-loud on catalogue outages, and a freshness window on the trust-score `published_at` penalty.** No new providers; this release closes three correctness issues that an external review surfaced.

* **`requireProvenance` no longer overclaims.** The doc-comment said "verified npm provenance" but the gate has only ever checked that the bundle's in-toto subject digest matches the tarball's `dist.integrity` (and, since 0.2.4, that PyPI's [Integrity API](https://docs.pypi.org/api/integrity/) returned 200 for the file). Both are *claimed* attestations, not *cryptographically verified* ones — we never walk the DSSE signature against a pinned Sigstore Fulcio root, and we never verify the Rekor inclusion proof. The `requireProvenance` doc, the `ProvenanceMissing` reason text, and the policy-gate comment all now say so explicitly. A `TODO(M9)` marks where the verified-peer signal will land alongside Sigstore Fulcio verification; when it does, this gate will require the verified signal and the present behaviour will move behind a separate, weaker `requireProvenanceClaim` toggle. **No behaviour change** — every gate that fired before still fires; we only owned what we ship.

* **deps.dev and Scorecard now distinguish "not indexed" from "outage".** Both providers used to collapse network failures, 5xx responses, and decode errors to a silent `None`, then return an empty signal set. The policy layer's existing `signal-unavailable` reason therefore never fired and a clean scan could hide a deps.dev outage or Scorecard interference. Both providers now lift those failure modes to `Signal::Unavailable { provider, reason }`. 404/410 stays silent (cached as a soft miss — the package isn't indexed yet). Operators who want hard failure on catalogue outages can use `severity: signal-unavailable: block`; the default stays at `warn` so transient 5xxs don't break CI.

* **The trust-score `published_at` penalty now respects a freshness window.** The matrix said the −10 was for "very recent publish", but the rule actually applied to every package — every dependency carries a `published_at`, so the steady-state trust score was silently capped at 90 and `minTrustScore: 90+` would block healthy packages for the wrong reason. The penalty now only applies when the publish time is within `FRESHNESS_WINDOW_DAYS` (14 days, aligned with the docs' default `minimumReleaseAge` recommendation). Outside the window the contribution is zero and the signal is omitted from the breakdown — it still appears in the audit signal set for explainability. Future-dated publishes (clock skew or forged metadata) are also treated as outside the window rather than counting as "fresh".

  Smoke-validated: `pyyaml@6.0.1` (a 2023 release) now scores 100/100 on a default policy instead of 90/100.

## 0.2.5 — 2026-05-15

**PyPI sdists are now scanned for install-time RCE patterns.** A new provider (`installguard-signal-pypi-sdist`) closes the last two cells in the PyPI coverage matrix that had a viable path: `lifecycle_scripts` and `suspicious_script`.

For every resolved PyPI dependency the provider downloads the canonical `.tar.gz` sdist (subject to a 25 MiB hard cap, HEAD-probed first so a pathological size never costs bandwidth), verifies the tarball's SHA-256 against the digest PyPI publishes, extracts `setup.py` (1 MiB cap on the body, UTF-8 lossy fallback), and emits `Signal::LifecycleScripts { scripts: ["setup.py"] }` whenever the file is present — `setup.py` runs during `pip install`, full stop.

The body is then run through both the existing shell-pattern detector (`curl … | sh`, `wget … | bash`, `/dev/tcp`, base64-decoded shell) and a new Python-aware ruleset covering `os.system`/`subprocess` calls that fetch over the network, `exec`/`eval` of `urlopen`/`requests.get`/`b64decode` payloads, the canonical `socket.socket(…) + os.dup2 / pty.spawn / sh -i` reverse-shell layout, and `__import__('os').system(…)` obfuscation. Each rule fires at most once per body and emits `Signal::SuspiciousScript`.

The provider fails soft on every kind of network or parse error. PEP 517-only sdists (no `setup.py`, just a `pyproject.toml`) correctly produce no lifecycle signal — that is the safe shape and we want users moving toward it. A new `--no-pypi-sdist` flag matches the existing opt-out family for offline / air-gapped CI runs.

Smoke-validated against `pyyaml@6.0.1`: `lifecycle_scripts: ["setup.py"]` is emitted, the default policy blocks the install, and `--no-pypi-sdist` correctly suppresses the signal.

## 0.2.4 — 2026-05-15

**PEP 740 publisher attestations are now surfaced as `provenance_claimed` on PyPI deps.** The pypi-registry provider gains a second probe — after fetching `/pypi/<name>/<version>/json` for `published_at` and yanked status, it also asks PyPI's [Integrity API](https://docs.pypi.org/api/integrity/) (`GET /integrity/<name>/<version>/<filename>/provenance`) about the canonical sdist (or first wheel as fallback). A `200` response means the file was uploaded with a Trusted Publisher attestation that PyPI cryptographically verified at upload time; we surface that as `Signal::ProvenanceClaimed` with `bundle_url` set to the integrity URL itself.

The signal shape matches npm provenance, so the `+10` trust-score boost applies identically across ecosystems and `policy.requireProvenance` now works for PyPI deps too. The probe is silent on `404` (most projects haven't adopted Trusted Publishers yet — absence isn't suspicious) and on network errors (the metadata signals remain authoritative).

Smoke-tested live: `sigstore@3.6.1` now surfaces `provenance_claimed` against `pypi.org/integrity/sigstore/3.6.1/sigstore-3.6.1.tar.gz/provenance`, lifting its trust score to 98/100.

This closes the `provenance_claimed` deferral on the PyPI side of the [ecosystems coverage matrix](/concepts/ecosystems/#signal-coverage). `publisher_change` and `maintainer_new_account` remain deferred — PyPI still does not expose a stable per-version publisher identity outside of the attestation envelope.

## 0.2.3 — 2026-05-15

**Poetry lockfiles are now first-class.** The PyPI adapter grows a third format alongside `uv.lock` and hash-pinned `requirements.txt`: `poetry.lock`, the TOML lockfile written by [Poetry](https://python-poetry.org/). Lock-version `1.x` and `2.x` are both accepted; future major versions are rejected explicitly so a schema change can't slip through silently.

Direct-vs-transitive: poetry stores the project's direct dependency set in `pyproject.toml`, not the lockfile, so the adapter peeks at the sibling `pyproject.toml` when present. It reads `[tool.poetry.dependencies]`, `[tool.poetry.group.<name>.dependencies]` (any group, dev included), and PEP 621 `[project.dependencies]` (used by poetry 2.x in modern mode). PEP 508 markers and extras (`requests[security]>=2; python_version>='3.8'`) are stripped to recover the bare distribution name; the `python` pin is excluded. Without a sibling `pyproject.toml` every entry is conservatively flagged transitive — better than lying about provenance when we genuinely don't know.

Source classification mirrors the other PyPI shapes: `[package.source]` with `type = "git"` produces `Source::Git` (with `resolved_reference` preferred over `reference`), `type = "url"` becomes `Source::Tarball`, `type = "file"` / `"directory"` become `Source::File`, and `"legacy"` (custom PEP 503 indexes) plus the registry default both fall through to `Source::Pypi`. Integrity prefers any non-`.whl` file (typically the sdist) over wheel hashes.

Lockfile auto-discovery extended: `installguard explain` and `evaluate` now find `poetry.lock` in `--path` directories alongside `uv.lock` and `requirements.txt`. Smoke-tested live against a real `requests@2.31.0` `poetry.lock` + `pyproject.toml` pair — all six PyPI signals (published_at, three OSV advisories, project_metadata, scorecard_score) emit identically to the `uv.lock` path.

## 0.2.2 — 2026-05-15

**OpenSSF Scorecard now scores PyPI dependencies.** The Scorecard provider previously skipped Python deps because it discovered the upstream source-repo URL via the npm packument. This release teaches it to read PyPI's `info.project_urls` map (with `info.home_page` as a last-resort fallback) so any PyPI package that points its `Source` / `Repository` / `Source Code` URL at a GitHub repo gets a `scorecard_score` signal.

The walk over `project_urls` is case- and separator-insensitive (`Source-Code`, `source code`, `Repository` all match), and falls through to any value containing `github.com` before `home_page` — catching the common case where a project lists its repo only under a custom key like `Tracker` or `Bug Reports`.

GitHub-hosting requirement unchanged: non-github source URLs resolve to no signal (Scorecard's gitlab.com / bitbucket.org coverage is too sparse to be useful today).

Smoke-tested live: `requests@2.31.0` now surfaces `scorecard_score: 8` against `github.com/psf/requests`, lifting its trust score from 60 to 66.

## 0.2.1 — 2026-05-15

**PyPI dependencies are now scored and gated.** The 0.2.0 adapter made PyPI deps visible; this release wires three signal providers to them so they actually participate in policy decisions.

* New crate `installguard-signal-pypi-registry` calling the [PyPI JSON API](https://docs.pypi.org/api/json/) and emitting `published_at` (earliest `upload_time_iso_8601` across the sdist + wheel files for the resolved version) and `deprecated_version` when the release is yanked ([PEP 592](https://peps.python.org/pep-0592/)).
* OSV advisory provider now speaks PyPI: `Ecosystem::Pypi` maps to the OSV `"PyPI"` ecosystem label, so GHSA / PyPA advisories land on Python deps with the same severity bucketing as npm-family. This is the headline value of the slice — `cryptography@<X`, `requests@2.31.0`, `urllib3@<1.26.18` etc. now block / warn per the same `defaults.advisorySeverity` policy as their npm equivalents.
* deps.dev provider: system selector parameterised; PyPI version records fetch from `/v3alpha/systems/pypi/...` and the in-process cache is keyed by `(system, name@version)` so npm and PyPI never alias.
* New CLI flag [`--no-pypi-registry`](/usage/scan/) for fully offline / air-gapped CI runs (mirrors `--no-osv` / `--no-deps-dev` / `--no-scorecard`).

Deferred to follow-up slices: PyPI maintainer / publisher signals (the JSON API doesn't expose per-version publisher identity); OpenSSF Scorecard for PyPI deps (needs `info.project_urls` plumbed into the Scorecard provider); `setup.py` static analysis for sdists (different provider shape — needs download + extract).

## 0.2.0 — 2026-05-15

**First non-npm ecosystem.** PyPI lockfiles now parse, evaluate, and report alongside npm / pnpm / yarn projects. The signal providers will follow in 0.2.x; this release ships the adapter so users can immediately see PyPI dependencies in `scan`, `ci`, [`lock`](/usage/lock/), [`sbom`](/usage/sbom/), and [`vex`](/usage/vex/) output, and so policy authors can start writing forward-compatible `pypi:`-prefixed allowlists today.

Two lockfile formats supported:

* **`uv.lock`** — the canonical TOML lockfile produced by [uv](https://docs.astral.sh/uv/). Schema version 1. Pulls per-package sdist/wheel URLs and `sha256` hashes; the root virtual package is suppressed; transitive vs direct is computed from the root's `dependencies` list.
* **`requirements.txt`** — only when generated with hashes (`uv pip compile --generate-hashes` or `pip-compile --generate-hashes`). Hash-less files are rejected with a clear actionable error: a wishlist is not a lockfile, and shipping a lockfile-shaped adapter against one would silently lower the bar.

Names are normalised per [PEP 503](https://peps.python.org/pep-0503/#normalized-names) throughout (`Re_quests` → `requests`); ecosystem matchers and cache keys all see the normalised form.

Lockfile lookup priority is now `pnpm-lock.yaml` → `yarn.lock` → `package-lock.json` → `uv.lock` → `requirements.txt`. npm-family lockfiles still win when both are present, so polyglot repos running InstallGuard from the JS root keep their existing behaviour.

Until PyPI signal providers ship in 0.2.x, PyPI dependencies resolve to `allow` with empty signals — visible in scan output and SBOM components, but not gated. Existing 0.1.x policies, locks, and audit logs are forward-compatible without changes.

## 0.1.19 — 2026-05-15

**Docs catch-up: every subcommand now has a usage page.** The Usage section grew from 9 to 18 pages, covering every command that ships in the binary. Previously undocumented:

* [`cache`](/usage/cache/) — inspect & manage the on-disk signal cache (new in 0.1.17).
* [`schema`](/usage/schema/) — print the policy JSON Schema for editor integration.
* [`lock`](/usage/lock/) — deterministic policy-evaluation snapshot.
* [`verify`](/usage/verify/) — re-evaluate and check against a lock or signed bundle (online, frozen, or signature-verifying modes).
* [`attest`](/usage/attest/) — unsigned in-toto v1 statement wrapping the verdict.
* [`sbom`](/usage/sbom/) — CycloneDX 1.5 SBOM with `installguard:*` decision properties per component.
* [`vex`](/usage/vex/) — OpenVEX 0.2.0 mapping decisions to VEX statements.
* [`key`](/usage/key/) — generate Sigstore-compatible Ed25519 keypairs.
* [`sign`](/usage/sign/) — DSSE v1 envelope cosign can verify.

The attestation chain (`lock` → `attest` → `sign` → `verify --bundle`) is cross-linked end-to-end so the SLSA L3 / cosign story is finally walkable from the docs alone.

No binary changes.

## 0.1.18 — 2026-05-15

**Recipe: gating Dependabot & Renovate PRs.** New [Dependency bots](/recipes/dependency-bots/) recipe shows how to scope an InstallGuard workflow to bot-authored bump PRs, and how to gate Dependabot automerge on a clean InstallGuard verdict so patch & minor bumps land hands-free while real findings still block. Includes a Renovate config snippet that defers automerge to required-status-check enforcement, plus the security rationale for keeping the gate in a target-branch workflow file (so bots can't edit it).

Also ships [`examples/workflows/installguard-bot-prs.yml`](https://github.com/jt-systems/installguard/blob/main/examples/workflows/installguard-bot-prs.yml) for drop-in use.

No binary changes — same gate, more places to plug it in.

## 0.1.17 — 2026-05-15

**Cache invalidation, finally automatic.** Every on-disk cache entry now stamps the producing tool's version on write; on read, a mismatch drops the entry just like a schema mismatch. Closes the historical foot-gun where signal-shape changes that shipped between explicit schema bumps left users hand-running `rm -rf ~/Library/Caches/installguard` after every upgrade. Legacy entries written by 0.1.16 and earlier auto-flush on first read under 0.1.17 — you get a clean slate on the upgrade.

New [`installguard cache`](/usage/troubleshooting/#i-upgraded-installguard-and-a-packages-signals-look-stale) subcommand for inspection and manual control:

* `installguard cache path` — prints the resolved cache directory.
* `installguard cache info` — per-status breakdown (fresh / stale by version / stale by schema / unreadable) plus the running tool version.
* `installguard cache clear` — drops every entry; the next `scan` refetches signals from the network.

All three honour `--cache-dir` for parity with `scan`.

## 0.1.16 — 2026-05-15

Type-system placeholders for the upcoming PyPI adapter ([ROADMAP M8](https://github.com/jt-systems/installguard/blob/main/ROADMAP.md)). The core crate now ships an `Ecosystem::Pypi` variant and a `Source::Pypi { url }` variant; neither is emitted by any adapter today. They exist so downstream `match` arms over `Ecosystem` and `Source` are forced to handle PyPI *before* the adapter starts producing them — trading a small amount of "hot lava" today for a much smoother adapter rollout when M8 lands.

`Source::Pypi` is treated as non-exotic alongside `Source::Registry` and `Source::Workspace` (PyPI is a first-party registry source). A PyPI-ecosystem `ResolvedDependency` produces the cache key `pypi/<name>@<version>`, matching the [ecosystem-prefix grammar](/usage/policy-yaml/#ecosystem-prefix-grammar) shipped in 0.1.15.

No user-facing CLI behaviour changes.

## 0.1.15 — 2026-05-15

Policy allowlists now accept an optional [ecosystem-prefix grammar](/usage/policy-yaml/#ecosystem-prefix-grammar). Bare entries (`gaxios`, `my-pkg`) keep working unchanged and match a package of that name in any registry family — every existing 0.1.x policy is unaffected. New prefixed entries scope the allow to one family: `npm:lodash` matches only npm-family packages (npm/pnpm/yarn), and `pypi:requests` parses today as forward-compat for the upcoming PyPI adapter ([ROADMAP M8](https://github.com/jt-systems/installguard/blob/main/ROADMAP.md)). The grammar applies to `defaults.nameSquatAllow` and `scripts.allow`; scoped npm names (`@scope/name`, `npm:@scope/name`) work in both forms.

Unknown family prefixes (`pypy:lodash`, `gem:rails`) fail policy load loudly rather than silently allowing nothing.

Internally, the dependency cache key now derives from the package's *registry family* rather than a hardcoded `"npm"` literal — paving the way for `pypi/<name>@<version>` keys without further core changes when the PyPI adapter lands.

## 0.1.14 — 2026-05-15

New [`installguard simulate`](/usage/simulate/) subcommand. Runs the same evaluation pipeline as [`scan`](/usage/scan/) once against the project's *current* policy, then re-evaluates every dependency against a *candidate* policy YAML using the **same signals** (no second network round-trip), and prints the per-package decision diff: which packages would be newly blocked, newly warned, newly allowed, or have their reasons change while staying in the same decision class. Pretty output groups by class with a `+`/`-` reason-code delta per package; `--format json` emits a stable machine-readable shape (`schemaVersion: 1`) with per-change before/after `details` and `reasonCodes`. Always exits `0` — simulate is advisory; gating belongs in `scan` or `ci`. Completes the [`explain`](/usage/explain/) (why was this blocked?) / [`doctor`](/usage/doctor/) (what should I add?) / `simulate` (what would happen if I added this?) triad — the propose → preview → merge loop for policy changes without spinning up a scratch repo or a network re-fetch.

`--frozen` is rejected with a clear error: the lock stores decisions, not raw signals, so a candidate policy cannot be re-evaluated against it.

## 0.1.13 — 2026-05-15

New [`installguard explain`](/usage/explain/) subcommand. Runs the same evaluation pipeline as `scan` / `doctor`, but for one `name@version` coordinate already present in the lockfile, prints the full per-package audit trail: every signal observed (rendered as compact JSON, one per line, so every variant round-trips losslessly), every reason produced (with stable kebab-case code, human summary, and remediation hint), and the trust-score breakdown with each weighted contribution and rationale. Pretty output is the default; `--format json` emits a stable machine-readable shape (`schemaVersion: 1`) suitable for piping into tooling. Always exits `0` — explain is informational; gating belongs in `scan` or `ci`. Pairs naturally with [`doctor`](/usage/doctor/) (0.1.12), which tells you *what* to allow.

`dist-tag-anomaly` heuristic tightened with three new suppressions, all driven by false positives observed on real production lockfiles. **Sentinel filter**: versions with `major >= 999` are dropped from the `highest_published` candidate set — `react-native` publishes `1000.0.0` precisely to break `npm install react-native@latest`, and treating it as the highest produced a guaranteed false positive for every RN lockfile. **User-bypass at-or-past max**: if the resolved dep version is itself `>= highest_published`, the operator has pinned past `latest` deliberately (e.g. `accepts@2.0.0` while `latest=1.3.8` during a cautious 2.x rollout). **User-bypass below latest major**: if the resolved dep version is on a major *older* than `latest`, the operator has explicitly stepped off the `latest` train (e.g. `@expo/cli@54.0.24` while Expo SDK 55 is `latest` and SDK 56 is published). The structural cross-major case within the user's major remains the high-precision pattern still surfaced.

Default `scripts.allow` gains `core-js` and `protobufjs`. Both are the postinstall-runs-helper-script pattern (same shape as `esbuild`, `playwright`, `supabase`) and satisfy the existing inclusion criteria — tens of millions of weekly downloads each, single well-understood install purpose, no historical takeover advisory tied to the install script. User-supplied `scripts.allow` continues to extend (not replace) the built-in default.

## 0.1.12 — 2026-05-14

New [`installguard doctor`](/usage/doctor/) subcommand. Runs the same evaluation pipeline as `scan`, but instead of printing a verdict it groups the actionable findings by class and emits a ready-to-paste `installguard.yaml` block that resolves the false positives we have a known fix for: lifecycle-script blocks become a `scripts.allow` list (commented with the scripts seen so reviewers can vet before allowing), name-squat blocks become a `defaults.nameSquatAllow` list (commented with the package each one resembles), and `dist-tag-anomaly` / `signal-unavailable` blocks become explicit `severity: warn` overrides (their default since 0.1.6 / 0.1.7 — surfacing this means the operator had locally promoted them). Doctor is advisory only — it always exits `0`; use `scan` or `ci` to gate. Closes the "blocked → triage → write config" loop into a single command for first-time adopters.

## 0.1.11 — 2026-05-14

Default `scripts.allow` gains `supabase`. The npm-distributed Supabase CLI is the postinstall-downloads-platform-binary pattern (same shape as `esbuild`, `playwright`, `@biomejs/biome`): the script genuinely needs to run for the package to function, and it satisfies the existing inclusion criteria — well over 1M weekly downloads, single well-understood install purpose (fetch the platform-appropriate CLI binary from GitHub Releases and install it into `node_modules/.bin`), no historical takeover advisory tied to the install script. User-supplied `scripts.allow` continues to extend (not replace) the built-in default.

## 0.1.10 — 2026-05-14

`defaults.nameSquatAllow` allowlist for the name-squat detector. Levenshtein-1 catches typosquats but also produces false positives for legitimate packages whose names happen to sit near a popular one — most visibly `gaxios` (Google's HTTP client) being flagged against `axios`. Operators can now suppress specific names without disabling the detector globally.

```yaml
defaults:
  nameSquatAllow: [gaxios]
```

Allowlist is exact-match only — typo-of-an-allowlisted-name still fires.

## 0.1.9 — 2026-05-14

Registry lookup tolerates `v`-prefixed lockfile versions. Some lockfiles record `version: 'v1.35.1'` when npm/yarn resolved against a GitHub release tag; the registry stores bare semver, so the literal lookup missed every time and surfaced as `signal-unavailable`. The provider now retries with the leading `v` stripped (only when followed by an ASCII digit, so `velocity` is unaffected). Lockfile-fidelity is preserved in audit output; only the lookup is normalized.

## 0.1.8 — 2026-05-14

Workspace-aware policy. npm v3+ lockfiles record workspace members at their on-disk path with no `resolved` URL — these were being treated as private registry packages and producing one `signal-unavailable` per member. The npm adapter now classifies them as `Source::Workspace`, the CLI skips signal gathering, and `Policy::evaluate` short-circuits to `Allow`. See [Concepts › Workspaces](/concepts/workspaces/).

## 0.1.7 — 2026-05-14

`signal-unavailable` default severity demoted from `block` to `warn`. A provider failing to answer is not evidence of compromise. Operators who want strict-fail-closed semantics can promote with `severity.signal-unavailable: block`.

## 0.1.6 — 2026-05-14

`dist-tag-anomaly` default severity demoted from `block` to `warn`. A backwards-moving `latest` is structurally unusual but most often indicates a maintainer running an LTS line as `latest` while a newer major exists on a separate tag.

## 0.1.5 — 2026-05-14

Bugfix: the per-reason `↳` remediation hint promised in 0.1.4 was wired into `Reason::remediation()` but never rendered. Restored, so each finding now actually prints its hint immediately under the bullet.

## 0.1.4 — 2026-05-14

Scan UX: actionable next-steps. Each finding carries a one-line remediation hint specific to its signal class, and pretty output ends with a generic "Next steps" footer pointing at investigation, allowlisting, freezing, and reporting paths.

## 0.1.3 — 2026-05-14

Scan UX: live progress indicator. A small Braille spinner ticks on stderr at 10 Hz with a `done/total` counter during the signal-gather phase. Suppressed when stderr isn't a TTY and when `NO_COLOR` is set.

## 0.1.2 — 2026-05-14

Cuts ~21 false-positive blocks from the same real-world 1,276-package scan that 0.1.1 drove down from ~120 to ~21. Default `scripts.allow` now includes a curated set of well-known native-binary / asset-bootstrap packages: `bcrypt`, `cypress`, `electron`, `esbuild`, `fsevents`, `msw`, `node-gyp`, `node-pre-gyp`, `playwright`, `puppeteer`, `sharp`. `DistTagAnomaly` no longer fires for same-major patch / minor drift. On-disk cache schema bumped so v0.1.1 fixes take effect on machines with populated caches.

## 0.1.1 — 2026-05-14

First maintenance release. Reduces noise from real-world scans, fixes a packument decode regression that affected the React 19 family, and ships the new `installguard report` subcommand.

## 0.1.0 — 2026-05-13

First tagged alpha. Covers milestones M0 through M4 from the [roadmap](https://github.com/jt-systems/installguard/blob/main/ROADMAP.md) — lockfile parsing, signal providers, policy DSL, evidence outputs (CycloneDX SBOM, in-toto attestations, OpenVEX), publisher/provenance signals, OSV/deps.dev/Scorecard providers, and the public `SignalProvider` trait.
