import type {
  Application,
  ApplicationEvent,
  DemoState,
  Document,
  Journey,
  Traveler,
} from "./types";
import { getRequirements, type TravelRequirement } from "./requirements";
import { applicationContextKey, requirementContext } from "./workspace-context";

export type ApplicationRequirement = TravelRequirement & {
  applicationId: string;
  ruleId: string;
  verificationState: "unverified";
  assessed: boolean;
};

const now = () => new Date().toISOString();
export function applicationId(journey: Journey, traveler: Traveler) {
  return `visa:${encodeURIComponent(JSON.stringify([journey.id, traveler.id, journey.country, journey.purpose]))}`;
}

/** Additive, idempotent migration. Legacy records remain intact for rollback/export. */
export function normalizeVisaState(state: DemoState): DemoState {
  const applications = [...(state.applications ?? [])];
  for (const journey of state.journeys) {
    for (const travelerId of journey.travelers) {
      const traveler = state.travelers.find((t) => t.id === travelerId);
      if (!traveler) continue;
      const id = applicationId(journey, traveler);
      const existingIndex = applications.findIndex((app) => app.id === id);
      if (existingIndex !== -1) {
        applications[existingIndex] = {
          ...applications[existingIndex],
          contextSnapshot: requirementContext(journey, traveler),
        };
        continue;
      }
      const legacyKey = applicationContextKey(journey, traveler);
      const legacy = state.applicationRecords?.[legacyKey];
      const tracking = state.bookings.find(
        (b) => b.id === `application:${legacyKey}`,
      );
      const ukStudent =
        journey.country === "United Kingdom" &&
        /study|student|education/i.test(journey.purpose);
      applications.push({
        id,
        journeyId: journey.id,
        travelerId,
        destination: journey.country,
        visaCategory: ukStudent ? "Student visa" : "Route confirmation needed",
        officialUrl: ukStudent
          ? "https://www.gov.uk/student-visa/apply"
          : undefined,
        stage: "requirements",
        notes: "",
        completedSteps: [],
        status: legacy?.reference
          ? tracking?.name === "Decision received"
            ? "Decision received"
            : "Submitted"
          : "Not started",
        reference: legacy?.reference,
        submissionDate: legacy?.submissionDate,
        legacyStatus: tracking?.name,
        contextSnapshot: requirementContext(journey, traveler),
      });
    }
  }
  const evidenceLinks = [...(state.evidenceLinks ?? [])];
  if (!state.visaSchemaVersion) {
    for (const doc of state.documents) {
      if (!doc.requirementId) continue;
      const app = applications.find(
        (a) => a.journeyId === doc.journeyId && a.travelerId === doc.ownerId,
      );
      if (!app) continue;
      const replacements: Record<string, string> = {
        "uk-study-india-finances": "uk-study-finances",
        "uk-study-canada-finances": "uk-study-finances",
        "uk-india-clinic-discovery": "uk-study-tb",
      };
      const ruleId =
        doc.requirementId === "uk-study-passport-cas"
          ? doc.category === "Passport"
            ? "uk-study-passport"
            : doc.category === "CAS"
              ? "uk-study-cas"
              : doc.requirementId
          : (replacements[doc.requirementId] ?? doc.requirementId);
      evidenceLinks.push({
        id: `${app.id}:${ruleId}:${doc.id}`,
        applicationId: app.id,
        requirementId: `${app.id}:${ruleId}`,
        documentId: doc.id,
        confirmedAt: doc.added || now(),
        verificationState: "unverified",
        reviewedAt: doc.reviewed ? now() : undefined,
      });
    }
  }
  return {
    ...state,
    visaSchemaVersion: 1,
    applications,
    evidenceLinks,
    applicationEvents: state.applicationEvents ?? [],
    requirementAssessments: state.requirementAssessments ?? {},
  };
}

export function activeApplication(state: DemoState) {
  const journey = state.journeys.find((j) => j.id === state.activeJourneyId);
  const traveler = state.travelers.find((t) => t.id === state.activeTravelerId);
  return journey && traveler
    ? state.applications?.find(
        (app) => app.id === applicationId(journey, traveler),
      )
    : undefined;
}

export function applicationRequirements(
  state: DemoState,
  app: Application,
): ApplicationRequirement[] {
  const journey = state.journeys.find((j) => j.id === app.journeyId);
  const traveler = state.travelers.find((t) => t.id === app.travelerId);
  if (!journey || !traveler) return [];
  const current = app.id === applicationId(journey, traveler);
  const context = current
    ? requirementContext(journey, traveler)
    : app.contextSnapshot;
  if (!context) return [];
  const contextKey = JSON.stringify([
    current ? applicationContextKey(journey, traveler) : context,
    app.ruleContext ?? {},
  ]);
  return getRequirements({ ...context, ...app.ruleContext }).map((rule) => ({
    ...rule,
    ruleId: rule.id,
    id: `${app.id}:${rule.id}`,
    applicationId: app.id,
    verificationState: "unverified",
    assessed:
      state.requirementAssessments?.[`${app.id}:${rule.id}`]?.contextKey ===
      contextKey,
  }));
}

export function linkedDocuments(
  state: DemoState,
  requirementId: string,
): Document[] {
  const ids = new Set(
    state.evidenceLinks
      ?.filter((link) => link.requirementId === requirementId)
      .map((link) => link.documentId),
  );
  return state.documents.filter((doc) => ids.has(doc.id));
}

export function suggestedDocuments(
  state: DemoState,
  app: Application,
  req: ApplicationRequirement,
): Document[] {
  const linked = new Set(linkedDocuments(state, req.id).map((d) => d.id));
  return state.documents.filter(
    (doc) =>
      doc.ownerId === app.travelerId &&
      req.evidenceTypes.includes(doc.category) &&
      !linked.has(doc.id),
  );
}

export function recordEvent(
  state: DemoState,
  applicationId: string,
  type: string,
  detail: string,
): DemoState {
  const event: ApplicationEvent = {
    id: crypto.randomUUID(),
    applicationId,
    type,
    detail,
    createdAt: now(),
  };
  return {
    ...state,
    applicationEvents: [...(state.applicationEvents ?? []), event],
  };
}

export function linkEvidence(
  state: DemoState,
  appId: string,
  requirementId: string,
  documentId: string,
): DemoState {
  const app = state.applications?.find((a) => a.id === appId);
  const doc = state.documents.find((d) => d.id === documentId);
  const req =
    app &&
    applicationRequirements(state, app).find((r) => r.id === requirementId);
  if (
    !app ||
    !doc ||
    doc.ownerId !== app.travelerId ||
    !req ||
    req.procedural ||
    req.applicability === "Not applicable"
  ) {
    throw new Error(
      "Choose an applicable evidence requirement and a document belonging to this traveler.",
    );
  }
  if (
    state.evidenceLinks?.some(
      (l) => l.requirementId === requirementId && l.documentId === documentId,
    )
  )
    return state;
  return recordEvent(
    {
      ...state,
      evidenceLinks: [
        ...(state.evidenceLinks ?? []),
        {
          id: crypto.randomUUID(),
          applicationId: appId,
          requirementId,
          documentId,
          confirmedAt: now(),
          verificationState: "unverified",
        },
      ],
    },
    appId,
    "evidence-linked",
    doc.name,
  );
}

export function unlinkEvidence(
  state: DemoState,
  requirementId: string,
  documentId: string,
): DemoState {
  const link = state.evidenceLinks?.find(
    (l) => l.requirementId === requirementId && l.documentId === documentId,
  );
  if (!link) return state;
  return recordEvent(
    {
      ...state,
      evidenceLinks: state.evidenceLinks?.filter((l) => l.id !== link.id),
    },
    link.applicationId,
    "evidence-unlinked",
    documentId,
  );
}

export function assessRequirement(
  state: DemoState,
  appId: string,
  requirementId: string,
): DemoState {
  const app = state.applications?.find((a) => a.id === appId);
  if (
    !app ||
    !applicationRequirements(state, app).some((r) => r.id === requirementId)
  )
    return state;
  const journey = state.journeys.find((j) => j.id === app.journeyId)!;
  const traveler = state.travelers.find((t) => t.id === app.travelerId)!;
  return recordEvent(
    {
      ...state,
      requirementAssessments: {
        ...state.requirementAssessments,
        [requirementId]: {
          assessedAt: now(),
          contextKey: JSON.stringify([
            applicationContextKey(journey, traveler),
            app.ruleContext ?? {},
          ]),
        },
      },
    },
    appId,
    "requirement-assessed",
    requirementId,
  );
}

export function saveDocument(state: DemoState, document: Document): DemoState {
  const exists = state.documents.some((d) => d.id === document.id);
  // Metadata or preparation changes require a fresh personal evidence review.
  const changed = { ...document };
  return {
    ...state,
    documents: exists
      ? state.documents.map((d) => (d.id === document.id ? changed : d))
      : [...state.documents, changed],
    evidenceLinks: state.evidenceLinks?.map((l) =>
      l.documentId === document.id ? { ...l, reviewedAt: undefined } : l,
    ),
  };
}

export function documentStatus(doc: Document): string {
  if (doc.preparationStatus === "Missing") return "Missing";
  if (doc.prepared) return doc.reviewed ? "Ready" : "Needs review";
  return doc.preparationStatus === "Added" ? "Added" : "To prepare";
}

export function updateApplication(
  state: DemoState,
  id: string,
  changes: Partial<Omit<Application, "id" | "journeyId" | "travelerId">>,
): DemoState {
  const app = state.applications?.find((a) => a.id === id);
  if (!app) return state;
  const next = {
    ...app,
    ...changes,
    legacyStatus: changes.status ? undefined : app.legacyStatus,
  };
  if (
    ["Submitted", "Awaiting decision", "Decision received"].includes(
      next.status,
    ) &&
    (!next.reference || !next.submissionDate)
  ) {
    throw new Error("Record a submission reference and date first.");
  }
  return recordEvent(
    {
      ...state,
      applications: state.applications?.map((a) => (a.id === id ? next : a)),
    },
    id,
    "application-updated",
    changes.stage
      ? `Opened ${changes.stage}`
      : changes.status
        ? `User recorded: ${changes.status}`
        : "Application details saved",
  );
}

export function reviewEvidence(
  state: DemoState,
  requirementId: string,
  documentId: string,
): DemoState {
  const doc = state.documents.find((d) => d.id === documentId);
  const link = state.evidenceLinks?.find(
    (l) => l.requirementId === requirementId && l.documentId === documentId,
  );
  if (!doc?.prepared || !link) return state;
  return recordEvent(
    {
      ...state,
      documents: state.documents.map((d) =>
        d.id === documentId
          ? { ...d, reviewed: true, preparationStatus: "Ready" }
          : d,
      ),
      evidenceLinks: state.evidenceLinks?.map((l) =>
        l.requirementId === requirementId && l.documentId === documentId
          ? { ...l, reviewedAt: now() }
          : l,
      ),
    },
    link.applicationId,
    "evidence-reviewed",
    `Personal evidence review: ${doc.name}`,
  );
}

export function applicationMetrics(state: DemoState, app: Application) {
  const requirements = applicationRequirements(state, app);
  const current = new Set(
    requirements
      .filter((r) => r.applicability !== "Not applicable")
      .map((r) => r.id),
  );
  const links =
    state.evidenceLinks?.filter(
      (l) => l.applicationId === app.id && current.has(l.requirementId),
    ) ?? [];
  const ids = new Set(links.map((l) => l.documentId));
  const docs = state.documents.filter((d) => ids.has(d.id));
  return {
    requirementsAssessed: requirements.filter((r) => r.assessed).length,
    requirementsTotal: requirements.length,
    documentsPrepared: docs.filter((d) => d.prepared).length,
    documentsTotal: docs.length,
    documentsRequiringReview: docs.filter(
      (d) =>
        !d.reviewed ||
        links.some((l) => l.documentId === d.id && !l.reviewedAt),
    ).length,
    evidenceRequirementsMissing: requirements.filter(
      (r) =>
        !r.procedural &&
        r.applicability === "Required" &&
        !links.some((l) => l.requirementId === r.id),
    ).length,
    applicationStepsCompleted: app.completedSteps.length,
    submissionRecorded: Boolean(app.reference && app.submissionDate),
  };
}
