"use client";
import Link from "next/link";
import { useState } from "react";
import { usePathname } from "next/navigation";
import {
  ArrowUpRight,
  Bell,
  CalendarCheck,
  ClipboardList,
  ChevronDown,
  CreditCard,
  FolderClosed,
  Globe2,
  House,
  Map,
  Menu,
  Moon,
  PanelLeftClose,
  PanelLeftOpen,
  Plane,
  Search,
  Settings,
  Shield,
  Sparkles,
  Sun,
} from "lucide-react";
import { useDemo } from "@/lib/store";
import { activeJourney, activeNotifications } from "@/lib/journey-state";
import { Brand } from "./common";
import { Modal } from "./ui/dialog";
import { JourneyForm } from "./journey-form";
import { Overview, Journeys, JourneyWorkspace } from "./views/overview";
import { EntryView, SourcesView } from "./views/entry";
import { ApplicationsView } from "./views/applications";
import { TasksView, DocumentsView } from "./views/organize";
import {
  TravelView,
  LayoverView,
  TravelDayView,
  ArrivalView,
} from "./views/travel";
import {
  BudgetView,
  SafetyView,
  FamilyView,
  NotificationsView,
  SettingsView,
  AIView,
} from "./views/life";
export const navigation = [
  { label: "Overview", path: "overview", icon: House },
  { label: "Journeys", path: "journeys", icon: Map },
  { label: "Visa & entry", path: "entry", icon: Globe2 },
  { label: "Applications", path: "applications", icon: ClipboardList },
  { label: "Documents", path: "documents", icon: FolderClosed },
  { label: "Tasks", path: "tasks", icon: CalendarCheck },
  { label: "Travel", path: "travel", icon: Plane },
  { label: "Arrival", path: "arrival", icon: House },
  { label: "Expenses", path: "budget", icon: CreditCard },
];
export function Workspace({ section }: { section: string }) {
  const { state, update, selectJourney, ready } = useDemo();
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobile, setMobile] = useState(false);
  const [create, setCreate] = useState(false);
  const [search, setSearch] = useState(false);
  const [query, setQuery] = useState("");
  const [profile, setProfile] = useState(false);
  const journey = activeJourney(state);
  const unread = activeNotifications(state).filter((n) => !n.read).length;
  const initials = state.profile
    .split(" ")
    .slice(0, 2)
    .map((word) => word[0])
    .join("");
  const label =
    navigation.find((n) => n.path === section)?.label ??
    {
      journey: "Journey workspace",
      ai: "Meridian Assistant",
      sources: "Official references",
      family: "Traveler information",
      safety: "Emergency assistance",
      layovers: "Transit",
      "travel-day": "Travel-day checklist",
      settings: "Settings",
      notifications: "Notifications",
    }[section] ??
    "Page not found";
  const pages: Record<string, React.ReactNode> = {
    overview: <Overview onCreate={() => setCreate(true)} />,
    journeys: <Journeys onCreate={() => setCreate(true)} />,
    journey: <JourneyWorkspace />,
    entry: <EntryView />,
    applications: <ApplicationsView />,
    tasks: <TasksView />,
    documents: <DocumentsView />,
    travel: <TravelView />,
    layovers: <LayoverView />,
    "travel-day": <TravelDayView />,
    arrival: <ArrivalView />,
    budget: <BudgetView />,
    safety: <SafetyView />,
    family: <FamilyView />,
    notifications: <NotificationsView />,
    settings: <SettingsView />,
    sources: <SourcesView />,
    ai: <AIView />,
  };
  return (
    <div
      className={`app-shell ${collapsed ? "sidebar-collapsed" : ""} ${mobile ? "mobile-open" : ""}`}
    >
      {mobile && (
        <button
          className="mobile-scrim"
          aria-label="Close navigation"
          onClick={() => setMobile(false)}
        />
      )}
      <a className="skip-link" href="#workspace-main">
        Skip to workspace
      </a>
      <aside className="sidebar">
        <div className="sidebar-brand">
          <Brand compact={collapsed} />
          <button
            className="sidebar-collapse"
            aria-label="Collapse sidebar"
            onClick={() => {
              setCollapsed(!collapsed);
              setMobile(false);
            }}
          >
            <PanelLeftClose size={16} />
          </button>
        </div>
        <div className="workspace-switch">
          <span className="workspace-avatar">M</span>
          <div>
            <strong>Travel workspace</strong>
            <small>Cross-border preparation</small>
          </div>
          <ChevronDown size={13} />
        </div>
        <button className="sidebar-search" onClick={() => setSearch(true)}>
          <Search size={15} />
          <span>Find anything</span>
          <kbd>⌕</kbd>
        </button>
        <nav aria-label="Main navigation">
          <div className="nav-group-label">Workspace</div>
          {navigation.map((n) => (
            <Link
              title={n.label}
              key={n.path}
              href={`/app/${n.path}`}
              onClick={() => setMobile(false)}
              className={`nav-link ${section === n.path || (n.path === "journeys" && section === "journey") || (n.path === "travel" && ["layovers", "travel-day"].includes(section)) || (n.path === "entry" && section === "sources") ? "active" : ""}`}
            >
              <n.icon size={16} />
              <span>{n.label}</span>
              {n.path === "tasks" && (
                <small>
                  {
                    state.tasks.filter(
                      (t) => t.journeyId === journey?.id && !t.done,
                    ).length
                  }
                </small>
              )}
            </Link>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <Link
            className={`nav-link ${section === "settings" ? "active" : ""}`}
            href="/app/settings"
          >
            <Settings size={16} />
            <span>Settings</span>
          </Link>
          <button
            className="profile-button"
            onClick={() => setProfile(!profile)}
          >
            <span className="avatar lavender">{initials}</span>
            <span>
              <strong>{state.profile}</strong>
              <small>Personal account</small>
            </span>
            <ChevronDown size={14} />
          </button>
          {profile && (
            <div className="profile-popover">
              <Link href="/app/settings" onClick={() => setProfile(false)}>
                Profile & preferences
              </Link>
              <button
                onClick={() =>
                  update((s) => ({
                    ...s,
                    theme: s.theme === "light" ? "dark" : "light",
                  }))
                }
              >
                {state.theme === "light" ? (
                  <Moon size={14} />
                ) : (
                  <Sun size={14} />
                )}{" "}
                Switch appearance
              </button>
              <Link href="/">
                Back to website <ArrowUpRight size={12} />
              </Link>
            </div>
          )}
        </div>
      </aside>
      <div className="app-main">
        <header className="workspace-header">
          <div className="breadcrumb">
            {collapsed && (
              <button
                className="icon-button"
                aria-label="Expand sidebar"
                onClick={() => setCollapsed(false)}
              >
                <PanelLeftOpen size={17} />
              </button>
            )}
            <button
              className="mobile-menu"
              aria-label="Open navigation"
              onClick={() => setMobile(true)}
            >
              <Menu size={20} />
            </button>
            <span className="header-home">
              <House size={14} />
            </span>
            <span className="slash">/</span>
            <span>{label}</span>
          </div>
          <div className="header-actions">
            <Link
              href="/app/safety"
              className="icon-button"
              aria-label="Emergency assistance"
              title="Emergency assistance"
            >
              <Shield size={16} />
            </Link>
            <Link
              href="/app/ai"
              className="icon-button"
              aria-label="Meridian Assistant"
              title="Meridian Assistant"
            >
              <Sparkles size={16} />
            </Link>
            <select
              aria-label="Journey selector"
              className="scenario-switch"
              value={journey?.id ?? ""}
              onChange={(e) => selectJourney(e.target.value)}
            >
              {!journey && <option value="">No active journeys</option>}
              {state.journeys
                .filter((j) => !j.archived)
                .map((j) => (
                  <option value={j.id} key={j.id}>
                    {j.name}
                  </option>
                ))}
            </select>
            <button
              className="icon-button theme-toggle"
              aria-label="Toggle theme"
              onClick={() =>
                update((s) => ({
                  ...s,
                  theme: s.theme === "light" ? "dark" : "light",
                }))
              }
            >
              {state.theme === "light" ? <Moon size={16} /> : <Sun size={16} />}
            </button>
            <Link
              className="icon-button notification-bell"
              href="/app/notifications"
              aria-label={`Notifications, ${unread} unread`}
            >
              <Bell size={17} />
              {unread > 0 && <i />}
            </Link>
            <Link
              href="/app/settings"
              className="avatar tiny lavender"
              aria-label="Profile settings"
            >
              {initials}
            </Link>
          </div>
        </header>
        <main
          className="app-content"
          id="workspace-main"
          key={`${pathname}-${journey?.id ?? "empty"}`}
        >
          {!ready ? (
            <div className="skeleton-page">
              <div />
              <div />
              <div />
            </div>
          ) : (
            <>
              {["travel", "layovers", "travel-day"].includes(section) && (
                <nav className="tabs standalone" aria-label="Travel sections">
                  <Link
                    className={section === "travel" ? "active" : ""}
                    href="/app/travel"
                  >
                    Itinerary & route
                  </Link>
                  <Link
                    className={section === "layovers" ? "active" : ""}
                    href="/app/layovers"
                  >
                    Transit
                  </Link>
                  <Link
                    className={section === "travel-day" ? "active" : ""}
                    href="/app/travel-day"
                  >
                    Travel-day checklist
                  </Link>
                </nav>
              )}
              {["entry", "sources"].includes(section) && (
                <nav className="tabs standalone" aria-label="Entry sections">
                  <Link
                    className={section === "entry" ? "active" : ""}
                    href="/app/entry"
                  >
                    Requirements
                  </Link>
                  <Link
                    className={section === "sources" ? "active" : ""}
                    href="/app/sources"
                  >
                    Official references
                  </Link>
                </nav>
              )}
              {["settings", "family"].includes(section) && (
                <nav className="tabs standalone" aria-label="Settings sections">
                  <Link
                    className={section === "settings" ? "active" : ""}
                    href="/app/settings"
                  >
                    Preferences & privacy
                  </Link>
                  <Link
                    className={section === "family" ? "active" : ""}
                    href="/app/family"
                  >
                    Traveler information
                  </Link>
                </nav>
              )}
               {!journey && !["overview", "journeys", "settings"].includes(section) ? (
                 <div className="empty">
                   <h1>No active journey</h1>
                   <p>Restore an archived journey or create a new one.</p>
                   <Link href="/app/journeys">Open journeys</Link>
                 </div>
               ) : pages[section] ?? (
                 <div className="empty">
                  <h1>This page took a detour.</h1>
                  <Link href="/app">Return to overview</Link>
                </div>
              )}
            </>
          )}
        </main>
        <footer className="app-footer">
          <span>Meridian · Travel readiness & cross-border services</span>
          <span>Local workspace</span>
        </footer>
      </div>
      {create && <JourneyForm open onOpenChange={setCreate} />}
      <Modal
        open={search}
        onOpenChange={setSearch}
        title="Find your next step"
        description="Search pages, tasks and journeys."
      >
        <div className="search-box">
          <Search size={18} />
          <input
            autoFocus
            placeholder="Search your workspace…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <div className="search-results">
          {[
            ...navigation.map((n) => ({ label: n.label, path: n.path })),
            ...state.journeys.filter((j) => !j.archived).map((j) => ({
              label: j.name,
              path: "journey",
              id: j.id,
            })),
            ...state.tasks
              .filter((t) => t.journeyId === journey?.id)
              .map((t) => ({ label: t.title, path: "tasks" })),
          ]
            .filter((n) => n.label.toLowerCase().includes(query.toLowerCase()))
            .map((n, i) => (
              <Link
                key={`${n.label}-${i}`}
                href={`/app/${n.path}`}
                onClick={() => {
                  if ("id" in n && typeof n.id === "string")
                    selectJourney(n.id);
                  setSearch(false);
                }}
              >
                {n.label}
                <ArrowUpRight size={14} />
              </Link>
            ))}
        </div>
      </Modal>
    </div>
  );
}
