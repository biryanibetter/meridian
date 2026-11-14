import { expect, test, type Page } from "@playwright/test";

function amount(text: string) {
  return Number(text.replace(/[^\d.-]/g, ""));
}

async function stat(page: Page, index: number) {
  return amount(
    await page
      .locator(".budget-stats > *")
      .nth(index)
      .locator("h2")
      .innerText(),
  );
}

test("E: evidence metadata can be added, prepared, reviewed, and persisted", async ({
  page,
}) => {
  const name = `E2E evidence ${Date.now()}`;
  await page.goto("/app/documents");
  await page
    .getByRole("button", { name: "Add document", exact: true })
    .first()
    .click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Document name").fill(name);
  await dialog
    .getByLabel("Notes", { exact: true })
    .fill("E2E local metadata only");
  await dialog
    .getByRole("button", { name: "Add document", exact: true })
    .click();

  const row = page.getByRole("row").filter({ hasText: name });
  await expect(row).toBeVisible();
  await row.getByRole("button", { name: `Edit ${name}`, exact: true }).click();
  await dialog
    .getByRole("button", { name: "Mark prepared", exact: true })
    .click();
  await dialog
    .getByRole("button", { name: "Mark reviewed (personal)", exact: true })
    .click();
  await dialog.getByRole("button", { name: "Close dialog" }).click();
  await expect(row).toContainText("Ready");

  await page.reload();
  const persistedRow = page.getByRole("row").filter({ hasText: name });
  await expect(persistedRow).toContainText("Ready");
  await persistedRow
    .getByRole("button", { name: `Edit ${name}`, exact: true })
    .click();
  await expect(
    page.getByRole("dialog").getByLabel("Notes", { exact: true }),
  ).toHaveValue("E2E local metadata only");
});

test("G: expense totals recalculate from planned and actual amounts and persist", async ({
  page,
}) => {
  await page.goto("/app/budget");
  const plannedBefore = await stat(page, 1);
  const actualBefore = await stat(page, 2);
  const remainingBefore = await stat(page, 3);
  const title = `E2E expense ${Date.now()}`;

  await page
    .getByRole("button", { name: "Add expense", exact: true })
    .first()
    .click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Expense name").fill(title);
  await dialog.getByLabel("Planned amount").fill("234");
  await dialog.getByLabel("Actual amount").fill("67");
  await dialog
    .getByRole("button", { name: "Save expense", exact: true })
    .click();

  await expect(page.getByRole("row").filter({ hasText: title })).toContainText(
    "$234",
  );
  await expect.poll(() => stat(page, 1)).toBe(plannedBefore + 234);
  await expect.poll(() => stat(page, 2)).toBe(actualBefore + 67);
  await expect.poll(() => stat(page, 3)).toBe(remainingBefore - 67);

  await page.reload();
  await expect(page.getByRole("row").filter({ hasText: title })).toContainText(
    "$234",
  );
  await expect.poll(() => stat(page, 1)).toBe(plannedBefore + 234);
  await expect.poll(() => stat(page, 2)).toBe(actualBefore + 67);
});
