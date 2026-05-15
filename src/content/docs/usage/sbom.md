---
title: sbom
description: Emit a CycloneDX 1.5 SBOM with InstallGuard policy decisions per component.
---

```sh
installguard sbom [--out installguard.cdx.json]
```

`sbom` emits a [CycloneDX 1.5](https://cyclonedx.org/specification/overview/)
SBOM in JSON, one component per package in the lockfile, with InstallGuard's
policy decision attached as `installguard:*` properties on every component.

Unlike a generic SBOM tool, the components carry the **policy verdict** —
SBOM consumers can answer "is this component allowed by my policy?" without
re-running the evaluation.

## When to use it

- **Compliance handoff.** Ship the SBOM to security/compliance teams who use
  CycloneDX-aware tooling (Dependency-Track, etc.) — the `installguard:*`
  properties surface the verdict in their existing dashboards.
- **Long-term audit trail.** SBOMs are the standard archival format for
  "what did this build depend on?" — tagging with the policy verdict at build
  time means the answer to "was this allowed at the time?" lives in the same
  artefact.
- **Sigstore + GUAC.** Pipe the SBOM through cosign or push to a GUAC
  instance for graph-based supply-chain queries.

## Component properties

Every component in `components[]` gets:

| Property | Value |
|---|---|
| `installguard:decision` | `allow` / `warn` / `block` |
| `installguard:reasons` | Comma-separated reason codes (when present) |
| `installguard:trust-score` | 0–100 trust score |

Plus the standard CycloneDX fields (`name`, `version`, `purl`, `bom-ref`,
licences if surfaced by the registry).

## Flags

The standard evaluation flags apply — see [`scan`](/usage/scan/).
`sbom`-specific flags:

| Flag | Meaning |
|---|---|
| `--out <path>` | Output path. Default: `<path>/installguard.cdx.json`. Use `-` for stdout. |

## Example

```sh
installguard sbom --out bom.json

# Find every blocked component:
jq '.components[] | select(.properties[]? | select(.name == "installguard:decision" and .value == "block"))' bom.json
```

## Related

- [`vex`](/usage/vex/) — companion document for vulnerability triage.
- [`attest`](/usage/attest/) — wrap the SBOM as an in-toto attestation.
