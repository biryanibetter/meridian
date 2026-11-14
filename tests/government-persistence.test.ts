import test from "node:test";
import assert from "node:assert/strict";
import { createSeed } from "../lib/demo";
import { normalizeVisaState } from "../lib/visa-workflow";
import { isDemoState } from "../lib/planning";

test("old saved workspace and additive appointment/deadline records remain readable", () => {
  const state = normalizeVisaState(createSeed());
  assert.equal(isDemoState(state), true);
  state.applications![0].appointments = [{ id: "a", title: "User plan", scheduledAt: "2026-12-01T10:00", location: "To confirm", completed: false }];
  state.applications![0].deadlines = [{ id: "d", title: "Evidence", date: "2026-12-01", completed: false }];
  assert.equal(isDemoState(JSON.parse(JSON.stringify(state))), true);
});
test("malformed local appointments cannot crash the case workspace on restore", () => {
  const state = normalizeVisaState(createSeed());
  const malformed = JSON.parse(JSON.stringify(state));
  malformed.applications[0].appointments = { not: "an array" };
  assert.equal(isDemoState(malformed), false);
});
test("unknown expense certainty is rejected without rewriting saved storage", () => {
  const state = createSeed();
  const malformed = JSON.parse(JSON.stringify(state));
  malformed.expenses[0].certainty = "official";
  assert.equal(isDemoState(malformed), false);
});
test("appointment timestamps and deadline dates must be parseable", () => {
  const state = normalizeVisaState(createSeed());
  state.applications![0].appointments = [{ id: "a", title: "Appointment", scheduledAt: "tomorrow-ish", location: "", completed: false }];
  assert.equal(isDemoState(state), false);
});
test("optional profile metadata is validated before import", () => {
  const state = JSON.parse(JSON.stringify(createSeed()));
  state.travelers[0].passportType = 42;
  assert.equal(isDemoState(state), false);
});
