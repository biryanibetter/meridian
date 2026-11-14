import { test } from "node:test";
import assert from "node:assert/strict";
import { deriveJourneyRoute } from "../lib/journey-route";
import type { Journey, Segment } from "../lib/types";

const journey: Journey = {
  id: "j1",
  name: "Test",
  mode: "Trip",
  origin: "Mumbai",
  originCode: "BOM",
  destination: "London",
  destinationCode: "LHR",
  country: "UK",
  transit: "Doha",
  departure: "2027-01-01",
  returnDate: "2027-01-10",
  purpose: "Visit",
  travelers: [],
  archived: false,
  color: "blue",
};
const segment = (
  from: string,
  to: string,
  overrides: Partial<Segment> = {},
): Segment => ({
  id: `${from}-${to}`,
  journeyId: journey.id,
  from,
  to,
  fromCode: from,
  toCode: to,
  depart: "09:00",
  arrive: "14:00",
  carrier: "Example Air",
  flight: "EX 1",
  terminal: "T1",
  duration: "5h",
  ...overrides,
});

test("route follows journey origin, ordered transit, and destination instead of stale segment endpoints", () => {
  const route = deriveJourneyRoute(journey, [
    segment("BOM", "DOH", {
      id: "metadata",
      from: "Old Mumbai label",
      to: "Old Doha label",
      flight: "EX 42",
    }),
    segment("OLD", "LHR"),
  ]);
  assert.deepEqual(
    route.legs.map(({ from, to }) => [from.code, to.code]),
    [
      ["BOM", "DOH"],
      ["DOH", "LHR"],
    ],
  );
  assert.equal(route.legs[0].recorded?.flight, "EX 42");
  assert.equal(route.legs[1].recorded, undefined);
});

test("edited location name wins over a stale journey airport code", () => {
  const route = deriveJourneyRoute(
    { ...journey, origin: "Uncatalogued City", originCode: "BOM" },
    [],
  );
  assert.equal(route.stops[0].name, "Uncatalogued City");
  assert.equal(route.stops[0].airport, undefined);
  assert.equal(route.stops[0].code, "");
});

test("country-only locations remain explicit without inventing airport geometry", () => {
  const route = deriveJourneyRoute(
    { ...journey, origin: "Iceland", originCode: "" },
    [],
  );
  assert.equal(route.stops[0].name, "Iceland");
  assert.equal(route.stops[0].airport, undefined);
  assert.equal(route.legs[0].from.airport, undefined);
});

test("changed transit stops do not inherit unrelated recorded leg details", () => {
  const route = deriveJourneyRoute({ ...journey, transit: "Dubai" }, [
    segment("BOM", "DOH", { flight: "OLD 1" }),
    segment("DOH", "LHR", { flight: "OLD 2" }),
  ]);
  assert.equal(route.legs[0].to.code, "DXB");
  assert.equal(route.legs[0].recorded, undefined);
  assert.equal(route.legs[1].recorded, undefined);
});

test("unknown transit stops remain explicit and prevent route bridging", () => {
  const route = deriveJourneyRoute(
    { ...journey, transit: "Doha, Unknown Airport, Singapore" },
    [],
  );
  assert.equal(route.stops.length, 5);
  assert.equal(route.legs.length, 4);
  assert.deepEqual(
    route.legs.map((leg) => Boolean(leg.from.airport && leg.to.airport)),
    [true, false, false, true],
  );
});

test("airport registry resolves offline locations with country metadata", async () => {
  const { findAirport } = await import("../lib/geography");
  assert.equal(findAirport("SFO")?.city, "San Francisco");
  assert.equal(findAirport("SFO")?.country, "United States");
});

test("great-circle geometry handles antimeridian without a world-spanning fit", async () => {
  const { greatCircle } = await import("../lib/geography");
  const points = greatCircle(
    {
      code: "JFK",
      city: "New York",
      country: "United States",
      lat: 40.6,
      lon: -73.8,
    },
    { code: "HND", city: "Tokyo", country: "Japan", lat: 35.5, lon: 139.8 },
  );
  const wrapped = points.map(([lon]) => (lon < 0 ? lon + 360 : lon));
  assert.ok(Math.max(...wrapped) - Math.min(...wrapped) < 180);
});
