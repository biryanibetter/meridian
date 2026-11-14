import test from "node:test";
import assert from "node:assert/strict";
import { getRequirements } from "../lib/requirements";

const context = { nationality: "India", residence: "India", destination: "United Kingdom", transit: "Doha", purpose: "Study", departure: "2027-09-15", returnDate: "2028-06-15", passportType: "Ordinary" };
test("supported passport conditions change financial preparation records, never grant eligibility", () => {
  const indian = getRequirements(context);
  const canadian = getRequirements({ ...context, nationality: "Canada" });
  assert.ok(indian.some(r => r.id === "uk-study-india-finances"));
  assert.ok(!indian.some(r => r.id === "uk-study-canada-finances"));
  assert.ok(canadian.some(r => r.id === "uk-study-canada-finances"));
  assert.ok(!canadian.some(r => r.id === "uk-study-india-finances"));
  assert.ok(canadian.every(r => r.status === "official-confirmation-required"));
});
test("India residence adds a clinic discovery check independently of nationality", () => {
  assert.ok(getRequirements(context).some(r => r.id === "uk-india-clinic-discovery"));
  assert.ok(getRequirements({ ...context, nationality: "Canada" }).some(r => r.id === "uk-india-clinic-discovery"));
  assert.ok(!getRequirements({ ...context, residence: "Canada" }).some(r => r.id === "uk-india-clinic-discovery"));
});
test("minor study travelers receive age-specific consent review without an approval claim", () => {
  assert.ok(getRequirements({ ...context, dateOfBirth: "2011-01-01" }).some(r => r.id === "uk-study-under18"));
  assert.ok(!getRequirements({ ...context, dateOfBirth: "1990-01-01" }).some(r => r.id === "uk-study-under18"));
});
test("long term journeys survive persisted-state validation without a fabricated return date", async () => {
  const { createSeed } = await import("../lib/demo");
  const { isDemoState } = await import("../lib/planning");
  const state = createSeed();
  state.journeys[0].longTerm = true;
  state.journeys[0].returnDate = "";
  assert.equal(isDemoState(state), true);
});
