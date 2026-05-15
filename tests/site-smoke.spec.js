import { expect, test } from "@playwright/test";

function collectCspNoise(page) {
  /** @type {string[]} */
  const messages = [];

  page.on("console", (msg) => {
    const text = msg.text();
    if (
      /content security policy|violates the following content security policy directive|pagefind wasm|frame-ancestors/i.test(
        text
      )
    ) {
      messages.push(`${msg.type()}: ${text}`);
    }
  });

  page.on("pageerror", (error) => {
    if (/content security policy|pagefind|webassembly/i.test(error.message)) {
      messages.push(`pageerror: ${error.message}`);
    }
  });

  return messages;
}

test("homepage boots cleanly under production headers", async ({ page }) => {
  const cspNoise = collectCspNoise(page);
  const response = await page.goto("/", { waitUntil: "networkidle" });

  expect(response).not.toBeNull();
  expect(response.headers()["content-security-policy"]).toContain("frame-ancestors 'none'");
  expect(response.headers()["content-security-policy"]).toContain("'wasm-unsafe-eval'");

  await expect(page.locator('meta[http-equiv="content-security-policy"]')).toHaveCount(0);
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await expect(page.locator("starlight-theme-select select")).toHaveValue("dark");
  await expect(page.getByRole("heading", { name: /Stop risky packages across/i })).toBeVisible();

  const terminal = page.locator(".ig-terminal").first();
  await expect(terminal.locator(".ig-terminal-dot")).toHaveCount(3);
  expect(await terminal.locator(".ig-ansi").count()).toBeGreaterThan(0);

  await page.getByRole("button", { name: /search/i }).first().click();

  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();

  const searchInput = dialog.locator('input[type="search"], input[placeholder*="Search"]').first();
  await expect(searchInput).toBeVisible();
  await searchInput.fill("policy yaml");

  await expect(dialog.locator('a[href*="/usage/policy-yaml/"]').first()).toBeVisible();
  expect(cspNoise).toEqual([]);
});

test("first scan docs page keeps the rendered terminal example intact", async ({ page }) => {
  await page.goto("/start/first-scan/", { waitUntil: "networkidle" });

  await expect(page.getByRole("heading", { name: /First InstallGuard scan/i })).toBeVisible();

  const terminal = page.locator(".ig-terminal").first();
  await expect(terminal).toBeVisible();
  await expect(terminal.locator(".ig-terminal-dot")).toHaveCount(3);
  expect(await terminal.locator(".ig-ansi").count()).toBeGreaterThan(0);

  await expect(terminal.getByText("installguard scan", { exact: true })).toBeVisible();
  await expect(page.getByText("installguard.yaml", { exact: true }).first()).toBeVisible();
});
