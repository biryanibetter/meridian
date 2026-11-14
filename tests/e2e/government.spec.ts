import { expect, test, type Page } from "@playwright/test";

const casePanel = (page: Page) => page.locator(".government-case-panel");
const panel = (page: Page, title: string) =>
  page.locator(".panel").filter({
    has: page.getByRole("heading", { name: title, exact: true }),
  });

async function addScenario(page: Page, route = "BOM, DXB, LHR") {
  await page.goto("/app/optimize/");
  await page.getByLabel("Route stops, in order").fill(route);
  await page.getByLabel("Fare (optional)").fill("450");
  await page.getByLabel("Currency", { exact: true }).fill("USD");
  await page.getByLabel("Quote conditions").fill("Traveler checked; cabin bag only");
  await page.getByRole("button", { name: "Add scenario", exact: true }).click();
  const candidate = page.getByRole("button", {
    name: /Manual scenario/,
  });
  await expect(candidate).toHaveAttribute("aria-pressed", "true");
  return candidate;
}

async function selectTraveler(page: Page, name: string) {
  await page.goto("/app/family/");
  await page.locator(".traveler-card").filter({
    has: page.getByRole("heading", { name, exact: true }),
  }).locator(".traveler-card-select").click();
}

test.describe("Task 11 government preparation and planning acceptance", () => {
  test("appointment and deadline records persist without leaking into another traveler's case", async ({
    page,
  }) => {
    await page.goto("/app/applications/");
    await casePanel(page).getByLabel("Appointment", { exact: true }).fill("Maya biometrics planning");
    await casePanel(page).getByLabel("Planned date and time", { exact: true }).fill("2027-08-10T10:30");
    await casePanel(page).getByLabel("Location (optional)", { exact: true }).fill("Mumbai planning centre");
    await casePanel(page).getByRole("button", { name: "Add appointment", exact: true }).click();
    await expect(casePanel(page)).toContainText("Maya biometrics planning");
    await expect(casePanel(page)).toContainText("Mumbai planning centre");

    await casePanel(page).getByLabel("Deadline", { exact: true }).fill("Maya evidence deadline");
    await casePanel(page).getByLabel("Date", { exact: true }).fill("2027-08-12");
    await casePanel(page).getByRole("button", { name: "Add deadline", exact: true }).click();
    await page.reload();
    await expect(casePanel(page)).toContainText("Maya biometrics planning");
    await expect(casePanel(page)).toContainText("Maya evidence deadline");
    await expect(casePanel(page)).toContainText(/does not book appointments/i);
    await expect(casePanel(page)).toContainText(/no government connection/i);

    await page.goto("/app/family/");
    await page.getByRole("button", { name: "Add traveler", exact: true }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByLabel("Full legal name").fill("Second Test Traveler");
    await dialog.getByLabel("Nationality", { exact: true }).fill("India");
    await dialog.getByLabel("Residence", { exact: true }).fill("India");
    await dialog.getByRole("button", { name: "Add traveler", exact: true }).click();
    await expect(dialog).toBeHidden();
    await page.goto("/app/applications/");
    await expect(casePanel(page)).toBeVisible();
    await expect(casePanel(page)).not.toContainText("Maya biometrics planning");
    await expect(casePanel(page)).not.toContainText("Maya evidence deadline");
    await page.reload();
    await expect(casePanel(page)).not.toContainText("Maya evidence deadline");
    await selectTraveler(page, "Maya Bennett");
    await page.goto("/app/applications/");
    await expect(casePanel(page)).toContainText("Maya biometrics planning");
    await expect(casePanel(page)).toContainText("Maya evidence deadline");
  });

  test("prepared CAS evidence cannot bypass its admission prerequisite", async ({
    page,
  }) => {
    await page.goto("/app/applications/");
    const overview = casePanel(page).locator(".government-case-overview");
    const baseline = (await overview.innerText()).match(/(\d+)\/(\d+)/);
    expect(baseline).not.toBeNull();
    await page.getByRole("navigation", { name: "Application progress" })
      .getByRole("button", { name: "Documents" }).click();
    const row = page.getByRole("row").filter({ hasText: "Confirmation of Acceptance" });
    await row.getByRole("button", { name: "Add", exact: true }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Add document", exact: true }).click();
    let dialog = page.getByRole("dialog");
    await dialog.getByLabel("Document name", { exact: true }).fill("Acceptance test CAS");
    await dialog.getByRole("button", { name: "Add document", exact: true }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Close dialog" }).click();
    await page.goto("/app/documents/");
    await page.getByRole("button", { name: "Edit Acceptance test CAS", exact: true }).click();
    dialog = page.getByRole("dialog");
    await dialog.getByRole("button", { name: "Mark prepared", exact: true }).click();
    await dialog.getByRole("button", { name: "Mark reviewed (personal)", exact: true }).click();
    await expect(dialog).toContainText("Ready");
    await dialog.getByRole("button", { name: "Close dialog" }).click();
    await page.goto("/app/applications/");
    await expect(overview).toContainText(`${baseline![1]}/${baseline![2]}`);
    await casePanel(page).getByText(/Procedure and dependencies \(/).click();
    const step = casePanel(page).locator(".government-case-step").filter({
      has: page.locator("strong", { hasText: /^Provide your Confirmation of Acceptance/ }),
    });
    await expect(step).toContainText("Not checked");
    await expect(overview.getByRole("img")).toHaveAttribute("aria-label", /Official verification unavailable/);
    await expect(overview.getByRole("img")).not.toHaveAttribute("aria-label", /100%/);
    await expect(casePanel(page)).not.toContainText("Officially verified");
    await page.reload();
    await expect(step).toContainText("Not checked");
    await expect(overview).toContainText(`${baseline![1]}/${baseline![2]}`);
  });

  test("manual comparison retains fare provenance and unknown duration rather than inventing live data", async ({
    page,
  }) => {
    const candidate = await addScenario(page);
    await expect(candidate).toContainText("$450");
    await expect(candidate).toContainText("Unknown");
    const breakdown = panel(page, "Option breakdown");
    await expect(breakdown).toContainText("BOM → DXB → LHR");
    await expect(breakdown).toContainText("Fare: manual");
    await expect(breakdown).toContainText("Traveler checked; cabin bag only");
    await expect(breakdown).toContainText(/Transit review: Not reviewed/);
    await page.getByLabel("Preference").selectOption("cheapest");
    await candidate.click();
    await expect(candidate).toHaveAttribute("aria-pressed", "true");
    await expect(breakdown).toContainText("$450");
    await page.reload();
    await candidate.click();
    await expect(breakdown).toContainText("Traveler checked; cabin bag only");
  });

  test("applying a manual itinerary synchronizes the canonical journey, itinerary and map after refresh", async ({
    page,
  }) => {
    await addScenario(page);
    await page.getByRole("button", { name: "Apply selected itinerary", exact: true }).click();
    await page.goto("/app/travel/");
    const mapLegs = page.locator('[aria-label="Flight segments"]');
    await expect(mapLegs.getByRole("button")).toHaveCount(2);
    await expect(mapLegs).toContainText("BOM → DXB");
    await expect(mapLegs).toContainText("DXB → LHR");
    await expect(mapLegs).not.toContainText("DOH");
    await expect(page.locator(".geo-marker")).toHaveCount(3);
    await expect(page.locator(".geo-marker")).toContainText(["BOM", "DXB", "LHR"]);
    await mapLegs.getByRole("button", { name: /DXB → LHR/ }).click();
    await expect(page.locator('[aria-label="Selected itinerary leg"]')).toContainText("Dubai");
    await expect(page.locator('[aria-label="Selected itinerary leg"]')).toContainText("London");
    await page.reload();
    await expect(mapLegs).toContainText("BOM → DXB");
    await expect(mapLegs).not.toContainText("DOH");
    await page.goto("/app/optimize/");
    await expect(page.getByRole("button", { name: /Current itinerary/ })).toContainText("BOM → DXB → LHR");
  });

  test("saved comparisons remain visible and restore their preset after refresh", async ({ page }) => {
    await addScenario(page);
    await page.getByLabel("Preference").selectOption("simplest");
    await page.getByRole("button", { name: "Save comparison", exact: true }).click();
    const saved = panel(page, "Saved comparisons");
    await expect(saved).toContainText("London");
    await expect(saved).toContainText("Simplest");
    await page.reload();
    await expect(saved).toContainText("Simplest");
    await saved.getByRole("button", { name: /Open comparison/i }).click();
    await expect(page.getByLabel("Preference")).toHaveValue("simplest");
    await expect(page.getByRole("button", { name: /Manual scenario/ })).toContainText("BOM → DXB → LHR");
  });

  test("unsupported destination exposes a coverage gap, never official verification", async ({ page }) => {
    await addScenario(page, "BOM, GRU");
    await page.getByRole("button", { name: "Apply selected itinerary", exact: true }).click();
    await page.goto("/app/applications/");
    await expect(casePanel(page)).toContainText("Brazil");
    await expect(casePanel(page)).toContainText(/No registered official reference|coverage|Official confirmation required/i);
    await expect(casePanel(page).locator(".government-case-overview").getByRole("img")).toHaveAttribute("aria-label", /Official verification unavailable/);
    await expect(casePanel(page)).not.toContainText("Officially verified");
    await expect(casePanel(page)).toContainText(/no government connection/i);
    await page.reload();
    await expect(casePanel(page)).toContainText("Brazil");
    await expect(casePanel(page)).not.toContainText("Officially verified");
  });

  test("profile completeness updates from user-entered metadata and survives refresh without claiming identity verification", async ({
    page,
  }) => {
    await page.goto("/app/family/");
    const card = page.locator(".traveler-card").filter({
      has: page.getByRole("heading", { name: "Maya Bennett", exact: true }),
    });
    await card.getByRole("button", { name: "Edit profile", exact: true }).click();
    let dialog = page.getByRole("dialog");
    await dialog.getByLabel("Passport issuing country", { exact: true }).fill("India");
    await dialog.getByLabel("Passport type", { exact: true }).fill("Ordinary");
    await dialog.getByLabel("Passport expiry", { exact: true }).fill("2035-06-15");
    await dialog.getByLabel("Masked passport suffix only").fill("•••• 1234");
    await dialog.getByLabel(/I consent to keeping these fictional profile metadata/).check();
    await dialog.getByRole("button", { name: "Save & mark reviewed", exact: true }).click();
    await expect(dialog).toBeHidden();
    await expect(card.getByRole("img", { name: /^Profile completeness/ })).toHaveAttribute("aria-label", /Profile completeness: 100%.*Official verification unavailable/);
    await expect(card).toContainText("Entry eligibility not verified");
    await page.reload();
    await expect(card.getByRole("img", { name: /^Profile completeness/ })).toHaveAttribute("aria-label", /100%/);
    await card.getByRole("button", { name: "Edit profile", exact: true }).click();
    dialog = page.getByRole("dialog");
    await expect(dialog.getByLabel("Passport issuing country", { exact: true })).toHaveValue("India");
    await expect(dialog.getByLabel("Passport expiry", { exact: true })).toHaveValue("2035-06-15");
    await expect(dialog.getByLabel("Masked passport suffix only")).toHaveValue("••••1234");
    await expect(dialog.getByLabel(/I consent to keeping these fictional profile metadata/)).toBeChecked();
  });

  test("application-linked expenses appear in the correct case with original currency and unknown costs stay unknown", async ({
    page,
  }) => {
    await page.goto("/app/applications/");
    await page.goto("/app/budget/");
    await page.getByRole("button", { name: "Add expense", exact: true }).first().click();
    let dialog = page.getByRole("dialog");
    await dialog.getByLabel("Expense name").fill("Student case fee planning");
    await dialog.getByRole("combobox", { name: /^Application/ }).selectOption({ label: "Maya Bennett · Student visa" });
    await dialog.getByRole("combobox", { name: /^Currency/ }).selectOption("GBP");
    await dialog.getByRole("combobox", { name: /^Amount certainty/ }).selectOption("estimated");
    await dialog.getByLabel("Planned amount").fill("524");
    await dialog.getByLabel("Actual amount").fill("0");
    await dialog.getByRole("button", { name: "Save expense", exact: true }).click();
    await expect(dialog).toBeHidden();
    const row = page.getByRole("row").filter({ hasText: "Student case fee planning" });
    await expect(row).toContainText("Student visa");
    await expect(row).toContainText("£524");
    await page.goto("/app/applications/");
    await expect(casePanel(page)).toContainText("Student case fee planning");
    await expect(casePanel(page)).toContainText("£524");
    await expect(casePanel(page)).toContainText("estimated");
    await page.reload();
    await expect(casePanel(page)).toContainText("Student case fee planning");
    await page.goto("/app/budget/");
    await row.getByRole("button", { name: "Edit Student case fee planning", exact: true }).click();
    dialog = page.getByRole("dialog");
    await dialog.getByRole("combobox", { name: /^Amount certainty/ }).selectOption("unknown");
    await dialog.getByRole("button", { name: "Save expense", exact: true }).click();
    await expect(row).toContainText("Unknown");
    await page.goto("/app/applications/");
    await expect(casePanel(page)).toContainText("Amount not recorded");
    await expect(casePanel(page)).not.toContainText("£524");
    await page.getByLabel("Journey selector").selectOption("tokyo");
    await expect(casePanel(page)).not.toContainText("Student case fee planning");
  });
});
