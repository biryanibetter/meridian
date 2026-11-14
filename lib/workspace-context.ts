import type { DemoState, Journey, Traveler } from "./types";
import type { RequirementContext } from "./requirements";

/** Keep older workspaces as restorable metadata; onboarding never discards user work. */
export function personalWorkspaceBase(
  state: DemoState,
  travelerId: string,
): DemoState {
  const {
    workspaceHistory = [],
    pendingTravelerId: _pending,
    ...snapshot
  } = state;
  void _pending;
  return {
    ...state,
    workspaceHistory: [
      ...workspaceHistory,
      {
        name: state.profile,
        savedAt: new Date().toISOString(),
        state: {
          ...snapshot,
          travelers: snapshot.travelers.filter(
            (traveler) => traveler.id !== state.pendingTravelerId,
          ),
        },
      },
    ],
    journeys: [],
    travelers: state.travelers.filter((t) => t.id === travelerId),
    tasks: [],
    documents: [],
    segments: [],
    bookings: [],
    expenses: [],
    notifications: [],
    applications: [],
    evidenceLinks: [],
    applicationEvents: [],
    requirementAssessments: {},
    optimizationCandidates: [],
    savedComparisons: [],
    applicationRecords: {},
    reviewedRules: [],
    arrivalDone: [],
    travelDayDone: [],
    preferences: Object.fromEntries(
      Object.entries(state.preferences).filter(
        ([key]) => !key.startsWith("application:"),
      ),
    ),
  };
}

export function requirementContext(
  journey: Journey,
  traveler?: Traveler,
): RequirementContext {
  return {
    nationality: traveler?.nationality ?? "Not provided",
    residence: traveler?.residence ?? "Not provided",
    destination: journey.country,
    transit: journey.transit,
    purpose: journey.purpose,
    departure: journey.departure,
    returnDate: journey.returnDate || undefined,
    passportType: traveler?.passportType,
    dateOfBirth: traveler?.dateOfBirth,
    residencePermitStatus: traveler?.residencePermitMasked
      ? `Recorded${traveler.residencePermitExpiry ? `; expires ${traveler.residencePermitExpiry}` : ""}; validity not confirmed`
      : "Not provided",
    existingVisaStatus: traveler?.existingVisaStatus ?? "Not provided",
  };
}

/** Exact, non-secret context key prevents old progress becoming valid for a changed journey. */
export function applicationContextKey(
  journey: Journey,
  traveler?: Traveler,
): string {
  return encodeURIComponent(
    JSON.stringify([
      journey.id,
      traveler?.id,
      requirementContext(journey, traveler),
      journey.origin,
      journey.originCountry,
      journey.destination,
      traveler?.passportExpiry,
    ]),
  );
}
