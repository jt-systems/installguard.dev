---
title: Editor setup
description: Get autocomplete, validation, and inline docs for installguard.yaml in your editor.
---

InstallGuard publishes a JSON Schema for `installguard.yaml`. Wire it
into your editor's YAML language server and you'll get keyword
autocomplete, type validation as you type, hover docs for every field,
and squigglies on typos before you save.

## The schema URL

```
https://raw.githubusercontent.com/jt-systems/installguard/main/schemas/installguard-policy.schema.json
```

The schema is generated from the same Rust types the CLI uses
(`Policy` via `schemars`), and a snapshot test in CI ensures the
committed file never drifts from the binary's behaviour. So whatever
your editor accepts, the CLI also accepts.

## VS Code

Install [Red Hat's YAML extension](https://marketplace.visualstudio.com/items?itemName=redhat.vscode-yaml)
and add this to your user or workspace `settings.json`:

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

The patterns are matched against the file path. Adjust them if your
project keeps its policy somewhere unusual.

## Zed

Zed bundles the YAML language server. Add the mapping to your
`settings.json` (open with `cmd+,`):

```json
{
  "lsp": {
    "yaml-language-server": {
      "settings": {
        "yaml": {
          "schemas": {
            "https://raw.githubusercontent.com/jt-systems/installguard/main/schemas/installguard-policy.schema.json": [
              "installguard.yaml",
              ".installguard/*.yaml"
            ]
          }
        }
      }
    }
  }
}
```

## JetBrains IDEs (IntelliJ / WebStorm / RustRover / PyCharm)

JetBrains IDEs ship with a built-in JSON Schema mapper that also
applies to YAML files.

1. **Settings → Languages & Frameworks → Schemas and DTDs → JSON Schema Mappings**
2. Click **+** to add a new mapping.
   - **Name**: `installguard`
   - **Schema file or URL**: paste the schema URL above
   - **Schema version**: `JSON Schema version 7`
3. Under **File path pattern**, add:
   - `installguard.yaml`
   - `.installguard/*.yaml`

Hit **OK**. Open `installguard.yaml` and confirm the IDE shows
"installguard" in the bottom status bar — that means the schema bound.

## Neovim (yaml-language-server)

If you use [nvim-lspconfig](https://github.com/neovim/nvim-lspconfig)
with `yamlls`, add the schema in your LSP config:

```lua
require("lspconfig").yamlls.setup({
  settings = {
    yaml = {
      schemas = {
        ["https://raw.githubusercontent.com/jt-systems/installguard/main/schemas/installguard-policy.schema.json"] = {
          "installguard.yaml",
          ".installguard/*.yaml",
        },
      },
    },
  },
})
```

For [SchemaStore.nvim](https://github.com/b0o/SchemaStore.nvim) users:
the InstallGuard schema is not yet on SchemaStore — use the explicit
mapping above until it lands.

## Inline `# yaml-language-server` comment

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

## Pinning to a specific version

The URL above tracks `main` and will reflect any new fields the next
release adds. To pin to a specific InstallGuard version, swap `main`
for the tag:

```text
https://raw.githubusercontent.com/jt-systems/installguard/<tag>/schemas/installguard-policy.schema.json
```

For example, if your CI is pinned to `v0.3.3`, use:

```text
https://raw.githubusercontent.com/jt-systems/installguard/v0.3.3/schemas/installguard-policy.schema.json
```

This is rarely needed — the schema is additive between minor releases —
but it's useful if you want autocomplete to match the exact CLI version
your CI runs.
