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

## Default policy file targets

Whether you use a local generated schema or the published URL, the common
policy targets are:

- `installguard.yaml`
- `.installguard/*.yaml`
- `.installguard/*.yml`

## Generate a repo-local schema

Use a local file when you want the editor schema to track the exact
InstallGuard binary already standardized in the repo:

```sh
mkdir -p .installguard
installguard schema > .installguard/installguard-policy.schema.json
```

Then point your editor at that local file. For example, in VS Code:

```jsonc
{
  "yaml.schemas": {
    ".installguard/installguard-policy.schema.json": [
      "installguard.yaml",
      ".installguard/*.yaml",
      ".installguard/*.yml"
    ]
  }
}
```

The exact mapping syntax varies by editor; [Editor setup](/usage/editor-setup/)
has ready-to-paste snippets for VS Code, Zed, JetBrains, and Neovim.

## Published URL

If you do not want to generate a local file, the canonical schema is
also published in the InstallGuard repo at
[`schemas/installguard-policy.schema.json`](https://github.com/jt-systems/installguard/blob/main/schemas/installguard-policy.schema.json).

In VS Code, that looks like:

```jsonc
{
  "yaml.schemas": {
    "https://raw.githubusercontent.com/jt-systems/installguard/main/schemas/installguard-policy.schema.json": [
      "installguard.yaml",
      ".installguard/*.yaml",
      ".installguard/*.yml"
    ]
  }
}
```

Pin a tag (`/main/` → `/v0.3.4/`) when you want reproducibility across an
InstallGuard upgrade.

## Which path should you use?

| Option | Best for |
|---|---|
| Published URL | Quick setup, centrally managed updates, and repos happy to track the current schema on `main`. |
| Local generated file | Teams that want the editor schema to match the exact InstallGuard binary version already pinned in CI. |

## Related

- [Policy YAML reference](/usage/policy-yaml/)
- [Editor setup](/usage/editor-setup/)
