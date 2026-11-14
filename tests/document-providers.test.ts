import test from "node:test";
import assert from "node:assert/strict";
import { documentProviders } from "../lib/document-providers";

test("document retrieval adapters never fabricate a connected response or government document", async () => {
  for (const provider of documentProviders) {
    assert.equal(provider.connected, false);
    assert.deepEqual(await provider.retrieveMetadata(), {
      status: "not-connected", records: [], message: "Authorized access and explicit consent are required.",
    });
  }
});
