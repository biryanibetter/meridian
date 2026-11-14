import { findAirport, type Airport } from "./geography";
import type { Journey, Segment } from "./types";

export type RouteStop = {
  name: string;
  code: string;
  airport?: Airport;
};

export type JourneyRouteLeg = {
  index: number;
  from: RouteStop;
  to: RouteStop;
  recorded?: Segment;
};

function resolveStop(name: string, code: string): RouteStop {
  const enteredName = name.trim();
  const airport = enteredName ? findAirport(enteredName) : findAirport(code);
  return {
    name: airport?.city ?? (enteredName || code.trim() || "Unknown stop"),
    code: airport?.code ?? (enteredName ? "" : code.trim()),
    airport,
  };
}

export function deriveJourneyRoute(
  journey: Journey,
  segments: Segment[] = [],
): { stops: RouteStop[]; legs: JourneyRouteLeg[] } {
  const transit = journey.transit
    .split(/[;,]/)
    .map((value) => value.trim())
    .filter(Boolean)
    .map((value) => resolveStop(value, ""));
  const stops = [
    resolveStop(journey.origin, journey.originCode),
    ...transit,
    resolveStop(journey.destination, journey.destinationCode),
  ];
  const routeSegments = segments.filter(
    (segment) => segment.journeyId === journey.id,
  );
  const used = new Set<string>();
  const legs = stops.slice(0, -1).map((from, index) => {
    const to = stops[index + 1];
    const matching =
      from.code && to.code
        ? routeSegments.find(
            (segment) =>
              !used.has(segment.id) &&
              (findAirport(segment.fromCode)?.code ??
                segment.fromCode.trim().toUpperCase()) === from.code &&
              (findAirport(segment.toCode)?.code ??
                segment.toCode.trim().toUpperCase()) === to.code,
          )
        : undefined;
    if (matching) used.add(matching.id);
    return { index, from, to, recorded: matching };
  });
  return { stops, legs };
}
