import test from "node:test";
import assert from "node:assert/strict";
import { summarizeServiceCosts } from "../lib/service-costs";
import type { BudgetItem } from "../lib/types";

test("known, estimated and unknown amounts stay separate without currency conversion", () => {
  const make = (currency: string, certainty: BudgetItem["certainty"], planned: number): BudgetItem =>
    ({ id: `${currency}-${certainty}`, journeyId: "j", title: "Recorded fee", category: "Government fees", planned, actual: 0, currency, certainty });
  const result = summarizeServiceCosts([make("USD", "known", 10), make("USD", "estimated", 20), make("USD", "unknown", 999), make("GBP", "known", 15)]);
  assert.deepEqual(result.USD, { known: 10, estimated: 20, unknown: 1 });
  assert.deepEqual(result.GBP, { known: 15, estimated: 0, unknown: 0 });
});
