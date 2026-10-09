import { expect, test } from "@playwright/test";

/**
 * Minimal smoke: login page renders email/password fields.
 * Requires a running app at PLAYWRIGHT_BASE_URL (default http://127.0.0.1:3000).
 * CI does not run this by default — use `npm run test:e2e` after `npm run build && npm run start`.
 */
test("login page shows email and password fields", async ({ page }) => {
  await page.goto("/login");
  await expect(page.getByLabel("Email")).toBeVisible();
  await expect(page.getByLabel("Password")).toBeVisible();
  await expect(page.getByRole("button", { name: /sign in/i })).toBeVisible();
});
