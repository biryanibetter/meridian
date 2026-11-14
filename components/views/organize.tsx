"use client";
import { useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import {
  CalendarDays,
  Check,
  LayoutList,
  Pencil,
  Plus,
  Search,
  Upload,
  MoreHorizontal,
  FileText,
} from "lucide-react";
import { useDemo } from "@/lib/store";
import { dueDate, formatDate, readiness } from "@/lib/planning";
import type { Task } from "@/lib/types";
import {
  Badge,
  DemoNotice,
  Empty,
  PageHeading,
  Panel,
  Progress,
  TaskRows,
} from "../common";
import { Button } from "../ui/button";
import { Modal } from "../ui/dialog";
import { invalidateTaskDescendants } from "@/lib/task-dependencies";
import { DocumentEditor } from "../document-editor";
import { applicationRequirements, documentStatus } from "@/lib/visa-workflow";
const documentCategories = [
  "Passport",
  "Visa",
  "Financial evidence",
  "Admission",
  "Insurance",
  "Accommodation",
  "Healthcare",
  "Booking",
  "Certificate",
  "Other",
];
export function TasksView() {
  const { state, update, toast } = useDemo();
  const j =
    state.journeys.find((j) => j.id === state.activeJourneyId) ??
    state.journeys[0];
  const tasks = state.tasks.filter((t) => t.journeyId === j.id);
  const [filter, setFilter] = useState("All tasks");
  const [search, setSearch] = useState("");
  const [view, setView] = useState("List");
  const [edit, setEdit] = useState<Task | null>(null);
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("Planning");
  const [priority, setPriority] = useState<Task["priority"]>("Medium");
  const [offset, setOffset] = useState(-7);
  const [owner, setOwner] = useState(state.activeTravelerId);
  const [dependency, setDependency] = useState("");
  const filtered = tasks.filter(
    (t) =>
      (filter === "All tasks" ||
        (filter === "To do" && !t.done) ||
        (filter === "Completed" && t.done) ||
        (filter === "High priority" && t.priority === "High")) &&
      t.title.toLowerCase().includes(search.toLowerCase()),
  );
  function start(t?: Task) {
    setEdit(t ?? null);
    setTitle(t?.title ?? "");
    setCategory(t?.category ?? "Planning");
    setPriority(t?.priority ?? "Medium");
    setOffset(t?.offset ?? -7);
    setOwner(t?.travelerId ?? state.activeTravelerId);
    setDependency(t?.dependency ?? "");
    setOpen(true);
  }
  function save(e: FormEvent) {
    e.preventDefault();
    const task: Task = {
      id: edit?.id ?? `task-${Date.now()}`,
      journeyId: j.id,
      title: title.trim(),
      category,
      offset,
      done: edit?.done ?? false,
      priority,
      travelerId: owner,
      dependency: dependency || undefined,
    };
    if (!task.title) return;
    update((s) => {
      const next = edit
        ? s.tasks.map((t) => (t.id === edit.id ? task : t))
        : [...s.tasks, task];
      const blocked =
        task.dependency && !next.find((t) => t.id === task.dependency)?.done;
      return {
        ...s,
        tasks: blocked ? invalidateTaskDescendants(next, task.id) : next,
      };
    });
    setOpen(false);
    toast(edit ? "Task updated." : "Task added to your journey.");
  }
  return (
    <>
      <PageHeading
        title="Tasks"
        description={`${j.destination} · Preparation and planning targets`}
      >
        <Button variant="default" onClick={() => start()}>
          <Plus size={14} />
          Add task
        </Button>
      </PageHeading>
      <div className="task-summary">
        <div>
          <span className="summary-icon">
            <Check size={20} />
          </span>
          <div>
            <strong>
              {tasks.filter((t) => t.done).length} of {tasks.length} complete
            </strong>
            <p>One less thing to carry in your head.</p>
          </div>
        </div>
        <div>
          <strong>{readiness(tasks)}%</strong>
          <Progress value={readiness(tasks)} />
        </div>
      </div>
      <div className="toolbar wrap">
        <div className="tabs">
          {["All tasks", "To do", "Completed", "High priority"].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={filter === f ? "active" : ""}
            >
              {f}
            </button>
          ))}
        </div>
        <div className="toolbar-actions">
          <div className="input-icon">
            <Search size={14} />
            <input
              placeholder="Search tasks…"
              aria-label="Search tasks"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="segmented">
            {["List", "Timeline"].map((v) => (
              <button
                aria-label={`${v} view`}
                key={v}
                className={view === v ? "active" : ""}
                onClick={() => setView(v)}
              >
                {v === "List" ? (
                  <LayoutList size={15} />
                ) : (
                  <CalendarDays size={15} />
                )}
              </button>
            ))}
          </div>
        </div>
      </div>
      {filtered.length ? (
        <Panel>
          {view === "List" ? (
            <div className="editable-tasks">
              {filtered.map((t) => (
                <div key={t.id} className="editable-task">
                  <TaskRows tasks={[t]} journey={j} />
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Edit ${t.title}`}
                    onClick={() => start(t)}
                  >
                    <Pencil size={13} />
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <div className="task-timeline">
              {filtered
                .toSorted((a, b) => a.offset - b.offset)
                .map((t) => (
                  <div key={t.id}>
                    <time className="mono">
                      {formatDate(dueDate(j.departure, t.offset))}
                    </time>
                    <span className={t.done ? "complete" : ""} />
                    <section>
                      <Badge
                        tone={
                          t.done
                            ? "green"
                            : t.priority === "High"
                              ? "amber"
                              : "blue"
                        }
                      >
                        {t.done ? "Complete" : t.priority + " priority"}
                      </Badge>
                      <h3>{t.title}</h3>
                      <p>
                        {Math.abs(t.offset)} days{" "}
                        {t.offset <= 0 ? "before" : "after"} departure ·{" "}
                        {t.category}
                      </p>
                      <Button size="sm" onClick={() => start(t)}>
                        Edit task
                      </Button>
                    </section>
                  </div>
                ))}
            </div>
          )}
        </Panel>
      ) : (
        <Empty
          title="Nothing on this list."
          description="Try another filter, or add your next planning step."
        >
          <Button onClick={() => start()}>Add task</Button>
        </Empty>
      )}
      <DemoNotice />
      <Modal
        open={open}
        onOpenChange={setOpen}
        title={edit ? "Edit task" : "Add task"}
        description="Deadlines are relative to departure, so your plan stays in sync."
      >
        <form onSubmit={save}>
          <div className="form-grid">
            <label className="full">
              Task name
              <input
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Arrange an airport transfer"
              />
            </label>
            <label>
              Category
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                {[
                  "Planning",
                  "Documents",
                  "Entry",
                  "Travel",
                  "Safety",
                  "Arrival",
                ].map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </label>
            <label>
              Priority
              <select
                value={priority}
                onChange={(e) =>
                  setPriority(e.target.value as Task["priority"])
                }
              >
                {["High", "Medium", "Low"].map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </label>
            <label>
              Days relative to departure
              <input
                type="number"
                required
                min="-365"
                max="365"
                value={offset}
                onChange={(e) => setOffset(Number(e.target.value))}
              />
              <small>Negative means before departure.</small>
            </label>
            <label>
              Assigned traveler
              <select value={owner} onChange={(e) => setOwner(e.target.value)}>
                {state.travelers
                  .filter((t) => j.travelers.includes(t.id))
                  .map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
              </select>
            </label>
            <label className="full">
              Depends on
              <select
                value={dependency}
                onChange={(e) => setDependency(e.target.value)}
              >
                <option value="">No dependency</option>
                {tasks
                  .filter((t) => t.id !== edit?.id && !t.dependency)
                  .map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.title}
                    </option>
                  ))}
              </select>
            </label>
          </div>
          <div className="dialog-footer">
            <span className="muted small">
              Due {formatDate(dueDate(j.departure, offset))}
            </span>
            <Button variant="default" type="submit">
              Save task
              <Check size={14} />
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
export function DocumentsView() {
  const { state, ready } = useDemo();
  const journey =
    state.journeys.find((item) => item.id === state.activeJourneyId) ??
    state.journeys[0];
  const [filter, setFilter] = useState("All");
  const [ownerFilter, setOwnerFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [editorOpen, setEditorOpen] = useState(false);
  const [documentId, setDocumentId] = useState<string>();
  const [applicationId, setApplicationId] = useState<string>();
  const [requirementId, setRequirementId] = useState<string>();
  const [requirementFilter, setRequirementFilter] = useState("");
  const [returnToApplication, setReturnToApplication] = useState(false);
  const initialized = useRef(false);
  useEffect(() => {
    if (!ready || initialized.current) return;
    initialized.current = true;
    let active = true;
    queueMicrotask(() => {
      if (!active) return;
      const params = new URLSearchParams(window.location.search);
      const req = params.get("requirement") ?? "";
      setRequirementFilter(req);
      setApplicationId(
        params.get("application") ??
          state.applications?.find((app) =>
            applicationRequirements(state, app).some(
              (item) => item.id === req || item.ruleId === req,
            ),
          )?.id,
      );
      setDocumentId(params.get("document") ?? undefined);
      setRequirementId(req || undefined);
      setReturnToApplication(Boolean(params.get("application")));
      if (params.get("document") || (params.get("application") && req))
        setEditorOpen(true);
    });
    return () => {
      active = false;
    };
  }, [ready, state]);
  const documents = state.documents.filter((doc) => {
    const belongsToJourney =
      doc.journeyId === journey.id ||
      (state.evidenceLinks ?? []).some(
        (link) =>
          link.documentId === doc.id &&
          state.applications?.some(
            (app) =>
              app.id === link.applicationId && app.journeyId === journey.id,
          ),
      );
    const linked = (state.evidenceLinks ?? []).filter(
      (link) => link.documentId === doc.id,
    );
    return (
      belongsToJourney &&
      (!requirementFilter ||
        linked.some(
          (link) =>
            link.requirementId === requirementFilter ||
            link.requirementId.endsWith(`:${requirementFilter}`),
        )) &&
      (ownerFilter === "all" || doc.ownerId === ownerFilter) &&
      (filter === "All" || doc.category === filter) &&
      doc.name.toLowerCase().includes(search.toLowerCase())
    );
  });
  const openEditor = (id?: string) => {
    setDocumentId(id);
    setEditorOpen(true);
  };
  return (
    <>
      <PageHeading
        title="Documents"
        description={`${journey.destination} · shared document inventory`}
      >
        <Button variant="default" onClick={() => openEditor()}>
          <Upload size={14} />
          Add document
        </Button>
      </PageHeading>
      {requirementFilter && (
        <div className="entry-context">
          <span>
            Related requirement: <strong>{requirementFilter}</strong>
          </span>
          <Button size="sm" onClick={() => setRequirementFilter("")}>
            Show all documents
          </Button>
          {returnToApplication && (
            <Link href="/app/applications">Return to application</Link>
          )}
        </div>
      )}
      <div className="toolbar wrap">
        <div className="tabs filter-tabs">
          {["All", ...documentCategories].map((item) => (
            <button
              key={item}
              className={filter === item ? "active" : ""}
              onClick={() => setFilter(item)}
            >
              {item}
            </button>
          ))}
        </div>
        <div className="toolbar-actions">
          <select
            aria-label="Filter documents by traveler"
            value={ownerFilter}
            onChange={(event) => setOwnerFilter(event.target.value)}
          >
            <option value="all">All travelers</option>
            {state.travelers
              .filter((person) => journey.travelers.includes(person.id))
              .map((person) => (
                <option key={person.id} value={person.id}>
                  {person.name}
                </option>
              ))}
          </select>
          <div className="input-icon">
            <Search size={14} />
            <input
              aria-label="Search documents"
              placeholder="Find a document…"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
        </div>
      </div>
      <Panel
        className="document-inventory-panel"
        title="Documents"
        description={`${documents.length} record${documents.length === 1 ? "" : "s"}`}
      >
        <div className="table-scroll">
          <table className="document-table">
            <thead>
              <tr>
                <th>Document</th>
                <th>Traveler</th>
                <th>Linked requirement(s)</th>
                <th>Expiry</th>
                <th>Status</th>
                <th aria-label="Actions" />
              </tr>
            </thead>
            <tbody>
              {documents.map((doc) => {
                const owner = state.travelers.find(
                  (person) => person.id === doc.ownerId,
                );
                const links = (state.evidenceLinks ?? []).filter(
                  (link) => link.documentId === doc.id,
                );
                const titles = links.map((link) => {
                  const app = state.applications?.find(
                    (item) => item.id === link.applicationId,
                  );
                  const req =
                    app &&
                    applicationRequirements(state, app).find(
                      (item) => item.id === link.requirementId,
                    );
                  return req?.title ?? link.requirementId;
                });
                const status = documentStatus(doc);
                return (
                  <tr key={doc.id}>
                    <td>
                      <button
                        className="document-detail-trigger"
                        onClick={() => openEditor(doc.id)}
                      >
                        <FileText className="document-row-icon" size={16} />
                        <span>
                          <strong>{doc.name}</strong>
                          <small>{doc.category}</small>
                        </span>
                      </button>
                    </td>
                    <td className="document-traveler">
                      {owner?.name ?? "Traveler"}
                    </td>
                    <td>{titles.length ? titles.join(", ") : "—"}</td>
                    <td>
                      {doc.expires
                        ? formatDate(doc.expires, {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })
                        : "—"}
                    </td>
                    <td>
                      <Badge
                        tone={
                          status === "Ready"
                            ? "green"
                            : status === "Missing"
                              ? "amber"
                              : "neutral"
                        }
                      >
                        {status}
                      </Badge>
                    </td>
                    <td>
                      <Button
                        size="icon"
                        variant="ghost"
                        aria-label={`Edit ${doc.name}`}
                        onClick={() => openEditor(doc.id)}
                      >
                        <MoreHorizontal size={16} />
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {!documents.length && (
          <Empty
            title="No documents match."
            description="Add a metadata record for an item you are preparing."
          />
        )}
      </Panel>
      <DocumentEditor
        open={editorOpen}
        onOpenChange={setEditorOpen}
        documentId={documentId}
        applicationId={applicationId}
        requirementId={requirementId}
      />
    </>
  );
}
