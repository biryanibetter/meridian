import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import {
  greatCircle,
  findAirport,
} from "../lib/geography";

test("great-circle interpolation preserves exact airport endpoints and finite coordinates", () => {
  const a = findAirport("BOM")!;
  const b = findAirport("DOH")!;
  assert.ok(a && b);
  const points = greatCircle(a, b);
  assert.ok(Math.abs(points[0][0] - a.lon) < 0.00001);
  assert.ok(Math.abs(points.at(-1)![1] - b.lat) < 0.00001);
  assert.ok(points.every((p) => p.every(Number.isFinite)));
  assert.equal(findAirport("UNKNOWN AIRPORT"), undefined);
});
test("offline map contains actual locally bundled Natural Earth polygons", () => {
  const data = JSON.parse(
    fs.readFileSync("public/assets/countries.geojson", "utf8"),
  );
  assert.ok(data.features.length > 100);
  assert.ok(
    data.features.every((f: { geometry: { type: string } }) =>
      /Polygon/.test(f.geometry.type),
    ),
  );
});
test(
  "portable Windows export provides the flat segment filename requested by Next client navigation",
  { skip: !fs.existsSync("MERIDIAN_USB_SUBMISSION/application") },
  () => {
    assert.ok(
      fs.existsSync(
        "MERIDIAN_USB_SUBMISSION/application/app/travel/__next.app.$oc$section.__PAGE__.txt",
      ),
    );
  },
);
test("generated direct-file fallback JavaScript parses after map embedding", { skip: !fs.existsSync("MERIDIAN_USB_SUBMISSION/OFFLINE_PREVIEW.html") }, () => {
  const html = fs.readFileSync("MERIDIAN_USB_SUBMISSION/OFFLINE_PREVIEW.html", "utf8");
  const script = html.match(/<script>([\s\S]*?)<\/script>/)?.[1];
  assert.ok(script);
  assert.doesNotThrow(() => new vm.Script(script));
  assert.doesNotMatch(html, /<script[^>]+src=|<link[^>]+href=["']https?:/i);
});
