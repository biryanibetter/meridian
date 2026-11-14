"use client";
import { useEffect, useId, useRef, useState } from "react";
import { Minus, Plus, RotateCcw } from "lucide-react";
import { greatCircle } from "@/lib/geography";
import { useDemo } from "@/lib/store";
import type { Journey } from "@/lib/types";
import { deriveJourneyRoute } from "@/lib/journey-route";
import { loadMapFeatures, type GeographicFeature } from "@/lib/map-data";

type Feature = GeographicFeature;
const wrapDelta = (lon: number) => ((((lon + 180) % 360) + 360) % 360) - 180;
const project = ([lon, lat]: number[], centerLon = 0) => [
  (centerLon + wrapDelta(lon - centerLon) + 180) * 3,
  (90 - lat) * 3,
];
const line = (points: number[][], close = false, centerLon = 0) =>
  points
    .map((p, i) => {
      const [x, y] = project(p, centerLon);
      return `${i ? "L" : "M"}${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(" ") + (close ? "Z" : "");

export function GeographicalMap({
  journey,
  small = false,
  selectedLeg,
  hoveredLeg,
  onSelectLeg,
  onHoverLeg,
  onEditLeg,
}: {
  journey: Journey;
  small?: boolean;
  selectedLeg?: number;
  hoveredLeg?: number;
  onSelectLeg?: (index: number) => void;
  onHoverLeg?: (index: number) => void;
  onEditLeg?: (index: number) => void;
}) {
  const { state } = useDemo();
  const [land, setLand] = useState<Feature[]>([]);
  const [failed, setFailed] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [drag, setDrag] = useState<{ x: number; y: number } | null>(null);
  const [localSelected, setLocalSelected] = useState(-1);
  const [localHovered, setLocalHovered] = useState(-1);
  const selected = selectedLeg ?? localSelected;
  const hovered = hoveredLeg ?? localHovered;
  const select = (index: number) => {
    const next = selected === index ? -1 : index;
    setLocalSelected(next);
    onSelectLeg?.(next);
  };
  const hover = (index: number) => {
    setLocalHovered(index);
    onHoverLeg?.(index);
  };
  const svg = useRef<SVGSVGElement>(null);
  const [viewportWidth, setViewportWidth] = useState(800);
  const id = useId().replace(/:/g, "");
  useEffect(() => {
    if (!svg.current) return;
    const observer = new ResizeObserver(([entry]) =>
      setViewportWidth(Math.max(1, entry.contentRect.width)),
    );
    observer.observe(svg.current);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    let active = true;
    loadMapFeatures()
      .then((features) => {
        if (active) setLand(features);
      })
      .catch(() => {
        if (active) setFailed(true);
      });
    return () => {
      active = false;
    };
  }, []);
  const route = deriveJourneyRoute(journey, state.segments);
  const pairs = route.legs.map(
    (leg) => [leg.from.airport, leg.to.airport] as const,
  );
  const known = route.stops.flatMap((stop) =>
    stop.airport ? [stop.airport] : [],
  );
  const markers = [...new Map(known.map((a) => [a.code, a])).values()];
  const routePoints = pairs.flatMap(([a, b]) =>
    a && b ? greatCircle(a, b, 96) : [],
  );
  const centerLon = (() => {
    const lons = routePoints.map(([lon]) => lon);
    if (!lons.length) return 0;
    const radians = lons.map((lon) => (lon * Math.PI) / 180);
    return (
      (Math.atan2(
        radians.reduce((sum, lon) => sum + Math.sin(lon), 0),
        radians.reduce((sum, lon) => sum + Math.cos(lon), 0),
      ) *
        180) /
      Math.PI
    );
  })();
  const bounds = routePoints.map((point) => project(point, centerLon));
  const minX = bounds.length ? Math.min(...bounds.map((p) => p[0])) - 50 : 0;
  const maxX = bounds.length ? Math.max(...bounds.map((p) => p[0])) + 50 : 1080;
  const centerX = (minX + maxX) / 2;
  const centerY = bounds.length
    ? (Math.min(...bounds.map((p) => p[1])) +
        Math.max(...bounds.map((p) => p[1]))) /
      2
    : 270;
  const width = Math.max(360, maxX - minX) / zoom;
  const height = width * (small ? 0.46 : 0.39);
  const pixel = width / viewportWidth;
  const viewBox = `${centerX - width / 2 + pan.x} ${centerY - height / 2 + pan.y} ${width} ${height}`;
  return (
    <div className={`geo-map ${small ? "geo-small" : ""}`}>
      <div className="geo-toolbar">
        <span>
          Route map <small>Geographical view</small>
        </span>
        <div>
          <button
            aria-label="Zoom in map"
            onClick={() => setZoom((z) => Math.min(4, z * 1.3))}
          >
            <Plus size={15} />
          </button>
          <button
            aria-label="Zoom out map"
            onClick={() => setZoom((z) => Math.max(0.4, z / 1.3))}
          >
            <Minus size={15} />
          </button>
          <button
            aria-label="Reset map view"
            onClick={() => {
              setZoom(1);
              setPan({ x: 0, y: 0 });
            }}
          >
            <RotateCcw size={14} />
          </button>
        </div>
      </div>
      <svg
        ref={svg}
        role="img"
        aria-label={`Geographical route from ${journey.origin} via ${journey.transit || "direct flight"} to ${journey.destination}`}
        viewBox={viewBox}
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          setDrag({ x: e.clientX, y: e.clientY });
        }}
        onPointerMove={(e) => {
          if (drag) {
            const scale = width / e.currentTarget.clientWidth;
            setPan((p) => ({
              x: p.x - (e.clientX - drag.x) * scale,
              y: p.y - (e.clientY - drag.y) * scale,
            }));
            setDrag({ x: e.clientX, y: e.clientY });
          }
        }}
        onPointerUp={() => setDrag(null)}
        onPointerCancel={() => setDrag(null)}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            setLocalSelected(-1);
            setLocalHovered(-1);
            onSelectLeg?.(-1);
            onHoverLeg?.(-1);
          }
        }}
      >
        <defs>
          <pattern id={id} width="90" height="90" patternUnits="userSpaceOnUse">
            <path d="M90 0H0V90" className="geo-grid" fill="none" />
          </pattern>
        </defs>
        <rect
          x="-1080"
          y="-540"
          width="3240"
          height="1620"
          fill={`url(#${id})`}
        />
        <g className="geo-land">
          {land.map((f, i) => {
            const polygons =
              f.geometry.type === "Polygon"
                ? [f.geometry.coordinates as number[][][]]
                : (f.geometry.coordinates as number[][][][]);
            return (
              <path
                key={i}
                d={polygons
                  .map((p) =>
                    p.map((ring) => line(ring, true, centerLon)).join(" "),
                  )
                  .join(" ")}
                fillRule="evenodd"
              />
            );
          })}
        </g>
        {pairs.map(([a, b], i) =>
          a && b ? (
            <path
              key={i}
              className={`geo-flight${selected === i ? " selected" : ""}${hovered === i ? " hovered" : ""}${selected >= 0 && selected !== i ? " dimmed" : ""}`}
              d={line(
                greatCircle(a, b).map(([lon, lat]) => [
                  centerLon + wrapDelta(lon - centerLon),
                  lat,
                ]),
                false,
                centerLon,
              )}
              fill="none"
              tabIndex={0}
              role="button"
              aria-pressed={selected === i}
              aria-label={`${a.city} ${a.code} to ${b.city} ${b.code}`}
              onPointerDown={(e) => e.stopPropagation()}
              onPointerEnter={() => hover(i)}
              onPointerLeave={() => hover(-1)}
              onFocus={() => hover(i)}
              onBlur={() => hover(-1)}
              onClick={() => select(i)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  select(i);
                }
              }}
            >
              <title>
                {a.city} ({a.code}) → {b.city} ({b.code}) · Great-circle route
              </title>
            </path>
          ) : null,
        )}
        {markers.map((a) => {
          const [x, y] = project([a.lon, a.lat], centerLon);
          return (
            <g key={a.code} className="geo-marker">
              <circle className="geo-marker-halo" cx={x} cy={y} r={8 * pixel} />
              <circle cx={x} cy={y} r={3.5 * pixel} />
              <text x={x + 9 * pixel} y={y - 7 * pixel} fontSize={12 * pixel}>
                {a.code}
              </text>
              <text
                className="geo-city"
                x={x + 9 * pixel}
                y={y + 8 * pixel}
                fontSize={11 * pixel}
              >
                {a.city}
              </text>
            </g>
          );
        })}
      </svg>
      {hovered >= 0 && route.legs[hovered] && (
        <div className="geo-route-tooltip" role="tooltip">
          <strong>
            {route.legs[hovered].from.name} ({route.legs[hovered].from.code || "Unresolved"}) → {route.legs[hovered].to.name} ({route.legs[hovered].to.code || "Unresolved"})
          </strong>
          {route.legs[hovered].recorded && (
            <span>
              {route.legs[hovered].recorded!.flight || "Planned flight"}
              {route.legs[hovered].recorded!.depart
                ? ` · ${route.legs[hovered].recorded!.depart}`
                : ""}
              {route.legs[hovered].recorded!.arrive
                ? ` → ${route.legs[hovered].recorded!.arrive}`
                : ""}
              {route.legs[hovered].recorded!.duration
                ? ` · ${route.legs[hovered].recorded!.duration}`
                : ""}
            </span>
          )}
        </div>
      )}
      <div className="geo-segments" aria-label="Flight segments">
        {route.legs.map((leg, i) => {
          const [a, b] = pairs[i];
          return (
            <button
              key={i}
              aria-pressed={selected === i}
              className={`${selected === i ? "selected" : ""}${selected >= 0 && selected !== i ? " dimmed" : ""}`}
              onPointerEnter={() => hover(i)}
              onPointerLeave={() => hover(-1)}
              onFocus={() => hover(i)}
              onBlur={() => hover(-1)}
              onClick={() => select(i)}
            >
              <span>{i + 1}</span> {leg.from.code || leg.from.name} →{" "}
              {leg.to.code || leg.to.name}
              {!a || !b ? " · Location not mapped" : ""}
            </button>
          );
        })}
      </div>
      {selected >= 0 && route.legs[selected] && (
        <section className="geo-leg-detail" aria-label="Selected itinerary leg">
          <div>
            <strong>{route.legs[selected].from.name} → {route.legs[selected].to.name}</strong>
            <span>
              {[
                route.legs[selected].recorded?.flight,
                route.legs[selected].recorded?.depart && `Departs ${route.legs[selected].recorded!.depart}`,
                route.legs[selected].recorded?.arrive && `Arrives ${route.legs[selected].recorded!.arrive}`,
                route.legs[selected].recorded?.duration,
              ].filter(Boolean).join(" · ") || "Flight details not recorded"}
            </span>
          </div>
          {onEditLeg && <button type="button" onClick={() => onEditLeg(selected)}>Edit leg</button>}
          <button type="button" onClick={() => select(-1)}>Clear selection</button>
        </section>
      )}
      <div className="geo-caption">
        <span>
          {failed
            ? "Map data could not load. Check the local assets folder."
            : selected >= 0 && route.legs[selected]
              ? `${route.legs[selected].from.name}${route.legs[selected].from.airport ? `, ${route.legs[selected].from.airport.country}` : ""} → ${route.legs[selected].to.name}${route.legs[selected].to.airport ? `, ${route.legs[selected].to.airport.country}` : ""}${route.legs[selected].recorded ? ` · ${route.legs[selected].recorded!.flight}` : ""}${pairs[selected]?.[0] && pairs[selected]?.[1] ? " · Great-circle route" : " · Route geometry unavailable"}`
              : "Drag to pan · Select a route for details"}
          {route.stops.some((stop) => !stop.airport) &&
            " · Unknown locations are not bridged"}
        </span>
        <small>Natural Earth · Offline</small>
      </div>
    </div>
  );
}
