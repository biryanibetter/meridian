"use client";

import { useMemo, useState, type FormEvent } from "react";
import { Check } from "lucide-react";
import { useDemo } from "@/lib/store";
import type { Document as TravelDocument } from "@/lib/types";
import {
  applicationRequirements,
  documentStatus,
  linkEvidence,
  saveDocument,
  unlinkEvidence,
} from "@/lib/visa-workflow";
import { Button } from "./ui/button";
import { Modal } from "./ui/dialog";
import { Badge } from "./common";

export type DocumentEditorProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  documentId?: string;
  applicationId?: string;
  requirementId?: string;
};
const categories = [
  "Passport",
  "Visa",
  "Financial evidence",
  "Admission",
  "Insurance",
  "Accommodation",
  "Healthcare",
  "Booking",
  "Certificate",
  "CAS",
  "English evidence",
  "TB certificate",
  "ATAS",
  "Consent",
  "Sponsorship",
  "Other",
];
export function DocumentEditor(props: DocumentEditorProps) {
  if (!props.open) return null;
  return (
    <DocumentEditorForm
      key={`${props.documentId ?? "new"}:${props.applicationId ?? ""}:${props.requirementId ?? ""}`}
      {...props}
    />
  );
}
function DocumentEditorForm({
  open,
  onOpenChange,
  documentId,
  applicationId,
  requirementId,
}: DocumentEditorProps) {
  const { state, update, toast } = useDemo();
  const existing = state.documents.find((doc) => doc.id === documentId);
  const existingLinks =
    state.evidenceLinks?.filter((item) => item.documentId === existing?.id) ??
    [];
  const linkedApplicationId = existingLinks[0]?.applicationId;
  const initialApplicationId = applicationId ?? linkedApplicationId ?? "";
  const app = state.applications?.find(
    (item) => item.id === initialApplicationId,
  );
  const journey =
    state.journeys.find(
      (item) =>
        item.id ===
        (existing?.journeyId ?? app?.journeyId ?? state.activeJourneyId),
    ) ?? state.journeys[0];
  const defaultRequirement =
    app && requirementId
      ? applicationRequirements(state, app).find(
          (item) => item.id === requirementId || item.ruleId === requirementId,
        )
      : undefined;
  const defaultCategory = defaultRequirement?.evidenceTypes[0] ?? "Other";
  const [name, setName] = useState(existing?.name ?? "");
  const [category, setCategory] = useState(
    existing?.category ?? defaultCategory,
  );
  const [owner, setOwner] = useState(
    existing?.ownerId ?? app?.travelerId ?? state.activeTravelerId,
  );
  const [selectedApp, setSelectedApp] = useState(initialApplicationId);
  const [selectedRequirements, setSelectedRequirements] = useState<string[]>(
    existing
      ? existingLinks.map(
          (item) => `${item.applicationId}|${item.requirementId}`,
        )
      : app && defaultRequirement
        ? [`${app.id}|${defaultRequirement.id}`]
        : [],
  );
  const [issueDate, setIssueDate] = useState(existing?.issueDate ?? "");
  const [expiry, setExpiry] = useState(existing?.expires ?? "");
  const [preparationStatus, setPreparationStatus] = useState<
    TravelDocument["preparationStatus"]
  >(
    existing?.preparationStatus ??
      (existing?.prepared
        ? existing.reviewed
          ? "Ready"
          : "Needs review"
        : "To prepare"),
  );
  const [notes, setNotes] = useState(existing?.preparationNote ?? "");
  const availableApps = (state.applications ?? []).filter(
    (item) => item.travelerId === owner,
  );
  const applicableRequirements = useMemo(() => {
    const target = state.applications?.find((item) => item.id === selectedApp);
    return target
      ? applicationRequirements(state, target).filter(
          (req) => !req.procedural && req.applicability !== "Not applicable",
        )
      : [];
  }, [state, selectedApp]);

  function save(e: FormEvent) {
    e.preventDefault();
    if (!name.trim() || !journey || !owner) return;
    for (const pair of selectedRequirements) {
      const [appId, reqId] = pair.split("|");
      const target = state.applications?.find((item) => item.id === appId);
      const requirement =
        target &&
        applicationRequirements(state, target).find(
          (item) => item.id === reqId,
        );
      const historical = existingLinks.some(
        (link) => link.applicationId === appId && link.requirementId === reqId,
      );
      if (historical && existing?.ownerId === owner && !requirement) continue;
      if (
        !target ||
        target.travelerId !== owner ||
        !requirement ||
        requirement.procedural ||
        requirement.applicability === "Not applicable"
      ) {
        toast(
          "Remove the invalid requirement link or select a requirement for this traveler.",
        );
        return;
      }
    }
    const prepared =
      preparationStatus === "Ready" || preparationStatus === "Needs review";
    const reviewed = preparationStatus === "Ready";
    const doc: TravelDocument = {
      ...(existing ?? ({} as TravelDocument)),
      id: existing?.id ?? `doc-${crypto.randomUUID()}`,
      journeyId: existing?.journeyId ?? journey.id,
      name: name.trim(),
      category,
      ownerId: owner,
      expires: expiry,
      issueDate: issueDate || undefined,
      taskId: existing?.taskId ?? "",
      added: existing?.added ?? new Date().toISOString().slice(0, 10),
      preparationNote: notes.trim() || undefined,
      preparationStatus,
      prepared,
      reviewed,
    };
    update((s) => {
      let next = saveDocument(s, doc);
      const selectedPairs = new Set(selectedRequirements);
      for (const item of next.evidenceLinks ?? []) {
        if (
          item.documentId === doc.id &&
          !selectedPairs.has(`${item.applicationId}|${item.requirementId}`)
        )
          next = unlinkEvidence(next, item.requirementId, doc.id);
      }
      for (const pair of selectedPairs) {
        const [appId, reqId] = pair.split("|");
        if (
          appId &&
          reqId &&
          !next.evidenceLinks?.some(
            (item) =>
              item.documentId === doc.id && item.requirementId === reqId,
          )
        )
          next = linkEvidence(next, appId, reqId, doc.id);
      }
      return next;
    });
    toast(existing ? "Document record updated." : "Document metadata added.");
    onOpenChange(false);
  }
  const currentStatus = existing ? documentStatus(existing) : preparationStatus;
  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={existing ? "Document details" : "Add document"}
      description={
        !existing
          ? "Local metadata only; no file content is stored."
          : "Edit this travel document record and its preparation details."
      }
      className="document-editor"
    >
      <form onSubmit={save}>
        <div className="form-grid">
          <label className="full">
            Document name
            <input
              aria-label="Document name"
              required
              maxLength={100}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </label>
          <label>
            Type
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              {categories.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </label>
          <label>
            Traveler
            <select
              value={owner}
              disabled={Boolean(existingLinks.length)}
              onChange={(e) => {
                setOwner(e.target.value);
                setSelectedRequirements([]);
                if (
                  !availableApps.some(
                    (item) => item.travelerId === e.target.value,
                  )
                )
                  setSelectedApp("");
              }}
            >
              {state.travelers
                .filter(
                  (person) =>
                    journey?.travelers.includes(person.id) ||
                    person.id === existing?.ownerId,
                )
                .map((person) => (
                  <option key={person.id} value={person.id}>
                    {person.name}
                  </option>
                ))}
            </select>
          </label>
          <label className="full">
            Application
            <select
              aria-label="Application"
              value={selectedApp}
              onChange={(e) => setSelectedApp(e.target.value)}
            >
              <option value="">No application selected</option>
              {availableApps.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.destination} · {item.visaCategory}
                </option>
              ))}
            </select>
          </label>
          <label>
            Issue date
            <input
              type="date"
              value={issueDate}
              onChange={(e) => setIssueDate(e.target.value)}
            />
          </label>
          <label>
            Expiry date
            <input
              type="date"
              value={expiry}
              onChange={(e) => setExpiry(e.target.value)}
            />
          </label>
          <label className="full">
            Preparation status
            <select
              value={preparationStatus ?? "To prepare"}
              onChange={(e) =>
                setPreparationStatus(
                  e.target.value as TravelDocument["preparationStatus"],
                )
              }
            >
              {["Missing", "To prepare", "Added", "Needs review", "Ready"].map(
                (item) => (
                  <option key={item}>{item}</option>
                ),
              )}
            </select>
          </label>
          <label className="full">
            Notes
            <input value={notes} onChange={(e) => setNotes(e.target.value)} />
          </label>
          <fieldset className="full">
            <legend>Linked requirements</legend>
            {applicableRequirements.length ? (
              applicableRequirements.map((req) => {
                const pair = `${selectedApp}|${req.id}`;
                return (
                  <label key={req.id}>
                    <input
                      type="checkbox"
                      checked={selectedRequirements.includes(pair)}
                      onChange={(e) =>
                        setSelectedRequirements((current) =>
                          e.target.checked
                            ? [...current, pair]
                            : current.filter((item) => item !== pair),
                        )
                      }
                    />
                    {req.title}
                  </label>
                );
              })
            ) : (
              <small>Select an application to link requirements.</small>
            )}
            {existingLinks
              .filter(
                (item) =>
                  !applicableRequirements.some(
                    (req) =>
                      req.id === item.requirementId &&
                      item.applicationId === selectedApp,
                  ),
              )
              .map((item) => {
                const linkedApp = state.applications?.find(
                  (a) => a.id === item.applicationId,
                );
                const title = linkedApp
                  ? applicationRequirements(state, linkedApp).find(
                      (req) => req.id === item.requirementId,
                    )?.title
                  : undefined;
                const pair = `${item.applicationId}|${item.requirementId}`;
                return (
                  <label key={item.id}>
                    <input
                      type="checkbox"
                      checked={selectedRequirements.includes(pair)}
                      onChange={(e) =>
                        setSelectedRequirements((current) =>
                          e.target.checked
                            ? [...current, pair]
                            : current.filter((value) => value !== pair),
                        )
                      }
                    />
                    {title ?? item.requirementId} ·{" "}
                    {linkedApp?.destination ?? "Application"}
                  </label>
                );
              })}
          </fieldset>
        </div>
        {existing && (
          <div className="document-detail-actions">
            <Badge tone={currentStatus === "Ready" ? "green" : "amber"}>
              {currentStatus}
            </Badge>
            <Button
              type="button"
              size="sm"
              onClick={() => {
                const nextStatus = existing.prepared
                  ? "To prepare"
                  : "Needs review";
                setPreparationStatus(nextStatus);
                update((s) =>
                  saveDocument(s, {
                    ...existing,
                    prepared: !existing.prepared,
                    reviewed: false,
                    preparationStatus: nextStatus,
                  }),
                );
              }}
            >
              {existing.prepared ? "Mark not prepared" : "Mark prepared"}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => {
                const reviewed = !existing.reviewed;
                setPreparationStatus(
                  existing.prepared
                    ? reviewed
                      ? "Ready"
                      : "Needs review"
                    : (existing.preparationStatus ?? "To prepare"),
                );
                update((s) => {
                  const links = s.evidenceLinks ?? [];
                  return {
                    ...s,
                    documents: s.documents.map((item) =>
                      item.id === existing.id
                        ? {
                            ...item,
                            reviewed,
                            preparationStatus: item.prepared
                              ? reviewed
                                ? "Ready"
                                : "Needs review"
                              : item.preparationStatus,
                          }
                        : item,
                    ),
                    evidenceLinks: links.map((link) =>
                      link.documentId === existing.id
                        ? {
                            ...link,
                            reviewedAt: reviewed
                              ? new Date().toISOString()
                              : undefined,
                          }
                        : link,
                    ),
                  };
                });
              }}
            >
              {existing.reviewed
                ? "Undo personal review"
                : "Mark reviewed (personal)"}
            </Button>
            <small>
              Personal preparation and review only; not government verification
              or approval.
            </small>
          </div>
        )}
        <div className="dialog-footer">
          <Button type="submit" variant="default">
            {existing ? "Save changes" : "Add document"}
            <Check size={14} />
          </Button>
        </div>
      </form>
    </Modal>
  );
}
