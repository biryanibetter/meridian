import { test, expect } from "@playwright/test";

test.beforeEach(async ({ context, baseURL }) => {
  await context.route("**/*", (route) =>
    ["127.0.0.1", "localhost", new URL(baseURL!).hostname].includes(new URL(route.request().url()).hostname)
      ? route.continue()
      : route.abort(),
  );
});

test("global documents inventory edits one record and shows its linked requirement", async ({
  page,
}) => {
  await page.goto("/app/documents");
  await expect(
    page.getByRole("heading", { name: "Documents", exact: true, level: 1 }),
  ).toBeVisible();
  await expect(
    page.getByRole("table").getByText("Passport", { exact: false }).first(),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Edit Passport", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByLabel("Document name").fill("Updated passport record");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByRole("table")).toContainText(
    "Updated passport record",
  );
  const saved = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("meridian-demo-v1")!).documents.find(
      (doc: { name: string }) => doc.name === "Updated passport record",
    ),
  );
  expect(saved).toBeTruthy();
});

test("document preparation and personal review are managed in the shared editor", async ({
  page,
}) => {
  await page.goto("/app/documents");
  await page
    .getByRole("button", { name: "Edit Passport", exact: true })
    .click();
  await page.getByRole("button", { name: "Mark prepared" }).click();
  await page.getByRole("button", { name: /Mark reviewed/i }).click();
  await expect(page.getByRole("dialog")).toContainText("Ready");
  await expect(page.getByRole("dialog")).toContainText(
    "Personal preparation and review",
  );
});

test("requirement query opens shared editor with application context", async ({
  page,
}) => {
  await page.goto("/app/documents?requirement=uk-study-passport");
  await page.getByRole("button", { name: "Add document", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(
    page.getByRole("group", { name: "Linked requirements" }),
  ).toContainText(/valid passport/i);
  await expect(page.getByRole("combobox", { name: "Type" })).toHaveValue(
    "Passport",
  );
  await expect(
    page
      .getByRole("group", { name: "Linked requirements" })
      .getByRole("checkbox")
      .first(),
  ).toBeChecked();
});
