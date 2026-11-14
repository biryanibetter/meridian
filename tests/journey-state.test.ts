import assert from "node:assert/strict";
import test from "node:test";
import { createSeed } from "../lib/demo";
import { isDemoState } from "../lib/planning";
import {
  activeJourney,
  activeNotifications,
  buildPlannedSegments,
  normalizeJourneyState,
} from "../lib/journey-state";

test("archiving the selected journey selects another active journey and hides archived notifications", () => {
  const state = createSeed();
  const next = normalizeJourneyState({
    ...state,
    journeys: state.journeys.map((journey) =>
      journey.id === state.activeJourneyId
        ? { ...journey, archived: true }
        : journey,
    ),
  });

  assert.notEqual(next.activeJourneyId, state.activeJourneyId);
  assert.equal(activeJourney(next)?.archived, false);
  assert.ok(
    activeNotifications(next).every(
      (notification) => notification.journeyId !== state.activeJourneyId,
    ),
  );
});

test("an all-archived workspace has no active journey instead of reviving a legacy record", () => {
  const state = createSeed();
  const next = normalizeJourneyState({
    ...state,
    journeys: state.journeys.map((journey) => ({
      ...journey,
      archived: true,
    })),
  });

  assert.equal(next.activeJourneyId, "");
  assert.equal(activeJourney(next), undefined);
  assert.equal(isDemoState(next), true);
});

test("planned segments follow every valid transit stop without inventing booking data", () => {
  const state = createSeed();
  const journey = {
    ...state.journeys[0],
    id: "new-route",
    origin: "Toronto",
    originCode: "YYZ",
    transit: "Lisbon, Paris",
    destination: "Berlin",
    destinationCode: "BER",
  };
  const segments = buildPlannedSegments(journey);

  assert.deepEqual(
    segments.map((segment) => [segment.fromCode, segment.toCode]),
    [
      ["YYZ", "LIS"],
      ["LIS", "CDG"],
      ["CDG", "BER"],
    ],
  );
  assert.ok(segments.every((segment) => segment.carrier === ""));
  assert.ok(segments.every((segment) => segment.flight === ""));
  assert.ok(segments.every((segment) => segment.status === "Planned"));
});
