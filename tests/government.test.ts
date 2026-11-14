import assert from "node:assert/strict";
import test from "node:test";
import { createSeed } from "../lib/demo";
import {
  deriveGovernmentCase,
  recordGovernmentAppointment,
  setGovernmentAppointmentCompleted,
  recordGovernmentDeadline,
  setGovernmentDeadlineCompleted,
  safeExternalHttpUrl,
} from "../lib/government";
import { activeApplication, normalizeVisaState } from "../lib/visa-workflow";

test("government case derives a conditional evidence graph from the selected application", () => {
  const state = normalizeVisaState(createSeed());
  const app = activeApplication(state)!;
  const result = deriveGovernmentCase(state, app);

  assert.ok(result.steps.length > 0);
  assert.ok(result.steps.some((step) => step.source?.url));
  assert.ok(result.steps.some((step) => step.dependencies.length > 0));
  assert.ok(result.steps.some((step) => step.applicability === "unknown"));
  assert.ok(result.steps.every((step) => String(step.status) !== "officially-verified"));
  assert.equal(result.progress.completed, 0);
  assert.equal(result.progress.total, result.steps.filter((step) =>
    ["required", "conditional", "unknown"].includes(step.applicability),
  ).length);
});

test("unsupported destinations stay confirmation-needed and do not inherit UK procedures", () => {
  const state = normalizeVisaState(createSeed());
  const original = activeApplication(state)!;
  const unsupported = {
    ...original,
    id: "unsupported-case",
    destination: "Atlantis",
    visaCategory: "Route confirmation needed",
    contextSnapshot: {
      nationality: "India",
      residence: "India",
      destination: "Atlantis",
      transit: "",
      purpose: "Work",
      departure: "2027-08-28",
    },
  };
  const result = deriveGovernmentCase(
    { ...state, applications: [...(state.applications ?? []), unsupported] },
    unsupported,
  );

  assert.ok(result.steps.length > 0);
  assert.ok(result.steps.every((step) => step.applicability === "unknown"));
  assert.ok(result.steps.every((step) => step.source === null));
  assert.ok(!result.steps.some((step) => /student visa|CAS|UKVI/i.test(step.title)));
});

test("only ready, unexpired linked evidence counts; assessment and review are not authority checks", () => {
  const state = normalizeVisaState(createSeed());
  const app = activeApplication(state)!;
  const requirement = deriveGovernmentCase(state, app).steps.find((step) =>
    step.evidenceRequirementId,
  )!;
  const doc = state.documents.find((item) => item.ownerId === app.travelerId)!;
  const readyState = {
    ...state,
    documents: state.documents.map((item) =>
      item.id === doc.id
        ? { ...item, prepared: true, reviewed: true, preparationStatus: "Ready" as const }
        : item,
    ),
    evidenceLinks: [{
      id: "link",
      applicationId: app.id,
      requirementId: requirement.evidenceRequirementId!,
      documentId: doc.id,
      confirmedAt: "2026-11-14",
      reviewedAt: "2026-11-14",
      verificationState: "unverified" as const,
    }],
  };
  const prepared = deriveGovernmentCase(readyState, app);
  assert.equal(prepared.progress.completed, 1);
  assert.equal(
    prepared.steps.find((step) => step.id === requirement.id)?.status,
    "prepared",
  );
  assert.notEqual(String(prepared.status), "officially-verified");
  assert.ok(prepared.steps.every((step) => String(step.status) !== "officially-verified"));
});

test("UK Student procedure connects admission, CAS, preparation, submission, identity and decision", () => {
  const state = normalizeVisaState(createSeed());
  const app = activeApplication(state)!;
  const result = deriveGovernmentCase(state, app);
  const admission = result.steps.find((step) => step.ruleId === "uk-study-admission");
  const cas = result.steps.find((step) => step.ruleId === "uk-study-cas");
  const preparation = result.steps.find((step) => step.kind === "procedure-preparation");
  const submission = result.steps.find((step) => step.kind === "procedure-submission");
  const identity = result.steps.find((step) => step.kind === "procedure-identity");
  const decision = result.steps.find((step) => step.kind === "procedure-decision");

  assert.ok(admission && cas && preparation && submission && identity && decision);
  assert.equal(result.authority.name, "UK Visas and Immigration (UKVI)");
  assert.equal(result.authority.confirmed, false);
  assert.equal(result.nextAction?.id, admission.id);
  assert.ok(result.steps.some((step) => step.source?.lastChecked));
  assert.deepEqual(cas.dependencies, [admission.id]);
  assert.deepEqual(preparation.dependencies, [cas.id]);
  assert.deepEqual(submission.dependencies, [preparation.id]);
  assert.deepEqual(identity.dependencies, [submission.id]);
  assert.deepEqual(decision.dependencies, [identity.id]);
  assert.equal(identity.applicability, "unknown");
  assert.equal(result.steps.every((step) => step.status !== "prepared"), true);
});

test("a generic completed journey task cannot satisfy a requirement or unknown applicability", () => {
  const state = normalizeVisaState(createSeed());
  const app = activeApplication(state)!;
  const derived = deriveGovernmentCase(state, app);
  const passport = derived.steps.find((step) => step.ruleId === "uk-study-passport")!;
  const unknown = derived.steps.find((step) => step.applicability === "unknown")!;
  const tasksDone = {
    ...state,
    tasks: state.tasks.map((task) => ({ ...task, done: true })),
  };
  const after = deriveGovernmentCase(tasksDone, app);

  assert.notEqual(after.steps.find((step) => step.id === passport.id)?.status, "prepared");
  assert.notEqual(after.steps.find((step) => step.id === unknown.id)?.status, "prepared");
  assert.equal(after.progress.completed, 0);
});

test("appointment and deadline records persist on the application and completion emits activity", () => {
  let state = normalizeVisaState(createSeed());
  const app = activeApplication(state)!;
  state = recordGovernmentAppointment(state, app.id, {
    title: "Biometrics",
    scheduledAt: "2027-04-12T10:00",
    location: "Service centre",
  });
  const appointment = (state.applications!.find((item) => item.id === app.id) as typeof app & {
    appointments?: { id: string; title: string; scheduledAt: string; location?: string; completed: boolean }[];
  }).appointments![0];
  state = setGovernmentAppointmentCompleted(state, app.id, appointment.id, true);

  state = recordGovernmentDeadline(state, app.id, {
    title: "Submit application",
    date: "2027-04-20",
  });
  const deadline = (state.applications!.find((item) => item.id === app.id) as typeof app & {
    deadlines?: { id: string; title: string; date: string; completed: boolean }[];
  }).deadlines![0];
  state = setGovernmentDeadlineCompleted(state, app.id, deadline.id, true);

  const current = state.applications!.find((item) => item.id === app.id)! as typeof app & {
    appointments?: { id: string; completed: boolean }[];
    deadlines?: { id: string; completed: boolean }[];
  };
  assert.equal(current.appointments?.[0].completed, true);
  assert.equal(current.deadlines?.[0].completed, true);
  assert.ok(state.applicationEvents?.some((event) => event.type === "appointment-completed"));
  assert.ok(state.applicationEvents?.some((event) => event.type === "deadline-completed"));
});

test("expense reference URLs are limited to HTTP(S) and graph next action resolves prerequisites", () => {
  assert.equal(safeExternalHttpUrl("javascript:alert(1)"), undefined);
  assert.equal(safeExternalHttpUrl("data:text/html,hello"), undefined);
  assert.equal(safeExternalHttpUrl("file:///etc/passwd"), undefined);
  assert.equal(safeExternalHttpUrl("https://example.gov/fees"), "https://example.gov/fees");

  const state = normalizeVisaState(createSeed());
  const app = activeApplication(state)!;
  const unsafeState = {
    ...state,
    expenses: [
      ...state.expenses,
      {
        id: "unsafe-cost",
        applicationId: app.id,
        journeyId: app.journeyId,
        title: "Cost reference",
        category: "Government",
        planned: 10,
        actual: 0,
        currency: "GBP",
        certainty: "estimated" as const,
        sourceUrl: "javascript:alert(1)",
      },
    ],
  };
  const result = deriveGovernmentCase(unsafeState, app);
  assert.equal(
    result.costs.find((cost) => cost.id === "unsafe-cost")?.sourceUrl,
    undefined,
  );
  const prerequisite = result.steps.find((step) => step.id === result.nextAction?.id);
  assert.ok(prerequisite);
  assert.equal(prerequisite?.ruleId, "uk-study-admission");
});
