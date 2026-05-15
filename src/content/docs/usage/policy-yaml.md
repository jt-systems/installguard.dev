---
title: Policy YAML reference
description: Full reference for installguard.yaml.
---

The canonical reference is the JSON schema generated from the Rust source:
[`installguard-policy.schema.json`](https://github.com/jt-systems/installguard/blob/main/schemas/installguard-policy.schema.json).

Point your editor at it for auto-completion and inline validation — see [Editor setup](/usage/editor-setup/) for VS Code, Zed, JetBrains, and Neovim snippets.

## Top-level keys

| Key | Type | Notes |
|---|---|---|
| `policyVersion` | int | Currently `1`. Required. |
| `defaults` | object | Applies to every dependency. |
| `direct` | object | Overrides for direct dependencies only. |
| `scripts` | object | Lifecycle script policy. |
| `severity` | map<reason-code, allow\|warn\|block> | Demote / promote individual reasons. |

## `defaults` / `direct` shared keys

| Key | Type | Default | Meaning |
|---|---|---|---|
| `minimumReleaseAge` | minutes | `0` | Block versions newer than this. 1440 = 24h is a common starting point. |
| `flagDeprecated` | bool | `true` | Block deprecated versions. |
| `detectVersionSurfaceChange` | bool | `false` | Flag new `bin`/script entries vs. prior release. |
| `minMaintainerAccountAgeDays` | int | `0` | Block versions published by accounts younger than this. |
| `requireProvenance` | bool | `false` | Block packages without a provenance attestation. Recognises npm `--provenance` bundles and PyPI [PEP 740](https://peps.python.org/pep-0740/) Trusted Publisher attestations. |
| `minTrustScore` | 0–100 | `0` | Block packages with composite trust below threshold. |
| `maxAdvisorySeverity` | low\|medium\|high\|critical | `critical` | Block on advisories at or above this severity. |
| `requireLicense` | bool | `false` | Block when no SPDX expression is recorded. |
| `licenseAllowlist` | string[] | `[]` | When non-empty, only these SPDX expressions are allowed. |
| `blockArchived` | bool | `false` | Block packages whose upstream repo is archived. |
| `minScorecardScore` | 0–10 | `0` | Block packages with OpenSSF Scorecard below threshold. |
| `nameSquatAllow` | string[] | `[]` | Exact-match allowlist for the name-squat detector. Names listed here will not produce a `name-squat` reason even when they are Levenshtein-1 from a popular package. Accepts the [ecosystem-prefix grammar](#ecosystem-prefix-grammar) (e.g. `npm:gaxios`) since 0.1.15. Added in 0.1.10. |

## `scripts`

Lifecycle scripts that run at install time (`preinstall`, `install`, `postinstall`) are denied by default. The built-in allowlist already covers well-known native-binary packages: `bcrypt`, `cypress`, `electron`, `esbuild`, `fsevents`, `msw`, `node-gyp`, `node-pre-gyp`, `playwright`, `puppeteer`, `sharp`, `supabase`. The user-supplied `scripts.allow` **extends** (not replaces) the built-in default.

```yaml
scripts:
  policy: deny-by-default   # or allow-by-default
  allow:
    # Each entry below was reviewed against its current install script.
    # Re-review on major version bump.
    - core-js               # postinstall prints a sponsor / opt-out banner
    - "@firebase/util"      # postinstall warns about analytics opt-out
    - dtrace-provider       # install builds the C addon
    - protobufjs            # postinstall compiles the minimal runtime
    - unrs-resolver         # install builds the napi-rs native addon
    - my-private-tool       # internal — postinstall syncs an asset bundle
```

## Ecosystem-prefix grammar

Since 0.1.15, entries in `defaults.nameSquatAllow` and `scripts.allow` accept an optional `family:` prefix that scopes the allow to one registry family.

| Form | Matches |
| --- | --- |
| `lodash` (bare) | A package named `lodash` in **any** registry family. This is the v1 default and the right shape for single-ecosystem projects. |
| `npm:lodash` | Only npm-family packages (npm / pnpm / yarn). |
| `pypi:requests` | Only PyPI packages. The PyPI adapter (uv.lock, poetry.lock, hashed requirements.txt) and signal providers ship today &mdash; see [Ecosystems](/concepts/ecosystems/). |
| `@scope/pkg`, `npm:@scope/pkg` | Scoped npm names work in either form. |

Unknown family prefixes (`pypy:lodash`, `gem:rails`) are a hard parse error — better a loud failure at policy load than a silent allow-of-nothing.

Most users keep using bare names. Reach for the prefix when you operate a multi-ecosystem repo and the same package name exists in more than one family but should only be allow-listed in one.

## `severity`

Demote or promote individual reasons. See [Concepts › Severity model](/concepts/severity/) for the default verdict table and the principle behind it.

```yaml
severity:
  # Tighten:
  dist-tag-anomaly: block        # default warn
  signal-unavailable: block      # default warn — fail-closed CI
  # Loosen:
  release-age-below-threshold: warn
  maintainer-new-account: warn
```

Reason codes are kebab-case. The full set is enumerated in [Reference › Reason codes](/reference/reason-codes/).

## Worked example: a real monorepo

The minimum policy that takes a 2,666-package Expo + Cloudflare Workers monorepo from 77 blocks to 0:

```yaml
policyVersion: 1

defaults:
  nameSquatAllow:
    - gaxios                # Google's HTTP client (Levenshtein-1 from axios)

scripts:
  allow:
    - core-js
    - "@firebase/util"
    - dtrace-provider
    - protobufjs
    - unrs-resolver
```

Full walk-through: [Recipes › Expo + monorepo case study](/recipes/expo-monorepo/).
