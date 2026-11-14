import { test } from "node:test";
import assert from "node:assert/strict";
import { profileReadiness, maskedPassportSuffix } from "../lib/profile-readiness";

test("profile readiness counts only locally supplied profile metadata", () => {
  const result = profileReadiness({
    name: "Demo Traveler",
    role: "Parent",
    nationality: "Canada",
    residence: "Canada",
    passportIssuingCountry: "Canada",
    passportType: "Ordinary",
    passportExpiry: "2028-01-01",
  }, "2027-01-01");
  assert.equal(result.completed, 7);
  assert.equal(result.percentage, 100);
  assert.deepEqual(result.missing, []);
  assert.equal(result.expiry, "valid");
});

test("missing details and passport expiry reminders are explicit", () => {
  const incomplete = profileReadiness({ name: "Demo" }, "2027-01-01");
  assert.equal(incomplete.completed, 1);
  assert.equal(incomplete.expiry, "missing");
  assert.deepEqual(incomplete.missing, [
    "Relationship", "Nationality", "Country of residence",
    "Passport issuing country", "Passport type", "Passport expiry",
  ]);
  assert.equal(
    profileReadiness({ passportExpiry: "2027-02-01" }, "2027-01-01").expiry,
    "due-soon",
  );
  assert.equal(
    profileReadiness({ passportExpiry: "2026-12-31" }, "2027-01-01").expiry,
    "expired",
  );
});
test("passport suffix input never preserves a full identifier", () => {
  assert.equal(maskedPassportSuffix("ABCD1234"), null);
  assert.equal(maskedPassportSuffix("ABCDEFG"), null);
  assert.equal(maskedPassportSuffix("12a4"), "••••12A4");
  assert.equal(maskedPassportSuffix("•••• 1234"), "••••1234");
  assert.equal(maskedPassportSuffix(""), "");
});
