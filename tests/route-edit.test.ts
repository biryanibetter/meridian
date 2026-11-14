import test from "node:test";
import assert from "node:assert/strict";
import { createSeed } from "../lib/demo";
import { buildPlannedSegments } from "../lib/journey-state";

test("saving an edited route clears unrelated flight metadata and preserves exact matching legs", () => {
  const state = createSeed();
  const journey = state.journeys[0];
  const original = state.segments.filter(segment => segment.journeyId === journey.id);
  assert.ok(original.some(segment => segment.flight));
  const unchanged = buildPlannedSegments(journey, original);
  assert.equal(unchanged[0].flight, original[0].flight);
  const changed = buildPlannedSegments({ ...journey, transit: "Dubai" }, original);
  assert.equal(changed[0].toCode, "DXB");
  assert.equal(changed[1].fromCode, "DXB");
  assert.ok(changed.every(segment => !segment.flight && !segment.depart && !segment.arrive));
});

test("planned segment coordinates and names follow an edited origin despite a stale code", () => {
  const state = createSeed();
  const changed = buildPlannedSegments({ ...state.journeys[0], origin: "Delhi" });
  assert.equal(changed[0].fromCode, "DEL");
  assert.equal(changed[0].from, "Delhi");
});
