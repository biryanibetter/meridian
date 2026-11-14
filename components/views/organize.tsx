"use client";
import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import {
  CalendarDays,
  Check,
  LayoutList,
  Pencil,
  Plus,
  Search,
  Upload,
} from "lucide-react";
import { useDemo } from "@/lib/store";
import { getRequirements } from "@/lib/requirements";
import { dueDate, formatDate, readiness } from "@/lib/planning";
import type { Task, Document as TravelDocument } from "@/lib/types";
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
import { requirementContext } from "@/lib/workspace-context";
import { invalidateTaskDescendants } from "@/lib/task-dependencies";
const documentCategories = ["Passport", "Visa", "Financial evidence", "Admission", "Insurance", "Accommodation", "Healthcare", "Booking", "Certificate", "Other"];
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
      const next = edit ? s.tasks.map((t) => t.id === edit.id ? task : t) : [...s.tasks, task];
      const blocked = task.dependency && !next.find(t => t.id === task.dependency)?.done;
      return { ...s, tasks: blocked ? invalidateTaskDescendants(next, task.id) : next };
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
  const { state, update, toast } = useDemo();
  const j =
    state.journeys.find((j) => j.id === state.activeJourneyId) ??
    state.journeys[0];
  const [filter, setFilter] = useState("All documents");
  const [ownerFilter, setOwnerFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [preview, setPreview] = useState<TravelDocument | null>(null);
  const [name, setName] = useState("");
  const [category, setCategory] = useState("Other");
  const [owner, setOwner] = useState(state.activeTravelerId);
  const [taskId, setTaskId] = useState("");
  const [requirementId, setRequirementId] = useState("");
  const [preparationNote, setPreparationNote] = useState("");
  const [expiry, setExpiry] = useState("");
  const [requirementFilter, setRequirementFilter] = useState("");
  const ownerTraveler = state.travelers.find((traveler) => traveler.id === owner);
  const availableRequirements = getRequirements(requirementContext(j, ownerTraveler));
  const selectedRequirement = availableRequirements.find((item) => item.id === requirementId);
  useEffect(() => {
    let active = true;
    queueMicrotask(() => {
      if (!active) return;
      const requirement = new URLSearchParams(window.location.search).get("requirement") ?? "";
      setRequirementFilter(requirement);
      setRequirementId(requirement);
    });
    return () => {
      active = false;
    };
  }, []);
  const docs = state.documents.filter(
    (d) =>
      d.journeyId === j.id &&
      (!requirementFilter || d.requirementId === requirementFilter) &&
      (ownerFilter === "all" || d.ownerId === ownerFilter) &&
      (filter === "All documents" || d.category === filter) &&
      d.name.toLowerCase().includes(search.toLowerCase()),
  );
  function add(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      toast("Add an evidence description.");
      return;
    }
    if (requirementId && !selectedRequirement) {
      toast("Choose a requirement registered for this journey and traveler.");
      return;
    }
    if (
      !j.travelers.includes(owner) ||
      (taskId &&
        !state.tasks.some((t) => t.id === taskId && t.journeyId === j.id))
    ) {
      toast(
            "Choose a traveler and task from this journey.",
      );
      return;
    }
    update((s) => ({
      ...s,
      documents: [
        ...s.documents,
        {
          id: `doc-${Date.now()}`,
          journeyId: j.id,
          name: name.trim(),
          category,
          ownerId: owner,
          expires: expiry,
          taskId,
          added: new Date().toISOString().slice(0, 10),
          requirementId: selectedRequirement?.id,
          sourceUrl: selectedRequirement?.sourceUrl ?? undefined,
          preparationNote: preparationNote.trim() || undefined,
          prepared: false,
          reviewed: false,
        },
      ],
    }));
    setName("");
    setExpiry("");
    setPreparationNote("");
    setOpen(false);
    toast("Evidence metadata added. No file content was stored.");
  }
  return (
    <>
      <PageHeading
        title="Documents"
        description="Evidence inventory · metadata only"
      >
        <Button
          variant="default"
          onClick={() => {
            setOwner(state.activeTravelerId);
            setRequirementId(requirementFilter);
            setTaskId("");
            setOpen(true);
          }}
        >
          <Upload size={14} />
          Add evidence record
        </Button>
      </PageHeading>
      <DemoNotice>
        No files are uploaded or stored. Avoid entering passport numbers or other sensitive identifiers.
      </DemoNotice>
      {requirementFilter && <div className="entry-context"><span>Related requirement: <strong>{availableRequirements.find(item => item.id === requirementFilter)?.title ?? requirementFilter}</strong></span><Button size="sm" onClick={() => { setRequirementFilter(""); setRequirementId(""); }}>Show all documents</Button><Link href="/app/applications">Return to application steps</Link></div>}
      <div className="toolbar wrap">
        <div className="tabs filter-tabs">
          {["All documents", ...documentCategories].map((c) => (
            <button
              key={c}
              className={filter === c ? "active" : ""}
              onClick={() => setFilter(c)}
            >
              {c}
            </button>
          ))}
        </div>
        <div className="toolbar-actions">
          <select
            aria-label="Filter documents by traveler"
            value={ownerFilter}
            onChange={(e) => setOwnerFilter(e.target.value)}
            className="document-owner-filter"
          >
            <option value="all">All travelers</option>
            {state.travelers
              .filter((t) => j.travelers.includes(t.id))
              .map((t) => (
                <option value={t.id} key={t.id}>
                  {t.name}
                </option>
              ))}
          </select>
          <div className="input-icon">
            <Search size={14} />
            <input
              aria-label="Search documents"
              placeholder="Find a document…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
      </div>
      <Panel className="document-inventory-panel" title="Evidence records" description={`${docs.length} record${docs.length === 1 ? "" : "s"} · metadata only`}>
        <div className="table-scroll">
          <table className="document-table">
            <thead><tr><th>Evidence</th><th>Owner</th><th>Requirement</th><th>Expiry</th><th>Preparation</th><th>Actions</th></tr></thead>
            <tbody>{docs.map((d) => {
              const t = state.travelers.find((traveler) => traveler.id === d.ownerId);
              const linkedRequirement = getRequirements(requirementContext(j, t)).find((item) => item.id === d.requirementId);
              return <tr key={d.id}>
                <td><button className="document-detail-trigger" onClick={() => setPreview(d)}><strong>{d.name}</strong><small>{d.category} · Added {d.added || "date not recorded"}</small></button></td>
                <td>{t?.name ?? "Traveler"}</td>
                <td>{linkedRequirement ? <Link href={`/app/documents?requirement=${encodeURIComponent(linkedRequirement.id)}`}>{linkedRequirement.title}</Link> : "—"}</td>
                <td>{d.expires ? formatDate(d.expires, { day: "numeric", month: "short", year: "numeric" }) : "—"}</td>
                <td><Badge tone={d.prepared ? "green" : "amber"}>{d.prepared ? "Prepared" : "To prepare"}</Badge><small>{d.reviewed ? "Reviewed" : "Not reviewed"}</small></td>
                <td><div className="document-row-actions">
                  <Button size="sm" variant={d.prepared ? "ghost" : "default"} onClick={() => update((s) => ({ ...s, documents: s.documents.map((item) => item.id === d.id ? { ...item, prepared: !item.prepared } : item) }))}>{d.prepared ? "Undo prep" : "Prepared"}</Button>
                  <Button size="sm" variant="ghost" onClick={() => update((s) => ({ ...s, documents: s.documents.map((item) => item.id === d.id ? { ...item, reviewed: !item.reviewed } : item) }))}>{d.reviewed ? "Undo review" : "Reviewed"}</Button>
                  <Button size="sm" variant="ghost" onClick={() => setPreview(d)}>Details</Button>
                </div></td>
              </tr>;
            })}</tbody>
          </table>
        </div>
        {!docs.length && <Empty title="No evidence records match." description="Add a metadata record for an item you are preparing." />}
      </Panel>
      <Modal open={!!preview} onOpenChange={(value) => !value && setPreview(null)} title="Document record" description="Local preparation metadata — no document file is stored.">
        {preview && <div className="context-details">
          <span>Name<strong>{preview.name}</strong></span>
          <span>Owner<strong>{state.travelers.find(person => person.id === preview.ownerId)?.name}</strong></span>
          <span>Type<strong>{preview.category}</strong></span>
          <span>Journey<strong>{j.name}</strong></span>
          <span>Requirement<strong>{getRequirements(requirementContext(j, state.travelers.find(person => person.id === preview.ownerId))).find(item => item.id === preview.requirementId)?.title ?? "Not linked"}</strong></span>
          <span>Preparation note<strong>{preview.preparationNote || "Not recorded"}</strong></span>
          <span>Added<strong>{preview.added || "Not recorded"}</strong></span>
          <span>Linked task<strong>{state.tasks.find(task => task.id === preview.taskId)?.title ?? "Not linked"}</strong></span>
          <span>Preparation<strong>{preview.prepared ? "Prepared" : "Not prepared"}</strong></span>
          <span>Review<strong>{preview.reviewed ? "Reviewed by you" : "Not reviewed"}</strong></span>
          <span>Expiry<strong>{preview.expires || "Not recorded"}</strong></span>
          <div className="document-detail-actions">
            <Button size="sm" onClick={() => {
              const prepared = !preview.prepared;
              update((s) => ({ ...s, documents: s.documents.map((item) => item.id === preview.id ? { ...item, prepared } : item) }));
              setPreview({ ...preview, prepared });
            }}>{preview.prepared ? "Mark not prepared" : "Mark prepared"}</Button>
            <Button size="sm" variant="ghost" onClick={() => {
              const reviewed = !preview.reviewed;
              update((s) => ({ ...s, documents: s.documents.map((item) => item.id === preview.id ? { ...item, reviewed } : item) }));
              setPreview({ ...preview, reviewed });
            }}>{preview.reviewed ? "Undo review" : "Mark reviewed"}</Button>
          </div>
        </div>}
      </Modal>
      <Modal
        open={open}
        onOpenChange={setOpen}
        title="Add evidence record"
        description="Metadata only. No file storage is available."
      >
        <form onSubmit={add}>
          <div className="upload-zone">
            <Upload size={26} />
            <strong>File storage is unavailable</strong>
            <span>Only evidence metadata can be recorded.</span>
          </div>
          <div className="form-grid">
            <label className="full">
              Evidence description
              <input
                required
                maxLength={80}
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </label>
            <label className="full">
              Linked requirement (optional)
              <select value={requirementId} onChange={(e) => setRequirementId(e.target.value)}>
                <option value="">No linked requirement</option>
                {availableRequirements.map((item) => <option key={item.id} value={item.id}>{item.category}: {item.title}</option>)}
              </select>
              {selectedRequirement?.sourceUrl && <small>Official source: {selectedRequirement.sourceName} · selected from registry</small>}
            </label>
            <label className="full">
              Preparation note
              <input value={preparationNote} onChange={(e) => setPreparationNote(e.target.value)} />
            </label>
            <label>
              Category
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                {documentCategories.map((x) => (
                  <option key={x}>{x}</option>
                ))}
              </select>
            </label>
            <label>
              Expiry date (if known)
              <input type="date" value={expiry} onChange={(e) => setExpiry(e.target.value)} />
            </label>
            <label>
              Owner
              <select value={owner} onChange={(e) => { setOwner(e.target.value); setRequirementId(""); }}>
                {state.travelers
                  .filter((t) => j.travelers.includes(t.id))
                  .map((t) => (
                    <option value={t.id} key={t.id}>
                      {t.name}
                    </option>
                  ))}
              </select>
            </label>
            <label>
              Link to task
              <select
                value={taskId}
                onChange={(e) => setTaskId(e.target.value)}
              >
                <option value="">No linked task</option>
                {state.tasks
                  .filter((t) => t.journeyId === j.id)
                  .map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.title}
                    </option>
                  ))}
              </select>
            </label>
          </div>
          <div className="dialog-footer">
              <Badge>Metadata only</Badge>
            <Button type="submit" variant="default">
              Add record
              <Plus size={14} />
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
