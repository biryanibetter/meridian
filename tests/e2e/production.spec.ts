import { expect, test } from "@playwright/test";

test("application requirements can advance to documents and retain progress", async ({ page }) => {
  await page.goto("/app/applications/");
  await expect(page.getByRole("navigation", { name: "Application progress" }).getByRole("button")).toHaveCount(5);
  await page.getByRole("button", { name: "Mark requirements reviewed", exact: true }).click();
  const documents = page.getByRole("navigation", { name: "Application progress" }).getByRole("button", { name: /Documents/ });
  await expect(documents).toBeEnabled();
  await documents.click();
  await expect(page.locator(".stage-header h2")).toHaveText("Documents");
  await page.reload();
  await expect(documents).toBeEnabled();
  await page.getByRole("button", { name: "Reopen requirements", exact: true }).click();
  await expect(documents).toBeDisabled();
});

test("sign-in is the only initial action and opens the local workspace", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Sign in", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Continue", exact: true })).toHaveCount(0);
  await page.getByLabel("Email address").fill("smoke@example.com");
  await page.getByLabel("Password", { exact: true }).fill("local-only");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page.locator(".app-content h1")).toBeVisible();
});

test("archiving removes an active journey from overview and selector after reload", async ({ page }) => {
  await page.goto("/app/journeys/");
  const selector = page.getByLabel("Journey selector");
  await page.waitForFunction(() => localStorage.getItem("meridian-demo-v1") !== null);
  const selected = await selector.inputValue();
  const label = await page.evaluate((id) => JSON.parse(localStorage.getItem("meridian-demo-v1")!).journeys.find((journey: { id: string }) => journey.id === id).name, selected);
  await page.locator(".journey-grid > div").filter({ has: page.getByRole("heading", { name: label, exact: true }) }).getByRole("button", { name: "Archive journey", exact: true }).click();
  await expect(selector.locator(`option[value="${selected}"]`)).toHaveCount(0);
  await page.goto("/app/overview/");
  await expect(selector.locator(`option[value="${selected}"]`)).toHaveCount(0);
  await page.reload();
  await expect(selector.locator(`option[value="${selected}"]`)).toHaveCount(0);
});

test("expenses add, edit, delete and persist with journey-specific totals", async ({ page }) => {
  await page.goto("/app/budget/");
  await page.getByRole("button", { name: "Add expense", exact: true }).first().click();
  await page.getByLabel("Expense name").fill("Production smoke expense");
  await page.getByLabel("Planned amount").fill("234");
  await page.getByLabel("Actual amount").fill("67");
  await page.getByRole("button", { name: "Save expense", exact: true }).click();
  const row = page.getByRole("row").filter({ hasText: "Production smoke expense" });
  await expect(row).toContainText("$234");
  await page.reload();
  await row.getByRole("button", { name: "Edit Production smoke expense", exact: true }).click();
  await page.getByLabel("Actual amount").fill("89");
  await page.getByRole("button", { name: "Save expense", exact: true }).click();
  await expect(row).toContainText("$89");
  await page.getByLabel("Journey selector").selectOption("tokyo");
  await expect(row).toHaveCount(0);
  await page.getByLabel("Journey selector").selectOption("london");
  await row.getByRole("button", { name: "Delete Production smoke expense", exact: true }).click();
  await page.reload();
  await expect(row).toHaveCount(0);
});

test("application stages require an explicit document review and persist submission and status", async ({ page }) => {
  await page.goto("/app/applications/");
  const progress = page.getByRole("navigation", { name: "Application progress" });
  await page.getByRole("button", { name: "Mark requirements reviewed", exact: true }).click();
  await progress.getByRole("button", { name: /Documents/ }).click();
  await expect(progress.getByRole("button", { name: /Application/ })).toBeDisabled();
  await page.getByRole("button", { name: "Record document review", exact: true }).click();
  await progress.getByRole("button", { name: /Application/ }).click();
  await page.getByRole("button", { name: "Record completion", exact: true }).click();
  await progress.getByRole("button", { name: /Submission/ }).click();
  await page.getByLabel("Submission date", { exact: true }).fill("2026-11-14");
  await page.getByLabel("Official reference", { exact: true }).fill("USER-RECORDED-SMOKE");
  await page.getByRole("button", { name: "Save submission details", exact: true }).click();
  await progress.getByRole("button", { name: /Status/ }).click();
  await page.getByRole("combobox", { name: "Current status", exact: true }).selectOption("Appointment scheduled");
  await page.getByRole("button", { name: "Save status", exact: true }).click();
  await page.reload();
  await progress.getByRole("button", { name: /Status/ }).click();
  await expect(page.getByRole("combobox", { name: "Current status", exact: true })).toHaveValue("Appointment scheduled");
  await expect(page.locator(".stage-content")).toContainText("USER-RECORDED-SMOKE");
  await page.getByLabel("Journey selector").selectOption("tokyo");
  await page.reload();
  await expect(progress.getByRole("button", { name: /Status/ })).toBeDisabled();
  await expect(page.locator(".app-content")).not.toContainText("USER-RECORDED-SMOKE");
});
