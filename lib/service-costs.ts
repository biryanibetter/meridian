import type { BudgetItem } from "./types";

/** User-recorded amounts only; no exchange rates or authoritative fee inference. */
export function summarizeServiceCosts(items: BudgetItem[]) {
  const totals: Record<string, { known: number; estimated: number; unknown: number }> = {};
  for (const item of items) {
    const currency = item.currency || "USD";
    totals[currency] ??= { known: 0, estimated: 0, unknown: 0 };
    if (item.certainty === "unknown") totals[currency].unknown++;
    else if (item.certainty === "estimated") totals[currency].estimated += item.planned;
    else totals[currency].known += item.planned;
  }
  return totals;
}
