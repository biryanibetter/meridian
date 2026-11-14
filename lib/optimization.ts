import type { DemoState, Journey, Segment } from "./types";
import { findAirport } from "./geography";
import { deriveJourneyRoute } from "./journey-route";
import { applicationRequirements } from "./visa-workflow";

export type FareQuote = {
  amount: number;
  currency: string;
  provenance: "sample" | "manual" | "booked";
  capturedAt?: string;
  conditions?: string;
  provider?: string;
};

export type OptimizationCandidate = {
  id: string;
  name: string;
  source: "current" | "sample" | "manual";
  route: string[];
  fare?: FareQuote;
  costs?: Partial<Record<"baggage" | "ground" | "lodging" | "other", number>>;
  /** When supplied, this is elapsed door-to-door flight itinerary time. */
  totalDurationMinutes?: number;
  segmentDurationsMinutes?: number[];
  layoverMinutes: (number | undefined)[];
  departureTime?: string;
  arrivalTime?: string;
  /** Records the user's review only; it is not a government permission or carrier confirmation. */
  transitReview?: "not-reviewed" | "user-recorded-review";
  transitConfirmationNotes?: string;
  evidenceGaps?: string[];
  deadlineNotes?: string[];
  dependencyUnknowns?: string[];
  preparation?: PreparationMetrics;
  currency?: string;
  createdAt?: string;
};

export type SavedComparison = {
  id: string;
  journeyId: string;
  name: string;
  preset: OptimizationPreset;
  candidateIds: string[];
  savedAt: string;
};

export type OptimizationPreset = "cheapest" | "fastest" | "simplest" | "balanced";
export type CostMetric = {
  status: "known" | "unknown" | "incomparable";
  amount?: number;
  currency?: string;
};
export type CandidateMetrics = {
  totalCost: CostMetric;
  totalDurationMinutes?: number;
  transferCount: number;
  layoverMinutes?: number;
  unknownLayovers: number;
  evidenceGaps: string[];
  warnings: string[];
};

export type PreparationMetrics = {
  remainingTasks: number;
  overdueTasks: number;
  blockedTasks: number;
  unknownDependencies: number;
  outstandingRequirements: number;
  requirementsNeedingConfirmation: number;
  transitUnreviewed: number;
};

export type RankedCandidate = {
  candidate: OptimizationCandidate;
  score: number;
  scoreBreakdown: { criterion: string; utility: number; weight: number }[];
};

const scoreWeights: Record<OptimizationPreset, Record<string, number>> = {
  cheapest: { cost: 0.55, duration: 0.1, transfers: 0.05, preparation: 0.1, feasibility: 0.1, evidence: 0.05, transit: 0.05 },
  fastest: { cost: 0.1, duration: 0.55, transfers: 0.05, preparation: 0.1, feasibility: 0.1, evidence: 0.05, transit: 0.05 },
  simplest: { cost: 0.1, duration: 0.1, transfers: 0.25, preparation: 0.2, feasibility: 0.15, evidence: 0.1, transit: 0.1 },
  balanced: { cost: 0.24, duration: 0.2, transfers: 0.12, preparation: 0.14, feasibility: 0.12, evidence: 0.1, transit: 0.08 },
};

type ScoreDimension = { key: string; label: string; value?: number };

export function getCandidateMetrics(
  candidate: OptimizationCandidate,
  comparisonCurrency?: string,
): CandidateMetrics {
  const quote = candidate.fare;
  const currency = comparisonCurrency?.toUpperCase() ?? candidate.currency?.toUpperCase() ?? quote?.currency.toUpperCase();
  const hasCosts = Object.values(candidate.costs ?? {}).some((value) => value !== undefined);
  const costCurrency = candidate.currency?.toUpperCase() ?? quote?.currency.toUpperCase();
  let totalCost: CostMetric;
  if (!quote || !Number.isFinite(quote.amount) || quote.amount < 0) {
    totalCost = { status: "unknown" };
  } else if (
    currency &&
    (quote.currency.toUpperCase() !== currency ||
      (hasCosts && costCurrency !== currency))
  ) {
    totalCost = { status: "incomparable", currency: quote.currency.toUpperCase() };
  } else {
    totalCost = {
      status: "known",
      amount:
        quote.amount +
        Object.values(candidate.costs ?? {}).reduce(
          (sum, amount) => sum + (Number.isFinite(amount) ? (amount as number) : 0),
          0,
        ),
      currency: quote.currency.toUpperCase(),
    };
  }
  const segmentTotal = candidate.segmentDurationsMinutes?.reduce((sum, value) => sum + value, 0);
  const transferCount = Math.max(0, candidate.route.length - 2);
  const layovers = Array.from({ length: transferCount }, (_, index) => candidate.layoverMinutes[index]);
  const unknownLayovers = layovers.filter((value) => value === undefined).length;
  const layoverMinutes = unknownLayovers ? undefined : layovers.reduce<number>((sum, value) => sum + (value ?? 0), 0);
  const totalDurationMinutes =
    candidate.totalDurationMinutes ??
    (segmentTotal === undefined || layoverMinutes === undefined ? undefined : segmentTotal + layoverMinutes);
  const evidenceGaps = [...(candidate.evidenceGaps ?? [])];
  const warnings: string[] = [];
  if (!quote) evidenceGaps.push("Fare not entered; no live fare search is provided.");
  else if (quote.provenance === "sample") evidenceGaps.push("Illustrative sample fare; not a live offer.");
  else if (quote.provenance === "manual") {
    if (!quote.capturedAt) evidenceGaps.push("Manual fare capture time not recorded.");
    if (!quote.conditions) evidenceGaps.push("Fare restrictions and included services need confirmation.");
  }
  if (totalDurationMinutes === undefined) evidenceGaps.push("Total elapsed duration is unknown.");
  if (candidate.route.length > 2 && candidate.transitReview !== "user-recorded-review") {
    const transitGap = "Transit details are unreviewed; confirm permission, airside access and baggage with official sources and carriers.";
    evidenceGaps.push(transitGap);
    warnings.push(transitGap);
  }
  if (candidate.route.length > 2 && candidate.transitReview === "user-recorded-review") {
    warnings.push("Transit review is user-recorded only; it does not establish permission or carrier confirmation.");
  }
  if (candidate.deadlineNotes?.length) warnings.push(...candidate.deadlineNotes);
  if (candidate.dependencyUnknowns?.length) warnings.push(...candidate.dependencyUnknowns);
  if (candidate.preparation?.transitUnreviewed) {
    evidenceGaps.push("One or more transit stops have no recorded user review.");
  }
  return {
    totalCost,
    totalDurationMinutes,
    transferCount,
    layoverMinutes,
    unknownLayovers,
    evidenceGaps: [...new Set(evidenceGaps)],
    warnings: [...new Set(warnings)],
  };
}

/** Transitive, lexicographic fallback comparator. Prefer rankCandidates for set-wide scoring. */
export function compareCandidates(
  left: OptimizationCandidate,
  right: OptimizationCandidate,
  preset: OptimizationPreset,
  currency?: string,
): number {
  const costKey = (option: OptimizationCandidate) => {
    const optionCurrency = option.currency?.toUpperCase() ?? option.fare?.currency.toUpperCase();
    if (!optionCurrency || (currency && optionCurrency !== currency.toUpperCase())) return [1, optionCurrency ?? "", 0] as const;
    const metric = getCandidateMetrics(option, currency).totalCost;
    return metric.status === "known" ? [0, optionCurrency, metric.amount ?? 0] as const : [1, optionCurrency, 0] as const;
  };
  const order: (a: OptimizationCandidate, b: OptimizationCandidate) => number = (a, b) => {
    const ak = costKey(a);
    const bk = costKey(b);
    return ak[0] - bk[0] || ak[1].localeCompare(bk[1]) || ak[2] - bk[2];
  };
  const compareMetric = (a?: number, b?: number) => {
    if (a === undefined || b === undefined) return a === b ? 0 : a === undefined ? 1 : -1;
    return a - b;
  };
  const costFirst = preset === "cheapest";
  const durationFirst = preset === "fastest";
  const simpleFirst = preset === "simplest";
  const criteria: number[] = [];
  if (costFirst) criteria.push(order(left, right));
  else if (durationFirst) criteria.push(compareMetric(getCandidateMetrics(left).totalDurationMinutes, getCandidateMetrics(right).totalDurationMinutes));
  else if (simpleFirst) criteria.push(left.route.length - right.route.length);
  const leftPrep = left.preparation;
  const rightPrep = right.preparation;
  criteria.push(compareMetric(
    leftPrep ? leftPrep.remainingTasks + leftPrep.outstandingRequirements : undefined,
    rightPrep ? rightPrep.remainingTasks + rightPrep.outstandingRequirements : undefined,
  ));
  criteria.push(compareMetric(
    leftPrep ? leftPrep.overdueTasks + leftPrep.blockedTasks + leftPrep.unknownDependencies : undefined,
    rightPrep ? rightPrep.overdueTasks + rightPrep.blockedTasks + rightPrep.unknownDependencies : undefined,
  ));
  if (!costFirst) criteria.push(order(left, right));
  if (!durationFirst) criteria.push(compareMetric(getCandidateMetrics(left).totalDurationMinutes, getCandidateMetrics(right).totalDurationMinutes));
  if (!simpleFirst) criteria.push(left.route.length - right.route.length);
  for (const result of criteria) {
    if (result) return result < 0 ? -1 : 1;
  }
  return left.id.localeCompare(right.id);
}

function scoreDimensions(candidate: OptimizationCandidate, currency?: string): ScoreDimension[] {
  const metrics = getCandidateMetrics(candidate, currency);
  const prep = candidate.preparation;
  const candidateCurrency = candidate.currency?.toUpperCase() ?? candidate.fare?.currency.toUpperCase();
  const costKnown =
    metrics.totalCost.status === "known" &&
    (!currency || candidateCurrency === currency.toUpperCase());
  return [
    { key: "cost", label: "Known total cost", value: costKnown ? metrics.totalCost.amount : undefined },
    { key: "duration", label: "Total duration", value: metrics.totalDurationMinutes },
    { key: "transfers", label: "Transfers", value: metrics.transferCount },
    { key: "preparation", label: "Preparation steps remaining", value: prep ? prep.remainingTasks + prep.outstandingRequirements : undefined },
    { key: "feasibility", label: "Deadline/dependency risks", value: prep ? prep.overdueTasks + prep.blockedTasks + prep.unknownDependencies + prep.requirementsNeedingConfirmation : undefined },
    { key: "evidence", label: "Evidence gaps", value: metrics.evidenceGaps.length + (prep?.unknownDependencies ?? 0) },
    { key: "transit", label: "Unreviewed transit stops", value: prep?.transitUnreviewed ?? (candidate.route.length > 2 ? (candidate.transitReview === "user-recorded-review" ? 0 : 1) : 0) },
  ];
}

/** Set-wide normalized utility scores are transitive and include an explanation per criterion. */
export function rankCandidates(
  candidates: OptimizationCandidate[],
  preset: OptimizationPreset,
  currency?: string,
): RankedCandidate[] {
  const dimensions = candidates.map((candidate) => scoreDimensions(candidate, currency));
  const ranges = new Map<string, { min: number; max: number }>();
  for (const dimensionSet of dimensions) {
    for (const dimension of dimensionSet) {
      if (dimension.value === undefined) continue;
      const range = ranges.get(dimension.key);
      ranges.set(dimension.key, range
        ? { min: Math.min(range.min, dimension.value), max: Math.max(range.max, dimension.value) }
        : { min: dimension.value, max: dimension.value });
    }
  }
  return candidates.map((candidate, index) => {
    const breakdown: RankedCandidate["scoreBreakdown"] = [];
    let weighted = 0;
    let weightTotal = 0;
    for (const dimension of dimensions[index]) {
      const weight = scoreWeights[preset][dimension.key] ?? 0;
      const range = ranges.get(dimension.key);
      if (dimension.value === undefined || !range || weight === 0) continue;
      const utility = range.max === range.min ? 1 : 1 - (dimension.value - range.min) / (range.max - range.min);
      weighted += utility * weight;
      weightTotal += weight;
      breakdown.push({ criterion: dimension.label, utility, weight });
    }
    return {
      candidate,
      score: weightTotal ? Math.round((weighted / weightTotal) * 100) : 0,
      scoreBreakdown: breakdown,
    };
  }).sort((a, b) => b.score - a.score || a.candidate.id.localeCompare(b.candidate.id));
}

export function paretoFrontier(
  candidates: OptimizationCandidate[],
  currency?: string,
): OptimizationCandidate[] {
  const dominates = (a: OptimizationCandidate, b: OptimizationCandidate) => {
    const aCurrency = a.currency?.toUpperCase() ?? a.fare?.currency.toUpperCase();
    const bCurrency = b.currency?.toUpperCase() ?? b.fare?.currency.toUpperCase();
    const costsComparable = currency
      ? aCurrency === currency.toUpperCase() && bCurrency === currency.toUpperCase()
      : Boolean(aCurrency && bCurrency && aCurrency === bCurrency);
    const ad = scoreDimensions(a, currency);
    const bd = scoreDimensions(b, currency);
    const av = ad.map((dimension) => dimension.key === "cost" && !costsComparable ? undefined : dimension.value);
    const bv = bd.map((dimension) => dimension.key === "cost" && !costsComparable ? undefined : dimension.value);
    // Unknown relevant values prevent a dominance claim; do not project them away.
    if (av.some((value) => value === undefined) || bv.some((value) => value === undefined)) return false;
    let strictlyBetter = false;
    for (let i = 0; i < av.length; i++) {
      if (av[i]! > bv[i]!) return false;
      if (av[i]! < bv[i]!) strictlyBetter = true;
    }
    return strictlyBetter;
  };
  return candidates.filter((candidate) => !candidates.some((other) => other.id !== candidate.id && dominates(other, candidate)));
}

/** Evaluates the active journey's recorded preparation state for every route option. */
export function evaluateJourneyPreparation(
  state: DemoState,
  journey: Journey,
  candidate: OptimizationCandidate,
  today = new Date().toISOString().slice(0, 10),
): PreparationMetrics {
  const tasks = state.tasks.filter((task) => task.journeyId === journey.id);
  const byId = new Map(tasks.map((task) => [task.id, task]));
  let overdueTasks = 0;
  let blockedTasks = 0;
  let unknownDependencies = 0;
  for (const task of tasks) {
    if (task.done) continue;
    if (task.dependency) {
      const dependency = byId.get(task.dependency);
      if (!dependency) unknownDependencies++;
      else if (!dependency.done) blockedTasks++;
    }
    const deadline = new Date(`${journey.departure}T12:00:00Z`);
    deadline.setUTCDate(deadline.getUTCDate() + task.offset);
    if (deadline.toISOString().slice(0, 10) < today) overdueTasks++;
  }
  const applications = (state.applications ?? []).filter(
    (application) => application.journeyId === journey.id,
  );
  let outstandingRequirements = 0;
  let requirementsNeedingConfirmation = 0;
  for (const application of applications) {
    for (const requirement of applicationRequirements(state, application)) {
      if (requirement.applicability === "Not applicable" || requirement.procedural) continue;
      if (!requirement.assessed) outstandingRequirements++;
      if (
        requirement.applicability === "Confirmation needed" ||
        requirement.missingInformation.length > 0
      ) {
        requirementsNeedingConfirmation++;
      }
    }
  }
  if (!applications.length) requirementsNeedingConfirmation = 1;
  return {
    remainingTasks: tasks.filter((task) => !task.done).length,
    overdueTasks,
    blockedTasks,
    unknownDependencies,
    outstandingRequirements,
    requirementsNeedingConfirmation,
    transitUnreviewed:
      candidate.route.length > 2 && candidate.transitReview !== "user-recorded-review"
        ? candidate.route.length - 2
        : 0,
  };
}

function hasExplicitTimezone(value: string) {
  return /(?:Z|[+-]\d{2}:\d{2})$/i.test(value);
}

function durationFromTimes(segment: Segment): number | undefined {
  if (!segment.depart || !segment.arrive) return undefined;
  if (!hasExplicitTimezone(segment.depart) || !hasExplicitTimezone(segment.arrive)) return undefined;
  const depart = Date.parse(segment.depart);
  const arrive = Date.parse(segment.arrive);
  if (!Number.isFinite(depart) || !Number.isFinite(arrive)) return undefined;
  if (arrive < depart) return undefined;
  return Math.round((arrive - depart) / 60_000);
}

export function candidateFromJourney(journey: Journey, segments: Segment[]): OptimizationCandidate {
  const route = deriveJourneyRoute(journey, segments);
  const recorded = route.legs.map((leg) => leg.recorded);
  const segmentDurationsMinutes = recorded.map((segment) => {
    const fromDuration = segment && durationFromTimes(segment);
    if (fromDuration !== undefined) return fromDuration;
    const match = segment?.duration.match(/(?:(\d+)\s*h)?\s*(?:(\d+)\s*m)?/i);
    return match && (match[1] || match[2]) ? Number(match[1] ?? 0) * 60 + Number(match[2] ?? 0) : undefined;
  });
  const completeDurations = segmentDurationsMinutes.every((value): value is number => value !== undefined);
  const layoverMinutes: (number | undefined)[] = recorded.slice(0, -1).map((segment, index) => {
    const next = recorded[index + 1];
    if (!segment?.arrive || !next?.depart) return undefined;
    if (!hasExplicitTimezone(segment.arrive) || !hasExplicitTimezone(next.depart)) return undefined;
    const arrive = Date.parse(segment.arrive);
    const depart = Date.parse(next.depart);
    if (!Number.isFinite(arrive) || !Number.isFinite(depart) || depart < arrive) return undefined;
    return Math.round((depart - arrive) / 60_000);
  });
  const first = recorded[0];
  const last = recorded[recorded.length - 1];
  const gaps: string[] = [];
  if (!recorded.length || recorded.some((segment) => !segment)) gaps.push("One or more itinerary legs have no recorded details.");
  if (recorded.some((segment) => segment?.depart && segment.arrive && (!hasExplicitTimezone(segment.depart) || !hasExplicitTimezone(segment.arrive)))) {
    gaps.push("Local itinerary times have no timezone; elapsed duration is used only when an explicit duration is recorded.");
  }
  const explicitElapsed =
    first?.depart && last?.arrive && hasExplicitTimezone(first.depart) && hasExplicitTimezone(last.arrive)
      ? Date.parse(last.arrive) - Date.parse(first.depart)
      : undefined;
  const allLayoversKnown = layoverMinutes.every((value) => value !== undefined);
  const totalDurationMinutes =
    explicitElapsed !== undefined && Number.isFinite(explicitElapsed) && explicitElapsed >= 0
      ? Math.round(explicitElapsed / 60_000)
      : completeDurations && allLayoversKnown
        ? segmentDurationsMinutes.reduce((sum, value) => sum + (value ?? 0), 0) +
          layoverMinutes.reduce((sum, value) => sum + (value ?? 0), 0)
        : undefined;
  return {
    id: `current:${journey.id}`,
    name: "Current itinerary",
    source: "current",
    route: route.stops.map((stop) => stop.code || stop.name),
    totalDurationMinutes,
    segmentDurationsMinutes: completeDurations ? segmentDurationsMinuteValues(segmentDurationsMinutes) : undefined,
    layoverMinutes,
    departureTime: first?.depart || undefined,
    arrivalTime: last?.arrive || undefined,
    transitReview: undefined,
    evidenceGaps: gaps,
  };
}

function segmentDurationsMinuteValues(values: (number | undefined)[]) {
  return values.map((value) => value ?? 0);
}

export function buildCandidateJourney(journey: Journey, candidate: OptimizationCandidate): Journey {
  const stops = candidate.route.map((value) => findAirport(value));
  const stopNames = candidate.route.map((value, index) => stops[index]?.city ?? value);
  return {
    ...journey,
    origin: stopNames[0] ?? journey.origin,
    originCode: stops[0]?.code ?? "",
    destination: stopNames.at(-1) ?? journey.destination,
    destinationCode: stops.at(-1)?.code ?? "",
    country: stops.at(-1)?.country ?? candidate.route.at(-1) ?? journey.country,
    transit: stopNames.slice(1, -1).join(", "),
  };
}

export function buildCandidateSegments(journey: Journey, candidate: OptimizationCandidate): Segment[] {
  const nextJourney = buildCandidateJourney(journey, candidate);
  const legs = deriveJourneyRoute(nextJourney);
  return legs.legs.map(({ from, to }, index) => ({
    id: `${journey.id}-opt-${index + 1}`,
    journeyId: journey.id,
    from: from.name,
    to: to.name,
    fromCode: from.code,
    toCode: to.code,
    depart: index === 0 ? candidate.departureTime ?? "" : "",
    arrive: index === legs.legs.length - 1 ? candidate.arrivalTime ?? "" : "",
    carrier: "",
    flight: "",
    terminal: "",
    duration: candidate.segmentDurationsMinutes?.[index] === undefined ? "" : `${Math.floor(candidate.segmentDurationsMinutes[index] / 60)}h ${candidate.segmentDurationsMinutes[index] % 60}m`,
    status: "Planned",
  }));
}
