import test from "node:test";
import assert from "node:assert/strict";
import { getRequirements } from "../lib/requirements";

const context = {
  nationality: "India",
  residence: "India",
  destination: "United Kingdom",
  transit: "Doha",
  purpose: "Study",
  departure: "2027-09-15",
  returnDate: "2028-06-15",
  passportType: "Ordinary",
};
test("supported passport conditions change financial preparation records, never grant eligibility", () => {
  const indian = getRequirements(context);
  const canadian = getRequirements({ ...context, nationality: "Canada" });
  assert.equal(indian.filter((r) => r.id === "uk-study-finances").length, 1);
  assert.equal(canadian.filter((r) => r.id === "uk-study-finances").length, 1);
  assert.ok(
    indian
      .find((r) => r.id === "uk-study-finances")
      ?.preparation.includes("evidence"),
  );
  assert.ok(
    canadian
      .find((r) => r.id === "uk-study-finances")
      ?.preparation.includes("differential"),
  );
  assert.ok(
    canadian.every((r) => r.status === "official-confirmation-required"),
  );
});
test("TB uses residence history rather than nationality or current residence alone", () => {
  assert.equal(
    getRequirements(context).find((r) => r.id === "uk-study-tb")?.applicability,
    "Confirmation needed",
  );
  assert.equal(
    getRequirements({ ...context, nationality: "Canada" }).find(
      (r) => r.id === "uk-study-tb",
    )?.applicability,
    "Confirmation needed",
  );
  assert.equal(
    getRequirements({
      ...context,
      residence: "Canada",
      tbListedCountryRecentResidence: false,
    }).find((r) => r.id === "uk-study-tb")?.applicability,
    "Not applicable",
  );
});
test("minor study travelers receive age-specific consent review without an approval claim", () => {
  assert.ok(
    getRequirements({ ...context, dateOfBirth: "2011-01-01" }).some(
      (r) => r.id === "uk-study-under18",
    ),
  );
  assert.equal(
    getRequirements({ ...context, dateOfBirth: "1990-01-01" }).find(
      (r) => r.id === "uk-study-under18",
    )?.applicability,
    "Not applicable",
  );
});
test("long term journeys survive persisted-state validation without a fabricated return date", async () => {
  const { createSeed } = await import("../lib/demo");
  const { isDemoState } = await import("../lib/planning");
  const state = createSeed();
  state.journeys[0].longTerm = true;
  state.journeys[0].returnDate = "";
  assert.equal(isDemoState(state), true);
});
