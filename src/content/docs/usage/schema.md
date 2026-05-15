---
title: schema
description: Print the JSON Schema for the InstallGuard policy file.
---

```sh
installguard schema > installguard-policy.schema.json
```

`schema` writes the canonical JSON Schema for `installguard.yaml` to stdout.
The schema is generated from the same Rust types the runtime uses to parse
your policy, so it is always in sync with the binary you have installed —
no chance of drift between docs and code.

## When to use it

- Wire it into your editor for **live policy validation + autocomplete** (see
  [Editor setup](/usage/editor-setup/)).
- Pin the schema for the InstallGuard version you've standardised on, so
  policy edits in unrelated repos stay consistent.
- Diff the schema between InstallGuard releases to see what new policy knobs
  showed up.

## Example: editor integration

```sh
mkdir -p .vscode
installguard schema > .vscode/installguard-policy.schema.json
```

Then in `.vscode/settings.json`:

```jsonc
{
  "yaml.schemas": {
    ".vscode/installguard-policy.schema.json": "installguard.yaml"
  }
}
```

VS Code's YAML extension will now validate every `installguard.yaml` in the
workspace and offer autocomplete for every policy key.

## Stable URL

A canonical version of the schema is also published in the InstallGuard repo
at [`schemas/installguard-policy.schema.json`](https://github.com/jt-systems/installguard/blob/main/schemas/installguard-policy.schema.json),
so you can reference it directly without invoking the binary:

```jsonc
{
  "yaml.schemas": {
    "https://raw.githubusercontent.com/jt-systems/installguard/main/schemas/installguard-policy.schema.json": "installguard.yaml"
  }
}
```

Pin a tag (`/main/` → `/v0.1.18/`) when you want reproducibility across an
InstallGuard upgrade.

## Related

- [Policy YAML reference](/usage/policy-yaml/)
- [Editor setup](/usage/editor-setup/)
