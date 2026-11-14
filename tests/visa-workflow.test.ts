import test from "node:test";
import assert from "node:assert/strict";
import { createSeed } from "../lib/demo";
import * as workflow from "../lib/visa-workflow";
import {
  applicationContextKey,
  personalWorkspaceBase,
} from "../lib/workspace-context";

test("legacy documents survive migration and unlinked passports are suggested, never accepted", () => {
  const seed = createSeed();
  const state = workflow.normalizeVisaState(seed);
  assert.deepEqual(state.documents, seed.documents);
  const app = workflow.activeApplication(state)!;
  const passport = workflow
    .applicationRequirements(state, app)
    .find((r) => r.evidenceTypes.includes("Passport"))!;
  assert.ok(passport);
  assert.equal(workflow.linkedDocuments(state, passport.id).length, 0);
  assert.ok(
    workflow
      .suggestedDocuments(state, app, passport)
      .some((d) => d.category === "Passport"),
  );
  assert.equal(workflow.applicationMetrics(state, app).documentsPrepared, 0);
  assert.deepEqual(workflow.normalizeVisaState(state), state);
});

test("explicit many-to-many evidence links propagate and unlink without removing documents", () => {
  let state = workflow.normalizeVisaState(createSeed());
  const app = workflow.activeApplication(state)!;
  const reqs = workflow
    .applicationRequirements(state, app)
    .filter((r) => !r.procedural);
  const doc = state.documents.find((d) => d.ownerId === app.travelerId)!;
  state = workflow.linkEvidence(state, app.id, reqs[0].id, doc.id);
  state = workflow.linkEvidence(state, app.id, reqs[1].id, doc.id);
  state = workflow.linkEvidence(state, app.id, reqs[0].id, doc.id);
  assert.equal(state.evidenceLinks?.length, 2);
  assert.equal(workflow.linkedDocuments(state, reqs[0].id).length, 1);
  state = workflow.unlinkEvidence(state, reqs[0].id, doc.id);
  assert.equal(workflow.linkedDocuments(state, reqs[0].id).length, 0);
  assert.equal(workflow.linkedDocuments(state, reqs[1].id).length, 1);
  assert.equal(state.documents.length, createSeed().documents.length);
});

test("preparation and assessment are independent from authority verification and submission", () => {
  let state = workflow.normalizeVisaState(createSeed());
  const app = workflow.activeApplication(state)!;
  const req = workflow
    .applicationRequirements(state, app)
    .find((r) => r.evidenceTypes.includes("Passport"))!;
  const doc = workflow.suggestedDocuments(state, app, req)[0];
  state = workflow.linkEvidence(state, app.id, req.id, doc.id);
  state = workflow.assessRequirement(state, app.id, req.id);
  state = workflow.saveDocument(state, {
    ...doc,
    prepared: true,
    reviewed: false,
  });
  assert.equal(
    workflow.documentStatus(state.documents.find((d) => d.id === doc.id)!),
    "Needs review",
  );
  assert.equal(workflow.applicationMetrics(state, app).requirementsAssessed, 1);
  assert.equal(workflow.applicationMetrics(state, app).documentsPrepared, 1);
  assert.equal(
    workflow.applicationMetrics(state, app).submissionRecorded,
    false,
  );
  assert.equal(state.evidenceLinks?.[0].verificationState, "unverified");
});

test("wrong-owner links are rejected and other journeys cannot leak records", () => {
  let state = workflow.normalizeVisaState(createSeed());
  const app = workflow.activeApplication(state)!;
  const req = workflow.applicationRequirements(state, app)[0];
  const foreignDoc = {
    ...state.documents[0],
    id: "foreign",
    ownerId: "another-person",
    journeyId: "elsewhere",
  };
  state = { ...state, documents: [...state.documents, foreignDoc] };
  assert.throws(() =>
    workflow.linkEvidence(state, app.id, req.id, foreignDoc.id),
  );
  assert.ok(
    !workflow
      .suggestedDocuments(state, app, req)
      .some((d) => d.id === "foreign"),
  );
});

test("legacy submission and explicit links migrate once while unrelated metadata survives", () => {
  const seed = createSeed();
  const journey = seed.journeys.find((j) => j.id === seed.activeJourneyId)!;
  const traveler = seed.travelers.find((t) => t.id === seed.activeTravelerId)!;
  const key = applicationContextKey(journey, traveler);
  seed.applicationRecords = {
    [key]: { reference: "GWF-legacy", submissionDate: "2026-11-13" },
  };
  const doc = seed.documents.find(
    (d) => d.ownerId === traveler.id && d.category === "Passport",
  )!;
  doc.requirementId = "uk-study-passport-cas";
  doc.preparationNote = "Existing note";
  let migrated = workflow.normalizeVisaState(seed);
  const app = workflow.activeApplication(migrated)!;
  assert.equal(app.reference, "GWF-legacy");
  assert.equal(migrated.evidenceLinks?.length, 1);
  assert.equal(
    migrated.documents.find((d) => d.id === doc.id)?.preparationNote,
    "Existing note",
  );
  migrated = workflow.unlinkEvidence(
    migrated,
    migrated.evidenceLinks![0].requirementId,
    doc.id,
  );
  assert.equal(workflow.normalizeVisaState(migrated).evidenceLinks?.length, 0);
});

test("changed circumstances invalidate assessment but retain submission history and documents", () => {
  let state = workflow.normalizeVisaState(createSeed());
  const app = workflow.activeApplication(state)!;
  const req = workflow.applicationRequirements(state, app)[0];
  state = workflow.assessRequirement(state, app.id, req.id);
  assert.equal(workflow.applicationMetrics(state, app).requirementsAssessed, 1);
  state = workflow.updateApplication(state, app.id, {
    ruleContext: { courseLevel: "degree" },
  });
  const changedApp = state.applications!.find((a) => a.id === app.id)!;
  assert.equal(
    workflow.applicationMetrics(state, changedApp).requirementsAssessed,
    0,
  );
  assert.equal(state.documents.length, createSeed().documents.length);
  assert.throws(() =>
    workflow.updateApplication(state, app.id, { status: "Submitted" }),
  );
});

test("retired finance links migrate to one current obligation and ambiguous links remain historical", () => {
  const seed = createSeed();
  seed.documents[0].requirementId = "uk-study-india-finances";
  seed.documents[1].requirementId = "uk-study-logistics";
  const state = workflow.normalizeVisaState(seed);
  const app = workflow.activeApplication(state)!;
  assert.ok(
    state.evidenceLinks?.some(
      (l) => l.requirementId === `${app.id}:uk-study-finances`,
    ),
  );
  assert.ok(
    state.evidenceLinks?.some(
      (l) => l.requirementId === `${app.id}:uk-study-logistics`,
    ),
  );
  assert.equal(workflow.applicationMetrics(state, app).documentsTotal, 1);
});

test("historical applications retain original requirements after journey route changes", () => {
  let state = workflow.normalizeVisaState(createSeed());
  const original = workflow.activeApplication(state)!;
  state = workflow.normalizeVisaState({
    ...state,
    journeys: state.journeys.map((j) =>
      j.id === original.journeyId
        ? { ...j, country: "Canada", purpose: "Work" }
        : j,
    ),
  });
  const historic = state.applications!.find((a) => a.id === original.id)!;
  assert.ok(
    workflow
      .applicationRequirements(state, historic)
      .some((r) => r.ruleId === "uk-study-passport"),
  );
  assert.ok(
    !workflow
      .applicationRequirements(state, workflow.activeApplication(state)!)
      .some((r) => r.ruleId === "uk-study-passport"),
  );
});

test("reviewing prepared requirement evidence updates personal review, never authority verification", () => {
  let state = workflow.normalizeVisaState(createSeed());
  const app = workflow.activeApplication(state)!;
  const req = workflow.applicationRequirements(state, app)[0];
  const doc = { ...state.documents[0], prepared: true, reviewed: false };
  state = workflow.saveDocument(state, doc);
  state = workflow.linkEvidence(state, app.id, req.id, doc.id);
  state = workflow.reviewEvidence(state, req.id, doc.id);
  assert.equal(
    workflow.applicationMetrics(state, app).documentsRequiringReview,
    0,
  );
  assert.equal(state.evidenceLinks?.[0].verificationState, "unverified");
});

test("starting a personal workspace archives normalized visa records without leaking them", () => {
  const state = workflow.normalizeVisaState(createSeed());
  const next = personalWorkspaceBase(state, state.activeTravelerId);
  assert.equal(next.applications?.length, 0);
  assert.equal(next.evidenceLinks?.length, 0);
  assert.equal(
    next.workspaceHistory?.[0].state.applications?.length,
    state.applications?.length,
  );
});
