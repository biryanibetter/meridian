import test from "node:test";
import assert from "node:assert/strict";
import { createSeed } from "../lib/demo";
import { assistantReply } from "../lib/assistant";

test("a greeting receives a greeting, not a readiness report", () => {
  const answer = assistantReply("hi", createSeed());
  assert.equal(answer.intent, "greeting");
  assert.match(answer.text, /hello/i);
  assert.doesNotMatch(answer.text, /%|departure|next steps/i);
});
test("unknown questions ask for clarification instead of summarizing", () => {
  assert.equal(assistantReply("quantum banana", createSeed()).intent, "unknown");
});
test("tasks come only from the active journey", () => {
  const state = createSeed();
  state.tasks = [{ ...state.tasks[0], title: "Collect admission letter", done: false }];
  const answer = assistantReply("outstanding tasks", state);
  assert.equal(answer.intent, "tasks");
  assert.match(answer.text, /Collect admission letter/);
  state.tasks[0].journeyId = "another-journey";
  assert.doesNotMatch(assistantReply("outstanding tasks", state).text, /Collect admission letter/);
});
test("visa and transit questions point to their appropriate workspace", () => {
  assert.equal(assistantReply("Do I need a visa?", createSeed()).links[0].href, "/app/entry");
  assert.match(assistantReply("Do I need a visa?", createSeed()).text, /financial evidence/i);
  assert.equal(assistantReply("What about Doha transit?", createSeed()).intent, "transit");
});
test("changes require explicit editing, not invented successful updates", () => {
  const state = createSeed();
  const snapshot = JSON.stringify(state);
  assert.equal(assistantReply("Change my departure date", state).intent, "changes");
  assert.equal(JSON.stringify(state), snapshot);
});
