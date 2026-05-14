// @ts-check
import { defineConfig } from "astro/config";
import starlight from "@astrojs/starlight";
import tailwindcss from "@tailwindcss/vite";

// https://astro.build/config
export default defineConfig({
  site: "https://installguard.dev",
  vite: {
    plugins: [tailwindcss()],
  },
  integrations: [
    starlight({
      title: "InstallGuard",
      description:
        "Policy gate for npm/pnpm/yarn installs. Blocks risky dependencies before they touch your CI or your machine.",
      logo: {
        light: "./src/assets/wordmark-light.svg",
        dark: "./src/assets/wordmark-dark.svg",
        replacesTitle: true,
      },
      social: [
        {
          icon: "github",
          label: "GitHub",
          href: "https://github.com/jt-systems/installguard",
        },
      ],
      customCss: ["./src/styles/global.css"],
      editLink: {
        baseUrl:
          "https://github.com/jt-systems/installguard.dev/edit/main/",
      },
      sidebar: [
        {
          label: "Start here",
          items: [
            { label: "What is InstallGuard?", slug: "start/what" },
            { label: "Install", slug: "start/install" },
            { label: "Your first scan", slug: "start/first-scan" },
          ],
        },
        {
          label: "Concepts",
          items: [
            { label: "Signals", slug: "concepts/signals" },
            { label: "Policy", slug: "concepts/policy" },
            { label: "Decisions", slug: "concepts/decisions" },
          ],
        },
        {
          label: "Usage",
          items: [
            { label: "scan", slug: "usage/scan" },
            { label: "ci", slug: "usage/ci" },
            { label: "report", slug: "usage/report" },
            { label: "Policy YAML", slug: "usage/policy-yaml" },
          ],
        },
        {
          label: "Recipes",
          items: [
            { label: "GitHub Actions", slug: "recipes/github-actions" },
            { label: "Monorepos", slug: "recipes/monorepos" },
          ],
        },
        {
          label: "Reference",
          items: [
            { label: "Reason codes", slug: "reference/reason-codes" },
            { label: "Exit codes", slug: "reference/exit-codes" },
          ],
        },
      ],
      head: [
        {
          tag: "meta",
          attrs: { name: "theme-color", content: "#020617" },
        },
      ],
    }),
  ],
});
