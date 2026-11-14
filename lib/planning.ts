import type { DemoState, Requirement, Rule, Task } from "./types";
import { findAirport } from "./geography";
export function readiness(tasks: { done: boolean }[]): number {
  return tasks.length
    ? Math.round((tasks.filter((t) => t.done).length / tasks.length) * 100)
    : 0;
}
export function dueDate(departure: string, offset: number): string {
  const date = new Date(`${departure}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + offset);
  return date.toISOString().slice(0, 10);
}
export function budgetTotals(
  items: { planned: number; actual: number }[],
  limit: number,
) {
  return {
    planned: items.reduce((s, x) => s + x.planned, 0),
    actual: items.reduce((s, x) => s + x.actual, 0),
    remaining: limit - items.reduce((s, x) => s + x.actual, 0),
  };
}
export function isDemoState(value: unknown): value is DemoState {
  if (!isRecord(value) || value.version !== 1) return false;
  if (
    value.workspaceHistory !== undefined &&
    (!Array.isArray(value.workspaceHistory) ||
      !value.workspaceHistory.every(
        (entry) =>
          isRecord(entry) &&
          typeof entry.name === "string" &&
          typeof entry.savedAt === "string" &&
          isRecord(entry.state) &&
          entry.state.workspaceHistory === undefined &&
          isDemoState(entry.state),
      ))
  )
    return false;
  const fields: Record<string, string[]> = {
    journeys: [
      "id",
      "name",
      "mode",
      "origin",
      "originCode",
      "destination",
      "destinationCode",
      "country",
      "transit",
      "departure",
      "returnDate",
      "purpose",
      "color",
    ],
    travelers: [
      "id",
      "name",
      "initials",
      "role",
      "nationality",
      "residence",
      "color",
    ],
    tasks: ["id", "journeyId", "title", "category", "priority", "travelerId"],
    documents: [
      "id",
      "journeyId",
      "name",
      "category",
      "ownerId",
      "expires",
      "taskId",
      "added",
    ],
    segments: [
      "id",
      "journeyId",
      "from",
      "to",
      "fromCode",
      "toCode",
      "depart",
      "arrive",
      "carrier",
      "flight",
      "terminal",
      "duration",
    ],
    bookings: ["id", "journeyId", "name", "reference", "category"],
    expenses: ["id", "journeyId", "title", "category", "currency"],
    notifications: ["id", "title", "detail", "type", "route"],
  };
  for (const [key, keys] of Object.entries(fields)) {
    const records = value[key];
    if (
      !Array.isArray(records) ||
      !records.every(
        (r) => isRecord(r) && keys.every((k) => typeof r[k] === "string"),
      )
    )
      return false;
  }
  for (const key of ["reviewedRules", "arrivalDone"]) {
    if (
      !Array.isArray(value[key]) ||
      !value[key].every((x) => typeof x === "string")
    )
      return false;
  }
  if (
    ![
      "activeJourneyId",
      "activeTravelerId",
      "profile",
      "currency",
      "language",
    ].every((k) => typeof value[k] === "string") ||
    !["light", "dark"].includes(String(value.theme)) ||
    !isRecord(value.preferences) ||
    !Object.values(value.preferences).every((v) => typeof v === "boolean")
  )
    return false;
  if (
    value.applications !== undefined &&
    (!Array.isArray(value.applications) ||
      !value.applications.every(
        (app) =>
          isRecord(app) &&
          [
            "id",
            "journeyId",
            "travelerId",
            "destination",
            "visaCategory",
            "notes",
          ].every((key) => typeof app[key] === "string") &&
          [
            "requirements",
            "documents",
            "application",
            "submission",
            "status",
          ].includes(String(app.stage)) &&
          [
            "Not started",
            "Preparing",
            "Submitted",
            "Awaiting decision",
            "Decision received",
          ].includes(String(app.status)) &&
          Array.isArray(app.completedSteps) &&
          app.completedSteps.every((step) => typeof step === "string") &&
          (app.ruleContext === undefined || isRecord(app.ruleContext)),
      ))
  )
    return false;
  if (
    value.evidenceLinks !== undefined &&
    (!Array.isArray(value.evidenceLinks) ||
      !value.evidenceLinks.every(
        (link) =>
          isRecord(link) &&
          [
            "id",
            "applicationId",
            "requirementId",
            "documentId",
            "confirmedAt",
          ].every((key) => typeof link[key] === "string") &&
          link.verificationState === "unverified",
      ))
  )
    return false;
  if (
    value.applicationEvents !== undefined &&
    (!Array.isArray(value.applicationEvents) ||
      !value.applicationEvents.every(
        (event) =>
          isRecord(event) &&
          ["id", "applicationId", "type", "detail", "createdAt"].every(
            (key) => typeof event[key] === "string",
          ),
      ))
  )
    return false;
  if (
    value.requirementAssessments !== undefined &&
    (!isRecord(value.requirementAssessments) ||
      !Object.values(value.requirementAssessments).every(
        (record) =>
          isRecord(record) &&
          typeof record.assessedAt === "string" &&
          typeof record.contextKey === "string",
      ))
  )
    return false;
  // The structural checks above make typed record inspection safe.
  const s = value as unknown as DemoState;
  if (
    s.travelDayDone !== undefined &&
    (!Array.isArray(s.travelDayDone) ||
      !s.travelDayDone.every((x) => typeof x === "string"))
  )
    return false;
  const active = s.journeys.find((j) => j.id === s.activeJourneyId);
  const activeContextValid = active
    ? !active.archived && active.travelers.includes(s.activeTravelerId)
    : s.activeJourneyId === "" &&
      s.journeys.every((journey) => journey.archived);
  return (
    activeContextValid &&
    s.journeys.every(
      (j) =>
        ["Trip", "Move", "Transit", "Family"].includes(j.mode) &&
        typeof j.archived === "boolean" &&
        isDate(j.departure) &&
        (j.longTerm === true
          ? j.returnDate === ""
          : isDate(j.returnDate) && j.returnDate >= j.departure) &&
        Array.isArray(j.travelers) &&
        j.travelers.length > 0 &&
        j.travelers.every((id) => s.travelers.some((t) => t.id === id)),
    ) &&
    s.tasks.every(
      (t) =>
        typeof t.done === "boolean" &&
        Number.isFinite(t.offset) &&
        ["High", "Medium", "Low"].includes(t.priority) &&
        (t.dependency === undefined || typeof t.dependency === "string") &&
        (t.note === undefined || typeof t.note === "string"),
    ) &&
    s.documents.every(
      (d) => (d.expires === "" || isDate(d.expires)) && isDate(d.added),
    ) &&
    s.expenses.every(
      (e) =>
        Number.isFinite(e.planned) &&
        e.planned >= 0 &&
        Number.isFinite(e.actual) &&
        e.actual >= 0,
    ) &&
    s.notifications.every((n) => typeof n.read === "boolean")
  );
}
function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}
function isDate(value: string) {
  return (
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    Number.isFinite(Date.parse(`${value}T12:00:00Z`))
  );
}
/** Unknown places remain unresolved; never fabricate an IATA code. */
export function airportCode(city: string): string {
  return findAirport(city)?.code ?? "";
}
export function journeyRequirements(
  rules: Rule[],
  journeyId: string,
  travelerId: string,
  tasks: Task[],
): Requirement[] {
  const links: Record<string, string> = {
    Visa: "t4",
    Passport: "t1",
    Documents: "t5",
    Transit: "t7",
    Entry: "t4",
  };
  return rules.map((rule) => {
    const task = tasks.find(
      (t) =>
        t.id === `${journeyId}-${links[rule.category]}` &&
        t.travelerId === travelerId,
    );
    return {
      ...rule,
      journeyId,
      travelerId,
      status: task?.done
        ? "Example complete"
        : task && !rule.changed
          ? "In progress"
          : "Needs review",
    };
  });
}
export function formatDate(
  value: string,
  options?: Intl.DateTimeFormatOptions,
) {
  return new Date(`${value}T12:00:00`).toLocaleDateString(
    "en-GB",
    options ?? { day: "numeric", month: "short" },
  );
}
export function money(value: number, currency = "USD") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(value);
}
