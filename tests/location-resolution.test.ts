import { test } from "node:test";
import assert from "node:assert/strict";
import { airportCode } from "../lib/planning";

test("airport codes are resolved from the offline registry, never invented", () => {
  assert.equal(airportCode("Bangkok"), "BKK");
  assert.equal(airportCode("LHR"), "LHR");
  assert.equal(airportCode("Not a real place"), "");
});
