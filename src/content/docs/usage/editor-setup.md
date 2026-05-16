---
title: Editor setup
description: Get autocomplete, validation, and inline docs for installguard.yaml in your editor.
---

InstallGuard publishes a JSON Schema for `installguard.yaml`. Wire it
into your editor's YAML language server and you'll get keyword
autocomplete, type validation as you type, hover docs for every field,
and squigglies on typos before you save.

## Published schema URL

Use this URL directly in editors that support remote schema mappings:

```
https://raw.githubusercontent.com/jt-systems/installguard/main/schemas/installguard-policy.schema.json
```

The schema is generated from the same Rust types the CLI uses
(`Policy` via `schemars`), and a snapshot test in CI ensures the
committed file never drifts from the binary's behaviour. So whatever
your editor accepts, the CLI also accepts.

## Default policy file targets

Every example below targets the same common policy locations:

- `installguard.yaml`
- `.installguard/*.yaml`
- `.installguard/*.yml`

If your repo keeps the policy elsewhere, keep the same schema URL and
change only the file patterns.

## Editor mappings

### VS Code

**Where:** user or workspace `settings.json`<br />
**Requires:** [Red Hat's YAML extension](https://marketplace.visualstudio.com/items?itemName=redhat.vscode-yaml)

Add this mapping:

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

**Check:** open `installguard.yaml` and confirm you get completion,
hover docs, and validation errors for bad keys.

### Zed

**Where:** `settings.json`<br />
**Requires:** none; Zed bundles `yaml-language-server`

Add this mapping:

```json
{
  "lsp": {
    "yaml-language-server": {
      "settings": {
        "yaml": {
          "schemas": {
            "https://raw.githubusercontent.com/jt-systems/installguard/main/schemas/installguard-policy.schema.json": [
              "installguard.yaml",
              ".installguard/*.yaml",
              ".installguard/*.yml"
            ]
          }
        }
      }
    }
  }
}
```

**Check:** reopen `installguard.yaml` and confirm Zed offers schema-backed
completion and squiggles on invalid fields.

### JetBrains IDEs (IntelliJ / WebStorm / RustRover / PyCharm)

**Where:** **Settings → Languages & Frameworks → Schemas and DTDs → JSON Schema Mappings**<br />
**Requires:** none; JetBrains ships the mapper built in

Create one mapping with:

- **Name:** `installguard`
- **Schema file or URL:** the schema URL above
- **Schema version:** `JSON Schema version 7`
- **File path patterns:**
  - `installguard.yaml`
  - `.installguard/*.yaml`
  - `.installguard/*.yml`

**Check:** hit **OK**, open `installguard.yaml`, and confirm the IDE
shows `installguard` in the bottom status bar.

### Neovim (yaml-language-server)

**Where:** your `yamlls` config<br />
**Requires:** [nvim-lspconfig](https://github.com/neovim/nvim-lspconfig)
or equivalent `yaml-language-server` wiring

Add this mapping:

```lua
require("lspconfig").yamlls.setup({
  settings = {
    yaml = {
      schemas = {
        ["https://raw.githubusercontent.com/jt-systems/installguard/main/schemas/installguard-policy.schema.json"] = {
          "installguard.yaml",
          ".installguard/*.yaml",
          ".installguard/*.yml",
        },
      },
    },
  },
})
```

**Check:** reload the LSP client and confirm `installguard.yaml` gets
completion and validation.

For [SchemaStore.nvim](https://github.com/b0o/SchemaStore.nvim) users,
the InstallGuard schema is not yet on SchemaStore, so keep using the
explicit mapping above until it lands.

## Modeline fallback

If you can't or don't want to configure your editor globally, drop this
modeline at the top of any policy file and most YAML LSPs will pick it
up:

```yaml
# yaml-language-server: $schema=https://raw.githubusercontent.com/jt-systems/installguard/main/schemas/installguard-policy.schema.json
policyVersion: 1
# ...
```

This works in VS Code, Zed, Neovim, and any other editor running
yaml-language-server. JetBrains IDEs ignore the modeline — use the
**JSON Schema Mappings** dialog above.

## Version pinning

The URL above tracks `main` and will reflect any new fields the next
release adds. To pin to a specific InstallGuard version, swap `main`
for the tag:

```text
https://raw.githubusercontent.com/jt-systems/installguard/<tag>/schemas/installguard-policy.schema.json
```

For example, if your CI is pinned to `v0.3.4`, use:

```text
https://raw.githubusercontent.com/jt-systems/installguard/v0.3.4/schemas/installguard-policy.schema.json
```

This is rarely needed — the schema is additive between minor releases —
but it's useful if you want autocomplete to match the exact CLI version
your CI runs.
