import type { Application, DemoState, Document } from "./types";
import { applicationRequirements, recordEvent } from "./visa-workflow";

export type GovernmentStepStatus =
  | "not-checked"
  | "needs-information"
  | "user-reviewed"
  | "prepared"
  | "official-confirmation-required";
export type GovernmentApplicability =
  | "required"
  | "conditional"
  | "unknown"
  | "not-applicable";

export interface GovernmentAppointment {
  id: string;
  title: string;
  scheduledAt: string;
  location?: string;
  completed: boolean;
}
export interface GovernmentDeadline {
  id: string;
  title: string;
  date: string;
  completed: boolean;
}
export interface GovernmentStep {
  id: string;
  ruleId?: string;
  kind?: string;
  title: string;
  detail: string;
  applicability: GovernmentApplicability;
  status: GovernmentStepStatus;
  dependencies: string[];
  missingInformation: string[];
  evidenceRequirementId?: string;
  evidenceReady: boolean;
  dueDate?: string;
  authority: {
    name: string;
    jurisdiction: string;
    confirmed: false;
  };
  source: {
    name: string;
    responsibleAuthority: string;
    url: string;
    jurisdiction: string;
    coverage: string;
    freshness: "current-record" | "stale" | "unknown";
    lastChecked: string | null;
  } | null;
}

export interface GovernmentCase {
  applicationId: string;
  destination: string;
  authority: GovernmentStep["authority"];
  status: GovernmentStepStatus;
  progress: { completed: number; total: number };
  steps: GovernmentStep[];
  nextAction: GovernmentStep | null;
  appointments: GovernmentAppointment[];
  deadlines: GovernmentDeadline[];
  costs: Array<{
    id: string;
    title: string;
    amount: number | null;
    currency: string;
    certainty: "known" | "estimated" | "unknown";
    sourceUrl?: string;
  }>;
  timeline: Array<{
    id: string;
    title: string;
    date: string | null;
    kind: "task" | "evidence" | "application";
  }>;
}

type ExtendedApplication = Application & {
  appointments?: GovernmentAppointment[];
  deadlines?: GovernmentDeadline[];
};
type ExtendedExpense = DemoState["expenses"][number] & {
  applicationId?: string;
  certainty?: "known" | "estimated" | "unknown";
  sourceUrl?: string;
};

const freshness = (date: string | null) => {
  if (!date) return "unknown" as const;
  const parsed = Date.parse(date);
  if (!Number.isFinite(parsed)) return "unknown" as const;
  return Date.now() - parsed > 180 * 86_400_000
    ? ("stale" as const)
    : ("current-record" as const);
};

function dateExpired(value: string, now: number) {
  const date = Date.parse(`${value}T23:59:59`);
  return Number.isFinite(date) && date < now;
}

function evidenceIsReady(
  state: DemoState,
  app: Application,
  requirementId: string,
  now: number,
): boolean {
  return (
    state.evidenceLinks?.some((link) => {
      if (
        link.applicationId !== app.id ||
        link.requirementId !== requirementId
      )
        return false;
      const doc: Document | undefined = state.documents.find(
        (item) =>
          item.id === link.documentId &&
          item.ownerId === app.travelerId &&
          item.journeyId === app.journeyId,
      );
      return Boolean(
        doc?.prepared &&
          doc.reviewed &&
          !dateExpired(doc.expires, now) &&
          link.verificationState === "unverified",
      );
    }) ?? false
  );
}

function authorityFor(destination: string, studentRoute: boolean) {
  const uk = destination.trim().toLowerCase() === "united kingdom";
  return {
    name: uk && studentRoute
      ? "UK Visas and Immigration (UKVI)"
      : "Responsible immigration authority — unconfirmed",
    jurisdiction: destination,
    confirmed: false as const,
  };
}

function authorityFromSource(
  destination: string,
  sourceName: string | null,
  sourceUrl: string | null,
  studentRoute: boolean,
) {
  if (studentRoute) return "UK Visas and Immigration (UKVI)";
  if (!sourceName) return authorityFor(destination, false).name;
  const normalized = sourceName.toLowerCase();
  if (/gov\.uk/.test(`${normalized} ${sourceUrl ?? ""}`))
    return "UK Visas and Immigration (UKVI)";
  if (/immigration, refugees and citizenship canada|\bircc\b/.test(normalized))
    return "Immigration, Refugees and Citizenship Canada (IRCC)";
  if (/u\.s\. department of state|travel\.state\.gov/.test(`${normalized} ${sourceUrl ?? ""}`))
    return "U.S. Department of State";
  if (/home affairs/.test(normalized)) return "Department of Home Affairs";
  if (/immigration new zealand/.test(normalized)) return "Immigration New Zealand";
  // For other registry records retain the source's named body rather than
  // inventing an authority from a country label or an arbitrary domain.
  return sourceName.split(" · ")[0].trim() || authorityFor(destination, false).name;
}

export function safeExternalHttpUrl(value: string | undefined): string | undefined {
  if (typeof value !== "string" || !value.trim()) return undefined;
  try {
    const parsed = new URL(value.trim());
    if (
      (parsed.protocol !== "https:" && parsed.protocol !== "http:") ||
      !parsed.hostname ||
      parsed.username ||
      parsed.password
    )
      return undefined;
    return parsed.href;
  } catch {
    return undefined;
  }
}

function statusFor(
  applicability: GovernmentApplicability,
  missing: string[],
  evidenceReady: boolean,
  assessed: boolean,
): GovernmentStepStatus {
  if (applicability === "not-applicable") return "user-reviewed";
  if (applicability === "unknown") return "needs-information";
  if (missing.length > 0) return "needs-information";
  if (evidenceReady) return "prepared";
  if (assessed) return "user-reviewed";
  return "official-confirmation-required";
}

function localEvent(
  state: DemoState,
  appId: string,
  type: string,
  detail: string,
) {
  return recordEvent(state, appId, type, detail);
}

function updateCaseRecord(
  state: DemoState,
  appId: string,
  field: "appointments" | "deadlines",
  records: GovernmentAppointment[] | GovernmentDeadline[],
  eventType: string,
  detail: string,
): DemoState {
  if (!state.applications?.some((app) => app.id === appId)) return state;
  const applications = state.applications.map((app) =>
    app.id === appId
      ? ({ ...app, [field]: records } as Application)
      : app,
  );
  return localEvent({ ...state, applications }, appId, eventType, detail);
}

export function recordGovernmentAppointment(
  state: DemoState,
  appId: string,
  appointment: Omit<GovernmentAppointment, "id" | "completed">,
): DemoState {
  const app = state.applications?.find((item) => item.id === appId) as
    | ExtendedApplication
    | undefined;
  if (!app || !appointment.title.trim() || !appointment.scheduledAt) return state;
  const record = {
    ...appointment,
    id: crypto.randomUUID(),
    title: appointment.title.trim(),
    completed: false,
  };
  return updateCaseRecord(
    state,
    appId,
    "appointments",
    [...(app.appointments ?? []), record],
    "appointment-recorded",
    `Appointment planning record added: ${record.title}`,
  );
}

export function setGovernmentAppointmentCompleted(
  state: DemoState,
  appId: string,
  appointmentId: string,
  completed: boolean,
): DemoState {
  const app = state.applications?.find((item) => item.id === appId) as
    | ExtendedApplication
    | undefined;
  if (!app) return state;
  const records = (app.appointments ?? []).map((item) =>
    item.id === appointmentId ? { ...item, completed } : item,
  );
  const changed = records.find((item) => item.id === appointmentId);
  if (!changed) return state;
  return updateCaseRecord(
    state,
    appId,
    "appointments",
    records,
    completed ? "appointment-completed" : "appointment-reopened",
    `${completed ? "Appointment completion recorded" : "Appointment reopened"}: ${changed.title}`,
  );
}

export function recordGovernmentDeadline(
  state: DemoState,
  appId: string,
  deadline: Omit<GovernmentDeadline, "id" | "completed">,
): DemoState {
  const app = state.applications?.find((item) => item.id === appId) as
    | ExtendedApplication
    | undefined;
  if (!app || !deadline.title.trim() || !deadline.date) return state;
  const record = {
    ...deadline,
    id: crypto.randomUUID(),
    title: deadline.title.trim(),
    completed: false,
  };
  return updateCaseRecord(
    state,
    appId,
    "deadlines",
    [...(app.deadlines ?? []), record],
    "deadline-recorded",
    `Deadline planning record added: ${record.title}`,
  );
}

export function setGovernmentDeadlineCompleted(
  state: DemoState,
  appId: string,
  deadlineId: string,
  completed: boolean,
): DemoState {
  const app = state.applications?.find((item) => item.id === appId) as
    | ExtendedApplication
    | undefined;
  if (!app) return state;
  const records = (app.deadlines ?? []).map((item) =>
    item.id === deadlineId ? { ...item, completed } : item,
  );
  const changed = records.find((item) => item.id === deadlineId);
  if (!changed) return state;
  return updateCaseRecord(
    state,
    appId,
    "deadlines",
    records,
    completed ? "deadline-completed" : "deadline-reopened",
    `${completed ? "Deadline completion recorded" : "Deadline reopened"}: ${changed.title}`,
  );
}

export function deriveGovernmentCase(
  state: DemoState,
  app: Application,
): GovernmentCase {
  const now = Date.now();
  const requirements = applicationRequirements(state, app);
  const studentRoute =
    app.destination === "United Kingdom" &&
    /student/i.test(app.visaCategory);
  const primarySource = requirements.find((item) => item.sourceUrl);
  const authority = {
    name: authorityFromSource(
      app.destination,
      primarySource?.sourceName ?? null,
      primarySource?.sourceUrl ?? null,
      studentRoute,
    ),
    jurisdiction: primarySource?.jurisdiction ?? app.destination,
    confirmed: false as const,
  };
  const proceduralRuleIds = new Set([
    "uk-study-application",
    "uk-study-fees-health",
    "uk-study-identity",
    "uk-study-submission",
    "uk-study-decision",
  ]);
  const sourceFor = (ruleId: string) => {
    const item = requirements.find((requirement) => requirement.ruleId === ruleId);
    return item?.sourceUrl
      ? {
          name: item.sourceName ?? "Official reference",
          responsibleAuthority: authorityFromSource(
            item.jurisdiction,
            item.sourceName,
            item.sourceUrl,
            studentRoute,
          ),
          url: item.sourceUrl,
          jurisdiction: item.jurisdiction,
          coverage: item.sourceCoverage,
          freshness: freshness(item.sourceFetchedAt),
          lastChecked: item.lastVerified,
        }
      : null;
  };
  const authorityForRule = (ruleId: string) => {
    const item = requirements.find((requirement) => requirement.ruleId === ruleId);
    return {
      name: authorityFromSource(
        item?.jurisdiction ?? app.destination,
        item?.sourceName ?? null,
        item?.sourceUrl ?? null,
        studentRoute,
      ),
      jurisdiction: item?.jurisdiction ?? app.destination,
      confirmed: false as const,
    };
  };
  const applicable = (
    value: "Required" | "Conditional" | "Not applicable" | "Confirmation needed",
  ): GovernmentApplicability =>
    value === "Required"
      ? "required"
      : value === "Conditional"
        ? "conditional"
        : value === "Not applicable"
          ? "not-applicable"
          : "unknown";
  const steps: GovernmentStep[] = requirements
    .filter(
      (requirement) =>
        requirement.applicability !== "Not applicable" &&
        !(studentRoute && proceduralRuleIds.has(requirement.ruleId)),
    )
    .map((requirement) => {
      const applicability = applicable(requirement.applicability);
      const canCountEvidence =
        applicability === "required" ||
        (applicability === "conditional" &&
          requirement.missingInformation.length === 0);
      const evidenceReady =
        !requirement.procedural &&
        canCountEvidence &&
        evidenceIsReady(state, app, requirement.id, now);
      const dependencies =
        studentRoute && requirement.ruleId === "uk-study-cas"
          ? [`${app.id}:uk-study-admission`]
          : [];
      return {
        id: requirement.id,
        ruleId: requirement.ruleId,
        title: requirement.title,
        detail: requirement.preparation,
        applicability,
        status: statusFor(
          applicability,
          requirement.missingInformation,
          evidenceReady,
          requirement.assessed,
        ),
        dependencies,
        missingInformation: requirement.missingInformation,
        evidenceRequirementId: requirement.procedural
          ? undefined
          : requirement.id,
        evidenceReady,
        authority: authorityForRule(requirement.ruleId),
        source: sourceFor(requirement.ruleId),
      };
    });

  if (studentRoute) {
    const admission = steps.find((step) => step.ruleId === "uk-study-admission");
    const cas = steps.find((step) => step.ruleId === "uk-study-cas");
    const stepsDone = new Set(app.completedSteps ?? []);
    const prepComplete =
      stepsDone.has("information") && stepsDone.has("fees");
    const prepMissing = prepComplete ? [] : [
      ...(!stepsDone.has("information") ? ["Application information"] : []),
      ...(!stepsDone.has("fees") ? ["Application fees and healthcare surcharge"] : []),
    ];
    const preparedAfterCas = Boolean(cas && cas.status === "prepared");
    const addProcedure = (
      kind: string,
      title: string,
      applicability: GovernmentApplicability,
      dependencies: string[],
      sourceRule: string,
      isComplete: boolean,
      missingInformation: string[],
      localStatus?: GovernmentStepStatus,
    ) => {
      steps.push({
        id: `${app.id}:${kind}`,
        kind,
        title,
        detail: "User-recorded workflow state only; confirm procedural instructions with the responsible authority.",
        applicability,
        status: isComplete
          ? localStatus ?? "prepared"
          : applicability === "unknown"
            ? "needs-information"
            : missingInformation.length
              ? "needs-information"
              : "not-checked",
        dependencies,
        missingInformation,
        evidenceReady: false,
        authority: authorityForRule(sourceRule),
        source: sourceFor(sourceRule),
      });
    };
    if (admission && cas) {
      // The evidence chain is explicit: offer/admission precedes CAS.
      cas.dependencies = [admission.id];
    }
    addProcedure(
      "procedure-preparation",
      "Complete application information and fee steps",
      "required",
      cas ? [cas.id] : [],
      "uk-study-application",
      prepComplete && preparedAfterCas,
      prepMissing,
    );
    const preparationId = `${app.id}:procedure-preparation`;
    const submissionRecorded = Boolean(
      app.submissionDate &&
        app.reference &&
        ["Submitted", "Awaiting decision", "Decision received"].includes(app.status),
    );
    addProcedure(
      "procedure-submission",
      "Record official application submission",
      "required",
      [preparationId],
      "uk-study-submission",
      submissionRecorded,
      submissionRecorded ? [] : ["Submission date and reference recorded by you"],
      submissionRecorded ? "prepared" : undefined,
    );
    const identityDone = stepsDone.has("identity");
    const submissionId = `${app.id}:procedure-submission`;
    addProcedure(
      "procedure-identity",
      "Identity or biometric instructions",
      identityDone ? "required" : "unknown",
      [submissionId],
      "uk-study-identity",
      identityDone,
      identityDone ? [] : ["Confirm whether identity checks or biometrics are required"],
      identityDone ? "user-reviewed" : undefined,
    );
    const identityId = `${app.id}:procedure-identity`;
    const decisionRecorded = app.status === "Decision received";
    addProcedure(
      "procedure-decision",
      "Decision tracking (user-recorded)",
      "required",
      [identityId],
      "uk-study-decision",
      decisionRecorded,
      decisionRecorded ? [] : ["Record the decision communicated to you"],
      decisionRecorded ? "user-reviewed" : undefined,
    );
  }

  const byId = new Map(steps.map((step) => [step.id, step]));
  // A node is not prepared while any explicit prerequisite is incomplete.
  for (const step of steps) {
    if (step.status !== "prepared") continue;
    if (
      step.dependencies.some((dependency) => {
        const parent = byId.get(dependency);
        return !parent || !["prepared", "user-reviewed"].includes(parent.status);
      })
    ) {
      step.status = "not-checked";
    }
  }
  const requiredSteps = steps.filter((step) =>
    ["required", "conditional", "unknown"].includes(step.applicability),
  );
  const completed = requiredSteps.filter((step) => step.status === "prepared").length;
  const openSteps = steps.filter(
    (step) =>
      !["prepared", "user-reviewed"].includes(step.status) &&
      step.applicability !== "not-applicable",
  );
  const blockedPrerequisite = openSteps
    .flatMap((step) => step.dependencies)
    .map((dependency) => byId.get(dependency))
    .find(
      (parent) =>
        parent &&
        !["prepared", "user-reviewed"].includes(parent.status),
    );
  const nextAction =
    (() => {
      const candidate =
        blockedPrerequisite ??
        openSteps.find((step) => step.missingInformation.length > 0) ??
        openSteps[0];
      const visited = new Set<string>();
      let current = candidate;
      while (current && !visited.has(current.id)) {
        visited.add(current.id);
        const parent = current.dependencies
          .map((id) => byId.get(id))
          .find(
            (step) =>
              step &&
              !["prepared", "user-reviewed"].includes(step.status),
          );
        if (!parent) break;
        current = parent;
      }
      return current ?? null;
    })() ??
    null;
  const status: GovernmentStepStatus =
    steps.some((step) => step.status === "needs-information")
      ? "needs-information"
      : completed === requiredSteps.length && requiredSteps.length > 0
        ? "prepared"
        : steps.some((step) => step.status === "user-reviewed")
          ? "user-reviewed"
          : steps.length
            ? "official-confirmation-required"
            : "not-checked";

  const extendedApp = app as ExtendedApplication;
  const timeline: GovernmentCase["timeline"] = [
    ...state.tasks
      .filter(
        (task) =>
          task.journeyId === app.journeyId &&
          task.travelerId === app.travelerId &&
          task.done,
      )
      .map((task) => ({
        id: `task:${task.id}`,
        title: task.title,
        date: null,
        kind: "task" as const,
      })),
    ...(state.evidenceLinks ?? [])
      .filter((link) => link.applicationId === app.id)
      .map((link) => {
        const doc = state.documents.find((item) => item.id === link.documentId);
        return {
          id: `evidence:${link.id}`,
          title: `Evidence linked${doc ? `: ${doc.name}` : ""}`,
          date: link.confirmedAt || null,
          kind: "evidence" as const,
        };
      }),
    ...(state.applicationEvents ?? [])
      .filter(
        (event) =>
          event.applicationId === app.id &&
          !/review|assess|opened/i.test(`${event.type} ${event.detail}`),
      )
      .map((event) => ({
        id: `event:${event.id}`,
        title: event.detail,
        date: event.createdAt || null,
        kind: "application" as const,
      })),
  ].sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""));
  const costs: GovernmentCase["costs"] = (
    state.expenses as ExtendedExpense[]
  )
    .filter((expense) => expense.applicationId === app.id)
    .map((expense) => ({
      id: expense.id,
      title: expense.title,
      amount: expense.certainty === "unknown" ? null : expense.planned,
      currency: expense.currency,
      certainty: expense.certainty ?? "known",
      sourceUrl: safeExternalHttpUrl(expense.sourceUrl),
    }));
  if (!costs.length)
    costs.push({
      id: `${app.id}:official-costs`,
      title: "Government application fees",
      amount: null,
      currency: state.currency || "USD",
      certainty: "unknown",
    });

  return {
    applicationId: app.id,
    destination: app.destination,
    authority,
    status,
    progress: { completed, total: requiredSteps.length },
    steps,
    nextAction,
    appointments: extendedApp.appointments ?? [],
    deadlines: extendedApp.deadlines ?? [],
    costs,
    timeline,
  };
}
