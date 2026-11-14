import test from "node:test";
import assert from "node:assert/strict";
import { createMapLoader } from "../lib/map-data";

test("map instances share one bundled dataset load and failed fetches can retry", async () => {
  let calls = 0;
  const loader = createMapLoader(async () => {
    calls++;
    return { ok: true, json: async () => ({ features: [{ geometry: { type: "Polygon", coordinates: [] } }] }) };
  });
  const [a, b] = await Promise.all([loader(), loader()]);
  assert.equal(calls, 1);
  assert.equal(a, b);
  let attempts = 0;
  const retry = createMapLoader(async () => {
    if (++attempts === 1) throw new Error("Unavailable");
    return { ok: true, json: async () => ({ features: [] }) };
  });
  await assert.rejects(retry());
  assert.deepEqual(await retry(), []);
  assert.equal(attempts, 2);
});
