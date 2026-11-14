import { test } from "node:test";
import assert from "node:assert/strict";
import {
  readiness,
  dueDate,
  budgetTotals,
  isDemoState,
  airportCode,
  journeyRequirements,
} from "../lib/planning";
import { createSeed, rules } from "../lib/demo";

test("readiness reflects completed tasks and handles empty journeys", () => {
  assert.equal(
    readiness([
      { done: true },
      { done: false },
      { done: true },
      { done: false },
    ]),
    50,
  );
  assert.equal(readiness([]), 0);
});
test("relative deadlines move across month boundaries", () => {
  assert.equal(dueDate("2027-01-05", -10), "2026-12-26");
  assert.equal(dueDate("2027-01-15", -10), "2027-01-05");
});
test("budget totals preserve planned versus actual and remaining buffer", () => {
  assert.deepEqual(
    budgetTotals(
      [
        { planned: 100, actual: 80 },
        { planned: 200, actual: 150 },
      ],
      500,
    ),
    { planned: 300, actual: 230, remaining: 270 },
  );
});
test("reject malformed persisted state", () => {
  assert.equal(isDemoState(null), false);
  assert.equal(isDemoState({ version: 1, journeys: "broken" }), false);
});
test("reject corrupted records, invalid dates and orphaned active context", () => {
  const state = createSeed();
  assert.equal(isDemoState(state), true);
  assert.equal(isDemoState({ ...state, documents: [null] }), false);
  assert.equal(
    isDemoState({
      ...state,
      journeys: [{ ...state.journeys[0], departure: "not-a-date" }],
    }),
    false,
  );
  assert.equal(isDemoState({ ...state, activeJourneyId: "missing" }), false);
  assert.equal(
    isDemoState({ ...state, tasks: [{ ...state.tasks[0], title: null }] }),
    false,
  );
});
test("city edits preserve known airport codes", () => {
  assert.equal(airportCode("Mumbai"), "BOM");
  assert.equal(airportCode("London"), "LHR");
  assert.equal(airportCode("Lisbon"), "LIS");
  assert.equal(airportCode("Unknown City"), "");
});
test("requirement planning status follows the individual traveler, never asserts legal validity", () => {
  const state = createSeed();
  const primary = journeyRequirements(rules, "tokyo", "oliver", state.tasks);
  const other = journeyRequirements(rules, "tokyo", "elena", state.tasks);
  assert.equal(
    primary.find((r) => r.category === "Passport")?.status,
    "Example complete",
  );
  assert.equal(
    other.find((r) => r.category === "Passport")?.status,
    "Needs review",
  );
});
