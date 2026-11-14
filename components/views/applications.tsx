"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { Check, ExternalLink, FileText, ChevronRight, HelpCircle, Globe, ClipboardList, Send, Flag, Plus } from "lucide-react";
import { getRequirements, type TravelRequirement } from "@/lib/requirements";
import type { Document, Traveler } from "@/lib/types";
import { useDemo } from "@/lib/store";
import {
  applicationContextKey,
  requirementContext,
} from "@/lib/workspace-context";
import { Badge, PageHeading, Panel } from "../common";
import { Button } from "../ui/button";

const stages = [
  { key: "requirements", label: "Requirements", icon: ClipboardList },
  { key: "documents", label: "Documents", icon: FileText },
  { key: "application", label: "Application", icon: Globe },
  { key: "submit", label: "Submission", icon: Send },
  { key: "track", label: "Status", icon: Flag },
] as const;

type StageKey = typeof stages[number]["key"];

interface RequirementWithMeta extends TravelRequirement {
  documentCount: number;
  preparedCount: number;
  isExpanded: boolean;
}

export function ApplicationsView() {
  const { state, update, toast } = useDemo();
  const journey = state.journeys.find(
    (item) => item.id === state.activeJourneyId,
  )!;
  const traveler = state.travelers.find(
    (item) => item.id === state.activeTravelerId,
  );
  const requirements = getRequirements(requirementContext(journey, traveler));
  const requirementIds = new Set(requirements.map((item) => item.id));
  const evidence = state.documents.filter(
    (item) =>
      item.journeyId === journey.id &&
      item.ownerId === traveler?.id &&
      requirementIds.has(item.requirementId ?? ""),
  );
  const sources = [
    ...new Map(
      requirements
        .filter((item) => item.sourceUrl)
        .map((item) => [item.sourceUrl, item]),
    ).values(),
  ];
  const prefix = `application:${applicationContextKey(journey, traveler)}:`;
  const recordKey = applicationContextKey(journey, traveler);
  const [activeStage, setActiveStage] = useState<StageKey>("requirements");
  const statusRecord = state.bookings.find(
    (item) =>
      item.id === `application:${recordKey}` && item.category === "Application",
  );
  const submissionRecord = state.applicationRecords?.[recordKey];
  const prepared = evidence.every((item) => item.prepared);
  function complete(key: string): boolean {
    const index = stages.findIndex((stage) => stage.key === key);
    if (index > 0 && !complete(stages[index - 1].key)) return false;
    return key === "documents"
      ? prepared && state.preferences[`${prefix}documents`] === true
      : key === "submit"
        ? Boolean(submissionRecord?.reference && submissionRecord.submissionDate)
         : state.preferences[`${prefix}${key}`] === true;
  }

  function mark(key: string) {
    const index = stages.findIndex((stage) => stage.key === key);
    const wasComplete = complete(key);
    update((current) => ({
      ...current,
      preferences: {
        ...current.preferences,
        ...Object.fromEntries(stages.slice(index + 1).map((stage) => [`${prefix}${stage.key}`, false])),
        [`${prefix}${key}`]: !wasComplete,
      },
    }));
  }

  function saveSubmission(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const reference = String(form.get("reference")).trim();
    const submissionDate = String(form.get("submissionDate"));
    if (!reference || !submissionDate || !complete("application")) return;
    update((current) => ({
      ...current,
      applicationRecords: {
        ...current.applicationRecords,
        [recordKey]: { reference, submissionDate },
      },
    }));
    toast("Submission details saved to this traveler's application record.");
  }

  function saveTracking(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const status = String(form.get("status"));
    if (!submissionRecord?.reference || !complete("submit")) {
      toast("Record the submission date and reference before tracking status.");
      return;
    }
    update((current) => ({
      ...current,
      bookings: [
        ...current.bookings.filter(
          (item) =>
            !(
              item.id === `application:${recordKey}`
            ),
        ),
        {
          id: `application:${recordKey}`,
          journeyId: journey.id,
          name: status,
          reference: submissionRecord.reference,
          category: "Application",
        },
      ],
      preferences: {
        ...current.preferences,
        [`${prefix}track`]: true,
      },
    }));
    toast("External application record updated.");
  }

  // Build requirements with document metadata
  const requirementsWithMeta: RequirementWithMeta[] = requirements.map((req) => {
    const linkedDocs = evidence.filter((d) => d.requirementId === req.id);
    const preparedCount = linkedDocs.filter((d) => d.prepared).length;
    return {
      ...req,
      documentCount: linkedDocs.length,
      preparedCount,
      isExpanded: false,
    };
  });

  const reviewedCount = complete("requirements") ? requirementsWithMeta.length : 0;
  const totalRequirements = requirementsWithMeta.length;

  const completedStages = stages.filter((s) => complete(s.key)).length;

  return (
    <>
      <PageHeading
        title="Applications"
        description={`${journey.country} \u00b7 ${journey.purpose} \u00b7 ${traveler?.name ?? "Traveler"}`}
      >
        <Button asChild variant="ghost" size="sm">
          <Link href="/app/documents">
            <FileText size={13} />
            <span>View documents</span>
          </Link>
        </Button>
      </PageHeading>

      {/* Compact Horizontal Progress Stepper */}
      <div className="application-stepper" role="navigation" aria-label="Application progress">
        {stages.map((stage, index) => {
          const isComplete = complete(stage.key);
          const isActive = activeStage === stage.key;
          const isPending = !isComplete && !isActive;

          return (
            <button
              key={stage.key}
              className={`stepper-item ${isComplete ? "complete" : ""} ${isActive ? "active" : ""} ${isPending ? "pending" : ""}`}
              onClick={() => setActiveStage(stage.key)}
              aria-current={isActive ? "step" : undefined}
              disabled={index > 0 && !complete(stages[index - 1].key)}
            >
              <div className="stepper-connector" aria-hidden="true" />
              <div className="stepper-node">
                {isComplete ? (
                  <Check size={12} className="stepper-check" />
                ) : (
                  <span className="stepper-number">{index + 1}</span>
                )}
              </div>
              <div className="stepper-label">
                <strong>{stage.label}</strong>
                <span className="stepper-status">
                  {isComplete ? "Completed" : isActive ? "Current" : "Pending"}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      <div className="application-workspace">
        {/* Main Content Area (~70%) */}
        <main className="application-main">
          <Panel className="application-stage-panel">
            {(() => {
              switch (activeStage) {
                case "requirements":
                  return (
                    <div className="stage-content">
                      <div className="stage-header">
                        <h2>Requirements</h2>
                        <Badge tone="blue">{reviewedCount} of {totalRequirements} reviewed</Badge>
                      </div>
                      <div className="requirements-list">
                        {requirementsWithMeta.length === 0 ? (
                          <div className="empty-state">
                            <HelpCircle size={24} />
                            <p>No requirements found for this journey and traveler combination.</p>
                          </div>
                        ) : (
                          requirementsWithMeta.map((req) => (
                            <RequirementRow
                              key={req.id}
                              requirement={req}
                              evidence={evidence}
                              traveler={traveler}
                              journey={journey}
                              onNavigateToDocuments={() => {
                                setActiveStage("documents");
                              }}
                            />
                          ))
                        )}
                      </div>
                      <div className="stage-footer">
                        <Button variant={complete("requirements") ? "ghost" : "default"} onClick={() => mark("requirements")}>
                          {complete("requirements") ? "Reopen requirements" : "Mark requirements reviewed"}
                        </Button>
                      </div>
                    </div>
                  );

                case "documents":
                  return (
                    <div className="stage-content">
                      <div className="stage-header">
                        <h2>Documents</h2>
                        <Badge tone="neutral">{evidence.filter((d) => d.prepared).length} of {evidence.length} prepared</Badge>
                      </div>
                      <div className="documents-stage-list">
                        {evidence.length === 0 ? (
                          <div className="empty-state">
                            <FileText size={24} />
                            <p>No document records linked yet.</p>
                            <Button asChild variant="default" size="sm">
                              <Link href="/app/documents">
                                <Plus size={13} />
                                Add document
                              </Link>
                            </Button>
                          </div>
                        ) : (
                          evidence.map((doc) => {
                            const req = requirements.find((r) => r.id === doc.requirementId);
                            const owner = state.travelers.find((t) => t.id === doc.ownerId);
                            return (
                              <DocumentStageRow
                                key={doc.id}
                                document={doc}
                                requirement={req}
                                owner={owner}
                                journey={journey}
                              />
                            );
                          })
                        )}
                      </div>
                      <div className="stage-footer">
                        <p className="muted">
                          {requirements.filter((requirement) => !evidence.some((document) => document.requirementId === requirement.id)).length} requirements have no linked records.
                          {" "}Check every requirement with the responsible authority before recording your document review. Linked records alone do not establish complete supporting evidence.
                        </p>
                        <Button asChild variant="outline" size="sm">
                          <Link href="/app/documents">
                            <FileText size={13} />
                            Manage all documents
                          </Link>
                        </Button>
                        <Button
                          variant={complete("documents") ? "ghost" : "default"}
                          disabled={!prepared}
                          onClick={() => mark("documents")}
                        >
                          {complete("documents") ? "Reopen document review" : "Record document review"}
                        </Button>
                        {!prepared && <p className="muted">Prepare the linked records before recording your review.</p>}
                      </div>
                    </div>
                  );

                case "application":
                  return (
                    <div className="stage-content">
                      <div className="stage-header">
                        <h2>Application</h2>
                        <Badge tone={complete("application") ? "green" : "neutral"}>
                          {complete("application") ? "Completion recorded" : "In progress"}
                        </Badge>
                      </div>
                      <div className="application-details">
                        <div className="detail-group">
                          <h3>Visa category</h3>
                          <p className="muted">{journey.purpose} visa for {journey.country}</p>
                        </div>
                        <div className="detail-group">
                          <h3>Official application website</h3>
                          {sources[0] ? (
                            <Button asChild variant="ghost" size="sm">
                              <a href={sources[0].sourceUrl!} target="_blank" rel="noreferrer">
                                {sources[0].sourceName}
                                <ExternalLink size={13} />
                              </a>
                            </Button>
                          ) : (
                                <p className="muted">No official source registered for this destination.</p>
                          )}
                        </div>
                        <div className="detail-group">
                          <h3>Required information checklist</h3>
                          <ul className="checklist">
                            {requirementsWithMeta.slice(0, 5).map((req) => (
                              <li key={req.id}>
                                <span>{req.title}</span>
                                <Badge tone={req.documentCount > 0 ? "green" : "amber"}>
                                  {req.preparedCount} / {req.documentCount}
                                </Badge>
                              </li>
                            ))}
                          </ul>
                        </div>
                        <Button
                          variant={complete("application") ? "ghost" : "default"}
                          onClick={() => mark("application")}
                          className="stage-action"
                        >
                          {complete("application") ? "Reopen stage" : "Record completion"}
                          <Check size={13} />
                        </Button>
                      </div>
                    </div>
                  );

                case "submit":
                  return (
                    <form className="stage-content form-grid" onSubmit={saveSubmission}>
                      <div className="stage-header full">
                        <h2>Submission</h2>
                        <Badge tone={submissionRecord ? "green" : "neutral"}>
                          {submissionRecord ? "Submission recorded" : "Not submitted"}
                        </Badge>
                      </div>
                      <p className="full muted">
                        Meridian does not submit or verify applications. Open the responsible authority and complete submission there.
                      </p>
                      <div className="full official-links">
                        {sources.slice(0, 3).map((source) => (
                          <a key={source.sourceUrl} href={source.sourceUrl!} target="_blank" rel="noreferrer" className="official-link">
                            {source.sourceName}
                            <ExternalLink size={13} />
                          </a>
                        ))}
                      </div>
                      <label className="full">
                        Submission date
                        <input name="submissionDate" type="date" required defaultValue={submissionRecord?.submissionDate} />
                      </label>
                      <label className="full">
                        Official reference
                        <input name="reference" required defaultValue={submissionRecord?.reference} maxLength={120} placeholder="e.g., GWF12345678" />
                      </label>
                      <div className="full">
                        <Button type="submit" variant="default" className="stage-action">
                          Save submission details
                        </Button>
                      </div>
                    </form>
                  );

                case "track":
                  return (
                    <form className="stage-content form-grid" onSubmit={saveTracking}>
                      <div className="stage-header full">
                        <h2>Status</h2>
                        <Badge tone={statusRecord ? "green" : "neutral"}>
                          {statusRecord ? "Status recorded" : "Not tracked"}
                        </Badge>
                      </div>
                      <p className="full muted">
                        {submissionRecord
                          ? `Submission ${submissionRecord.reference} \u00b7 ${submissionRecord.submissionDate}`
                          : "Record the official submission date and reference in the previous stage first."}
                      </p>
                      <label className="full">
                        Current status
                        <select name="status" defaultValue={statusRecord?.name ?? "Submitted externally"} disabled={!submissionRecord}>
                          <option>Submitted externally</option>
                          <option>Appointment scheduled</option>
                          <option>Additional evidence requested</option>
                          <option>Decision received</option>
                          <option>Withdrawn</option>
                        </select>
                      </label>
                      <div className="full">
                        <Button type="submit" variant="default" disabled={!submissionRecord} className="stage-action">
                          Save status
                        </Button>
                      </div>
                    </form>
                  );

                default:
                  return null;
              }
            })()}
          </Panel>
        </main>

        {/* Context Sidebar (~30%) */}
        <aside className="application-sidebar" aria-label="Application context">
          <Panel title="Application details" className="sidebar-panel">
            <dl className="details-list">
              <div><dt>Country</dt><dd>{journey.country}</dd></div>
              <div><dt>Traveler</dt><dd>{traveler?.name ?? "Not selected"}</dd></div>
              <div><dt>Purpose</dt><dd>{journey.purpose}</dd></div>
              <div><dt>Travel date</dt><dd>{journey.departure}</dd></div>
              <div><dt>Application category</dt><dd>{journey.purpose} · Official confirmation required</dd></div>
              <div><dt>Progress</dt><dd>
                <div className="progress-mini">
                  <div style={{ width: `${Math.round((completedStages / stages.length) * 100)}%` }} />
                </div>
                <small>{completedStages} of {stages.length} stages</small>
              </dd></div>
            </dl>
          </Panel>

          {activeStage === "requirements" && requirementsWithMeta.length > 0 && (
            <Panel title="Quick actions" className="sidebar-panel">
              <div className="quick-actions">
                <Button asChild variant="outline" size="sm" className="full">
                  <Link href="/app/entry">
                    <ClipboardList size={13} />
                    Open requirement table
                  </Link>
                </Button>
                <Button asChild variant="outline" size="sm" className="full">
                  <Link href="/app/documents">
                    <FileText size={13} />
                    Manage documents
                  </Link>
                </Button>
              </div>
            </Panel>
          )}

          {activeStage === "documents" && (
            <Panel title="Document summary" className="sidebar-panel">
              <dl className="details-list">
                <div><dt>Total records</dt><dd>{evidence.length}</dd></div>
                <div><dt>Prepared</dt><dd>{evidence.filter((d) => d.prepared).length}</dd></div>
                <div><dt>Missing</dt><dd>{evidence.filter((d) => !d.prepared).length}</dd></div>
              </dl>
            </Panel>
          )}
        </aside>
      </div>
    </>
  );
}

function RequirementRow({
  requirement,
  evidence,
}: {
  requirement: RequirementWithMeta;
  evidence: Document[];
  traveler?: Traveler;
  journey: import("@/lib/types").Journey;
  onNavigateToDocuments: () => void;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const linkedDocs = evidence.filter((d) => d.requirementId === requirement.id);
  const hasDocuments = linkedDocs.length > 0;
  const allPrepared = hasDocuments && linkedDocs.every((d) => d.prepared);

  return (
    <article className={`requirement-row ${isExpanded ? "expanded" : ""}`}>
      <div className="requirement-main" onClick={() => setIsExpanded(!isExpanded)}>
        <div className="requirement-icon">
          <span className="category-badge">{requirement.category[0]}</span>
        </div>
        <div className="requirement-info">
          <div className="requirement-title-row">
            <h3>{requirement.title}</h3>
            <Badge tone={allPrepared ? "green" : hasDocuments ? "blue" : "amber"}>
              {hasDocuments ? `${requirement.preparedCount} / ${requirement.documentCount} prepared` : "No documents"}
            </Badge>
          </div>
          <p className="requirement-meta">
            <span>{requirement.category}</span>
            {requirement.sourceName && (
              <>
                <span>\u00b7</span>
                <span className="source-link" onClick={(e) => { e.stopPropagation(); window.open(requirement.sourceUrl!, "_blank", "noreferrer"); }}>
                  {requirement.sourceName}
                </span>
              </>
            )}
          </p>
        </div>
        <div className="requirement-actions">
          {requirement.sourceUrl && (
            <Button asChild variant="ghost" size="icon" aria-label="Open official source">
              <a href={requirement.sourceUrl} target="_blank" rel="noreferrer" onClick={(event) => event.stopPropagation()}>
              <span className="icon-btn"><Globe size={14} /></span>
              </a>
            </Button>
          )}
          <ChevronRight size={16} className={`expand-icon ${isExpanded ? "rotated" : ""}`} />
        </div>
      </div>

      {isExpanded && (
        <div className="requirement-expansion">
          <div className="expansion-content">
            <div className="expansion-section">
              <h4>Preparation guidance</h4>
              <p>{requirement.preparation}</p>
            </div>
            {requirement.sourceUrl && (
              <div className="expansion-section">
                <h4>Official source</h4>
                <a href={requirement.sourceUrl} target="_blank" rel="noreferrer" className="source-detail">
                  {requirement.sourceName}
                  <ExternalLink size={13} />
                </a>
                <p className="muted small">{requirement.sourceCoverage}</p>
              </div>
            )}
            <div className="expansion-section">
              <h4>Linked documents</h4>
              {hasDocuments ? (
                <ul className="linked-docs">
                  {linkedDocs.map((doc) => (
                    <li key={doc.id}>
                      <span className="doc-name">{doc.name}</span>
                      <Badge tone={doc.prepared ? "green" : "amber"}>
                        {doc.prepared ? "Prepared" : "To prepare"}
                      </Badge>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="muted">No documents linked to this requirement.</p>
              )}
              <Button asChild variant="outline" size="sm" className="add-doc-link">
                <Link href={`/app/documents?requirement=${encodeURIComponent(requirement.id)}`}>
                  <FileText size={13} />
                  {hasDocuments ? "Add another document" : "Add document"}
                </Link>
              </Button>
            </div>
            <div className="expansion-section">
              <h4>Applicability context</h4>
              <dl className="context-list">
                <div><dt>Nationality</dt><dd>{requirement.context.nationality}</dd></div>
                <div><dt>Residence</dt><dd>{requirement.context.residence}</dd></div>
                <div><dt>Passport type</dt><dd>{requirement.context.passportType}</dd></div>
                <div><dt>Residence permit</dt><dd>{requirement.context.residencePermitStatus}</dd></div>
                <div><dt>Existing visa</dt><dd>{requirement.context.existingVisaStatus}</dd></div>
                <div><dt>Purpose</dt><dd>{requirement.context.purpose}</dd></div>
                <div><dt>Departure</dt><dd>{requirement.context.departure}</dd></div>
                <div><dt>Duration</dt><dd>{requirement.context.durationDays ? `${requirement.context.durationDays} days` : "Not provided"}</dd></div>
                <div><dt>Age band</dt><dd>{requirement.context.ageBand}</dd></div>
              </dl>
            </div>
          </div>
        </div>
      )}
    </article>
  );
}

function DocumentStageRow({
  document,
  requirement,
  owner,
}: {
  document: Document;
  requirement: TravelRequirement | undefined;
  owner: Traveler | undefined;
  journey: import("@/lib/types").Journey;
}) {
  return (
    <article className="document-stage-row">
      <div className="doc-main">
        <div className="doc-icon">
          <FileText size={16} />
        </div>
        <div className="doc-info">
          <strong>{document.name}</strong>
          <small>{document.category} \u00b7 {owner?.name ?? "Traveler"}</small>
        </div>
      </div>
      <div className="doc-requirement">
        {requirement ? (
          <a href={`/app/documents?requirement=${encodeURIComponent(requirement.id)}`} className="requirement-link">
            {requirement.title}
          </a>
        ) : (
          <span className="muted">Not linked</span>
        )}
      </div>
      <div className="doc-status">
        <Badge tone={document.prepared ? "green" : "amber"}>
          {document.prepared ? "Prepared" : "To prepare"}
        </Badge>
      </div>
      <div className="doc-actions">
        <Button asChild variant="ghost" size="sm">
          <Link href={`/app/documents?requirement=${document.requirementId}`}>
            View
          </Link>
        </Button>
      </div>
    </article>
  );
}
