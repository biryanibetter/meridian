import test from "node:test";
import assert from "node:assert/strict";
import { consularEntries } from "../lib/consular";

test("India to UK context shows an official mission reference, not fabricated contact details", () => {
  const records = consularEntries("India", "India", "United Kingdom");
  assert.ok(records.some(record => record.website === "https://www.gov.uk/world/organisations/british-high-commission-new-delhi"));
  assert.ok(records.every(record => record.phone === null && record.email === null));
});
test("unsupported missions remain unconfirmed instead of using an unrelated embassy", () => {
  const records = consularEntries("Canada", "Canada", "Japan");
  assert.ok(!records.some(record => record.name.includes("New Delhi")));
});
