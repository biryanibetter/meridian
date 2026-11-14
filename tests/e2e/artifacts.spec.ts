import { test, expect } from "@playwright/test";

test("capture current release screens without external networking", async ({ page, context }) => {
  await context.route("**/*", route => ["127.0.0.1", "localhost"].includes(new URL(route.request().url()).hostname) ? route.continue() : route.abort());
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Travel with clarity." })).toBeVisible();
  await page.screenshot({ path: "MERIDIAN_USB_SUBMISSION/backup/screenshots/01-welcome.png", fullPage: true });
  await page.goto("/app");
  await expect(page.locator(".geo-land path")).toHaveCount(177);
  await page.screenshot({ path: "MERIDIAN_USB_SUBMISSION/backup/screenshots/04-overview.png", fullPage: true });
  await page.goto("/app/entry");
  await expect(page.getByRole("heading", { name: "Visa & entry requirements" })).toBeVisible();
  await page.screenshot({ path: "MERIDIAN_USB_SUBMISSION/backup/screenshots/06-visa-entry.png", fullPage: true });
});
