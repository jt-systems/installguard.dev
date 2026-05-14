# installguard.dev

Marketing site and documentation for [InstallGuard](https://github.com/jt-systems/installguard).

Built with [Astro](https://astro.build) + [Starlight](https://starlight.astro.build) + [Tailwind v4](https://tailwindcss.com). Deployed to [Cloudflare Pages](https://pages.cloudflare.com).

## Develop

```sh
pnpm install
pnpm dev          # http://localhost:4321
pnpm build        # static output → ./dist
pnpm preview      # serve the production build locally
```

## Deploy

Cloudflare Workers + Static Assets. The committed [`wrangler.jsonc`](wrangler.jsonc) declares the Worker name (`installguard` — must be `[a-z0-9-]+`, hence not `installguard.dev`) and binds `./dist` as the asset directory. Cloudflare auto-detects this on push to `main` and deploys without any dashboard build configuration.

Custom domain `installguard.dev` is wired in the Cloudflare dashboard.

Security headers are pinned in [`public/_headers`](public/_headers).

## Content

All docs live under `src/content/docs/` as Markdown / MDX. The sidebar is configured in [`astro.config.mjs`](astro.config.mjs); add a sidebar entry for any new page.

The landing page is [`src/content/docs/index.mdx`](src/content/docs/index.mdx) and uses Starlight's `splash` template.

## Brand

- **Palette** — Sentinel: emerald accent (`#10b981`) on slate ground (`#020617`). Mirrors the CLI's `✓ allow` colour.
- **Type** — Geist (sans) + Geist Mono. CLI / file-path-heavy content uses mono prominently.
- **Tone** — Calm authority. Real terminal output, not stock locks-and-keys imagery.

## Licence

Site source: Apache-2.0 (matches the InstallGuard project).
Site copy and screenshots: CC-BY-4.0.
