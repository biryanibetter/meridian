import { test, expect } from "@playwright/test";

const routes = ["overview", "journeys", "journey", "entry", "applications", "tasks", "documents",
  "travel", "layovers", "travel-day", "arrival", "budget", "safety", "ai", "family", "notifications", "settings", "sources"];

test.beforeEach(async ({ context }) => {
  await context.route("**/*", route => {
    const url = new URL(route.request().url());
    return ["127.0.0.1", "localhost"].includes(url.hostname) ? route.continue() : route.abort();
  });
});

test("every preserved route and applications render locally without errors or overflow", async ({ page }) => {
  const errors: string[] = [], missing: string[] = [];
  page.on("pageerror", e => errors.push(e.message));
  page.on("response", r => { if (r.status() >= 400) missing.push(`${r.status()} ${r.url()}`); });
  for (const route of routes) {
    expect((await page.goto(`/app/${route}`))?.status(), route).toBe(200);
    await expect(page.locator(".app-content h1")).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), route).toBe(true);
  }
  expect(errors).toEqual([]);
  expect(missing).toEqual([]);
});

test("all modules fit mobile and global navigation opens", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  for (const route of ["/", ...routes.map(route => `/app/${route}`)]) {
    await page.goto(route);
    await expect(page.locator("h1").first()).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), route).toBe(true);
  }
  await page.getByRole("button", { name: "Open navigation" }).click();
  await expect(page.getByRole("navigation", { name: "Main navigation" })).toBeVisible();
  await page.getByRole("link", { name: "Expenses", exact: true }).click();
  await expect(page.locator("h1")).toHaveText("Expenses");
});

test("assistant greets, clarifies and reads actual active journey documents and tasks", async ({ page }) => {
  await page.goto("/app/ai");
  const ask = async (text: string) => {
    const count = await page.locator(".message.assistant").count();
    await page.getByLabel("Ask Meridian").fill(text);
    await page.getByLabel("Ask Meridian").press("Enter");
    await expect(page.locator(".message.assistant")).toHaveCount(count + 1);
  };
  await ask("hi");
  await expect(page.locator(".message.assistant").last()).toContainText("Hello!");
  await expect(page.locator(".message.assistant").last()).not.toContainText("%");
  await ask("quantum banana");
  await expect(page.locator(".message.assistant").last()).toContainText("couldn’t match");
  await ask("outstanding tasks");
  await expect(page.locator(".message.assistant").last()).toContainText("outstanding tasks");
  const activeName = await page.getByLabel("Journey selector").locator("option:checked").innerText();
  expect(activeName).toContain("London");
  await page.getByLabel("Journey selector").selectOption("tokyo");
  await ask("journey summary");
  await expect(page.locator(".message.assistant").last()).toContainText("Tokyo");
  await expect(page.locator(".message.assistant").last()).not.toContainText("London");
});

test("task completion changes readiness and survives reload", async ({ page }) => {
  await page.goto("/app/tasks");
  const before = await page.locator(".task-summary").textContent();
  await page.getByRole("button", { name: /Complete Confirm.*permission/ }).first().click();
  await expect(page.locator(".task-summary")).not.toHaveText(before!);
  const after = await page.locator(".task-summary").textContent();
  await page.reload();
  await expect(page.locator(".task-summary")).toHaveText(after!);
});

test("travel-day checklist and active traveler state remain journey-specific", async ({ page }) => {
  await page.goto("/app/travel-day");
  await page.getByRole("button", { name: /Confirm your terminal with the airline/ }).click();
  await expect(page.locator(".checkpoint .checked")).toHaveCount(1);
  await page.getByLabel("Journey selector").selectOption("tokyo");
  await expect(page.locator(".checkpoint .checked")).toHaveCount(0);
  await page.goto("/app/family");
  await page.getByRole("button", { name: /Elena Chen/ }).click();
  await page.goto("/app/entry");
  await expect(page.locator(".context-details")).toContainText("Elena Chen");
  await page.getByLabel("Journey selector").selectOption("london");
  await page.goto("/app/travel-day");
  await expect(page.locator(".checkpoint .checked")).toHaveCount(1);
});

test("theme, expense edit, notifications and archive remain interactive", async ({ page }) => {
  await page.goto("/app/budget");
  await page.getByRole("button", { name: "Edit Return flights", exact: true }).click();
  await page.getByLabel("Actual amount").fill("800");
  await page.getByRole("button", { name: "Save expense" }).click();
  await expect(page.locator(".budget-stats")).toContainText("$2,360");
  await page.getByRole("button", { name: "Toggle theme" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.goto("/app/notifications");
  await page.getByRole("button", { name: "Mark all as read" }).click();
  await page.getByRole("button", { name: "Unread", exact: false }).click();
  await expect(page.getByRole("heading", { name: "You’re all caught up." })).toBeVisible();
  await page.goto("/app/journeys");
  await page.getByRole("button", { name: "Archive journey" }).first().click();
  await page.getByRole("button", { name: "Archived", exact: true }).click();
  await expect(page.locator(".journey-card")).toHaveCount(1);
  await page.getByRole("button", { name: "Restore journey" }).click();
  await expect(page.getByRole("heading", { name: "Nothing archived." })).toBeVisible();
});

test("sidebar collapse can be reversed", async ({ page }) => {
  await page.goto("/app");
  await page.getByRole("button", { name: "Collapse sidebar" }).click();
  await page.getByRole("button", { name: "Expand sidebar" }).click();
  await expect(page.getByRole("button", { name: "Collapse sidebar" })).toBeVisible();
});
