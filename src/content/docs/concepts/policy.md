---
title: Policy
description: How an installguard.yaml shapes which signals become blocks.
---

A **policy** maps signals to decisions. It is a single YAML file at the root of your repo:

```yaml
# installguard.yaml
policyVersion: 1

defaults:
  minimumReleaseAge: 1440  # 24 hours, in minutes
  flagDeprecated: true
  detectVersionSurfaceChange: true
  requireProvenance: false
  minTrustScore: 0
  maxAdvisorySeverity: high

direct:
  # Stricter rules for direct deps; opt-in.
  detectVersionSurfaceChange: true

scripts:
  policy: deny-by-default
  allow: []  # extend the built-in default allow-list

severity:
  release-age-below-threshold: warn
  dist-tag-anomaly: block
```

## Defaults vs. direct overrides

Every setting in `defaults` applies to all dependencies. The same setting under `direct` applies *only to direct dependencies* (those your `package.json` lists explicitly). This lets you, for example, demand provenance from packages you chose to add without breaking on transitive dependencies that haven't adopted it yet.

## Severity overrides

Every reason has a default severity (`block`, `warn`, or `allow`). The `severity:` map lets you demote noisy signals or promote signals you care about more than the default.

## Built-in defaults

InstallGuard ships sensible defaults so a fresh project with no `installguard.yaml` does the right thing:

- `scripts.policy: deny-by-default` with a curated allowlist for known native-binary packages (`esbuild`, `fsevents`, `msw`, `cypress`, `playwright`, …).
- A typo allowlist that prevents legitimate packages from being flagged for being one edit away from a popular name.
- `dist-tag-anomaly` only fires across major-version boundaries.

You only need a policy file when you want to *deviate* from defaults.

## Schema

The full schema is generated from the Rust source: [`installguard-policy.schema.json`](https://github.com/jt-systems/installguard/blob/main/schemas/installguard-policy.schema.json). See [Editor setup](/usage/editor-setup/) to wire it into VS Code, Zed, JetBrains, or Neovim for autocomplete and inline validation.
