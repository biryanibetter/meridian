import { test } from "node:test";
import assert from "node:assert/strict";
import {
  createVerificationChallenge,
  maskSensitiveIdentifier,
  verifyChallenge,
} from "../lib/verification";
import { identityProviders } from "../lib/identity-providers";

test("local verification issues a random six digit expiring code", () => {
  const first = createVerificationChallenge(1000);
  assert.match(first.code, /^\d{6}$/);
  assert.equal(first.expiresAt, 1000 + 5 * 60 * 1000);
});

test("verification rejects wrong and expired codes and accepts a valid code", () => {
  const challenge = createVerificationChallenge(1000);
  assert.equal(verifyChallenge(challenge, challenge.code === "000000" ? "111111" : "000000", 1001), false);
  assert.equal(verifyChallenge(challenge, challenge.code, challenge.expiresAt), false);
  assert.equal(verifyChallenge(challenge, challenge.code, challenge.expiresAt - 1), true);
});

test("sensitive identifiers accept arbitrary values and only expose a mask", () => {
  assert.equal(maskSensitiveIdentifier("AB 123456"), "••••3456");
  assert.equal(maskSensitiveIdentifier("123"), "");
  assert.equal(maskSensitiveIdentifier("1234").includes("1234"), false);
});

test("identity providers are explicit local-only, jurisdiction-based previews", () => {
  assert.deepEqual(identityProviders.map((provider) => provider.id), [
    "india-aadhaar",
    "india-digilocker",
    "qatar",
  ]);
  assert.ok(identityProviders.every((provider) => provider.connected === false));
  assert.ok(identityProviders.every((provider) => provider.basis === "jurisdiction"));
});
