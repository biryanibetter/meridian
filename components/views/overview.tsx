"use client";
import Link from "next/link";
import { useState } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  Check,
  ChevronRight,
  Clock3,
  FileText,
  Flag,
  Globe2,
  MapPin,
  Pencil,
  Plane,
  Plus,
} from "lucide-react";
import { useDemo } from "@/lib/store";
import { activeJourney, activeJourneys } from "@/lib/journey-state";
import { DEMO_TODAY } from "@/lib/demo";
import { dueDate, formatDate, readiness } from "@/lib/planning";
import {
  Badge,
  DemoNotice,
  Empty,
  JourneyCard,
  PageHeading,
  Panel,
  Progress,
  RouteMap,
  TaskRows,
  TextLink,
} from "../common";
import { Button } from "../ui/button";
import { JourneyForm } from "../journey-form";
import { VerificationProgressRing } from "../verification-progress-ring";
export function Overview({ onCreate }: { onCreate: () => void }) {
  const { state } = useDemo();
  const j = activeJourney(state);
  if (!j) {
    return (
      <>
        <PageHeading title="Overview" description="Your active travel plans.">
          <Button onClick={onCreate} variant="default">
            <Plus size={15} /> New journey
          </Button>
        </PageHeading>
        <Empty
          title="No active journeys"
          description="Restore an archived journey or create a new one."
        >
          <Button onClick={onCreate}>Create a journey</Button>
        </Empty>
      </>
    );
  }
  const tasks = state.tasks.filter((t) => t.journeyId === j.id);
  const pending = tasks
    .filter((t) => !t.done)
    .sort((a, b) => a.offset - b.offset);
  const value = readiness(tasks);
  const journeyDocuments = state.documents.filter(
    (document) => document.journeyId === j.id && document.ownerId === state.activeTravelerId,
  );
  const days = Math.round(
    (new Date(j.departure).getTime() - new Date(DEMO_TODAY).getTime()) /
      86400000,
  );
  return (
    <>
      <PageHeading
        title="Overview"
        description={`${j.origin} to ${j.destination} · ${formatDate(j.departure)}`}
      >
        <Button onClick={onCreate} variant="default">
          <Plus size={15} />
          New journey
        </Button>
      </PageHeading>
      <div className="overview-stats">
        <div>
          <span className="stat-icon blue">
            <MapPin size={17} />
          </span>
          <div>
            <small>Active journeys</small>
            <strong>
               {activeJourneys(state).length}
              <span>in your workspace</span>
            </strong>
          </div>
        </div>
        <div>
          <span className="stat-icon green">
            <VerificationProgressRing completed={tasks.filter((task) => task.done).length} total={tasks.length} size={32} label="Journey tasks" status="official-confirmation-required" />
          </span>
          <div>
            <small>Journey readiness</small>
            <strong>
              {value}%
              <span>
                {tasks.filter((t) => t.done).length} of {tasks.length} tasks
                complete
              </span>
            </strong>
          </div>
        </div>
        <div>
          <span className="stat-icon amber">
            <Clock3 size={17} />
          </span>
          <div>
            <small>Needs your attention</small>
            <strong>
              {pending.length}
              <span>outstanding tasks</span>
            </strong>
          </div>
        </div>
        <div>
          <span className="stat-icon lavender">
            <Plane size={17} />
          </span>
          <div>
            <small>Next departure</small>
            <strong>
              {days > 0 ? `${days} days` : "Coming up"}
              <span>
                {j.originCode} to {j.destinationCode}
              </span>
            </strong>
          </div>
        </div>
      </div>
      <Link href="/app/documents" className="document-readiness-summary">
        <VerificationProgressRing completed={journeyDocuments.filter((document) => document.prepared).length} total={journeyDocuments.length} size={32} label="Document records prepared" status="prepared" />
        <strong>{journeyDocuments.filter((document) => document.prepared).length} of {journeyDocuments.length} document records prepared</strong>
        <span>Local preparation status</span>
        <ArrowRight size={14} />
      </Link>
      <div className="overview-grid">
        <div className="overview-primary">
          <Panel
            className="featured-journey"
            title="Your next journey"
            action={<TextLink href="/app/journey">Open workspace</TextLink>}
          >
            <div className="featured-content">
              <div className="between">
                <Badge tone="blue">
                  {j.purpose}
                </Badge>
                <span className="muted small mono">
                  {formatDate(j.departure, {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </span>
              </div>
              <h2>{j.name}</h2>
              <div className="featured-meta">
                <span>
                  <MapPin size={13} />
                  {j.country}
                </span>
                <span>
                  <CalendarDays size={13} />
                  {formatDate(j.departure)} departure
                </span>
                <span className="traveler-mini">
                  <i className="avatar tiny lavender">
                    {
                      state.travelers.find((t) => t.id === j.travelers[0])
                        ?.initials
                    }
                  </i>
                  {j.travelers.length} traveler
                  {j.travelers.length > 1 ? "s" : ""}
                </span>
              </div>
            </div>
            <RouteMap journey={j} />
            <div className="journey-readiness">
              <div className="between">
                <span>
                  <span className="live-dot" />
                  Preparation progress
                </span>
                <strong>{value}% ready</strong>
              </div>
              <Progress value={value} />
              <small>{pending.length} outstanding tasks</small>
            </div>
          </Panel>
        </div>
        <div className="overview-secondary">
          <Panel className="next-action">
            <div className="action-kicker">
              <span className="action-icon">
                <Flag size={16} />
              </span>
              Next action<Badge tone="amber">Priority</Badge>
            </div>
            <h2>{pending[0]?.title ?? "Review your final travel checklist"}</h2>
            <p>{pending[0]?.note ?? "Review your preparation checklist."}</p>
            <div className="next-action-deadline">
              <Clock3 size={14} />{" "}
              {pending[0]
                ? `Plan by ${formatDate(dueDate(j.departure, pending[0].offset))}`
                : "Before you travel"}
            </div>
            <Button variant="default" asChild>
              <Link href="/app/tasks">
                Review task
                <ArrowRight size={14} />
              </Link>
            </Button>
          </Panel>
          <Panel
            title="Planning targets"
            action={<TextLink href="/app/tasks">All tasks</TextLink>}
          >
            <TaskRows journey={j} tasks={pending} limit={4} />
            {pending.length === 0 && (
              <Empty
                title="No outstanding tasks"
                description="Re-check official guidance before you travel."
              />
            )}
          </Panel>
        </div>
      </div>
      <div className="section-heading">
        <div>
          <h2>My journeys</h2>
        </div>
        <TextLink href="/app/journeys">View all journeys</TextLink>
      </div>
      <div className="journey-grid">
         {activeJourneys(state)
          .slice(0, 3)
          .map((j) => (
            <JourneyCard key={j.id} journey={j} />
          ))}
      </div>
      <div className="bottom-grid">
        <Panel
          title="Journey stages"
          action={<TextLink href="/app/journey">Full timeline</TextLink>}
        >
          <div className="lifecycle">
            {[
              { title: "Plan", detail: "Build your foundation", done: true },
              { title: "Prepare", detail: "You are here", active: true },
              { title: "Travel", detail: formatDate(j.departure) },
              { title: "Settle in", detail: `Hello, ${j.destination}` },
            ].map((x, i) => (
              <div
                key={x.title}
                className={`${x.done ? "done" : ""} ${x.active ? "active" : ""}`}
              >
                <span>{x.done ? <Check size={14} /> : i + 1}</span>
                <strong>{x.title}</strong>
                <small>{x.detail}</small>
              </div>
            ))}
          </div>
        </Panel>
        <Panel title="Recently in your workspace">
          <div className="activity-row">
            <span className="activity-dot green" />
            <p>
              Travel insurance added
              <small>Document vault · 2 hours ago</small>
            </p>
            <FileText size={15} />
          </div>
          <div className="activity-row">
            <span className="activity-dot blue" />
            <p>
              Supporting documents to review
              <small>Preparation reminder · Today</small>
            </p>
            <Globe2 size={15} />
          </div>
        </Panel>
      </div>
      <DemoNotice />
    </>
  );
}
export function Journeys({ onCreate }: { onCreate: () => void }) {
  const { state, update, toast } = useDemo();
  const [archived, setArchived] = useState(false);
  const [search, setSearch] = useState("");
  return (
    <>
      <PageHeading title="My journeys" description="Manage your travel plans.">
        <Button variant="default" onClick={onCreate}>
          <Plus size={15} />
          New journey
        </Button>
      </PageHeading>
      <div className="toolbar">
        <div className="tabs">
          <button
            className={!archived ? "active" : ""}
            onClick={() => setArchived(false)}
          >
            Active journeys
          </button>
          <button
            className={archived ? "active" : ""}
            onClick={() => setArchived(true)}
          >
            Archived
          </button>
        </div>
        <input
          className="filter-input"
          placeholder="Find a journey…"
          aria-label="Find a journey"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>
      <div className="journey-grid">
        {state.journeys
          .filter(
            (j) =>
              j.archived === archived &&
              j.name.toLowerCase().includes(search.toLowerCase()),
          )
          .map((j) => (
            <div key={j.id}>
              <JourneyCard journey={j} />
              <Button
                className="archive-button"
                size="sm"
                variant="ghost"
                onClick={() => {
                  update((s) => ({
                    ...s,
                    journeys: s.journeys.map((x) =>
                      x.id === j.id ? { ...x, archived: !x.archived } : x,
                    ),
                  }));
                  toast(
                    j.archived
                      ? "Journey restored."
                      : "Journey archived. Its records are preserved.",
                  );
                }}
              >
                {j.archived ? "Restore journey" : "Archive journey"}
              </Button>
            </div>
          ))}
      </div>
      {!state.journeys.some(
        (j) =>
          j.archived === archived &&
          j.name.toLowerCase().includes(search.toLowerCase()),
      ) && (
        <Empty
          title={archived ? "Nothing archived." : "No journeys found."}
          description="Your next chapter is yours to plan."
        >
          <Button onClick={onCreate}>Create a journey</Button>
        </Empty>
      )}
      <DemoNotice />
    </>
  );
}
export function JourneyWorkspace() {
  const { state } = useDemo();
  const [edit, setEdit] = useState(false);
  const j = activeJourney(state);
  if (!j) {
    return (
      <Empty
        title="No active journey"
        description="Restore a journey from Archived to open its workspace."
      />
    );
  }
  const tasks = state.tasks.filter((t) => t.journeyId === j.id);
  return (
    <>
      <Link className="back-link" href="/app/journeys">
        Journeys <ChevronRight size={12} />
        <span>{j.destination}</span>
      </Link>
      <PageHeading
        title={j.name}
        description={`${j.purpose} · ${j.origin} to ${j.destination} · ${formatDate(j.departure, { day: "numeric", month: "long", year: "numeric" })}`}
      >
        <Button onClick={() => setEdit(true)}>
          <Pencil size={14} />
          Edit journey
        </Button>
        <Button variant="default" asChild>
          <Link href="/app/travel-day">
            <Plane size={14} />
            Travel day
          </Link>
        </Button>
      </PageHeading>
      <div className="workspace-journey-grid">
        <Panel>
          <RouteMap journey={j} />
        </Panel>
        <Panel className="readiness-panel">
          <Badge tone="blue">{j.mode} planning</Badge>
          <div className="readiness-number">
            {readiness(tasks)}
            <span>%</span>
          </div>
          <h3>A clearer path ahead.</h3>
          <p>{tasks.filter((t) => !t.done).length} planning steps remaining.</p>
          <Progress value={readiness(tasks)} />
          <TextLink href="/app/tasks">Continue preparing</TextLink>
        </Panel>
      </div>
      <nav className="workspace-tabs" aria-label="Journey sections">
        {[
          "Entry",
          "Tasks",
          "Documents",
          "Travel",
          "Layovers",
          "Arrival",
          "Safety",
        ].map((n) => (
          <Link href={`/app/${n.toLowerCase()}`} key={n}>
            {n}
            <ArrowUpRight size={12} />
          </Link>
        ))}
      </nav>
      <div className="bottom-grid">
        <Panel title="Preparation stages">
          <div className="vertical-timeline">
            {[
              {
                title: "The plan is in motion",
                text: "Journey created. Dates and travelers added.",
                done: true,
              },
              {
                title: "Make the important things certain",
                text: "Entry guidance, evidence and insurance.",
                done: false,
              },
              {
                title: "Everything you need, within reach",
                text: `Depart ${j.origin} on ${formatDate(j.departure)}.`,
                done: false,
              },
              {
                title: `Find your feet in ${j.destination}`,
                text: "Your first day, week and month, thoughtfully planned.",
                done: false,
              },
            ].map((x, i) => (
              <div key={x.title}>
                <span className={x.done ? "complete" : ""}>
                  {x.done ? <Check size={13} /> : i + 1}
                </span>
                <section>
                  <h3>{x.title}</h3>
                  <p>{x.text}</p>
                </section>
              </div>
            ))}
          </div>
        </Panel>
        <Panel
          title="Upcoming obligations"
          action={<TextLink href="/app/tasks">All tasks</TextLink>}
        >
          <TaskRows
            journey={j}
            tasks={tasks.filter((t) => !t.done)}
            limit={4}
          />
        </Panel>
      </div>
      <DemoNotice />
      {edit && <JourneyForm key={j.id} edit={j} open onOpenChange={setEdit} />}
    </>
  );
}
