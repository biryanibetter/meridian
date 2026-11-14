import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

test("submission contains no development artifacts or redundant fallback copies", { skip: process.env.MERIDIAN_TEST_USB !== "1" ? "Optional USB archive validation; set MERIDIAN_TEST_USB=1 after packaging" : false }, () => {
  const root = path.resolve("MERIDIAN_USB_SUBMISSION");
  const forbidden: string[] = [];
  function visit(dir: string) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const file = path.join(dir, entry.name);
      if (/^(AGENTS?\.md|\.env(?:\..*)?|\.git|\.github|screenshots|test-results|coverage|backup|RELEASE_VALIDATION\.txt)$/i.test(entry.name))
        forbidden.push(path.relative(root, file));
      if (entry.isDirectory()) visit(file);
    }
  }
  visit(root);
  assert.deepEqual(forbidden, []);
  for (const file of ["START_MERIDIAN.bat", "README_FIRST.txt", "OFFLINE_PREVIEW.html", "runtime/node.exe", "application/index.html", "source/package.json"])
    assert.ok(fs.existsSync(path.join(root, file)), file);
});
