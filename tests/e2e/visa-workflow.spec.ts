import { test, expect } from "@playwright/test";

test("A–H: existing passport, explicit linking, shared evidence, separate progress and persistence", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/app/applications");
  await expect(
    page.getByRole("heading", { name: "UK Student visa", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("navigation", { name: "Application progress" })
    .getByRole("button", { name: "Documents" })
    .click();
  const passportRow = page
    .getByRole("row")
    .filter({ hasText: /valid passport/i });
  await expect(passportRow).toContainText("existing match");
  await passportRow.getByRole("button", { name: "Link existing" }).click();
  let drawer = page.getByRole("dialog");
  await expect(drawer).toContainText("Potential match");
  await drawer
    .getByRole("button", { name: "Confirm link", exact: true })
    .click();
  await expect(
    drawer.getByRole("button", { name: "Unlink", exact: true }),
  ).toBeVisible();
  await drawer
    .getByRole("button", { name: "Record assessment", exact: true })
    .click();
  await drawer.getByRole("button", { name: "Passport", exact: true }).click();
  drawer = page.getByRole("dialog");
  await drawer
    .getByRole("button", { name: "Mark prepared", exact: true })
    .click();
  await expect(drawer).toContainText("Needs review");
  await expect(drawer).toContainText("not government verification");
  await drawer.getByRole("button", { name: "Close dialog" }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Close dialog" })
    .click();
  await expect(page.locator(".visa-metrics")).toContainText("1/");
  const stored = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("meridian-demo-v1")!),
  );
  expect(stored.evidenceLinks[0].verificationState).toBe("unverified");
  expect(stored.applications[0].reference).toBeUndefined();

  const casRow = page
    .getByRole("row")
    .filter({ hasText: "Confirmation of Acceptance" });
  await casRow.getByRole("button", { name: "Add", exact: true }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Add document", exact: true })
    .click();
  drawer = page.getByRole("dialog");
  await drawer
    .getByLabel("Document name", { exact: true })
    .fill("University CAS record");
  await expect(
    drawer.getByLabel("Application", { exact: true }),
  ).not.toHaveValue("");
  await drawer
    .getByRole("button", { name: "Add document", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toContainText("University CAS record");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Close dialog" })
    .click();
  await page
    .getByRole("link", { name: "Manage documents", exact: true })
    .click();
  await expect(
    page.getByRole("row").filter({ hasText: "University CAS record" }),
  ).toContainText("Confirmation of Acceptance");
  await expect(
    page.getByRole("row").filter({ hasText: "Passport" }),
  ).toContainText(/valid passport/i);
  await page.reload();
  await expect(
    page.getByRole("row").filter({ hasText: "University CAS record" }),
  ).toBeVisible();
  await page.goto("/app/entry");
  await expect(
    page.getByRole("button", { name: /Prove English proficiency/ }),
  ).toBeVisible();
  await page.getByRole("button", { name: /Prove English proficiency/ }).click();
  drawer = page.getByRole("dialog");
  await expect(drawer).toContainText(/higher education provider/i);
  await expect(
    drawer.getByRole("link", { name: /Approved SELT routes/ }),
  ).toHaveAttribute(
    "href",
    "https://www.gov.uk/guidance/prove-your-english-language-abilities-with-a-secure-english-language-test-selt",
  );
  await expect(page.locator("body")).not.toContainText("\\u00b7");
  await drawer.getByRole("button", { name: "Close dialog" }).click();
  await page.goto("/app/applications");
  await expect(
    page
      .getByRole("navigation", { name: "Application progress" })
      .getByRole("button", { name: "Documents" }),
  ).toHaveAttribute("aria-current", "step");
  expect(errors).toEqual([]);
});

test("submission is user-recorded and independent of document and requirement review", async ({
  page,
}) => {
  await page.goto("/app/applications");
  const nav = page.getByRole("navigation", { name: "Application progress" });
  await nav.getByRole("button", { name: "Status", exact: false }).click();
  await expect(page.getByLabel("Current status")).toHaveValue("Not started");
  await expect(
    page.getByRole("option", { name: "Submitted", exact: true }),
  ).toBeDisabled();
  await nav.getByRole("button", { name: "Submission" }).click();
  await page.getByLabel("Application reference").fill("GWF-user-record-123");
  await page.getByLabel("Submission date").fill("2026-11-13");
  await page.getByRole("button", { name: "Save submission details" }).click();
  await nav.getByRole("button", { name: "Status", exact: false }).click();
  await page.getByLabel("Current status").selectOption("Awaiting decision");
  await page.reload();
  await expect(page.getByLabel("Current status")).toHaveValue(
    "Awaiting decision",
  );
  await expect(page.locator(".visa-metrics")).toContainText("0/");
  await expect(page.locator(".visa-metrics")).toContainText("Yes");
});

test("traveler and journey switching never borrows another traveler's evidence", async ({
  page,
}) => {
  await page.goto("/app/applications");
  await page.waitForFunction(
    () => localStorage.getItem("meridian-demo-v1") !== null,
  );
  const original = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("meridian-demo-v1")!),
  );
  const second = original.journeys.find(
    (j: { id: string }) => j.id !== original.activeJourneyId,
  );
  expect(second).toBeTruthy();
  await page.evaluate((id) => {
    const s = JSON.parse(localStorage.getItem("meridian-demo-v1")!);
    s.activeJourneyId = id;
    s.activeTravelerId = s.journeys.find(
      (j: { id: string }) => j.id === id,
    ).travelers[0];
    localStorage.setItem("meridian-demo-v1", JSON.stringify(s));
  }, second.id);
  await page.reload();
  await expect(page.locator(".visa-workspace h1")).not.toHaveText(
    "UK Student visa",
  );
  await page.evaluate(
    (s) => localStorage.setItem("meridian-demo-v1", JSON.stringify(s)),
    original,
  );
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "UK Student visa", exact: true }),
  ).toBeVisible();
});

test("unlink, metadata editing and requirement evidence review remain synchronized", async ({
  page,
}) => {
  await page.goto("/app/applications");
  await page
    .getByRole("navigation", { name: "Application progress" })
    .getByRole("button", { name: "Documents" })
    .click();
  const row = page.getByRole("row").filter({ hasText: /valid passport/i });
  await row.getByRole("button", { name: "Link existing" }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Confirm link", exact: true })
    .click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Passport", exact: true })
    .click();
  await page.getByRole("dialog").getByLabel("Issue date").fill("2024-03-12");
  await page
    .getByRole("dialog")
    .getByLabel("Notes", { exact: true })
    .fill("Original passport checked by traveler");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Save changes" })
    .click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Passport", exact: true })
    .click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Mark prepared", exact: true })
    .click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Close dialog" })
    .click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Review evidence", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toContainText(
    "Authority verification: not verified",
  );
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Close dialog" })
    .click();
  await expect(row).toContainText("reviewed by you");
  await row.getByRole("button", { name: "View", exact: true }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Unlink", exact: true })
    .click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Close dialog" })
    .click();
  await expect(row).toContainText("existing match");
  await page.goto("/app/documents");
  const document = page
    .getByRole("row")
    .filter({
      has: page.getByRole("button", { name: "Edit Passport", exact: true }),
    });
  await expect(document).toContainText("Ready");
  await document
    .getByRole("button", { name: "Edit Passport", exact: true })
    .click();
  await expect(page.getByRole("dialog").getByLabel("Issue date")).toHaveValue(
    "2024-03-12",
  );
  await expect(
    page.getByRole("dialog").getByLabel("Notes", { exact: true }),
  ).toHaveValue("Original passport checked by traveler");
});

test("unreadable saved storage is preserved instead of overwritten", async ({
  page,
}) => {
  await page.goto("/app/applications");
  const malformed = '{"savedUserData":"keep me", broken';
  await page.evaluate(
    (raw) => localStorage.setItem("meridian-demo-v1", raw),
    malformed,
  );
  await page.reload();
  await expect(page.getByRole("status")).toContainText(
    "Existing storage is preserved",
  );
  expect(
    await page.evaluate(() => localStorage.getItem("meridian-demo-v1")),
  ).toBe(malformed);
});

test("affected views fit three sizes in both themes without escaped text or runtime errors", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  for (const width of [375, 768, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    for (const route of ["applications", "entry", "documents"]) {
      await page.goto(`/app/${route}`);
      await expect(page.locator(".app-content h1")).toBeVisible();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      await expect(page.locator("body")).not.toContainText("\\u00b7");
      await page
        .getByRole("button", { name: "Toggle theme", exact: true })
        .click();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
    }
  }
  expect(errors).toEqual([]);
});
