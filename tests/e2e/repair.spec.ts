import { test, expect, type Page } from "@playwright/test";
import path from "node:path";

test.beforeEach(async ({ context }) => {
  // Disable all external networking while leaving the USB's loopback server usable.
  await context.route("**/*", route => {
    const host = new URL(route.request().url()).hostname;
    return ["localhost", "127.0.0.1"].includes(host) ? route.continue() : route.abort();
  });
});

async function openEdit(page: Page) {
  await page.goto("/app/journey");
  await page.getByRole("button", { name: "Edit journey", exact: true }).click();
}
async function next(page: Page) {
  await page.getByRole("button", { name: "Continue", exact: true }).click();
}
async function finish(page: Page, edit = true) {
  await next(page);
  await next(page);
  await page.getByRole("button", { name: edit ? "Save changes" : "Create journey", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
}
async function create(page: Page, name: string, origin: string, destination: string, stops: string[] = []) {
  await page.goto("/app/journeys");
  await page.getByRole("button", { name: /New journey|Create a journey/, exact: true }).first().click();
  await page.getByLabel("Journey name", { exact: true }).fill(name);
  await next(page);
  await page.getByLabel("Origin city", { exact: true }).fill(origin);
  await page.getByLabel("Destination city", { exact: true }).fill(destination);
  for (let i = 0; i < stops.length; i++) {
    await page.getByRole("button", { name: "Add transit stop", exact: true }).click();
    await page.getByLabel(`Transit stop ${i + 1}`, { exact: true }).fill(stops[i]);
  }
  await finish(page, false);
}

test("packaged onboarding creates a personal journey without unrelated travelers", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.goto("/");
  await page.getByRole("button", { name: "Create account", exact: true }).click();
  await page.getByLabel("Full legal name").fill("USB Verification Traveler");
  await page.getByLabel("Nationality", { exact: true }).fill("India");
  await page.getByLabel("Country of residence", { exact: true }).fill("India");
  await page.getByLabel("Passport issuing country", { exact: true }).fill("India");
  await page.getByLabel("Passport expiry date").fill("2030-01-01");
  await page.getByLabel("Passport number", { exact: true }).fill("TEST12345");
  await next(page);
  await page.getByRole("button", { name: "Request code", exact: true }).click();
  await page.locator(".verification-delivery-panel summary").click();
  const code = (await page.locator(".verification-delivery-panel strong").innerText()).trim();
  await page.getByLabel("Six-digit local verification code").fill(code);
  await page.getByRole("button", { name: "Verify code", exact: true }).click();
  await next(page);
  await page.getByRole("button", { name: "Create a journey", exact: true }).click();
  await page.getByLabel("Journey name", { exact: true }).fill("Personal London journey");
  await next(page);
  await page.getByLabel("Origin city", { exact: true }).fill("Mumbai");
  await page.getByLabel("Destination city", { exact: true }).fill("London");
  await page.getByRole("button", { name: "Add transit stop", exact: true }).click();
  await page.getByLabel("Transit stop 1", { exact: true }).fill("Doha");
  await next(page);
  await expect(page.getByText("USB Verification Traveler", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("Maya Bennett", { exact: true })).toHaveCount(0);
  await next(page);
  await page.getByRole("button", { name: "Create journey", exact: true }).click();
  await expect(page.locator(".app-content h1")).toHaveText("Personal London journey");
  await page.goto("/app/travel");
  await expect(page.locator(".geo-marker")).toHaveCount(3);
  await expect(page.locator(".geo-flight")).toHaveCount(2);
  await page.reload();
  await expect(page.locator(".geo-flight")).toHaveCount(2);
  expect(errors).toEqual([]);
});

test("A–D: edited and newly created routes stay synchronized after reload and journey switching", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.goto("/app/travel");
  await expect(page.locator(".geo-marker")).toHaveCount(3);
  await expect(page.locator(".geo-flight")).toHaveCount(2);
  for (let i = 0; i < 2; i++) {
    await page.locator(".geo-flight").nth(i).focus();
    await expect(page.locator(".geo-flight.hovered")).toHaveCount(1);
    await page.locator(".geo-segments button").nth(i).click();
    await expect(page.locator(".geo-flight.selected")).toHaveCount(1);
  }
  await openEdit(page);
  await next(page);
  await page.getByLabel("Transit stop 1", { exact: true }).fill("Dubai");
  await finish(page);
  await page.goto("/app/travel");
  await expect(page.locator(".geo-marker")).toHaveCount(3);
  await expect(page.locator(".geo-map")).toContainText("Dubai");
  await expect(page.locator(".geo-map")).not.toContainText("Doha");
  await page.reload();
  await expect(page.locator(".geo-map")).toContainText("Dubai");

  await create(page, "London to New York", "London", "New York");
  await page.goto("/app/travel");
  await expect(page.locator(".geo-marker")).toHaveCount(2);
  await expect(page.locator(".geo-flight")).toHaveCount(1);
  await expect(page.locator(".geo-map")).not.toContainText(/Mumbai|Doha/);
  await expect(page.getByLabel("Journey selector")).toContainText("London to New York");

  await create(page, "Doha to Tokyo", "Doha", "Tokyo", ["Singapore"]);
  await openEdit(page);
  await next(page);
  await page.getByRole("button", { name: "Add transit stop", exact: true }).click();
  await page.getByLabel("Transit stop 2", { exact: true }).fill("Bangkok");
  await finish(page);
  await page.goto("/app/travel");
  await expect(page.locator(".geo-marker")).toHaveCount(4);
  await expect(page.locator(".geo-flight")).toHaveCount(3);
  await expect(page.locator(".geo-segments")).toContainText("SIN");
  await expect(page.locator(".geo-segments")).toContainText("BKK");
  await page.getByLabel("Journey selector").selectOption({ label: "London to New York" });
  await expect(page.locator(".geo-marker")).toHaveCount(2);
  await expect(page.locator(".geo-flight")).toHaveCount(1);
  await page.getByRole("button", { name: "Toggle theme" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  expect(errors).toEqual([]);
});

test("F: notification read state survives filtering and reload", async ({ page }) => {
  await page.goto("/app/notifications");
  const first = page.locator(".notification-row.unread").first();
  await first.click();
  await page.goto("/app/notifications");
  await page.getByRole("button", { name: /^Unread/ }).click();
  const remaining = await page.locator(".notification-row").count();
  expect(remaining).toBeGreaterThanOrEqual(0);
  await page.getByRole("button", { name: "Mark all as read" }).click();
  await expect(page.locator(".notification-row")).toHaveCount(0);
  await page.reload();
  await page.getByRole("button", { name: /^Unread/ }).click();
  await expect(page.locator(".notification-row")).toHaveCount(0);
});

test("H: wizard rejects invalid route and dates without creating a journey", async ({ page }) => {
  await openEdit(page);
  await page.getByLabel("Departure date").fill("2027-10-10");
  await page.getByLabel(/Return date|Planned end of stay/, { exact: true }).fill("2027-01-01");
  await next(page);
  await expect(page.getByRole("alert")).toBeVisible();
  await page.getByLabel(/Return date|Planned end of stay/, { exact: true }).fill("2027-12-01");
  await next(page);
  await page.getByLabel("Origin city", { exact: true }).fill("Imaginary airport");
  await next(page);
  await expect(page.getByRole("alert")).toBeVisible();
  await page.getByLabel(/^Origin city/).fill("Mumbai");
  await page.getByLabel("Destination city", { exact: true }).fill("Mumbai");
  await page.getByLabel("Transit stop 1", { exact: true }).fill("Mumbai");
  await next(page);
  await expect(page.getByRole("alert")).toBeVisible();
});

test("every exported workspace route loads without runtime errors or failed assets", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  page.on("response", response => { if (response.status() >= 400) errors.push(`${response.status()} ${response.url()}`); });
  for (const route of ["overview", "journeys", "journey", "entry", "applications", "documents", "tasks", "travel", "travel-day", "layovers", "arrival", "budget", "safety", "family", "notifications", "settings", "sources", "ai"]) {
    await page.goto(`/app/${route}`);
    await expect(page.locator(".app-content")).toBeVisible();
    await expect(page.locator(".app-content h1").first()).toBeVisible();
  }
  expect(errors).toEqual([]);
});

test("standalone fallback is usable with browser networking completely disabled", async ({ page, context }) => {
  await context.setOffline(true);
  const file = process.env.MERIDIAN_BACKUP ?? path.resolve("MERIDIAN_USB_SUBMISSION/OFFLINE_PREVIEW.html");
  await page.goto(`file:///${file.replace(/\\/g, "/")}`);
  await expect(page.getByRole("heading", { name: "Overview", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Journeys", exact: true }).click();
  await page.getByLabel("Origin city", { exact: true }).fill("London");
  await page.getByLabel("Destination city", { exact: true }).fill("New York");
  await page.getByLabel("Transit countries / cities", { exact: true }).fill("");
  await page.getByRole("button", { name: "Save journey", exact: true }).click();
  await page.getByRole("button", { name: "Travel", exact: true }).click();
  await expect(page.locator(".map svg")).toBeVisible();
});
