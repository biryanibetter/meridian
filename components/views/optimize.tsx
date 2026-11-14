"use client";

import Link from "next/link";
import { useMemo, useState, type FormEvent } from "react";
import { ArrowRight, Check, Save } from "lucide-react";
import { useDemo } from "@/lib/store";
import { findAirport } from "@/lib/geography";
import { buildPlannedSegments } from "@/lib/journey-state";
import type { Segment } from "@/lib/types";
import {
  buildCandidateJourney,
  buildCandidateSegments,
  candidateFromJourney,
  evaluateJourneyPreparation,
  getCandidateMetrics,
  paretoFrontier,
  rankCandidates,
  type OptimizationCandidate,
  type OptimizationPreset,
  type SavedComparison,
} from "@/lib/optimization";
import { Badge, PageHeading, Panel } from "../common";
import { Button } from "../ui/button";

type OptimizationState = {
  optimizationCandidates?: OptimizationCandidate[];
  savedComparisons?: SavedComparison[];
};

const hubs = ["DOH", "DXB", "SIN", "IST", "FRA", "CDG"];
const presets: { id: OptimizationPreset; label: string }[] = [
  { id: "balanced", label: "Balanced" },
  { id: "cheapest", label: "Cheapest" },
  { id: "fastest", label: "Fastest" },
  { id: "simplest", label: "Simplest" },
];

function sampleCandidates(journeyId: string, origin: string, destination: string): OptimizationCandidate[] {
  const from = findAirport(origin);
  const to = findAirport(destination);
  if (!from || !to) return [];
  return hubs
    .map((code) => findAirport(code))
    .filter((hub) => hub && hub.code !== from.code && hub.code !== to.code)
    .slice(0, 3)
    .map((hub) => ({
      id: `sample:${journeyId}:${hub!.code}`,
      name: `Sample route via ${hub!.city}`,
      source: "sample" as const,
      route: [from.code, hub!.code, to.code],
       layoverMinutes: [undefined],
      evidenceGaps: [
        "Illustrative route only; schedules, fares and availability are not connected.",
        "Confirm transit permission, airside access and baggage handling.",
      ],
    }));
}

function formatDuration(minutes?: number) {
  if (minutes === undefined) return "Unknown";
  return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
}

function costLabel(candidate: OptimizationCandidate, currency?: string) {
  const metric = getCandidateMetrics(candidate, currency);
  if (metric.totalCost.status === "unknown") return "Not provided";
  if (metric.totalCost.status === "incomparable") return `Incomparable (${metric.totalCost.currency})`;
  return new Intl.NumberFormat("en", {
    style: "currency",
    currency: metric.totalCost.currency,
    maximumFractionDigits: 2,
  }).format(metric.totalCost.amount ?? 0);
}

export function OptimizeView() {
  const { state, update, toast } = useDemo();
  const journey = state.journeys.find((item) => item.id === state.activeJourneyId);
  const [preset, setPreset] = useState<OptimizationPreset>("balanced");
  const [selectedId, setSelectedId] = useState("");
  const [manualRoute, setManualRoute] = useState("");
  const [manualFare, setManualFare] = useState("");
  const [manualCurrency, setManualCurrency] = useState(state.currency || "USD");
  const [manualConditions, setManualConditions] = useState("");
  const extraState = state as typeof state & OptimizationState;
  const base = useMemo(
    () =>
      journey
        ? candidateFromJourney(
            journey,
            state.segments.filter((segment) => segment.journeyId === journey.id),
          )
        : undefined,
    [journey, state.segments],
  );
  const candidates = useMemo(() => {
    if (!journey || !base) return [];
    const saved = (extraState.optimizationCandidates ?? []).filter(
      (item) =>
        item.id === base.id ||
        item.id.startsWith(`manual:${journey.id}:`) ||
        item.id.startsWith(`sample:${journey.id}:`),
    );
    const savedById = new Map(saved.map((item) => [item.id, item]));
    const options: OptimizationCandidate[] = [
      { ...base, ...savedById.get(base.id) },
      ...sampleCandidates(journey.id, journey.origin, journey.destination).map(
        (item) => ({ ...item, ...savedById.get(item.id) }),
      ),
      ...saved.filter((item) => item.source === "manual"),
    ];
    return options.map((option) => {
      const preparation = evaluateJourneyPreparation(state, journey, option);
      return {
        ...option,
        preparation,
        deadlineNotes: preparation.overdueTasks
          ? [`${preparation.overdueTasks} unfinished preparation task(s) have passed their recorded deadlines.`]
          : [],
        dependencyUnknowns: [
          ...(preparation.blockedTasks ? [`${preparation.blockedTasks} unfinished task(s) are blocked by prerequisites.`] : []),
          ...(preparation.unknownDependencies ? [`${preparation.unknownDependencies} task dependency link(s) refer to unknown tasks.`] : []),
          ...(preparation.requirementsNeedingConfirmation ? [`${preparation.requirementsNeedingConfirmation} requirement item(s) need confirmation or missing context.`] : []),
        ],
      };
    });
  }, [journey, base, extraState.optimizationCandidates, state]);
  const ordered = useMemo(
    () => rankCandidates(candidates, preset, state.currency),
    [candidates, preset, state.currency],
  );
  const paretoIds = new Set(paretoFrontier(candidates, state.currency).map((item) => item.id));
  const selectedRanked = ordered.find((item) => item.candidate.id === selectedId) ?? ordered[0];
  const selected = selectedRanked?.candidate;

  function addManual(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!journey) return;
    const route = manualRoute
      .split(/[>,;]/)
      .map((part) => part.trim())
      .filter(Boolean);
    if (route.length < 2) {
      toast("Enter at least an origin and destination.");
      return;
    }
    const amount = manualFare.trim() ? Number(manualFare) : undefined;
    if (amount !== undefined && (!Number.isFinite(amount) || amount < 0)) {
      toast("Enter a valid non-negative fare.");
      return;
    }
    const id = `manual:${journey.id}:${Date.now()}`;
    const option: OptimizationCandidate = {
      id,
      name: `Manual scenario · ${route.join(" → ")}`,
      source: "manual",
      route,
      layoverMinutes: route.length > 2 ? Array.from({ length: route.length - 2 }, () => undefined) : [],
      evidenceGaps: ["Schedule and connection details need confirmation."],
      fare:
        amount === undefined
          ? undefined
          : {
              amount,
              currency: manualCurrency.toUpperCase(),
              provenance: "manual",
              capturedAt: new Date().toISOString(),
              conditions: manualConditions.trim() || undefined,
            },
      currency: manualCurrency.toUpperCase(),
      createdAt: new Date().toISOString(),
    };
    update((current) => {
      const stored = current as typeof current & OptimizationState;
      return {
        ...current,
        optimizationCandidates: [...(stored.optimizationCandidates ?? []), option],
      };
    });
    setSelectedId(id);
    setManualRoute("");
    setManualFare("");
    toast("Manual scenario added.");
  }

  function applySelected() {
    if (!journey || !selected) return;
    const nextJourney = buildCandidateJourney(journey, selected);
    const nextSegments = buildCandidateSegments(journey, selected);
    update((current) => {
      const preserved = current.segments.filter(
        (segment) => segment.journeyId !== journey.id,
      );
      const recorded = current.segments.filter(
        (segment) => segment.journeyId === journey.id,
      );
      const planned = buildPlannedSegments(nextJourney, recorded);
      const merged = nextSegments.map((segment, index) => ({
        ...segment,
        ...planned[index],
        id: `${journey.id}-opt-${index + 1}`,
        journeyId: journey.id,
        depart: planned[index]?.depart || segment.depart,
        arrive: planned[index]?.arrive || segment.arrive,
        duration: planned[index]?.duration || segment.duration,
      })) as Segment[];
      return {
        ...current,
        journeys: current.journeys.map((item) =>
          item.id === journey.id ? nextJourney : item,
        ),
        segments: [...preserved, ...merged],
      };
    });
    toast("Itinerary updated. Confirm all transit and booking details.");
  }

  function saveComparison() {
    if (!journey) return;
    const saved: SavedComparison = {
      id: `comparison:${journey.id}:${Date.now()}`,
      journeyId: journey.id,
      name: `${journey.name} · ${presets.find((item) => item.id === preset)?.label}`,
      preset,
      candidateIds: ordered.map((item) => item.candidate.id),
      savedAt: new Date().toISOString(),
    };
    update((current) => {
      const stored = current as typeof current & OptimizationState;
      return { ...current, savedComparisons: [...(stored.savedComparisons ?? []), saved] };
    });
    toast("Comparison saved to this workspace.");
  }

  function recordTransitReview() {
    if (!journey || !selected || selected.route.length < 3) return;
    const reviewed: OptimizationCandidate = {
      ...selected,
      transitReview: "user-recorded-review",
    };
    update((current) => {
      const stored = current as typeof current & OptimizationState;
      const existing = stored.optimizationCandidates ?? [];
      return {
        ...current,
        optimizationCandidates: [
          ...existing.filter((item) => item.id !== reviewed.id),
          reviewed,
        ],
      };
    });
    toast("Transit review recorded. This is not a permission or carrier confirmation.");
  }

  if (!journey) return <Panel title="Optimize your journey">Choose an active journey to compare itinerary options.</Panel>;

  return (
    <>
      <PageHeading
        eyebrow="Journey planning"
        title="Optimize"
        description={`${journey.origin} to ${journey.destination} · Compare known details without treating missing information as zero.`}
      >
        <Link className="text-link" href="/app/journey">Edit journey <ArrowRight size={13} /></Link>
      </PageHeading>
      <Panel
        title="Compare options"
        description="Sample routes are illustrative alternatives. No live fares, schedules or official fees are supplied."
        action={<Button onClick={saveComparison}><Save size={14} />Save comparison</Button>}
      >
        <div className="between" style={{ marginBottom: 14, gap: 12, flexWrap: "wrap" }}>
          <label>
            Preference{" "}
            <select value={preset} onChange={(event) => setPreset(event.target.value as OptimizationPreset)}>
              {presets.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
            </select>
          </label>
          <span className="muted">Pareto labels require every compared criterion to be known.</span>
        </div>
        <div className="task-list">
          {ordered.map(({ candidate: option, score }) => {
            const metrics = getCandidateMetrics(option, state.currency);
            const active = option.id === (selected?.id ?? selectedId);
            return (
              <button
                type="button"
                key={option.id}
                className={`task-row ${active ? "completed" : ""}`}
                onClick={() => setSelectedId(option.id)}
                aria-pressed={active}
                style={{ width: "100%", textAlign: "left", cursor: "pointer" }}
              >
                <span className={`checkbox ${active ? "checked" : ""}`}>{active && <Check size={12} />}</span>
                <span className="task-copy">
                  <span>{option.name}</span>
                  <small>{option.route.join(" → ")}</small>
                </span>
                  <span className="muted">{costLabel(option, state.currency)}</span>
                <span className="muted">{formatDuration(metrics.totalDurationMinutes)}</span>
                <span className="muted">{score}/100</span>
                {paretoIds.has(option.id) && <Badge tone="blue">Pareto</Badge>}
                {option.source === "sample" && <Badge>Sample</Badge>}
              </button>
            );
          })}
        </div>
      </Panel>

      {selected && (
        <Panel title="Option breakdown" description={selected.route.join(" → ")}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12 }}>
            <div><small>Cost</small><p><strong>{costLabel(selected, state.currency)}</strong></p></div>
            <div><small>Total duration</small><p><strong>{formatDuration(getCandidateMetrics(selected).totalDurationMinutes)}</strong></p></div>
            <div><small>Transfers / layover</small><p><strong>{getCandidateMetrics(selected).transferCount} · {formatDuration(getCandidateMetrics(selected).layoverMinutes)}</strong></p></div>
          </div>
          {selected.fare && <p className="muted">Fare: {selected.fare.provenance} {selected.fare.provider ? `· ${selected.fare.provider}` : ""}{selected.fare.capturedAt ? ` · captured ${new Date(selected.fare.capturedAt).toLocaleString()}` : ""}{selected.fare.conditions ? ` · ${selected.fare.conditions}` : ""}</p>}
          {selected.route.length > 2 && <p className="muted">Transit review: {selected.transitReview === "user-recorded-review" ? "You recorded a review; this does not establish permission or carrier confirmation." : "Not reviewed — confirm with official sources and carrier."}</p>}
          {selected.route.length > 2 && selected.transitReview !== "user-recorded-review" && <Button onClick={recordTransitReview}>Record my transit review</Button>}
          {(() => {
            const metrics = getCandidateMetrics(selected);
            const notes = [...metrics.evidenceGaps, ...metrics.warnings];
            const prep = selected.preparation;
            return (
              <>
                <p>Preparation: {prep?.remainingTasks ?? "Unknown"} unfinished tasks · {prep?.outstandingRequirements ?? "Unknown"} unassessed requirements · {prep?.overdueTasks ?? "Unknown"} overdue · {prep?.blockedTasks ?? "Unknown"} blocked</p>
                {notes.length ? <ul>{notes.map((note) => <li key={note}>{note}</li>)}</ul> : <p>No recorded evidence gaps.</p>}
                {selectedRanked && <details><summary>Score explanation · {selectedRanked.score}/100</summary><ul>{selectedRanked.scoreBreakdown.map((part) => <li key={part.criterion}>{part.criterion}: {Math.round(part.utility * 100)}% utility (weight {Math.round(part.weight * 100)}%)</li>)}</ul></details>}
              </>
            );
          })()}
          <Button onClick={applySelected}>Apply selected itinerary</Button>
        </Panel>
      )}

      <Panel title="Add a manual scenario" description="Enter route stops and an optional fare you have personally checked. A manually entered value is not a live quote.">
        <form onSubmit={addManual} className="form-grid">
          <label>Route stops, in order<input value={manualRoute} onChange={(event) => setManualRoute(event.target.value)} placeholder="LHR, DOH, BOM" /></label>
          <label>Fare (optional)<input type="number" min="0" step="0.01" value={manualFare} onChange={(event) => setManualFare(event.target.value)} placeholder="Not entered" /></label>
          <label>Currency<input value={manualCurrency} maxLength={3} onChange={(event) => setManualCurrency(event.target.value)} /></label>
          <label>Quote conditions<input value={manualConditions} onChange={(event) => setManualConditions(event.target.value)} placeholder="Baggage, changeability, source conditions" /></label>
          <Button type="submit">Add scenario</Button>
        </form>
      </Panel>
      <Panel title="Saved comparisons">
        {(extraState.savedComparisons ?? []).filter((item) => item.journeyId === journey.id).map((comparison) => (
          <div className="between" key={comparison.id}>
            <span>{comparison.name}</span>
            <Button size="sm" onClick={() => {
              setPreset(comparison.preset);
              setSelectedId(comparison.candidateIds.find((id) => candidates.some((item) => item.id === id)) ?? "");
            }}>Open comparison</Button>
          </div>
        ))}
        {!(extraState.savedComparisons ?? []).some((item) => item.journeyId === journey.id) && <p>No saved comparisons for this journey.</p>}
      </Panel>
      <div className="between">
        <p className="muted">Comparison is planning support, not booking, transit permission or a visa decision.</p>
        <Link className="text-link" href="/app/applications">Return to application <ArrowRight size={13} /></Link>
      </div>
    </>
  );
}
