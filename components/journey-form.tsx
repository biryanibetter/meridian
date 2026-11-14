"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Briefcase,
  Check,
  ChevronDown,
  ChevronUp,
  MapPin,
  Plane,
  X,
  Users,
} from "lucide-react";
import { useDemo } from "@/lib/store";
import { makeTasks } from "@/lib/demo";
import { airportCode } from "@/lib/planning";
import { airports, findAirport } from "@/lib/geography";
import { personalWorkspaceBase } from "@/lib/workspace-context";
import { reconcileGeneratedTasks } from "@/lib/task-dependencies";
import { buildPlannedSegments } from "@/lib/journey-state";
import type { Journey, JourneyMode, Traveler } from "@/lib/types";
import { CountrySelect, validCountries } from "./country-select";
import { Modal } from "./ui/dialog";
import { Button } from "./ui/button";
const purposes = [
  { value: "tourism", label: "Trip", mode: "Trip" as JourneyMode, icon: Plane },
  { value: "study", label: "Study", mode: "Trip" as JourneyMode, icon: Plane },
  { value: "work", label: "Work", mode: "Trip" as JourneyMode, icon: Briefcase },
  { value: "family", label: "Family", mode: "Family" as JourneyMode, icon: Users },
  { value: "transit", label: "Transit", mode: "Transit" as JourneyMode, icon: MapPin },
  { value: "relocation", label: "Relocation", mode: "Move" as JourneyMode, icon: Briefcase },
] as const;
export function JourneyForm({
  open,
  onOpenChange,
  edit,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  edit?: Journey;
}) {
  const { state, update, toast } = useDemo();
  const primaryId =
    edit?.travelers[0] ?? state.pendingTravelerId ?? state.activeTravelerId;
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [mode, setMode] = useState<JourneyMode>(edit?.mode ?? "Trip");
  const [error, setError] = useState("");
  const [editIdentity, setEditIdentity] = useState(false);
  const [additional, setAdditional] = useState<Traveler[]>([]);
  const [family, setFamily] = useState({ name: "", nationality: "", residence: "" });
  const [adding, setAdding] = useState(false);
  const [longTerm, setLongTerm] = useState(edit?.longTerm ?? false);
  const [form, setForm] = useState({
    name: edit?.name ?? "",
    origin: edit?.origin ?? "",
    originCountry:
      edit?.originCountry ??
      state.travelers.find((t) => t.id === primaryId)?.residence ??
      "India",
    destination: edit?.destination ?? "",
    country: edit?.country ?? "United Kingdom",
    nationality:
      state.travelers.find((t) => t.id === primaryId)?.nationality ?? "India",
    residence:
      state.travelers.find((t) => t.id === primaryId)?.residence ?? "India",
    departure: edit?.departure ?? "2027-09-15",
    returnDate: edit?.returnDate ?? "2027-10-15",
    purpose: edit?.purpose ?? "study",
  });
  const [transits, setTransits] = useState<string[]>(
    edit?.transit ? edit.transit.split(",").map((value) => value.trim()).filter(Boolean) : [],
  );
  const [selected, setSelected] = useState<string[]>(
    edit?.travelers ?? [primaryId],
  );
  const field = (key: keyof typeof form, value: string) =>
    setForm((s) => ({ ...s, [key]: value }));
  const route = [form.origin, ...transits, form.destination].map((stop) => stop.trim());
  const unknownStops = route.filter((stop) => stop && (/[;,]/.test(stop) || !findAirport(stop)));
  const duplicateStops = route.some(
    (stop, index) => index > 0 && stop && (
      stop.toLowerCase() === route[index - 1].toLowerCase() ||
      (findAirport(stop)?.code && findAirport(stop)?.code === findAirport(route[index - 1])?.code)
    ),
  );
  function validateDetails() {
    if (!form.name.trim()) {
      setError("Add a name for this journey.");
      return false;
    }
    if (!form.departure || Number.isNaN(Date.parse(form.departure))) {
      setError("Choose a valid departure date.");
      return false;
    }
    if (!longTerm && (!form.returnDate || Number.isNaN(Date.parse(form.returnDate)))) {
      setError("Choose a valid return date, or select long-term move.");
      return false;
    }
    if (!longTerm && form.returnDate < form.departure) {
      setError("Your return date must be on or after departure.");
      return false;
    }
    return true;
  }
  function validateRoute() {
    if (!form.origin.trim() || !form.destination.trim() || transits.some((stop) => !stop.trim())) {
      setError("Add an origin, destination, and a location for every transit stop.");
      return false;
    }
    if (unknownStops.length) {
      setError(`Choose a known offline location for: ${unknownStops.join(", ")}.`);
      return false;
    }
    if (
      findAirport(form.origin)?.country !== form.originCountry ||
      findAirport(form.destination)?.country !== form.country
    ) {
      setError("The route countries must match the selected origin and destination cities.");
      return false;
    }
    if (duplicateStops) {
      setError("A route cannot have the same location at consecutive stops.");
      return false;
    }
    return true;
  }
  function toggleTraveler(id: string) {
    const next = selected.includes(id)
      ? selected.filter((x) => x !== id)
      : [...selected, id];
    setSelected(next);
    if (next[0] !== selected[0]) {
      const primary = state.travelers.find((t) => t.id === next[0]);
      if (primary)
        setForm((s) => ({
          ...s,
          nationality: primary.nationality,
          residence: primary.residence,
        }));
    }
  }
  function save() {
    if (![form.originCountry, form.country, form.nationality, form.residence].every(value => validCountries.includes(value))) {
      setError("Choose valid countries for the route, nationality and residence.");
      return;
    }
    if (!validateDetails() || !validateRoute()) return;
    if (!selected.length) {
      setError("Select at least one traveler.");
      return;
    }
    const id = edit?.id ?? `journey-${Date.now()}`;
    const journey: Journey = {
      id,
      name:
        form.name.trim() ||
        `${form.destination.trim()} · ${mode === "Move" ? "Relocation" : form.purpose}`,
      mode,
      origin: form.origin.trim(),
      originCountry: form.originCountry.trim(),
      originCode:
        edit?.origin === form.origin.trim()
          ? edit.originCode
          : airportCode(form.origin),
      destination: form.destination.trim(),
      destinationCode:
        edit?.destination === form.destination.trim()
          ? edit.destinationCode
          : airportCode(form.destination),
      country: form.country,
      transit: transits.map((value) => value.trim()).filter(Boolean).join(", "),
      departure: form.departure,
      returnDate: longTerm ? "" : form.returnDate,
      longTerm,
      purpose: form.purpose,
      travelers: selected,
      archived: false,
      color: "blue",
      budgetAllowance: edit?.budgetAllowance ?? 0,
    };
    update((s) => {
      const fresh = !edit && Boolean(s.pendingTravelerId);
      const base = fresh ? personalWorkspaceBase(s, primaryId) : s;
      const primary = s.travelers.find(traveler => traveler.id === selected[0]);
      const regenerate = edit && (
        edit.country !== journey.country || edit.purpose !== journey.purpose ||
        edit.transit !== journey.transit || primary?.nationality !== form.nationality ||
        primary?.residence !== form.residence
      );
      const existingTasks = regenerate
        ? reconcileGeneratedTasks(base.tasks, Array.from({ length: 8 }, (_, i) => `${id}-t${i + 1}`), makeTasks(journey))
        : base.tasks;
      return ({
      ...base,
      profile: fresh ? base.travelers.find((traveler) => traveler.id === primaryId)?.name ?? base.profile : base.profile,
      journeys: edit
        ? base.journeys.map((j) => (j.id === id ? journey : j))
        : [...base.journeys, journey],
      tasks: edit
        ? existingTasks.map((t) =>
            t.journeyId === id && !selected.includes(t.travelerId)
              ? { ...t, travelerId: selected[0] }
              : t,
          )
        : [
            ...base.tasks,
             ...makeTasks(journey).map((t) => ({ ...t, done: false })),
           ],
      segments: (() => {
        const planned = buildPlannedSegments(journey, base.segments);
        if (!edit) return [...base.segments, ...planned];
        return [
          ...base.segments.filter((segment) => segment.journeyId !== id),
          ...planned,
        ];
      })(),
      activeJourneyId: id,
      activeTravelerId: selected[0],
      pendingTravelerId: undefined,
      travelers: [...base.travelers, ...additional].map((t) =>
        t.id === selected[0]
          ? { ...t, nationality: form.nationality, residence: form.residence }
          : t,
      ),
      notifications: [
        {
          id: `date-${Date.now()}`,
          journeyId: id,
          title: edit ? "Journey dates updated" : "Your new journey is ready",
          detail: edit
            ? "Relative task deadlines now follow the new departure date."
            : "A planning checklist has been created. Verify all requirements with official sources.",
          type: "Journey",
          route: "journey",
          read: false,
        },
        ...base.notifications,
      ],
      });
    });
    toast(
      edit
        ? "Journey updated. Task deadlines recalculated."
        : "Journey created. Your planning workspace is ready.",
    );
    onOpenChange(false);
    router.push("/app/journey");
  }
  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={edit ? "Edit journey" : "Create a journey"}
      description={
        edit
          ? "Move your dates. Your relative task deadlines will follow."
          : "Details, route, travelers and your generated travel plan."
      }
    >
      <div className="step-indicator">
        {["Details", "Route", "Travelers", "Review"].map((s, i) => (
          <span
            className={step === i + 1 ? "active" : step > i + 1 ? "done" : ""}
            key={s}
          >
            <b>{step > i + 1 ? <Check size={11} /> : i + 1}</b>
            {s}
          </span>
        ))}
      </div>
      {step === 1 ? (
        <div className="form-grid">
          <label className="full">
            Journey name
            <input
              placeholder="e.g. London study term"
              value={form.name}
              onChange={(e) => field("name", e.target.value)}
            />
          </label>
          <label>Purpose
            <select value={form.purpose} onChange={(e) => {
              const purpose = purposes.find((item) => item.value === e.target.value);
              if (purpose) { field("purpose", purpose.value); setMode(purpose.mode); }
            }}>
              {purposes.map((purpose) => <option key={purpose.value} value={purpose.value}>{purpose.label}</option>)}
            </select>
          </label>
          <label>Journey mode
            <select value={mode} onChange={(e) => setMode(e.target.value as JourneyMode)}>
              {(["Trip", "Family", "Transit", "Move"] as JourneyMode[]).map((value) => <option key={value}>{value}</option>)}
            </select>
          </label>
          <label>Departure
            <input
              aria-label="Departure date"
              type="date"
              value={form.departure}
              onChange={(e) => field("departure", e.target.value)}
            />
          </label>
          <label>{mode === "Move" ? "Planned end of stay" : "Return date"}
            <input type="date" disabled={longTerm} value={form.returnDate} onChange={(e) => field("returnDate", e.target.value)} />
          </label>
          <label className="full confirmation-check">
            <input type="checkbox" checked={longTerm} onChange={(event) => setLongTerm(event.target.checked)} />
            Long-term move — no return date yet
          </label>
        </div>
      ) : step === 2 ? (
        <div className="form-grid">
          <datalist id="journey-locations">{airports.flatMap((airport) => [
            <option key={`${airport.code}-city`} value={airport.city}>{airport.code}</option>,
            <option key={`${airport.code}-code`} value={airport.code}>{airport.city}</option>,
          ])}</datalist>
          <label>Origin city
            <input list="journey-locations" required value={form.origin} onChange={(e) => {
              const value = e.target.value;
              field("origin", value);
              const airport = findAirport(value);
              if (airport) field("originCountry", airport.country);
            }} aria-invalid={Boolean(form.origin && !findAirport(form.origin))} />
            {form.origin && !findAirport(form.origin) && <small role="status">Not in the offline location list</small>}
          </label>
          <CountrySelect id="journey-origin-country" label="Origin country" value={form.originCountry} onChange={(value) => field("originCountry", value)} />
          <label>Destination city
            <input list="journey-locations" required placeholder="Choose a city or airport" value={form.destination} onChange={(e) => {
              const value = e.target.value;
              field("destination", value);
              const airport = findAirport(value);
              if (airport) field("country", airport.country);
            }} aria-invalid={Boolean(form.destination && !findAirport(form.destination))} />
            {form.destination && !findAirport(form.destination) && <small role="status">Not in the offline location list</small>}
          </label>
          <CountrySelect id="journey-destination-country" label="Destination country" value={form.country} onChange={(value) => field("country", value)} />
          <div className="full">
            <strong>Transit stops · in order</strong>
            {transits.map((transit, index) => (
              <div key={index} className="form-grid">
                <label>Transit stop {index + 1}<input list="journey-locations" value={transit} onChange={(event) => setTransits((current) => current.map((value, i) => i === index ? event.target.value : value))} aria-invalid={Boolean(transit && !findAirport(transit))} />
                  {transit && !findAirport(transit) && <small role="status">Not in the offline location list</small>}
                </label>
                <div>
                  <Button type="button" disabled={index === 0} aria-label={`Move stop ${index + 1} up`} onClick={() => setTransits((current) => { const next = [...current]; [next[index - 1], next[index]] = [next[index], next[index - 1]]; return next; })}><ChevronUp size={15} /></Button>
                  <Button type="button" disabled={index === transits.length - 1} aria-label={`Move stop ${index + 1} down`} onClick={() => setTransits((current) => { const next = [...current]; [next[index], next[index + 1]] = [next[index + 1], next[index]]; return next; })}><ChevronDown size={15} /></Button>
                  <Button type="button" aria-label={`Remove stop ${index + 1}`} onClick={() => setTransits((current) => current.filter((_, i) => i !== index))}><X size={15} /></Button>
                </div>
              </div>
            ))}
            <Button type="button" onClick={() => setTransits((current) => [...current, ""])}>Add transit stop</Button>
          </div>
          <div className="full identity-summary" aria-live="polite">
            <strong>Route preview</strong><span>{route.filter(Boolean).join(" → ") || "Add locations to preview the route"}</span>
            {duplicateStops && <small role="status">Consecutive duplicate locations need correction.</small>}
          </div>
        </div>
      ) : step === 3 ? (
        <div>
          <div className="identity-summary">
            <strong>Signed-in primary traveler</strong>
            <span>{state.travelers.find((traveler) => traveler.id === primaryId)?.name ?? "Primary traveler"}</span>
            <small>Primary traveler information is separate from accompanying family metadata.</small>
            <button
              className="text-link"
              onClick={() => setEditIdentity(!editIdentity)}
            >
              {editIdentity ? "Done editing" : "Edit traveler information"}
            </button>
          </div>
          {editIdentity && (
            <div className="form-grid">
              <CountrySelect id="journey-passport-nationality" label="Passport nationality" value={form.nationality} onChange={(value) => field("nationality", value)} />
              <CountrySelect id="journey-residence" label="Country of residence" value={form.residence} onChange={(value) => field("residence", value)} />
            </div>
          )}
          <h3 className="form-subtitle">Who’s coming along?</h3>
          {state.travelers.filter((traveler) => selected.includes(traveler.id) || traveler.id === primaryId).map((t) => (
            <label className="traveler-select" key={t.id}>
              <input
                type="checkbox"
                checked={selected.includes(t.id)}
                onChange={() => toggleTraveler(t.id)}
              />
              <span className={`avatar ${t.color}`}>{t.initials}</span>
              <span>
                {t.name}
                <small>{t.role}</small>
              </span>
            </label>
          ))}
          {additional.map((traveler) => <label className="traveler-select" key={traveler.id}><input type="checkbox" checked={selected.includes(traveler.id)} onChange={() => toggleTraveler(traveler.id)} /><span>{traveler.name}<small>{traveler.nationality} passport · Resident in {traveler.residence}</small></span></label>)}
          <Button type="button" onClick={() => setAdding(!adding)}>Add accompanying traveler</Button>
          {adding && <div className="family-draft form-grid">
            <label className="full">Traveler full legal name<input value={family.name} onChange={(event) => setFamily({ ...family, name: event.target.value })} /></label>
            <CountrySelect id="family-nationality" label="Traveler nationality" value={family.nationality} onChange={(nationality) => setFamily({ ...family, nationality })} />
            <CountrySelect id="family-residence" label="Traveler residence" value={family.residence} onChange={(residence) => setFamily({ ...family, residence })} />
            <Button type="button" onClick={() => {
              if (!family.name.trim() || !validCountries.includes(family.nationality) || !validCountries.includes(family.residence)) { setError("Add the accompanying traveler’s name and select nationality and residence."); return; }
              const traveler: Traveler = { id: `traveler-${crypto.randomUUID()}`, name: family.name.trim(), initials: family.name.split(/\s+/).map((part) => part[0]).slice(0, 2).join(""), nationality: family.nationality, residence: family.residence, role: "Accompanying traveler", color: "blue" };
              setAdditional([...additional, traveler]); setSelected([...selected, traveler.id]); setFamily({ name: "", nationality: "", residence: "" }); setAdding(false); setError("");
            }}>Add traveler</Button>
          </div>}
        </div>
      ) : (
        <div className="identity-summary">
          <strong>{form.name.trim() || `${form.destination.trim()} · ${form.purpose}`}</strong>
          <span>{route.filter(Boolean).join(" → ")}</span>
          <span>{form.departure} – {longTerm ? "Long-term move" : form.returnDate} · {form.purpose} · {mode}</span>
          <span>{selected.map((travelerId) =>
            additional.find((traveler) => traveler.id === travelerId)?.name ??
            state.travelers.find((traveler) => traveler.id === travelerId)?.name,
          ).filter(Boolean).join(", ") || "No travelers selected"}</span>
          <small>Review your journey details before saving. Tasks and document categories follow this purpose and route.</small>
        </div>
      )}
      {error && (
        <p role="alert" className="form-error">
          {error}
        </p>
      )}
      <div className="dialog-footer">
        <Button
          onClick={() => (step > 1 ? setStep(step - 1) : onOpenChange(false))}
        >
          <ArrowLeft size={14} />
          {step === 1 ? "Cancel" : "Back"}
        </Button>
            <span className="muted small">Step {step} of 4</span>
        <Button
          variant="default"
          onClick={() => {
            if (step < 4) {
              if (step === 1 && !validateDetails()) return;
              if (step === 2 && !validateRoute()) return;
              setError("");
              setStep(step + 1);
            } else save();
          }}
        >
          {step === 4 ? (edit ? "Save changes" : "Create journey") : "Continue"}
          <ArrowRight size={14} />
        </Button>
      </div>
    </Modal>
  );
}
