/**
 * Minimal Worker entrypoint.
 *
 * The site is 100% static assets in ./dist, but Cloudflare disables
 * deploy hooks, environment variables, and trigger configuration on
 * "assets-only" Workers. Declaring a fetch handler — even one that
 * just delegates straight to the ASSETS binding — flips the project
 * to the "Worker + Static Assets" tier and unlocks all of those.
 *
 * The handler is the default behaviour Cloudflare would apply
 * implicitly anyway, so there is no runtime cost.
 */
interface Env {
  ASSETS: Fetcher;
}

export default {
  fetch(request: Request, env: Env): Response | Promise<Response> {
    return env.ASSETS.fetch(request);
  },
} satisfies ExportedHandler<Env>;
