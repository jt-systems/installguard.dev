---
title: vex
description: Emit an OpenVEX 0.2.0 document mapping decisions to VEX statements.
---

```sh
installguard vex [--out installguard.vex.json] [--author "<name>"]
```

`vex` emits an [OpenVEX 0.2.0](https://github.com/openvex/spec) document
mapping each `block` / `warn` decision to a VEX statement. VEX
(Vulnerability Exploitability eXchange) is the standard way to communicate
"this CVE is in our SBOM but here's our triage status."

| InstallGuard decision | VEX status |
|---|---|
| `block` | `affected` |
| `warn`  | `under_investigation` |
| `allow` | *(no statement emitted — VEX only carries non-clean status)* |

The VEX `action_statement` for each entry uses the same canonical
`Reason::human_summary()` renderer that powers PR comments and audit logs, so
the rationale matches what reviewers see in `installguard report`.

## When to use it

- **Pair with [`sbom`](/usage/sbom/).** SBOM lists what's there; VEX
  explains the security posture of what's there. Together they're a complete
  compliance package.
- **Feed Dependency-Track / GUAC.** Both ingest OpenVEX natively and merge
  it with their own vulnerability databases.
- **Customer disclosure.** When a downstream consumer asks "are you affected
  by CVE-X?" you can hand them the VEX doc.

## Flags

The standard evaluation flags apply — see [`scan`](/usage/scan/).
`vex`-specific flags:

| Flag | Meaning |
|---|---|
| `--out <path>` | Output path. Default: `<path>/installguard.vex.json`. Use `-` for stdout. |
| `--author <string>` | Author string written into the document. Default: `InstallGuard`. |

## Output shape

```json
{
  "@context": "https://openvex.dev/ns/v0.2.0",
  "@id": "...",
  "author": "InstallGuard",
  "timestamp": "2026-05-15T...",
  "statements": [
    {
      "vulnerability": { "name": "GHSA-..." },
      "products": [ { "@id": "pkg:npm/danger@1.2.3" } ],
      "status": "affected",
      "action_statement": "install-time lifecycle script `postinstall` declared"
    }
  ]
}
```

## Related

- [`sbom`](/usage/sbom/) — the companion artefact.
- [Reference › Reason codes](/reference/reason-codes/) — every code that can appear in `action_statement`.
