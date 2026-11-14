"use client";
import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  Compass,
  Plane,
} from "lucide-react";
import { useDemo } from "@/lib/store";
import { dueDate, formatDate, readiness } from "@/lib/planning";
import type { Journey, Task } from "@/lib/types";
import { Button } from "./ui/button";
import type { ReactNode } from "react";
import { GeographicalMap } from "./geographical-map";
import { invalidateTaskDescendants } from "@/lib/task-dependencies";
export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <Link href="/" className="brand" aria-label="Meridian home">
      <span className="brand-symbol">
        <Compass size={23} strokeWidth={1.6} />
      </span>
      {!compact && (
        <span>
          meridian<span className="brand-dot">.</span>
        </span>
      )}
    </Link>
  );
}
export function Badge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: string;
}) {
  return <span className={`badge ${tone}`}>{children}</span>;
}
export function PageHeading({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  children?: ReactNode;
}) {
  return (
    <div className="page-heading">
      <div>
        {eyebrow && <div className="eyebrow">{eyebrow}</div>}
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </div>
      <div className="heading-actions">{children}</div>
    </div>
  );
}
export function Panel({
  title,
  description,
  action,
  children,
  className = "",
}: {
  title?: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`panel ${className}`}>
      {title && (
        <div className="panel-heading">
          <div>
            <h2>{title}</h2>
            {description && <p>{description}</p>}
          </div>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}
export function Empty({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children?: ReactNode;
}) {
  return (
    <div className="empty">
      <Compass size={28} />
      <h3>{title}</h3>
      <p>{description}</p>
      {children}
    </div>
  );
}
export function DemoNotice(_props: { children?: ReactNode }) {
  // Disclosure belongs at onboarding; feature-specific coverage is shown by requirements.
  void _props;
  return null;
}
export function Progress({ value }: { value: number }) {
  return (
    <div className="progress">
      <span style={{ width: `${value}%` }} />
    </div>
  );
}
export function RouteMap({
  journey,
  small = false,
}: {
  journey: Journey;
  small?: boolean;
}) {
  return <GeographicalMap journey={journey} small={small} />;
}
export function TaskRows({
  tasks,
  journey,
  limit,
}: {
  tasks: Task[];
  journey: Journey;
  limit?: number;
}) {
  const { state, update, toast } = useDemo();
  return (
    <div className="task-list">
      {tasks.slice(0, limit).map((t) => (
        <div className={`task-row ${t.done ? "completed" : ""}`} key={t.id}>
          <button
            className={`checkbox ${t.done ? "checked" : ""}`}
            aria-label={`${t.done ? "Reopen" : "Complete"} ${t.title}`}
            onClick={() => {
              const dependency = state.tasks.find((x) => x.id === t.dependency);
              if (!t.done && dependency && !dependency.done) {
                toast("Complete the dependent task first.");
                return;
              }
              update((s) => ({
                ...s,
                tasks: t.done ? invalidateTaskDescendants(s.tasks, t.id) : s.tasks.map((x) =>
                  x.id === t.id ? { ...x, done: true } : x,
                ),
              }));
            }}
          >
            {t.done && <Check size={12} />}
          </button>
          <div className="task-copy">
            <span>{t.title}</span>
            <small>
              {t.category}
              {t.dependency ? " · Has dependency" : ""}
            </small>
          </div>
          <span className={`priority-dot ${t.priority.toLowerCase()}`} />
          <span className="task-date mono">
            {formatDate(dueDate(journey.departure, t.offset))}
          </span>
        </div>
      ))}
    </div>
  );
}
export function JourneyCard({ journey }: { journey: Journey }) {
  const { state, selectJourney } = useDemo();
  const tasks = state.tasks.filter((t) => t.journeyId === journey.id);
  return (
    <Link
      href="/app/journey"
      onClick={() => selectJourney(journey.id)}
      className="journey-card"
    >
      <div className="between">
        <span className={`journey-icon ${journey.color}`}>
          <Plane size={18} />
        </span>
        <Badge>{journey.mode}</Badge>
      </div>
      <h3>{journey.name}</h3>
      <p>
        {journey.origin} <ArrowRight size={12} /> {journey.destination}
      </p>
      <div className="journey-card-meta">
        <span>
          {formatDate(journey.departure, {
            day: "numeric",
            month: "short",
            year: "numeric",
          })}
        </span>
        <span>
          {journey.travelers.length} traveler
          {journey.travelers.length > 1 ? "s" : ""}
        </span>
      </div>
      <Progress value={readiness(tasks)} />
      <div className="between muted">
        <small>{readiness(tasks)}% ready</small>
        <ArrowUpRight size={14} />
      </div>
    </Link>
  );
}
export function TextLink({
  href,
  children,
}: {
  href: string;
  children: ReactNode;
}) {
  return (
    <Link className="text-link" href={href}>
      {children}
      <ArrowRight size={13} />
    </Link>
  );
}
export function ExportButton({
  label = "Export workspace",
}: {
  label?: string;
}) {
  const { state, toast } = useDemo();
  return (
    <Button
      onClick={() => {
        const url = URL.createObjectURL(
          new Blob([JSON.stringify(state, null, 2)], {
            type: "application/json",
          }),
        );
        const a = document.createElement("a");
        a.href = url;
        a.download = "meridian-workspace.json";
        a.click();
        URL.revokeObjectURL(url);
        toast("Workspace exported.");
      }}
    >
      {label}
      <ArrowUpRight size={14} />
    </Button>
  );
}
