import test from "node:test";
import assert from "node:assert/strict";
import {
  compareCandidates,
  getCandidateMetrics,
  paretoFrontier,
  rankCandidates,
  type OptimizationCandidate,
} from "../lib/optimization";

const candidate = (
  id: string,
  values: Partial<OptimizationCandidate> = {},
): OptimizationCandidate => ({
  id,
  name: id,
  source: "manual",
  route: ["LHR", "DOH", "BOM"],
  fare: { amount: 500, currency: "GBP", provenance: "manual" },
  costs: { baggage: 40, ground: 20, lodging: 0, other: 0 },
  totalDurationMinutes: 600,
  layoverMinutes: [90],
  transitReview: "user-recorded-review",
  preparation: {
    remainingTasks: 2,
    overdueTasks: 0,
    blockedTasks: 0,
    unknownDependencies: 0,
    outstandingRequirements: 0,
    requirementsNeedingConfirmation: 0,
    transitUnreviewed: 0,
  },
  ...values,
});

test("missing prices remain unknown and mismatched currencies are not compared", () => {
  const unknown = candidate("unknown", { fare: undefined });
  const gbp = candidate("gbp");
  const eur = candidate("eur", {
    fare: { amount: 1, currency: "EUR", provenance: "manual" },
  });
  assert.equal(getCandidateMetrics(unknown).totalCost.status, "unknown");
  assert.equal(getCandidateMetrics(gbp, "USD").totalCost.status, "incomparable");
  assert.equal(getCandidateMetrics(gbp).totalCost.status, "known");
  assert.equal(getCandidateMetrics(eur).totalCost.status, "known");
  assert.equal(getCandidateMetrics(gbp, "USD").totalCost.status, "incomparable");
  assert.equal(paretoFrontier([gbp, eur]).length, 2);
  assert.equal(rankCandidates([gbp, eur], "cheapest", "USD")[0].score, rankCandidates([gbp, eur], "cheapest", "USD")[1].score);
});

test("total duration includes layover when only segment durations are supplied", () => {
  const option = candidate("segments", {
    totalDurationMinutes: undefined,
    segmentDurationsMinutes: [300, 360],
    layoverMinutes: [120],
  });
  assert.equal(getCandidateMetrics(option).totalDurationMinutes, 780);
});

test("weighted presets rank candidates and unknown transit adds evidence gaps", () => {
  const cheap = candidate("cheap", {
    fare: { amount: 300, currency: "GBP", provenance: "manual" },
    totalDurationMinutes: 900,
    layoverMinutes: [300],
  });
  const fast = candidate("fast", {
    fare: { amount: 700, currency: "GBP", provenance: "manual" },
    totalDurationMinutes: 400,
    layoverMinutes: [],
    transitReview: undefined,
  });
  assert.ok(compareCandidates(cheap, fast, "cheapest") < 0);
  assert.ok(compareCandidates(fast, cheap, "fastest") < 0);
  assert.ok(getCandidateMetrics(fast).evidenceGaps.length > 0);
});

test("Pareto frontier preserves nondominated options", () => {
  const cheap = candidate("cheap", {
    fare: { amount: 300, currency: "GBP", provenance: "manual" },
    totalDurationMinutes: 900,
    layoverMinutes: [300],
  });
  const fast = candidate("fast", {
    fare: { amount: 700, currency: "GBP", provenance: "manual" },
    totalDurationMinutes: 400,
    layoverMinutes: [],
  });
  const dominated = candidate("dominated", {
    fare: { amount: 800, currency: "GBP", provenance: "manual" },
    totalDurationMinutes: 1000,
    layoverMinutes: [400],
  });
  assert.deepEqual(
    paretoFrontier([cheap, fast, dominated]).map((item) => item.id),
    ["cheap", "fast"],
  );
});

test("missing timezone-aware layovers are unknown, not zero", () => {
  const option = candidate("unresolved layover", {
    layoverMinutes: [],
    segmentDurationsMinutes: [200, 240],
    totalDurationMinutes: undefined,
  });
  assert.equal(getCandidateMetrics(option).layoverMinutes, undefined);
  assert.equal(getCandidateMetrics(option).unknownLayovers, 1);
  assert.equal(getCandidateMetrics(option).totalDurationMinutes, undefined);
});

test("set-wide utility ranking is deterministic and explains known criteria", () => {
  const options = [
    candidate("a", { totalDurationMinutes: 700 }),
    candidate("b", { totalDurationMinutes: 500 }),
    candidate("c", { totalDurationMinutes: 900 }),
  ];
  const ranked = rankCandidates(options, "fastest");
  assert.deepEqual(ranked.map((item) => item.candidate.id), ["b", "a", "c"]);
  assert.ok(ranked[0].scoreBreakdown.some((part) => part.criterion === "Total duration"));
});
