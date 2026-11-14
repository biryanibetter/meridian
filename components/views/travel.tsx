"use client";
import Link from "next/link";
import { useState, type FormEvent } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  Clock3,
  Coffee,
  Download,
  FileText,
  Headphones,
  House,
  MapPin,
  Pencil,
  Plane,
  Plus,
  Shield,
  TrainFront,
  TriangleAlert,
  Wifi,
} from "lucide-react";
import { useDemo } from "@/lib/store";
import { formatDate } from "@/lib/planning";
import type { Segment } from "@/lib/types";
import { deriveJourneyRoute } from "@/lib/journey-route";
import { GeographicalMap } from "../geographical-map";
import {
  Badge,
  Empty,
  ExportButton,
  PageHeading,
  Panel,
  TextLink,
} from "../common";
import { Button } from "../ui/button";
import { Modal } from "../ui/dialog";
import { buildPlannedSegments } from "@/lib/journey-state";
function useJourney() {
  const store = useDemo();
  return {
    ...store,
    j:
      store.state.journeys.find((j) => j.id === store.state.activeJourneyId) ??
      store.state.journeys[0],
  };
}
export function TravelView() {
  const { state, update, toast, j } = useJourney();
  const [edit, setEdit] = useState<Segment | null>(null);
  const [selectedLeg, setSelectedLeg] = useState(-1);
  const [hoveredLeg, setHoveredLeg] = useState(-1);
  const segments = state.segments.filter((s) => s.journeyId === j.id);
  const route = deriveJourneyRoute(j, segments);
  const plannedSegments = buildPlannedSegments(j, segments);
  const itineraryLegs = route.legs.map((leg, index) => ({
    ...leg,
    recorded: plannedSegments[index],
  }));
  function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!edit) return;
    const f = new FormData(e.currentTarget);
    const next = {
      ...edit,
      depart: String(f.get("depart")),
      arrive: String(f.get("arrive")),
      carrier: String(f.get("carrier")),
      flight: String(f.get("flight")),
      duration: String(f.get("duration")),
      terminal: String(f.get("terminal")),
      gate: String(f.get("gate")),
      seat: String(f.get("seat")),
      status: String(f.get("status")) as Segment["status"],
    };
    update((s) => ({
      ...s,
      segments: s.segments.some((item) => item.id === edit.id)
        ? s.segments.map((x) => (x.id === edit.id ? next : x))
        : [...s.segments, next],
    }));
    setEdit(null);
    toast("Itinerary updated.");
  }
  function addLeg() {
    const target = route.legs.find((leg) => !leg.recorded) ?? route.legs[0];
    if (!target) return;
    const segment: Segment = {
      id: `${j.id}-s${state.segments.filter((item) => item.journeyId === j.id).length + 1}`,
      journeyId: j.id,
      from: target.from.name,
      to: target.to.name,
      fromCode: target.from.code,
      toCode: target.to.code,
      depart: "",
      arrive: "",
      carrier: "",
      flight: "",
      terminal: "",
      duration: "",
      status: "Planned",
    };
    update((s) => ({ ...s, segments: [...s.segments, segment] }));
    toast("Travel leg added. Add its details below.");
  }
  return (
    <>
      <PageHeading
        title="Travel"
        description={`${j.origin} to ${j.destination} · Itinerary and route`}
      >
        <Button onClick={addLeg}>
          <Plus size={14} />
          Add travel leg
        </Button>
      </PageHeading>
      <Panel>
        <GeographicalMap
          journey={j}
          selectedLeg={selectedLeg}
          hoveredLeg={hoveredLeg}
          onSelectLeg={setSelectedLeg}
          onHoverLeg={setHoveredLeg}
          onEditLeg={(index) => {
            const recorded = plannedSegments[index];
            if (recorded) setEdit(recorded);
          }}
        />
      </Panel>
      <div className="section-heading">
        <div>
          <h2>Your itinerary</h2>
          <p>
            {formatDate(j.departure, {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}{" "}
            · Local times
          </p>
        </div>
        <Badge>Booking not connected</Badge>
      </div>
      <div className="itinerary-layout">
        <div>
          {itineraryLegs.map((leg, i) => {
            const s = leg.recorded;
            const routeIndex = leg.index;
            return (
              <div
                key={s.id}
                onMouseEnter={() => setHoveredLeg(routeIndex)}
                onMouseLeave={() => setHoveredLeg(-1)}
                onFocus={() => setHoveredLeg(routeIndex)}
                onBlur={() => setHoveredLeg(-1)}
                onClick={() => setSelectedLeg(routeIndex)}
                tabIndex={0}
                role="group"
                aria-label={`Itinerary leg ${routeIndex + 1}: ${leg.from.name} to ${leg.to.name}`}
                onKeyDown={(event) => {
                  if (event.target === event.currentTarget && (event.key === "Enter" || event.key === " ")) {
                    event.preventDefault();
                    setSelectedLeg(routeIndex);
                  }
                }}
              >
                <Panel
                  className={`flight-card boarding-pass${selectedLeg === routeIndex ? " selected" : ""}${hoveredLeg === routeIndex ? " hovered" : ""}${selectedLeg >= 0 && selectedLeg !== routeIndex ? " dimmed" : ""}`}
                >
                  <div className="between">
                    <span>
                      <Plane size={16} />
                      {s.carrier || "Planned flight"}
                    </span>
                    <Badge tone={s.status === "Booked" ? "green" : "neutral"}>
                      {s.flight || s.status || "Planned"}
                    </Badge>
                  </div>
                  <div className="flight-route">
                    <div>
                      <h2 className="mono">{s.depart || "—:—"}</h2>
                      <strong>{leg.from.code || "—"}</strong>
                      <p>{leg.from.name}</p>
                    </div>
                    <div>
                      <small>{s.duration || "Duration not recorded"}</small>
                      <div className="flight-rule">
                        <span />
                        <Plane size={15} />
                        <span />
                      </div>
                      <small>{s.terminal || "Terminal not recorded"}</small>
                    </div>
                    <div>
                      <h2 className="mono">{s.arrive || "—:—"}</h2>
                      <strong>{leg.to.code || "—"}</strong>
                      <p>{leg.to.name}</p>
                    </div>
                  </div>
                  <div className="flight-footer">
                    <span>
                      {formatDate(j.departure, {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </span>
                    <span>
                      Gate <b>{s.gate || "—"}</b>
                    </span>
                    <span>
                      Seat <b>{s.seat || "—"}</b>
                    </span>
                    <span className="mono">
                      REF{" "}
                      {state.bookings.find(
                        (b) => b.journeyId === j.id && b.category === "Flight",
                      )?.reference ?? "Not booked"}
                    </span>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setEdit(s)}
                    >
                      <Pencil size={13} />
                      Edit leg
                    </Button>
                  </div>
                </Panel>
                {i < itineraryLegs.length - 1 && (
                  <div className="connection-row">
                    <Clock3 size={14} />
                    Connection in {leg.to.name}{" "}
                    <Link href="/app/layovers">
                      Explore your layover
                      <ArrowRight size={12} />
                    </Link>
                  </div>
                )}
              </div>
            );
          })}
          {!itineraryLegs.length && (
            <Empty
              title="Your route is ready for details."
              description="Add a travel leg to build your itinerary."
            />
          )}
        </div>
        <aside>
          <Panel title="Journey details">
            <div className="context-details">
              <span>
                Departure<strong>{formatDate(j.departure)}</strong>
              </span>
              <span>
                Return / end
                <strong>
                  {j.longTerm ? "Long-term move" : formatDate(j.returnDate)}
                </strong>
              </span>
              <span>
                Travelers<strong>{j.travelers.length}</strong>
              </span>
              <span>
                Reference
                <strong className="mono">
                  {state.bookings.find((b) => b.journeyId === j.id)
                    ?.reference ?? "Not booked"}
                </strong>
              </span>
            </div>
          </Panel>
          <div className="quiet-note">
            <Plane size={20} />
            <h3>Travel-day checklist</h3>
            <p>Documents and airport preparation.</p>
            <TextLink href="/app/travel-day">Open travel day</TextLink>
          </div>
        </aside>
      </div>
      <Modal
        open={!!edit}
        onOpenChange={(v) => !v && setEdit(null)}
        title="Edit travel leg"
      >
        {edit && (
          <form onSubmit={save}>
            <div className="form-grid">
              {[
                ["depart", "Departure time", edit.depart],
                ["arrive", "Arrival time", edit.arrive],
                ["carrier", "Airline", edit.carrier],
                ["flight", "Flight / service reference", edit.flight],
                ["duration", "Duration", edit.duration],
                ["terminal", "Terminal", edit.terminal],
                ["gate", "Gate", edit.gate ?? ""],
                ["seat", "Seat", edit.seat ?? ""],
              ].map(([name, label, value]) => (
                <label key={name}>
                  {label}
                  <input
                    name={name}
                    defaultValue={value}
                    type={
                      name === "depart" || name === "arrive" ? "time" : "text"
                    }
                  />
                </label>
              ))}
              <label>
                Status
                <select name="status" defaultValue={edit.status ?? "Planned"}>
                  <option>Planned</option>
                  <option>Booked</option>
                  <option>Checked in</option>
                  <option>Completed</option>
                  <option>Cancelled</option>
                </select>
              </label>
            </div>
            <div className="dialog-footer">
              <Badge>Booking not connected</Badge>
              <Button type="submit" variant="default">
                Save leg
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </>
  );
}
export function LayoverView() {
  const { j } = useJourney();
  const [selected, setSelected] = useState("Stay airside");
  const [transitIndex, setTransitIndex] = useState(0);
  const [detail, setDetail] = useState("");
  const route = deriveJourneyRoute(j);
  const transitStops = route.stops.slice(1, -1);
  const transitStop = transitStops[transitIndex];
  const options = [
    {
      name: "Stay airside",
      icon: Coffee,
      title: "Airside connection",
      text: "Stay within the terminal and make your onward connection the priority. Confirm facilities with the airport.",
      items: [
        "Quiet seating & rest areas",
        "Food and refreshments",
        "Airport Wi-Fi",
        "Terminal wayfinding",
      ],
    },
    {
      name: "Rest & recharge",
      icon: Headphones,
      title: "Rest facilities",
      text: "Check lounge and rest options with the airport, including opening times, prices and availability.",
      items: [
        "Lounge access · Confirm availability",
        "Short-stay rest space · Check airport",
        "Shower facilities · Check airport",
        "Charging points & work areas",
      ],
    },
    {
      name: "Explore the city",
      icon: TrainFront,
      title: "Leaving the airport",
      text: "Leaving the airport depends on your entry permission and available time. Confirm both before planning a visit.",
      items: [
        "Entry permission not verified",
        "Baggage and terminal conditions unknown",
        "Return security buffer required",
        "No city itinerary recommended",
      ],
    },
  ];
  const option = options.find((o) => o.name === selected)!;
  return (
    <>
      <PageHeading
        title="Transit"
        description={`${transitStop?.name ?? "Connecting airport"} · Connection planning`}
      />
      <div className="layover-summary">
        <div>
          <span className="journey-icon blue">
            <Plane size={22} />
          </span>
          <div>
            <h2>{transitStop?.name ?? "Connection"} connection</h2>
            {transitStops.length > 1 && (
              <div className="tabs">
                {transitStops.map((stop, index) => (
                  <button
                    key={`${stop.code}-${index}`}
                    type="button"
                    aria-pressed={transitIndex === index}
                    onClick={() => setTransitIndex(index)}
                  >
                    {stop.name}
                  </button>
                ))}
              </div>
            )}
            <p>Connection details · Confirm with your carrier</p>
          </div>
        </div>
        <div>
          <strong>Not recorded</strong>
          <span>Connection duration</span>
        </div>
        <div>
          <strong>Check with carrier</strong>
          <span>Minimum connection time</span>
        </div>
      </div>
      <div className="warning">
        <TriangleAlert size={18} />
        <p>
          Exiting the airport is not confirmed. Check official transit and entry
          rules for every traveler, and confirm your connection with the
          airline.
        </p>
      </div>
      <div className="tabs standalone">
        {options.map((o) => (
          <button
            key={o.name}
            onClick={() => setSelected(o.name)}
            className={selected === o.name ? "active" : ""}
          >
            <o.icon size={15} />
            {o.name}
          </button>
        ))}
      </div>
      <Panel className="layover-content">
        <option.icon size={30} strokeWidth={1.4} />
        <h2>{option.title}</h2>
        <p>{option.text}</p>
        <div className="facility-grid">
          {option.items.map((item, i) => (
            <button key={item} onClick={() => setDetail(item)}>
              <span>
                {i === 0 ? (
                  <Coffee size={20} />
                ) : i === 1 ? (
                  <House size={20} />
                ) : i === 2 ? (
                  <Wifi size={20} />
                ) : (
                  <MapPin size={20} />
                )}
              </span>
              <strong>{item}</strong>
              <small>
                View planning notes <ArrowUpRight size={12} />
              </small>
            </button>
          ))}
        </div>
      </Panel>
      <Modal
        open={!!detail}
        onOpenChange={(v) => !v && setDetail("")}
        title={detail}
        description="Transit planning note"
      >
        <p className="detail-paragraph">
          This option is not reserved or verified. Check the airport’s current
          facilities, accessibility, terminal access, opening hours and any
          charges before relying on it. Prioritize your onward connection.
        </p>
        {transitStop?.airport?.website ? (
          <Button asChild>
            <a
              href={transitStop.airport.website}
              target="_blank"
              rel="noreferrer"
            >
              Visit {transitStop.name} airport website
              <ArrowUpRight size={14} />
            </a>
          </Button>
        ) : (
          <p className="muted">
            An official airport website is not available in the offline
            catalogue.
          </p>
        )}
      </Modal>
    </>
  );
}
export function TravelDayView() {
  const { state, update, j } = useJourney();
  const [offline, setOffline] = useState(false);
  const checks = state.travelDayDone ?? [];
  const segments = state.segments.filter((s) => s.journeyId === j.id);
  const route = deriveJourneyRoute(j, segments);
  const firstLeg = route.legs[0];
  return (
    <>
      <PageHeading
        title="Travel-day checklist"
        description={`Prepare for ${formatDate(j.departure, { day: "numeric", month: "long", year: "numeric" })}`}
      >
        <Button onClick={() => setOffline(true)}>
          <Download size={14} />
          Export journey pack
        </Button>
        <Button asChild>
          <Link href="/app/safety">
            <Shield size={14} />
            Emergency access
          </Link>
        </Button>
      </PageHeading>
      <div className="travel-day-hero">
        <Badge tone="blue">Journey details · Confirm with carrier</Badge>
        <h2>
          {route.stops[0].name}
          <ArrowRight size={30} />
          {route.stops.at(-1)?.name}
        </h2>
        <div>
          <span className="mono">
            {route.stops[0].code || route.stops[0].name} —{" "}
            {route.stops.at(-1)?.code || route.stops.at(-1)?.name}
          </span>
          {route.stops.length > 2 && (
            <span>
              Via{" "}
              {route.stops
                .slice(1, -1)
                .map((stop) => stop.name)
                .join(" · ")}
            </span>
          )}
          <span>
            {firstLeg?.recorded?.flight ?? "Add your itinerary"} ·{" "}
            {firstLeg?.recorded?.depart ?? "Time not set"}
          </span>
          <span>
            Reference{" "}
            <b className="mono">
              {state.bookings.find((b) => b.journeyId === j.id)?.reference ??
                "Not connected"}
            </b>
          </span>
        </div>
      </div>
      <div className="bottom-grid">
        <Panel
          title="Airport checklist"
          description="Tap to check off your personal travel-day list."
        >
          {[
            "Check passport and permission documents",
            "Confirm your terminal with the airline",
            "Arrive with sufficient check-in time",
            "Complete security and find your gate",
            "Check onward connection details",
          ].map((t, i) => (
            <button
              className="checkpoint"
              key={t}
              onClick={() =>
                update((s) => {
                  const key = `${j.id}:${t}`;
                  const previous = s.travelDayDone ?? [];
                  return {
                    ...s,
                    travelDayDone: previous.includes(key)
                      ? previous.filter((x) => x !== key)
                      : [...previous, key],
                  };
                })
              }
            >
              <span
                className={checks.includes(`${j.id}:${t}`) ? "checked" : ""}
              >
                {checks.includes(`${j.id}:${t}`) ? <Check size={14} /> : i + 1}
              </span>
              <div>
                <strong>{t}</strong>
                <small>
                  {i === 0
                    ? "Keep original travel documents accessible."
                    : "Personal checkpoint · Confirm timing with your carrier"}
                </small>
              </div>
            </button>
          ))}
        </Panel>
        <div>
          <Panel
            title="Travel documents"
            action={<TextLink href="/app/documents">Vault</TextLink>}
          >
            {state.documents
              .filter((d) => d.journeyId === j.id)
              .map((d) => (
                <Link
                  className="document-shortcut"
                  href="/app/documents"
                  key={d.id}
                >
                  <FileText size={18} />
                  <div>
                    <strong>{d.name}</strong>
                    <small>Stored in your journey</small>
                  </div>
                  <ArrowUpRight size={14} />
                </Link>
              ))}
          </Panel>
          <div className="quiet-note">
            <Shield size={19} />
            <h3>Your safety information is one tap away.</h3>
            <p>Keep important contacts and insurance details accessible.</p>
            <TextLink href="/app/safety">Safety & emergency</TextLink>
          </div>
        </div>
      </div>
      <Modal
        open={offline}
        onOpenChange={setOffline}
        title="Export journey pack"
        description="Export a local copy of your journey details. Offline availability is not guaranteed."
      >
        <div className="offline-checklist">
          {[
            "Journey dates and route",
            "Document names and dates",
            "Booking references",
            "Emergency notes",
          ].map((x) => (
            <p key={x}>
              <Check size={15} />
              {x}
            </p>
          ))}
        </div>
        <p className="muted">
          The export includes journey details, not copies of your documents.
          This app does not guarantee offline access.
        </p>
        <div className="dialog-footer">
          <Badge>Documents not included</Badge>
          <ExportButton label="Download journey pack" />
        </div>
      </Modal>
    </>
  );
}
const arrivalGroups = [
  {
    name: "First 24 hours",
    subtitle: "First-day tasks",
    items: [
      [
        "Get connected",
        "Compare local SIM or eSIM options. Verify compatibility and pricing.",
      ],
      [
        "Find your way home",
        "Confirm your arrival address and transport in advance.",
      ],
      [
        "Check in with your people",
        "Let your saved contacts know you’ve arrived.",
      ],
    ],
  },
  {
    name: "First week",
    subtitle: "First-week tasks",
    items: [
      [
        "Understand local registration",
        "Check whether any registration applies with official authorities.",
      ],
      [
        "Set up everyday banking",
        "Compare accounts and confirm identification requirements.",
      ],
      [
        "Meet your university or workplace",
        "Save your orientation details and local contact.",
      ],
    ],
  },
  {
    name: "First month",
    subtitle: "First-month tasks",
    items: [
      [
        "Find local health support",
        "Research health registration, coverage and nearby care.",
      ],
      [
        "Settle your housing details",
        "Keep your accommodation details and documents together.",
      ],
      [
        "Build your local essentials list",
        "Transport, groceries and a few places that feel like home.",
      ],
    ],
  },
];
export function ArrivalView() {
  const { state, update, j } = useJourney();
  const [tab, setTab] = useState("First 24 hours");
  const group = arrivalGroups.find((g) => g.name === tab)!;
  return (
    <>
      <PageHeading
        title="Arrival"
        description={`${j.destination} · Destination setup`}
      />
      <div className="arrival-banner">
        <span className="journey-icon blue">
          <House size={25} />
        </span>
        <div>
          <h2>Destination checklist</h2>
          <p>
            A practical settling-in plan, from your first night to your first
            month.
          </p>
        </div>
        <Badge tone="blue">
          {j.mode === "Move" ? "Relocation plan" : "Arrival plan"}
        </Badge>
      </div>
      <div className="tabs standalone">
        {arrivalGroups.map((g) => (
          <button
            key={g.name}
            className={tab === g.name ? "active" : ""}
            onClick={() => setTab(g.name)}
          >
            {g.name}
          </button>
        ))}
      </div>
      <Panel title={group.subtitle}>
        {group.items.map(([title, detail]) => {
          const id = `${j.id}-${title}`;
          const done = state.arrivalDone.includes(id);
          return (
            <div className="arrival-task" key={title}>
              <button
                className={`checkbox ${done ? "checked" : ""}`}
                aria-label={`${done ? "Reopen" : "Complete"} ${title}`}
                onClick={() =>
                  update((s) => ({
                    ...s,
                    arrivalDone: done
                      ? s.arrivalDone.filter((x) => x !== id)
                      : [...s.arrivalDone, id],
                  }))
                }
              >
                {done && <Check size={12} />}
              </button>
              <div>
                <h3>{title}</h3>
                <p>{detail}</p>
              </div>
              <Badge tone={done ? "green" : "neutral"}>
                {done ? "Done" : "To do"}
              </Badge>
            </div>
          );
        })}
      </Panel>
      <div className="bottom-grid spaced">
        <Panel title="Your first address">
          <div className="panel-padding">
            <MapPin size={22} />
            <h3>Accommodation address</h3>
            <p>Add an address for {j.destination}</p>
            <TextLink href="/app/documents">
              Keep accommodation evidence
            </TextLink>
          </div>
        </Panel>
        <Panel title="People to keep in reach">
          <div className="panel-padding">
            <h3>Arrival contact</h3>
            <p></p>
            <TextLink href="/app/safety">See all saved contacts</TextLink>
          </div>
        </Panel>
      </div>
    </>
  );
}
