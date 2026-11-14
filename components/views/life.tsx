"use client";
import Link from "next/link";
import { useState, type FormEvent } from "react";
import {
  ArrowDownToLine,
  ArrowRight,
  ArrowUpRight,
  Bell,
  Check,
  CheckCheck,
  ChevronRight,
  FileText,
  Globe2,
  LockKeyhole,
  Moon,
  Pencil,
  Phone,
  Plus,
  Shield,
  Sparkles,
  Sun,
  Trash2,
  TriangleAlert,
  Users,
  Wallet,
} from "lucide-react";
import { useDemo } from "@/lib/store";
import { activeNotifications } from "@/lib/journey-state";
import { createSeed } from "@/lib/demo";
import { assistantReply, type AssistantReply } from "@/lib/assistant";
import {
  budgetTotals,
  money,
  readiness,
  isDemoState,
} from "@/lib/planning";
import type { BudgetItem } from "@/lib/types";
import {
  Badge,
  DemoNotice,
  Empty,
  ExportButton,
  PageHeading,
  Panel,
  Progress,
  TextLink,
} from "../common";
import { Button } from "../ui/button";
import { Modal } from "../ui/dialog";
function useJourney() {
  const store = useDemo();
  return {
    ...store,
    j:
      store.state.journeys.find((j) => j.id === store.state.activeJourneyId) ??
      store.state.journeys[0],
  };
}
export function BudgetView() {
  const { state, update, toast, j } = useJourney();
  const [open, setOpen] = useState(false);
  const [allowanceOpen, setAllowanceOpen] = useState(false);
  const [edit, setEdit] = useState<BudgetItem | null>(null);
  const items = state.expenses.filter((e) => e.journeyId === j.id);
  const allowance = j.budgetAllowance ?? 5000;
  const totals = budgetTotals(items, allowance);
  const categoryTotals = items.reduce<Record<string, number>>((groups, item) => {
    groups[item.category] = (groups[item.category] ?? 0) + item.planned;
    return groups;
  }, {});
  const plannedByCategory = Object.entries(categoryTotals);
  function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const item: BudgetItem = {
      id: edit?.id ?? `expense-${Date.now()}`,
      journeyId: j.id,
      title: String(f.get("title")).trim(),
      category: String(f.get("category")),
      planned: Number(f.get("planned")),
      actual: Number(f.get("actual")),
      currency: "USD",
    };
    if (!item.title || item.planned < 0 || item.actual < 0) return;
    update((s) => ({
      ...s,
      expenses: edit
        ? s.expenses.map((x) => (x.id === edit.id ? item : x))
        : [...s.expenses, item],
    }));
    setOpen(false);
    toast("Expense saved. Your budget is up to date.");
  }
  return (
    <>
      <PageHeading
        title="Expenses"
        description={`${j.destination} · Planned and recorded costs in USD`}
      >
        <Button
          variant="default"
          onClick={() => {
            setEdit(null);
            setOpen(true);
          }}
        >
          <Plus size={14} />
          Add expense
        </Button>
        <Button onClick={() => setAllowanceOpen(true)}>Edit allowance</Button>
      </PageHeading>
      <div className="budget-stats">
        <Panel>
          <small>Total allowance</small>
           <h2>{money(allowance)}</h2>
          <p>Workspace allowance · USD</p>
        </Panel>
        <Panel>
          <small>Planned expenses</small>
          <h2>{money(totals.planned)}</h2>
          <p>{items.length} planned items</p>
        </Panel>
        <Panel>
          <small>Actual spending</small>
          <h2>{money(totals.actual)}</h2>
           <p>{allowance ? Math.round((totals.actual / allowance) * 100) : 0}% of allowance</p>
        </Panel>
        <Panel>
          <small>Remaining buffer</small>
          <h2 className="text-green">{money(totals.remaining)}</h2>
          <p>Allowance less actual spending</p>
        </Panel>
      </div>
       {items.length > 0 && <div className="bottom-grid">
        <Panel
          title="Where your budget goes"
          description="Planned cost by category"
        >
          <div className="budget-chart">
             {plannedByCategory.map(([categoryName, planned], i) => (
              <div className="budget-bar-row" key={categoryName}>
                <span>{categoryName}</span>
                <div>
                  <i
                    style={{
                      width: `${Math.max(3, (planned / Math.max(totals.planned, 1)) * 100)}%`,
                      background: [
                        "#4975e9",
                        "#7d98d8",
                        "#a2b5df",
                        "#c1cde5",
                        "#d7deeb",
                      ][i % 5],
                    }}
                  />
                </div>
                <strong>{money(planned)}</strong>
              </div>
            ))}
          </div>
        </Panel>
        <Panel title="A buffer for the unexpected">
          <div className="buffer-content">
            <Wallet size={26} />
            <h2>{money(totals.remaining)}</h2>
            <p>
              {totals.remaining >= 0
                ? "Room for the things you haven’t planned yet. Keep a buffer for transfers, deposits and everyday essentials."
                : "Your spending exceeds this allowance. Review your expense entries."}
            </p>
             <Progress value={allowance ? Math.min(100, (totals.actual / allowance) * 100) : 0} />
            <small>
               {money(totals.actual)} spent of {money(allowance)}
            </small>
          </div>
        </Panel>
      </div>}
      <Panel
        className="spaced"
        title="The details, without the guesswork"
        action={<Badge>USD · No live currency conversion</Badge>}
      >
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Expense</th>
                <th>Category</th>
                <th>Planned</th>
                <th>Actual</th>
                <th>Difference</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {items.map((e) => (
                <tr key={e.id}>
                  <td>
                    <strong>{e.title}</strong>
                  </td>
                  <td>{e.category}</td>
                  <td className="mono">{money(e.planned)}</td>
                  <td className="mono">{money(e.actual)}</td>
                  <td>
                    <Badge tone={e.actual <= e.planned ? "green" : "amber"}>
                      {money(e.planned - e.actual)}
                    </Badge>
                  </td>
                  <td>
                     <Button
                      size="icon"
                      variant="ghost"
                      aria-label={`Edit ${e.title}`}
                      onClick={() => {
                        setEdit(e);
                        setOpen(true);
                      }}
                    >
                      <Pencil size={13} />
                     </Button>
                     <Button
                       size="icon"
                       variant="ghost"
                       aria-label={`Delete ${e.title}`}
                       onClick={() => {
                         update((current) => ({
                           ...current,
                           expenses: current.expenses.filter((item) => item.id !== e.id),
                         }));
                         toast("Expense deleted.");
                       }}
                     >
                       <Trash2 size={13} />
                     </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
         {!items.length && (
           <Empty
             title="No expenses yet"
             description="Add a planned or actual cost for this journey."
           >
             <Button variant="default" onClick={() => { setEdit(null); setOpen(true); }}>
               <Plus size={14} /> Add expense
             </Button>
           </Empty>
         )}
      </Panel>
      <DemoNotice />
      <Modal
        open={open}
        onOpenChange={setOpen}
        title={edit ? "Edit expense" : "Make room in your plan"}
        description="Record planned and actual costs in USD."
      >
        <form onSubmit={save}>
          <div className="form-grid">
            <label className="full">
              Expense name
              <input
                required
                name="title"
                defaultValue={edit?.title}
                placeholder="Airport transfer"
              />
            </label>
            <label>
              Category
              <select
                name="category"
                defaultValue={edit?.category ?? "Transport"}
              >
                {[
                  "Flights",
                  "Housing",
                  "Administration",
                  "Health",
                  "Transport",
                  "Food",
                  "Other",
                ].map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </label>
            <label>
              Currency
              <input value="USD" readOnly />
            </label>
            <label>
              Planned amount
              <input
                type="number"
                min="0"
                step="0.01"
                name="planned"
                required
                defaultValue={edit?.planned ?? 100}
              />
            </label>
            <label>
              Actual amount
              <input
                type="number"
                min="0"
                step="0.01"
                name="actual"
                required
                defaultValue={edit?.actual ?? 0}
              />
            </label>
          </div>
          <div className="dialog-footer">
            <span className="muted">Saved in this browser</span>
            <Button variant="default" type="submit">
              Save expense
              <Check size={14} />
            </Button>
          </div>
        </form>
       </Modal>
       <Modal
         open={allowanceOpen}
         onOpenChange={setAllowanceOpen}
         title="Journey budget allowance"
         description={`Set the spending allowance for ${j.destination}.`}
       >
         <form onSubmit={(event) => {
           event.preventDefault();
           const value = Number(new FormData(event.currentTarget).get("allowance"));
           if (!Number.isFinite(value) || value < 0) return;
           update((current) => ({
             ...current,
             journeys: current.journeys.map((journey) =>
               journey.id === j.id ? { ...journey, budgetAllowance: value } : journey,
             ),
           }));
           setAllowanceOpen(false);
           toast("Journey allowance updated.");
         }}>
           <label>Allowance in USD<input name="allowance" type="number" min="0" step="0.01" defaultValue={allowance} required /></label>
           <div className="dialog-footer"><Button type="submit" variant="default">Save allowance</Button></div>
         </form>
       </Modal>
    </>
  );
}
export function SafetyView() {
  const { j } = useJourney();
  const [open, setOpen] = useState(false);
  return (
    <>
      <PageHeading
        title="Emergency assistance"
        description="Your important contacts and references, organized before you need them."
      >
        <Button onClick={() => setOpen(true)}>
          <Shield size={14} />
          Emergency information
        </Button>
      </PageHeading>
      <div className="warning">
        <TriangleAlert size={18} />
        <p>
          Emergency contacts are not configured. Save current local numbers
          and official consular contacts before departure.
        </p>
      </div>
      <div className="safety-grid">
        {[
          {
            icon: Phone,
            title: "Local emergency services",
            value: "Not configured",
            detail: "Verify the correct local numbers before departure.",
          },
          {
            icon: Globe2,
            title: "Embassy & consular assistance",
            value: `Your consulate in ${j.destination}`,
            detail:
              "Contact details not verified. Find your nationality’s official mission.",
          },
          {
            icon: Shield,
            title: "Travel insurance",
            value: "Not configured",
            detail: "Record your insurer’s confirmed assistance details.",
          },
          {
            icon: Users,
            title: "Your emergency contact",
            value: "Not configured",
            detail: "Keep a trusted contact accessible offline.",
          },
        ].map((c) => (
          <Panel key={c.title}>
            <div className="safety-card">
              <c.icon size={23} />
              <h3>{c.title}</h3>
              <strong>{c.value}</strong>
              <p>{c.detail}</p>
              <Badge tone="amber">Confirmation required</Badge>
            </div>
          </Panel>
        ))}
      </div>
      <div className="bottom-grid spaced">
        <Panel title="Before you travel">
          <div className="safety-notes">
            {[
              "Save verified emergency numbers separately.",
              "Share your itinerary with someone you trust.",
              "Keep original documents secure and accessible.",
              "Confirm insurance coverage directly with the provider.",
            ].map((t) => (
              <p key={t}>
                <Shield size={14} />
                {t}
              </p>
            ))}
          </div>
        </Panel>
        <Panel title="Important documents">
          <Link className="document-shortcut" href="/app/documents">
            <FileText size={19} />
            <div>
              <strong>Passport & insurance records</strong>
              <small>Document preparation</small>
            </div>
            <ArrowUpRight size={14} />
          </Link>
          <Link className="document-shortcut" href="/app/travel-day">
            <ArrowDownToLine size={19} />
            <div>
              <strong>Offline reference pack</strong>
              <small>Preview your local reference pack</small>
            </div>
            <ArrowUpRight size={14} />
          </Link>
        </Panel>
      </div>
      <DemoNotice />
      <Modal
        open={open}
        onOpenChange={setOpen}
        title="Emergency information"
        description="This application is not an emergency service."
      >
        <div className="warning">
          <TriangleAlert size={24} />
          <p>
            No emergency contact is configured. If someone
            is at risk, contact local emergency services using a number
            confirmed by an official source.
          </p>
        </div>
        <p className="detail-paragraph">
          Before your real journey, save confirmed local emergency, consular and
          insurance contacts in a place you can access without internet.
        </p>
        <Button asChild>
          <Link href="/app/sources">
            Find official starting points
            <ArrowRight size={14} />
          </Link>
        </Button>
      </Modal>
    </>
  );
}
export function FamilyView() {
  const { state, update, toast, j } = useJourney();
  const [add, setAdd] = useState(false);
  const people = state.travelers.filter((t) => j.travelers.includes(t.id));
  return (
    <>
      <PageHeading
        title="Traveler information"
        description="Manage each traveler’s information separately."
      >
        <Button variant="default" onClick={() => setAdd(true)}>
          <Plus size={14} />
          Add traveler
        </Button>
      </PageHeading>
      <div className="arrival-banner">
        <span className="journey-icon lavender">
          <Users size={25} />
        </span>
        <div>
          <h2>
            {people.length === 1
              ? "One traveler. A world of possibilities."
              : "Together, a little more prepared."}
          </h2>
          <p>
            {j.name} · {people.length} traveler{people.length > 1 ? "s" : ""} ·
            Click a profile to switch traveler context
          </p>
        </div>
        <Badge>Personal information</Badge>
      </div>
      <div className="traveler-grid">
        {people.map((t) => {
          const tasks = state.tasks.filter(
            (x) => x.journeyId === j.id && x.travelerId === t.id,
          );
          return (
            <button
              key={t.id}
              className={`traveler-card ${state.activeTravelerId === t.id ? "selected" : ""}`}
              onClick={() => {
                update((s) => ({ ...s, activeTravelerId: t.id }));
                toast(`Traveler context switched to ${t.name}.`);
              }}
            >
              <div className="between">
                <span className={`avatar large ${t.color}`}>{t.initials}</span>
                {state.activeTravelerId === t.id && (
                  <Badge tone="blue">
                    <Check size={11} />
                    Selected
                  </Badge>
                )}
              </div>
              <h2>{t.name}</h2>
              <p>{t.role}</p>
              <div className="context-details">
                <span>
                  Nationality<strong>{t.nationality}</strong>
                </span>
                <span>
                  Residence<strong>{t.residence}</strong>
                </span>
                <span>
                  Linked documents
                  <strong>
                    {
                      state.documents.filter(
                        (d) => d.journeyId === j.id && d.ownerId === t.id,
                      ).length
                    }
                  </strong>
                </span>
                <span>
                  Individual planning
                  <strong>
                    {tasks.length
                      ? `${readiness(tasks)}% complete`
                      : "Needs individual review"}
                  </strong>
                </span>
              </div>
              <Progress value={readiness(tasks)} />
              <small>Entry eligibility not verified</small>
            </button>
          );
        })}
      </div>
      <Panel className="spaced" title="Coordinate without the chaos">
        <div className="panel-padding">
          <p>
            Each traveler’s nationality, documents and requirements can
            differ—even on the same booking. Switch traveler context before
            reviewing entry information.
          </p>
          <div className="inline-links">
            <TextLink href="/app/entry">
              Review selected traveler’s requirements
            </TextLink>
            <TextLink href="/app/documents">Manage document owners</TextLink>
          </div>
        </div>
      </Panel>
      <DemoNotice />
      <Modal
        open={add}
        onOpenChange={setAdd}
        title="Someone else coming along?"
        description="Add personal information for an additional traveler."
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const f = new FormData(e.currentTarget);
            const name = String(f.get("name")).trim();
            if (!name) return;
            const id = `traveler-${Date.now()}`;
            update((s) => ({
              ...s,
              travelers: [
                ...s.travelers,
                {
                  id,
                  name,
                  initials: name
                    .split(" ")
                    .map((x) => x[0])
                    .join("")
                    .slice(0, 2)
                    .toUpperCase(),
                  role: "Additional traveler",
                  nationality: String(f.get("nationality")),
                  residence: String(f.get("residence")),
                  color: "blue",
                },
              ],
              journeys: s.journeys.map((x) =>
                x.id === j.id ? { ...x, travelers: [...x.travelers, id] } : x,
              ),
              activeTravelerId: id,
            }));
            setAdd(false);
            toast(
              "Traveler added. Individual requirements need review.",
            );
          }}
        >
          <div className="form-grid">
            <label className="full">
              Full legal name
              <input name="name" required placeholder="Full name" />
            </label>
            <label>
              Nationality
              <input name="nationality" required defaultValue="Canada" />
            </label>
            <label>
              Residence
              <input name="residence" required defaultValue="Canada" />
            </label>
          </div>
          <div className="dialog-footer">
            <Badge>Separate traveler record</Badge>
            <Button variant="default" type="submit">
              Add traveler
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
export function NotificationsView() {
  const { state, update } = useDemo();
  const [filter, setFilter] = useState<"All updates" | "Unread" | "Read">("All updates");
  const visibleNotifications = activeNotifications(state);
  const unreadCount = visibleNotifications.filter((notification) => !notification.read).length;
  const items = visibleNotifications.filter(
    (n) => filter === "All updates" || (filter === "Unread" ? !n.read : n.read),
  );
  const displayTitle = (notification: (typeof visibleNotifications)[number]) =>
    notification.title === "Your next chapter is getting closer"
      ? "Departure preparation reminder"
      : notification.title;
  const displayDetail = (notification: (typeof visibleNotifications)[number]) =>
    notification.title === "Your next chapter is getting closer"
      ? "Review outstanding preparation tasks before your departure."
      : notification.detail;
  const timestamp = (notification: (typeof visibleNotifications)[number]) => {
    const value = (notification as typeof notification & { timestamp?: string | number }).timestamp;
    if (value === undefined || value === "") return undefined;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? undefined : date;
  };
  return (
    <>
      <PageHeading
        title="Notifications"
        description={`${unreadCount} unread · Saved in this browser`}
      >
        <Button
          disabled={!unreadCount}
          onClick={() =>
            update((s) => ({
              ...s,
              notifications: s.notifications.map((n) => ({ ...n, read: true })),
            }))
          }
        >
          <CheckCheck size={14} />
          Mark all as read
        </Button>
      </PageHeading>
      <div className="tabs standalone">
        {(["All updates", "Unread", "Read"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setFilter(t)}
            className={filter === t ? "active" : ""}
          >
            {t}
            <Badge>{t === "All updates" ? visibleNotifications.length : t === "Unread" ? unreadCount : visibleNotifications.length - unreadCount}</Badge>
          </button>
        ))}
      </div>
      <Panel>
        {items.map((n) => {
          const createdAt = timestamp(n);
          return <Link
            className={`notification-row ${!n.read ? "unread" : ""}`}
            href={`/app/${n.route}`}
            key={n.id}
            onClick={() =>
              update((s) => ({
                ...s,
                activeJourneyId: n.journeyId ?? s.activeJourneyId,
                activeTravelerId: n.journeyId
                  ? (s.journeys.find((j) => j.id === n.journeyId)
                      ?.travelers[0] ?? s.activeTravelerId)
                  : s.activeTravelerId,
                notifications: s.notifications.map((x) =>
                  x.id === n.id ? { ...x, read: true } : x,
                ),
              }))
            }
          >
            <span
              className={`notification-icon ${n.type === "Requirement" ? "amber" : "blue"}`}
            >
              {n.type === "Requirement" ? (
                <Globe2 size={18} />
              ) : (
                <Bell size={18} />
              )}
            </span>
            <div>
              <div className="inline">
                <h3>{displayTitle(n)}</h3>
                {!n.read && <span className="unread-dot" />}
              </div>
              <p>{displayDetail(n)}</p>
              <small className="notification-meta">{n.type}{createdAt && <> · <time className="notification-time" dateTime={createdAt.toISOString()}>{createdAt.toLocaleString()}</time></>}</small>
            </div>
            <ChevronRight size={16} />
          </Link>
        })}
        {!items.length && (
          <Empty
            title={filter === "Read" ? "No read updates." : "You’re all caught up."}
            description={filter === "Read" ? "Read notifications for this journey will appear here." : "No unread notifications for this journey."}
          />
        )}
      </Panel>
      <DemoNotice />
    </>
  );
}
export function SettingsView() {
  const { state, update, toast } = useDemo();
  const [tab, setTab] = useState("Profile");
  const [reset, setReset] = useState(false);
  return (
    <>
      <PageHeading
        title="Settings"
        description="Profile, preferences and privacy."
      />
      <div className="settings-layout">
        <nav className="settings-nav">
          {[
            "Profile",
            "Appearance",
            "Preferences",
            "Notifications",
            "Privacy & data",
            "Account",
          ].map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={tab === t ? "active" : ""}
            >
              {t}
              <ChevronRight size={13} />
            </button>
          ))}
        </nav>
        <Panel
          title={tab}
          description={
            tab === "Account"
              ? "Personal workspace. No external account service connected."
              : "Workspace preferences saved in this browser."
          }
        >
          <div className="settings-body">
            {tab === "Profile" ? (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const f = new FormData(e.currentTarget);
                  update((s) => ({ ...s, profile: String(f.get("name")) }));
                  toast("Profile saved.");
                }}
              >
                <div className="profile-preview">
                  <span className="avatar large lavender">{state.profile.split(" ").map((part) => part[0]).slice(0, 2).join("")}</span>
                  <div>
                    <strong>{state.profile}</strong>
                    <p>Personal information</p>
                  </div>
                </div>
                <div className="form-grid">
                  <label className="full">
                    Display name
                    <input name="name" required defaultValue={state.profile} />
                  </label>
                </div>
                <Button className="spaced" type="submit" variant="default">
                  Save profile
                </Button>
              </form>
            ) : tab === "Appearance" ? (
              <>
                <p>A quieter workspace, in either light.</p>
                <div className="theme-options">
                  {(["light", "dark"] as const).map((t) => (
                    <button
                      key={t}
                      className={state.theme === t ? "selected" : ""}
                      onClick={() => update((s) => ({ ...s, theme: t }))}
                    >
                      <div className={`theme-preview ${t}`}>
                        <i />
                        <span>
                          <b />
                          <b />
                          <b />
                        </span>
                      </div>
                      <strong>
                        {t === "light" ? <Sun size={15} /> : <Moon size={15} />}{" "}
                        {t === "light" ? "Light" : "Dark"}
                      </strong>
                      {state.theme === t && <Check size={14} />}
                    </button>
                  ))}
                </div>
              </>
            ) : tab === "Preferences" ? (
              <div className="form-grid">
                <label className="full">
                  Language
                  <select
                    value={state.language}
                    onChange={(e) => {
                      update((s) => ({ ...s, language: e.target.value }));
                      toast(
                        "Language preference saved. Interface is currently English only.",
                      );
                    }}
                  >
                    {["English", "French", "Spanish", "Hindi"].map((c) => (
                      <option key={c}>{c}</option>
                    ))}
                  </select>
                  <small>
                    Interface translations are not connected.
                  </small>
                </label>
                <label className="full">
                  Preferred currency
                  <select
                    value={state.currency}
                    onChange={(e) => {
                      update((s) => ({ ...s, currency: e.target.value }));
                      toast(
                        "Preference saved. Expenses remain in USD; no currency conversion.",
                      );
                    }}
                  >
                    {["USD", "GBP", "EUR", "CAD", "INR"].map((c) => (
                      <option key={c}>{c}</option>
                    ))}
                  </select>
                  <small>
                    Expenses retain their recorded currency. No exchange
                    rates.
                  </small>
                </label>
              </div>
            ) : tab === "Notifications" ? (
              <>
                {[
                  [
                    "deadlines",
                    "Deadline reminders",
                    "A nudge when a planning step is coming up.",
                  ],
                  [
                    "requirements",
                    "Requirement changes",
                    "Requirement review reminders.",
                  ],
                  [
                    "digest",
                    "Weekly planning digest",
                    "An overview of your preparation progress.",
                  ],
                ].map(([key, title, detail]) => (
                  <div className="preference-row" key={key}>
                    <div>
                      <h3>{title}</h3>
                      <p>{detail}</p>
                    </div>
                    <button
                      role="switch"
                      aria-checked={!!state.preferences[key]}
                      aria-label={title}
                      className={`switch ${state.preferences[key] ? "on" : ""}`}
                      onClick={() =>
                        update((s) => ({
                          ...s,
                          preferences: {
                            ...s.preferences,
                            [key]: !s.preferences[key],
                          },
                        }))
                      }
                    >
                      <i />
                    </button>
                  </div>
                ))}
                <p className="muted small">
                  In-app preferences only. No external messages are sent.
                </p>
              </>
            ) : tab === "Privacy & data" ? (
              <>
                <div className="privacy-explainer">
                  <LockKeyhole size={25} />
                  <h3>Your workspace stays in this browser.</h3>
                  <p>
                    Metadata is stored in browser storage, not an encrypted vault.
                    Passport numbers are masked. Do not add sensitive document content.
                  </p>
                </div>
                <div className="preference-row">
                  <div>
                    <h3>Take a copy</h3>
                    <p>Download workspace metadata as JSON.</p>
                  </div>
                  <ExportButton />
                </div>
                <div className="preference-row">
                  <div>
                    <h3>Start fresh</h3>
                    <p>Replace local edits with the preview workspace.</p>
                  </div>
                  <Button variant="destructive" onClick={() => setReset(true)}>
                    Reset workspace
                  </Button>
                </div>
                {!!state.workspaceHistory?.length && <section className="saved-workspaces">
                  <h3>Saved workspaces</h3>
                  <p className="muted small">Earlier workspaces are retained separately when you onboard another traveler.</p>
                  {state.workspaceHistory.map((workspace, index) => <div className="preference-row" key={`${workspace.savedAt}-${index}`}>
                    <div><h3>{workspace.name}</h3><p>{new Date(workspace.savedAt).toLocaleDateString()} · {workspace.state.journeys.length} journeys</p></div>
                    <Button size="sm" onClick={() => {
                      if (!isDemoState(workspace.state)) { toast("This saved workspace cannot be restored."); return; }
                      update(current => {
                        const { workspaceHistory = [], ...snapshot } = current;
                        return { ...workspace.state, workspaceHistory: [
                          ...workspaceHistory.filter((_, i) => i !== index),
                          { name: current.profile, savedAt: new Date().toISOString(), state: snapshot },
                        ] };
                      });
                      toast("Saved workspace restored. Your previous workspace is also retained.");
                    }}>Restore workspace</Button>
                  </div>)}
                </section>}
              </>
            ) : (
              <>
                <Badge>Local workspace</Badge>
                <h3 className="spaced">
                  No sign-in needed. Nothing to subscribe to.
                </h3>
                <p>
                  Authentication, billing,
                  team invitations and active integrations are not connected.
                </p>
                <Button asChild>
                  <Link href="/">
                    Visit Meridian website
                    <ArrowUpRight size={14} />
                  </Link>
                </Button>
              </>
            )}
          </div>
        </Panel>
      </div>
      <Modal
        open={reset}
        onOpenChange={setReset}
        title="Start with a clean itinerary?"
        description="This replaces Meridian’s workspace in this browser. Your local edits will be lost."
      >
        <div className="dialog-footer">
          <Button onClick={() => setReset(false)}>Keep my changes</Button>
          <Button
            variant="destructive"
            onClick={() => {
              update(() => createSeed());
              setReset(false);
              toast("Workspace reset. Preview journeys are ready.");
            }}
          >
            Reset workspace
          </Button>
        </div>
      </Modal>
    </>
  );
}
type Message = { role: "user" | "assistant"; text: string; links?: AssistantReply["links"] };
export function AIView() {
  const { state, j } = useJourney();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  function ask(question: string) {
    if (!question.trim() || busy) return;
    setInput("");
    setMessages((s) => [...s, { role: "user", text: question }]);
    setBusy(true);
    const answer = assistantReply(question, state);
    window.setTimeout(() => {
      setMessages((s) => [...s, { role: "assistant", text: answer.text, links: answer.links }]);
      setBusy(false);
    }, 150);
  }
  return (
    <div className="ai-page">
      <div className="ai-topbar">
        <span>
          <Sparkles size={17} />
          Meridian Assistant
        </span>
        <Button size="sm" onClick={() => setMessages([])}>
          <Plus size={13} />
          New conversation
        </Button>
      </div>
      <div className="ai-context">
        <span className="live-dot" />
        Context: {j.name}
        <Link href="/app/journey">
          View journey
          <ArrowUpRight size={12} />
        </Link>
      </div>
      <div className="conversation">
        {!messages.length ? (
          <div className="ai-welcome">
            <div className="ai-welcome-icon">
              <Sparkles size={30} strokeWidth={1.4} />
            </div>
            <h1>How can I help?</h1>
            <p>
              Find requirements, documents and next steps in your workspace.
            </p>
            <div className="prompt-grid">
              {[
                "What should I do before I fly?",
                "Which documents have I added?",
                "How is my budget looking?",
                "What changed in my requirements?",
              ].map((p, i) => (
                <button key={p} onClick={() => ask(p)}>
                  {i === 0 ? (
                    <Check size={17} />
                  ) : i === 1 ? (
                    <FileText size={17} />
                  ) : i === 2 ? (
                    <Wallet size={17} />
                  ) : (
                    <Globe2 size={17} />
                  )}
                  <span>{p}</span>
                  <ArrowUpRight size={13} />
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="message-list">
            {messages.map((m, i) => (
              <div key={i} className={`message ${m.role}`}>
                <span
                  className={
                    m.role === "assistant"
                      ? "ai-message-avatar"
                      : "avatar tiny lavender"
                  }
                >
                  {m.role === "assistant" ? <Sparkles size={16} /> : "M"}
                </span>
                <div>
                  <strong>{m.role === "assistant" ? "Meridian" : "You"}</strong>
                  <p>{m.text}</p>
                  {m.role === "assistant" && (
                    <div className="message-sources">
                       {m.links?.map((link) => <Link key={link.href} href={link.href}>{link.label}<ArrowUpRight size={11} /></Link>)}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {busy && (
              <div className="message assistant">
                <span className="ai-message-avatar">
                  <Sparkles size={16} />
                </span>
                <p className="thinking" role="status">
                  Reading your workspace…
                </p>
              </div>
            )}
          </div>
        )}
      </div>
      <div className="ai-composer-wrap">
        <form
          className="ai-composer"
          onSubmit={(e) => {
            e.preventDefault();
            ask(input);
          }}
        >
          <textarea
            rows={2}
            aria-label="Ask Meridian"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={`Ask about your journey to ${j.destination}…`}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                ask(input);
              }
            }}
          />
          <div>
            <span>
              <Sparkles size={12} />
              Local workspace
            </span>
            <Button
              variant="default"
              size="icon"
              type="submit"
              disabled={busy || !input.trim()}
              aria-label="Send message"
            >
              <ArrowUpRight size={18} />
            </Button>
          </div>
        </form>
        <p>
          Local intent matching · No external AI service connected
        </p>
      </div>
    </div>
  );
}
