"use client";

import { useState } from "react";
import { ChevronRight, ExternalLink, FileText, Plus } from "lucide-react";
import type { Application } from "@/lib/types";
import { useDemo } from "@/lib/store";
import {
  applicationRequirements,
  assessRequirement,
  linkedDocuments,
  suggestedDocuments,
  linkEvidence,
  unlinkEvidence,
  reviewEvidence,
  documentStatus,
  type ApplicationRequirement,
} from "@/lib/visa-workflow";
import { Badge } from "./common";
import { Button } from "./ui/button";
import { Modal } from "./ui/dialog";
import { DocumentEditor } from "./document-editor";

export function evidenceLabel(
  state: ReturnType<typeof useDemo>["state"],
  requirement: ApplicationRequirement,
) {
  if (requirement.applicability === "Not applicable") return "Not applicable";
  if (requirement.procedural) return "Process step";
  const docs = linkedDocuments(state, requirement.id);
  if (!docs.length)
    return requirement.applicability === "Required"
      ? "Missing"
      : "Check applicability";
  const reviewed = state.evidenceLinks
    ?.filter((l) => l.requirementId === requirement.id)
    .every((l) => l.reviewedAt);
  return docs.every((d) => d.prepared && d.reviewed) && reviewed
    ? "Prepared · reviewed by you"
    : `${docs.length} linked · review needed`;
}

export function RequirementsWorkspace({
  application,
  documentsOnly = false,
}: {
  application: Application;
  documentsOnly?: boolean;
}) {
  const { state } = useDemo();
  const [selectedId, setSelectedId] = useState<string>();
  const requirements = applicationRequirements(state, application);
  const visible = documentsOnly
    ? requirements.filter(
        (r) => !r.procedural && r.applicability !== "Not applicable",
      )
    : requirements;
  const groups = [...new Set(visible.map((r) => r.group))];
  const selected = requirements.find((r) => r.id === selectedId);
  const traveler = state.travelers.find((t) => t.id === application.travelerId);
  return (
    <>
      {documentsOnly ? (
        <div className="table-scroll">
          <table className="visa-table">
            <thead>
              <tr>
                <th>Document</th>
                <th>Linked requirement</th>
                <th>Traveler</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((req) => {
                const docs = linkedDocuments(state, req.id);
                const suggestions = suggestedDocuments(state, application, req);
                return (
                  <tr key={req.id}>
                    <td>
                      <span className="visa-document-name">
                        <FileText size={15} />
                        <strong>
                          {docs.map((d) => d.name).join(", ") ||
                            req.evidenceTypes.join(" / ") ||
                            req.title}
                        </strong>
                      </span>
                    </td>
                    <td>{req.title}</td>
                    <td>{traveler?.name}</td>
                    <td>
                      <Badge tone={docs.length ? "blue" : "neutral"}>
                        {evidenceLabel(state, req)}
                      </Badge>
                      {suggestions.length > 0 && (
                        <small>
                          {suggestions.length} existing match
                          {suggestions.length === 1 ? "" : "es"}
                        </small>
                      )}
                    </td>
                    <td>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setSelectedId(req.id)}
                      >
                        {docs.length
                          ? "View"
                          : suggestions.length
                            ? "Link existing"
                            : req.applicability === "Required"
                              ? "Add"
                              : "Details"}
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {!visible.length && (
            <p className="panel-padding muted">
              No verified document checklist is available for this route.
              Confirm requirements with the responsible authority.
            </p>
          )}
        </div>
      ) : (
        <div className="visa-requirement-groups">
          {groups.map((group) => (
            <section key={group}>
              <h3 className="visa-group-heading">{group}</h3>
              <div className="visa-requirement-list">
                {visible
                  .filter((r) => r.group === group)
                  .map((req) => (
                    <div className="visa-requirement-row" key={req.id}>
                      <button
                        className="visa-requirement-open"
                        onClick={() => setSelectedId(req.id)}
                      >
                        <span>
                          <strong>{req.title}</strong>
                          <small>{evidenceLabel(state, req)}</small>
                        </span>
                        <Badge
                          tone={
                            req.applicability === "Required"
                              ? "blue"
                              : req.applicability === "Not applicable"
                                ? "neutral"
                                : "amber"
                          }
                        >
                          {req.applicability}
                        </Badge>
                        <ChevronRight size={15} />
                      </button>
                      {req.sourceUrl && (
                        <a
                          className="visa-source-action"
                          href={req.sourceUrl}
                          target="_blank"
                          rel="noreferrer"
                          aria-label={`Official source: ${req.title}`}
                          title="Open official source"
                        >
                          <ExternalLink size={14} />
                        </a>
                      )}
                    </div>
                  ))}
              </div>
            </section>
          ))}
        </div>
      )}
      {selected && (
        <RequirementDrawer
          application={application}
          requirement={selected}
          onClose={() => setSelectedId(undefined)}
        />
      )}
    </>
  );
}

function RequirementDrawer({
  application,
  requirement: req,
  onClose,
}: {
  application: Application;
  requirement: ApplicationRequirement;
  onClose: () => void;
}) {
  const { state, update, toast } = useDemo();
  const [editor, setEditor] = useState<{ documentId?: string }>();
  const [existingId, setExistingId] = useState("");
  const documents = linkedDocuments(state, req.id);
  const suggestions = suggestedDocuments(state, application, req);
  const unlinked = state.documents.filter(
    (d) =>
      d.ownerId === application.travelerId &&
      !documents.some((linked) => linked.id === d.id),
  );
  function confirm(id: string) {
    update((s) => linkEvidence(s, application.id, req.id, id));
    toast(
      "Document linked for your review. Authority verification is unchanged.",
    );
  }
  return (
    <>
      <Modal
        open={!editor}
        onOpenChange={(open) => !open && onClose()}
        title={req.title}
        description={`${application.destination} · ${req.group}`}
        className="visa-drawer"
      >
        <div className="visa-drawer-body">
          <div className="visa-inline">
            <Badge tone="neutral">{req.applicability}</Badge>
            <span className="muted">
              {req.assessed ? "Assessed by you" : "Not yet assessed"}
            </span>
          </div>
          <section>
            <h3>What this means</h3>
            <p>{req.preparation}</p>
          </section>
          <section>
            <h3>Who it applies to</h3>
            <p>
              {req.conditions.stayDuration} {req.conditions.ageBand}
            </p>
            <p className="muted">
              {req.context.nationality} passport · Resident in{" "}
              {req.context.residence} · {req.context.purpose}
            </p>
          </section>
          <section>
            <h3>What to prepare</h3>
            <p>
              {req.procedural
                ? "Complete this step through the official service; no document is counted as missing."
                : req.evidenceTypes.join(", ") ||
                  "Confirm the evidence type with the authority."}
            </p>
          </section>
          <section>
            <h3>Information still missing</h3>
            {req.missingInformation.length ? (
              <ul>
                {req.missingInformation.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            ) : (
              <p>
                No further rule-context fields are identified. Individual
                eligibility is not verified.
              </p>
            )}
          </section>
          {req.acceptedEvidence.length > 0 && (
            <section>
              <h3>Accepted evidence pathways</h3>
              <ul>
                {req.acceptedEvidence.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </section>
          )}
          <section>
            <h3>Official instructions</h3>
            {req.sourceUrl ? (
              <a
                className="text-link"
                href={req.sourceUrl}
                target="_blank"
                rel="noreferrer"
              >
                {req.sourceName} <ExternalLink size={13} />
              </a>
            ) : (
              <p>No verified official source is registered for this route.</p>
            )}
            {req.ruleId === "uk-study-english" && (
              <p>
                <a
                  className="text-link"
                  href="https://www.gov.uk/guidance/prove-your-english-language-abilities-with-a-secure-english-language-test-selt"
                  target="_blank"
                  rel="noreferrer"
                >
                  Approved SELT routes, tests and providers{" "}
                  <ExternalLink size={13} />
                </a>
              </p>
            )}
            {req.ruleId === "uk-study-finances" && (
              <p>
                <a
                  className="text-link"
                  href="https://www.gov.uk/student-visa/money"
                  target="_blank"
                  rel="noreferrer"
                >
                  Course fees, living costs and differential evidence{" "}
                  <ExternalLink size={13} />
                </a>
              </p>
            )}
            <small className="muted">
              Source guidance checked:{" "}
              {req.lastVerified ?? req.sourceFetchedAt ?? "Not verified"} ·
              Personal eligibility not verified
            </small>
          </section>
          {!req.procedural && req.applicability !== "Not applicable" && (
            <section>
              <h3>Associated documents</h3>
              {documents.length ? (
                documents.map((doc) => (
                  <div key={doc.id} className="visa-linked-document">
                    <div>
                      <button
                        className="text-link"
                        onClick={() => setEditor({ documentId: doc.id })}
                      >
                        {doc.name}
                      </button>
                      <small>
                        {documentStatus(doc)} · Authority verification: not
                        verified
                      </small>
                    </div>
                    <div className="visa-inline">
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={!doc.prepared}
                        onClick={() =>
                          update((s) => reviewEvidence(s, req.id, doc.id))
                        }
                      >
                        {state.evidenceLinks?.find(
                          (l) =>
                            l.requirementId === req.id &&
                            l.documentId === doc.id,
                        )?.reviewedAt
                          ? "Review recorded"
                          : "Review evidence"}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() =>
                          update((s) => unlinkEvidence(s, req.id, doc.id))
                        }
                      >
                        Unlink
                      </Button>
                    </div>
                  </div>
                ))
              ) : (
                <p className="muted">
                  No confirmed links. Existing matches below are suggestions,
                  not accepted evidence.
                </p>
              )}
              {suggestions.map((doc) => (
                <div className="visa-linked-document" key={doc.id}>
                  <div>
                    <strong>{doc.name}</strong>
                    <small>
                      Potential match · {documentStatus(doc)}
                      {doc.expires ? ` · Expires ${doc.expires}` : ""}
                    </small>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => confirm(doc.id)}
                  >
                    Confirm link
                  </Button>
                </div>
              ))}
              <div className="visa-link-controls">
                <label>
                  Link an existing document
                  <select
                    value={existingId}
                    onChange={(e) => setExistingId(e.target.value)}
                  >
                    <option value="">Choose this traveler’s record</option>
                    {unlinked.map((doc) => (
                      <option value={doc.id} key={doc.id}>
                        {doc.name} ({doc.category})
                      </option>
                    ))}
                  </select>
                </label>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!existingId}
                  onClick={() => {
                    confirm(existingId);
                    setExistingId("");
                  }}
                >
                  Link document
                </Button>
              </div>
              <Button variant="outline" size="sm" onClick={() => setEditor({})}>
                <Plus size={13} />
                Add document
              </Button>
            </section>
          )}
          <section>
            <h3>Next action</h3>
            <p>
              {req.applicability === "Not applicable"
                ? "Recheck if your circumstances change."
                : req.missingInformation.length
                  ? "Confirm the missing information against the official instructions before deciding what evidence to prepare."
                  : req.procedural
                    ? "Complete the official step and record its completion in the Application stage."
                    : "Prepare the applicable evidence and record your personal review."}
            </p>
          </section>
        </div>
        <div className="dialog-footer">
          <span className="muted small">
            Assessment does not mark evidence ready.
          </span>
          <Button
            size="sm"
            variant="default"
            disabled={req.assessed}
            onClick={() =>
              update((s) => assessRequirement(s, application.id, req.id))
            }
          >
            {req.assessed ? "Assessment recorded" : "Record assessment"}
          </Button>
        </div>
      </Modal>
      {editor && (
        <DocumentEditor
          open
          onOpenChange={(open) => !open && setEditor(undefined)}
          documentId={editor.documentId}
          applicationId={application.id}
          requirementId={req.id}
        />
      )}
    </>
  );
}
