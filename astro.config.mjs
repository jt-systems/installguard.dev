// @ts-check
import starlight from "@astrojs/starlight";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "astro/config";

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
        "Policy gate for npm/pnpm/yarn/PyPI installs. Blocks risky dependencies before they touch your CI or your machine.",
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
      components: {
        ThemeProvider: "./src/components/starlight/ThemeProvider.astro",
        ThemeSelect: "./src/components/starlight/ThemeSelect.astro",
      },
      // Keep search static and zero-infra via Starlight's built-in Pagefind UI.
      pagefind: true,
      customCss: ["./src/styles/global.css"],
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
            { label: "Severity model", slug: "concepts/severity" },
            { label: "Decisions", slug: "concepts/decisions" },
            { label: "Ecosystems", slug: "concepts/ecosystems" },
            { label: "Workspaces", slug: "concepts/workspaces" },
          ],
        },
        {
          label: "Usage",
          items: [
            { label: "scan", slug: "usage/scan" },
            { label: "ci", slug: "usage/ci" },
            { label: "report", slug: "usage/report" },
            { label: "doctor", slug: "usage/doctor" },
            { label: "explain", slug: "usage/explain" },
            { label: "simulate", slug: "usage/simulate" },
            { label: "lock", slug: "usage/lock" },
            { label: "verify", slug: "usage/verify" },
            { label: "attest", slug: "usage/attest" },
            { label: "sign", slug: "usage/sign" },
            { label: "key", slug: "usage/key" },
            { label: "sbom", slug: "usage/sbom" },
            { label: "vex", slug: "usage/vex" },
            { label: "cache", slug: "usage/cache" },
            { label: "schema", slug: "usage/schema" },
            { label: "Policy YAML", slug: "usage/policy-yaml" },
            { label: "Editor setup", slug: "usage/editor-setup" },
            { label: "Troubleshooting", slug: "usage/troubleshooting" },
          ],
        },
        {
          label: "Recipes",
          items: [
            { label: "GitHub Actions", slug: "recipes/github-actions" },
            { label: "GitLab CI", slug: "recipes/gitlab-ci" },
            { label: "Dependency bots", slug: "recipes/dependency-bots" },
            { label: "Monorepos", slug: "recipes/monorepos" },
            { label: "Expo + monorepo case study", slug: "recipes/expo-monorepo" },
          ],
        },
        {
          label: "Reference",
          items: [
            { label: "Reason codes", slug: "reference/reason-codes" },
            { label: "Exit codes", slug: "reference/exit-codes" },
            { label: "Changelog", slug: "reference/changelog" },
          ],
        },
      ],
      head: [
        {
          tag: "meta",
          attrs: { name: "theme-color", content: "#020617" },
        },
        // PostHog — product analytics (pageviews, sessions, autocapture).
        // Loaded only on the production hostname so `astro dev`, preview
        // deploys, and local builds don't pollute the dataset.
        {
          tag: "script",
          content: `
            (function () {
              if (typeof window === "undefined") return;
              if (window.location.hostname !== "installguard.dev") return;
              !function(t,e){var o,n,p,r;e.__SV||(window.posthog=e,e._i=[],e.init=function(i,s,a){function g(t,e){var o=e.split(".");2==o.length&&(t=t[o[0]],e=o[1]),t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}}(p=t.createElement("script")).type="text/javascript",p.crossOrigin="anonymous",p.async=!0,p.src=s.api_host.replace(".i.posthog.com","-assets.i.posthog.com")+"/static/array.js",(r=t.getElementsByTagName("script")[0]).parentNode.insertBefore(p,r);var u=e;for(void 0!==a?u=e[a]=[]:a="posthog",u.people=u.people||[],u.toString=function(t){var e="posthog";return"posthog"!==a&&(e+="."+a),t||(e+=" (stub)"),e},u.people.toString=function(){return u.toString(1)+".people (stub)"},o="init capture register register_once register_for_session unregister unregister_for_session getFeatureFlag getFeatureFlagPayload isFeatureEnabled reloadFeatureFlags updateEarlyAccessFeatureEnrollment getEarlyAccessFeatures on onFeatureFlags onSessionId getSurveys getActiveMatchingSurveys renderSurvey canRenderSurvey getNextSurveyStep identify setPersonProperties group resetGroups setPersonPropertiesForFlags resetPersonPropertiesForFlags setGroupPropertiesForFlags resetGroupPropertiesForFlags reset get_distinct_id getGroups get_session_id get_session_replay_url alias set_config startSessionRecording stopSessionRecording sessionRecordingStarted captureException loadToolbar get_property getSessionProperty createPersonProfile opt_in_capturing opt_out_capturing has_opted_in_capturing has_opted_out_capturing clear_opt_in_out_capturing debug getPageViewId captureTraceFeedback captureTraceMetric".split(" "),n=0;n<o.length;n++)g(u,o[n]);e._i.push([i,s,a])},e.__SV=1)}(document,window.posthog||[]);
              posthog.init('phc_t7EMwtPBsJxx6xYaSLq2phSvBCNg49AdW5Zsa9pfSGmL', {
                api_host: 'https://us.i.posthog.com',
                person_profiles: 'identified_only',
                defaults: '2025-05-24'
              });
            })();
          `,
        },
      ],
    }),
  ],
});
