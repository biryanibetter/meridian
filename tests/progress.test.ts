import test from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { progressPercent } from "../lib/progress";
import { VerificationProgressRing } from "../components/verification-progress-ring";

test("empty, invalid and partial work cannot round to locally complete", () => {
  assert.equal(progressPercent(0, 0), 0);
  assert.equal(progressPercent(999, 1000), 99);
  assert.equal(progressPercent(3, 3), 100);
  assert.equal(progressPercent(-1, 5), 0);
  assert.equal(progressPercent(NaN, 5), 0);
});
test("progress labels separate local completion from official verification", () => {
  const html = renderToStaticMarkup(createElement(VerificationProgressRing, {
    completed: 2, total: 2, size: 32, status: "prepared", label: "Document readiness",
  }));
  assert.match(html, /Locally completed/);
  assert.match(html, /Document readiness/);
  assert.match(html, /Official verification unavailable/);
  assert.match(html, /<path/);
});
test("untrusted local status cannot claim authorized verification", () => {
  const html = renderToStaticMarkup(createElement(VerificationProgressRing, {
    completed: 1, total: 1, status: "officially-verified", label: "Imported local record",
  }));
  assert.doesNotMatch(html, /officially verified/i);
  assert.match(html, /Official confirmation required/);
});
