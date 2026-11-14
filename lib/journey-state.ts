import { deriveJourneyRoute } from "./journey-route";
import type { DemoState, Journey, Notification, Segment } from "./types";

export function activeJourneys(state: DemoState) {
  return state.journeys.filter((journey) => !journey.archived);
}

export function activeJourney(state: DemoState) {
  return activeJourneys(state).find(
    (journey) => journey.id === state.activeJourneyId,
  );
}

export function activeNotifications(state: DemoState): Notification[] {
  const activeIds = new Set(activeJourneys(state).map((journey) => journey.id));
  return state.notifications.filter(
    (notification) =>
      !notification.journeyId || activeIds.has(notification.journeyId),
  );
}

export function normalizeJourneyState(state: DemoState): DemoState {
  const selected = activeJourney(state) ?? activeJourneys(state)[0];
  if (!selected) return { ...state, activeJourneyId: "" };
  const traveler = selected.travelers.includes(state.activeTravelerId)
    ? state.activeTravelerId
    : selected.travelers[0];
  if (
    selected.id === state.activeJourneyId &&
    traveler === state.activeTravelerId
  ) {
    return state;
  }
  return {
    ...state,
    activeJourneyId: selected.id,
    activeTravelerId: traveler,
  };
}

export function buildPlannedSegments(journey: Journey, recorded: Segment[] = []): Segment[] {
  return deriveJourneyRoute(journey, recorded).legs.map(({ from, to, recorded: existing }, index) => {
    return {
      ...(existing ?? {}),
      id: `${journey.id}-s${index + 1}`,
      journeyId: journey.id,
      from: from.name,
      to: to.name,
      fromCode: from.code,
      toCode: to.code,
      depart: existing?.depart ?? "",
      arrive: existing?.arrive ?? "",
      carrier: existing?.carrier ?? "",
      flight: existing?.flight ?? "",
      terminal: existing?.terminal ?? "",
      duration: existing?.duration ?? "",
      status: existing?.status ?? "Planned",
    };
  });
}
