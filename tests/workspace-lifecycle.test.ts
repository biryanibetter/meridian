import test from "node:test";
import assert from "node:assert/strict";
import { createSeed } from "../lib/demo";
import { personalWorkspaceBase, applicationContextKey, requirementContext } from "../lib/workspace-context";
import { invalidateTaskDescendants, reconcileGeneratedTasks } from "../lib/task-dependencies";

test("starting another personal workspace preserves the previous workspace as a restorable snapshot", () => {
  const state = createSeed();
  state.journeys[0].id = "journey-personal";
  const original = JSON.stringify(state);
  const next = personalWorkspaceBase(state, state.travelers[0].id);
  assert.equal(next.journeys.length, 0);
  assert.equal(next.workspaceHistory?.length, 1);
  assert.equal(next.workspaceHistory?.[0].state.journeys[0].id, "journey-personal");
  assert.equal(JSON.stringify(state), original);
});
test("application context changes when purpose, nationality or dates change", () => {
  const state = createSeed(), j = state.journeys[0], t = state.travelers[0];
  const key = applicationContextKey(j, t);
  assert.notEqual(key, applicationContextKey({ ...j, purpose: "Work" }, t));
  assert.notEqual(key, applicationContextKey({ ...j, departure: "2028-01-01" }, t));
  assert.notEqual(key, applicationContextKey(j, { ...t, nationality: "Canada" }));
});
test("requirement context uses nationality, not issuing country, and includes collected identity context", () => {
  const state = createSeed();
  const context = requirementContext(state.journeys[0], { ...state.travelers[0], nationality: "Canada", passportIssuingCountry: "India", passportType: "Diplomatic", dateOfBirth: "2010-01-01", residencePermitMasked: "••••1234" });
  assert.equal(context.nationality, "Canada");
  assert.equal(context.passportType, "Diplomatic");
  assert.equal(context.dateOfBirth, "2010-01-01");
  assert.match(context.residencePermitStatus ?? "", /recorded/i);
});
test("reopening a prerequisite invalidates completed descendants but not another journey", () => {
  const state = createSeed();
  const first = state.tasks[0];
  const tasks = [
    { ...first, id: "a", done: true },
    { ...first, id: "b", dependency: "a", done: true },
    { ...first, id: "c", dependency: "b", done: true },
    { ...first, id: "d", journeyId: "other", done: true },
  ];
  const next = invalidateTaskDescendants(tasks, "a");
  assert.deepEqual(next.map(t => t.done), [false, false, false, true]);
  assert.ok(tasks.every(t => t.done));
});
test("regenerated and removed prerequisites reopen custom descendants without leaving dangling links", () => {
  const first = createSeed().tasks[0];
  const tasks = [
    { ...first, id: "generated", done: true },
    { ...first, id: "custom", dependency: "generated", done: true },
    { ...first, id: "transit", done: true },
    { ...first, id: "custom-transit", dependency: "transit", done: true },
  ];
  const next = reconcileGeneratedTasks(tasks, ["generated", "transit"], [{ ...tasks[0], done: false }]);
  assert.equal(next.find(task => task.id === "custom")?.done, false);
  assert.equal(next.find(task => task.id === "custom-transit")?.done, false);
  assert.equal(next.find(task => task.id === "custom-transit")?.dependency, undefined);
});
