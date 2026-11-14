"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { ExternalLink, MoreHorizontal, Plus } from "lucide-react";
import { useDemo } from "@/lib/store";
import type { ApplicationStage } from "@/lib/types";
import {
  activeApplication,
  applicationMetrics,
  applicationRequirements,
  updateApplication,
} from "@/lib/visa-workflow";
import { RequirementsWorkspace } from "../requirements-workspace";
import { DocumentEditor } from "../document-editor";
import { Badge, PageHeading, Panel } from "../common";
import { Button } from "../ui/button";
import { Modal } from "../ui/dialog";

const stages: { key: ApplicationStage; label: string }[] = [
  { key: "requirements", label: "Requirements" },
  { key: "documents", label: "Documents" },
  { key: "application", label: "Application" },
  { key: "submission", label: "Submission" },
  { key: "status", label: "Status" },
];
const processSteps = [
  ["information", "Confirm your passport, CAS and application information"],
  [
    "fees",
    "Record payment of visa fees and healthcare surcharge, where applicable",
  ],
  ["identity", "Complete the requested identity verification or biometrics"],
] as const;

export function ApplicationsView() {
  const { state, update, toast } = useDemo();
  const app = activeApplication(state);
  const [add, setAdd] = useState(false);
  const [details, setDetails] = useState(false);
  if (!app)
    return (
      <PageHeading
        title="Applications"
        description="Select a journey and traveler to begin."
      />
    );
  const application = app;
  const journey = state.journeys.find((j) => j.id === app.journeyId)!;
  const traveler = state.travelers.find((t) => t.id === app.travelerId)!;
  const metrics = applicationMetrics(state, app);
  const requirements = applicationRequirements(state, app);
  function saveSubmission(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const reference = String(data.get("reference")).trim();
    const submissionDate = String(data.get("submissionDate"));
    if (!reference || !submissionDate) return;
    update((s) =>
      updateApplication(s, application.id, {
        reference,
        submissionDate,
        status: "Submitted",
      }),
    );
    toast("Submission recorded by you. No government connection was used.");
  }
  function saveNotes(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    update((s) =>
      updateApplication(s, application.id, {
        notes: String(data.get("notes")),
      }),
    );
    toast("Application notes saved.");
  }
  function saveContext(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const optionalBool = (name: string) =>
      data.get(name) === "yes"
        ? true
        : data.get(name) === "no"
          ? false
          : undefined;
    update((s) =>
      updateApplication(s, application.id, {
        ruleContext: {
          applicationDate:
            String(data.get("applicationDate") || "") || undefined,
          courseLevel: String(data.get("courseLevel") || "") || undefined,
          courseCah3Code: String(data.get("courseCah3Code") || "") || undefined,
          englishPathway: String(data.get("englishPathway") || "") || undefined,
          financialEvidenceException:
            String(data.get("financialException") || "") || undefined,
          tbListedCountryRecentResidence: optionalBool("tbRecent"),
          tbResidenceDurationMonths: data.get("tbMonths")
            ? Number(data.get("tbMonths"))
            : undefined,
          financialSponsorshipWithin12Months: optionalBool("sponsorship"),
          atasRequired: optionalBool("atas"),
        },
      }),
    );
    toast(
      "Context saved. Reassess requirements against the updated circumstances.",
    );
  }
  const title =
    app.destination === "United Kingdom" && app.visaCategory === "Student visa"
      ? "UK Student visa"
      : `${app.destination} application`;
  return (
    <div className="visa-workspace">
      <PageHeading
        title={title}
        description={`${app.destination} · ${traveler.name} · ${journey.departure}`}
      >
        <Badge tone={metrics.submissionRecorded ? "blue" : "neutral"}>
          {app.legacyStatus ?? app.status}
        </Badge>
        {app.officialUrl && (
          <Button asChild size="sm" variant="outline">
            <a href={app.officialUrl} target="_blank" rel="noreferrer">
              Open official application <ExternalLink size={13} />
            </a>
          </Button>
        )}
        <Button
          size="icon"
          variant="ghost"
          aria-label="More actions"
          onClick={() => setDetails(true)}
        >
          <MoreHorizontal size={16} />
        </Button>
      </PageHeading>
      <nav className="visa-stepper" aria-label="Application progress">
        {stages.map((stage, index) => (
          <button
            key={stage.key}
            aria-current={app.stage === stage.key ? "step" : undefined}
            onClick={() =>
              update((s) => updateApplication(s, app.id, { stage: stage.key }))
            }
          >
            <span>{index + 1}</span>
            {stage.label}
          </button>
        ))}
      </nav>
      <div className="visa-metrics" aria-label="Preparation metrics">
        <span>
          <strong>
            {metrics.requirementsAssessed}/{metrics.requirementsTotal}
          </strong>{" "}
          Requirements assessed
        </span>
        <span>
          <strong>
            {metrics.documentsPrepared}/{metrics.documentsTotal}
          </strong>{" "}
          Documents prepared
        </span>
        <span>
          <strong>{metrics.documentsRequiringReview}</strong> Documents
          requiring review
        </span>
        <span>
          <strong>
            {metrics.applicationStepsCompleted}/{processSteps.length}
          </strong>{" "}
          Application steps completed
        </span>
        <span>
          <strong>{metrics.submissionRecorded ? "Yes" : "No"}</strong>{" "}
          Submission recorded
        </span>
      </div>
      <div className="visa-layout">
        <div className="visa-main">
          <Panel className="visa-stage-panel">
            <div className="visa-stage-heading">
              <h2>
                {app.stage === "documents"
                  ? "Required documents"
                  : stages.find((s) => s.key === app.stage)?.label}
              </h2>
              {app.stage === "documents" && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setAdd(true)}
                >
                  <Plus size={13} />
                  Add document
                </Button>
              )}
            </div>
            {app.stage === "requirements" && (
              <RequirementsWorkspace application={app} />
            )}
            {app.stage === "documents" && (
              <>
                <RequirementsWorkspace application={app} documentsOnly />
                <div className="visa-stage-footer">
                  <Button asChild size="sm" variant="outline">
                    <Link href="/app/documents">Manage documents</Link>
                  </Button>
                  <small className="muted">
                    {metrics.evidenceRequirementsMissing} required evidence
                    obligation
                    {metrics.evidenceRequirementsMissing === 1 ? "" : "s"}{" "}
                    without a linked record. Conditional evidence still needs
                    assessment.
                  </small>
                </div>
              </>
            )}
            {app.stage === "application" && (
              <div className="visa-stage-body">
                <h3>Selected route</h3>
                <p>
                  {app.visaCategory} · {app.destination}
                </p>
                <h3>Remaining preparation</h3>
                <p>
                  {metrics.requirementsTotal - metrics.requirementsAssessed}{" "}
                  requirements not assessed;{" "}
                  {metrics.evidenceRequirementsMissing} required evidence
                  obligations without records;{" "}
                  {metrics.documentsRequiringReview} documents need review.
                </p>
                <ul className="visa-preparation-list">
                  {requirements
                    .filter(
                      (r) =>
                        !r.assessed && r.applicability !== "Not applicable",
                    )
                    .map((r) => (
                      <li key={r.id}>
                        {r.title}
                        <Badge tone="neutral">{r.applicability}</Badge>
                      </li>
                    ))}
                </ul>
                <h3>Application checklist</h3>
                {processSteps.map(([id, label]) => (
                  <label className="visa-check" key={id}>
                    <input
                      type="checkbox"
                      checked={app.completedSteps.includes(id)}
                      onChange={(e) =>
                        update((s) =>
                          updateApplication(s, app.id, {
                            completedSteps: e.target.checked
                              ? [...app.completedSteps, id]
                              : app.completedSteps.filter(
                                  (step) => step !== id,
                                ),
                            status: metrics.submissionRecorded
                              ? app.status
                              : "Preparing",
                          }),
                        )
                      }
                    />
                    {label}
                  </label>
                ))}
                {app.officialUrl && (
                  <a
                    className="text-link"
                    href={app.officialUrl}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Complete the official application <ExternalLink size={13} />
                  </a>
                )}
                <form key={app.id} onSubmit={saveNotes}>
                  <label>
                    User notes
                    <textarea
                      name="notes"
                      defaultValue={app.notes}
                      maxLength={4000}
                      rows={4}
                    />
                  </label>
                  <Button size="sm" variant="outline" type="submit">
                    Save notes
                  </Button>
                </form>
              </div>
            )}
            {app.stage === "submission" && (
              <form
                key={app.id}
                className="visa-stage-body form-grid"
                onSubmit={saveSubmission}
              >
                <p className="full muted">
                  Record details after submitting through the official service.
                  Meridian does not submit applications.
                </p>
                <div className="full">
                  {app.officialUrl ? (
                    <a
                      className="text-link"
                      href={app.officialUrl}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Official submission website <ExternalLink size={13} />
                    </a>
                  ) : (
                    <p>
                      No verified submission channel is registered for this
                      route.
                    </p>
                  )}
                </div>
                <div className="full">
                  <h3>Submission checklist</h3>
                  <ul>
                    <li>Confirm the route and all applicable evidence.</li>
                    <li>Check the official form, declarations and payments.</li>
                    <li>Keep the submission confirmation and reference.</li>
                  </ul>
                </div>
                <label>
                  Application reference
                  <input
                    name="reference"
                    required
                    maxLength={120}
                    defaultValue={app.reference}
                  />
                </label>
                <label>
                  Submission date
                  <input
                    type="date"
                    name="submissionDate"
                    required
                    max={new Date().toISOString().slice(0, 10)}
                    defaultValue={app.submissionDate}
                  />
                </label>
                <div className="full visa-inline">
                  <Badge tone="neutral">
                    {metrics.submissionRecorded
                      ? "Submission recorded by you"
                      : "Not recorded"}
                  </Badge>
                  <Button size="sm" variant="default" type="submit">
                    Save submission details
                  </Button>
                </div>
              </form>
            )}
            {app.stage === "status" && (
              <div className="visa-stage-body">
                <p className="muted">
                  Status is recorded by you, not retrieved from a government
                  system.
                </p>
                {app.legacyStatus && (
                  <p>
                    Previous recorded status:{" "}
                    <strong>{app.legacyStatus}</strong>
                  </p>
                )}
                <label>
                  Current status
                  <select
                    value={app.status}
                    onChange={(e) =>
                      update((s) =>
                        updateApplication(s, app.id, {
                          status: e.target.value as typeof app.status,
                        }),
                      )
                    }
                  >
                    {(
                      [
                        "Not started",
                        "Preparing",
                        "Submitted",
                        "Awaiting decision",
                        "Decision received",
                      ] as const
                    ).map((status) => (
                      <option
                        key={status}
                        disabled={
                          [
                            "Submitted",
                            "Awaiting decision",
                            "Decision received",
                          ].includes(status) && !metrics.submissionRecorded
                        }
                      >
                        {status}
                      </option>
                    ))}
                  </select>
                </label>
                {!metrics.submissionRecorded && (
                  <p className="muted">
                    Record a submission reference and date before recording a
                    submitted status.
                  </p>
                )}
                {metrics.submissionRecorded && (
                  <p>
                    Reference: {app.reference} · Submitted: {app.submissionDate}
                  </p>
                )}
                <h3>Application history</h3>
                <ol className="visa-history">
                  {(state.applicationEvents ?? [])
                    .filter(
                      (e) =>
                        e.applicationId === app.id &&
                        !e.detail.startsWith("Opened "),
                    )
                    .slice(-12)
                    .reverse()
                    .map((event) => (
                      <li key={event.id}>
                        <strong>
                          {event.detail.startsWith("visa:")
                            ? event.type.replaceAll("-", " ")
                            : event.detail}
                        </strong>
                        <small>
                          {new Date(event.createdAt).toLocaleString()}
                        </small>
                      </li>
                    ))}
                </ol>
              </div>
            )}
          </Panel>
        </div>
        <aside className="visa-sidebar">
          <Panel title="Application summary">
            <dl>
              <div>
                <dt>Visa category</dt>
                <dd>{app.visaCategory}</dd>
              </div>
              <div>
                <dt>Destination</dt>
                <dd>{app.destination}</dd>
              </div>
              <div>
                <dt>Traveler</dt>
                <dd>{traveler.name}</dd>
              </div>
              <div>
                <dt>Travel purpose</dt>
                <dd>{journey.purpose}</dd>
              </div>
              <div>
                <dt>Departure</dt>
                <dd>{journey.departure}</dd>
              </div>
              <div>
                <dt>Evidence readiness</dt>
                <dd>
                  {metrics.documentsPrepared}/{metrics.documentsTotal} linked
                  prepared
                </dd>
              </div>
              <div>
                <dt>Workflow stage</dt>
                <dd>{stages.find((s) => s.key === app.stage)?.label}</dd>
              </div>
              <div>
                <dt>Eligibility</dt>
                <dd>Not verified</dd>
              </div>
            </dl>
            {app.officialUrl && (
              <a
                className="text-link"
                href={app.officialUrl}
                target="_blank"
                rel="noreferrer"
              >
                Official application <ExternalLink size={13} />
              </a>
            )}
          </Panel>
        </aside>
      </div>
      <DocumentEditor open={add} onOpenChange={setAdd} applicationId={app.id} />
      <Modal
        open={details}
        onOpenChange={setDetails}
        title="Application details"
        description="Journey context and local application record"
        className="visa-drawer"
      >
        <dl className="context-details">
          <span>
            Journey<strong>{journey.name}</strong>
          </span>
          <span>
            Traveler<strong>{traveler.name}</strong>
          </span>
          <span>
            Nationality<strong>{traveler.nationality}</strong>
          </span>
          <span>
            Residence<strong>{traveler.residence}</strong>
          </span>
          <span>
            Category<strong>{app.visaCategory}</strong>
          </span>
          <span>
            Reference<strong>{app.reference || "Not recorded"}</strong>
          </span>
          <span>
            Submission date
            <strong>{app.submissionDate || "Not recorded"}</strong>
          </span>
        </dl>
        {app.visaCategory === "Student visa" && (
          <form
            className="visa-stage-body form-grid"
            key={app.id}
            onSubmit={saveContext}
          >
            <h3 className="full">Requirement context</h3>
            <p className="full muted">
              Record known facts only. Leave unknown conditions unconfirmed.
            </p>
            <label>
              Planned application date
              <input
                type="date"
                name="applicationDate"
                defaultValue={app.ruleContext?.applicationDate}
              />
            </label>
            <label>
              Course level
              <select
                name="courseLevel"
                defaultValue={app.ruleContext?.courseLevel ?? ""}
              >
                <option value="">Not confirmed</option>
                <option value="degree">Degree level or above</option>
                <option value="below-degree">Below degree level</option>
              </select>
            </label>
            <label className="full">
              Course subject / CAH3 code
              <input
                name="courseCah3Code"
                defaultValue={app.ruleContext?.courseCah3Code}
                maxLength={80}
              />
            </label>
            <label className="full">
              English evidence pathway
              <select
                name="englishPathway"
                defaultValue={app.ruleContext?.englishPathway ?? ""}
              >
                <option value="">Not confirmed</option>
                <option value="hep">
                  Higher education provider assessment — degree level or above
                </option>
                <option value="qualification">
                  Accepted qualification — checked official conditions
                </option>
                <option value="selt">
                  Approved SELT — required for my route
                </option>
                <option value="exempt">
                  Exemption — checked official conditions
                </option>
              </select>
            </label>
            <label className="full">
              Financial evidence exception
              <select
                name="financialException"
                defaultValue={app.ruleContext?.financialEvidenceException ?? ""}
              >
                <option value="">Not confirmed</option>
                <option value="none">No evidence exception applies</option>
                <option value="differential-evidence">
                  Differential evidence nationality — official list checked
                </option>
                <option value="12-month-visa">
                  At least 12 months in the UK on a valid visa
                </option>
                <option value="sabbatical-officer">
                  Student union sabbatical officer
                </option>
                <option value="doctor-dentist-training">
                  Doctor or dentist in training
                </option>
              </select>
            </label>
            <label className="full">
              Lived in a listed TB country within the last 6 months
              <select
                name="tbRecent"
                defaultValue={
                  app.ruleContext?.tbListedCountryRecentResidence === undefined
                    ? ""
                    : app.ruleContext.tbListedCountryRecentResidence
                      ? "yes"
                      : "no"
                }
              >
                <option value="">Not confirmed</option>
                <option value="yes">
                  Yes — checked the official country list
                </option>
                <option value="no">No — checked residence history</option>
              </select>
            </label>
            <label>
              Months lived in listed TB country
              <input
                name="tbMonths"
                type="number"
                min="0"
                max="1200"
                defaultValue={app.ruleContext?.tbResidenceDurationMonths}
              />
            </label>
            <label>
              ATAS required by course guidance
              <select
                name="atas"
                defaultValue={
                  app.ruleContext?.atasRequired === undefined
                    ? ""
                    : app.ruleContext.atasRequired
                      ? "yes"
                      : "no"
                }
              >
                <option value="">Not confirmed</option>
                <option value="yes">Yes — confirmed with provider</option>
                <option value="no">No — confirmed with provider</option>
              </select>
            </label>
            <label className="full">
              Financial sponsor covered fees and living costs in the last 12
              months
              <select
                name="sponsorship"
                defaultValue={
                  app.ruleContext?.financialSponsorshipWithin12Months ===
                  undefined
                    ? ""
                    : app.ruleContext.financialSponsorshipWithin12Months
                      ? "yes"
                      : "no"
                }
              >
                <option value="">Not confirmed</option>
                <option value="yes">Yes</option>
                <option value="no">No</option>
              </select>
            </label>
            <Button type="submit" size="sm" variant="outline">
              Save requirement context
            </Button>
          </form>
        )}
        <div className="dialog-footer">
          <Button asChild size="sm" variant="outline">
            <Link href="/app/journey">Edit journey</Link>
          </Button>
          <Button asChild size="sm" variant="outline">
            <Link href="/app/documents">Manage documents</Link>
          </Button>
        </div>
      </Modal>
    </div>
  );
}
