"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { ExternalLink } from "lucide-react";
import type { Application } from "@/lib/types";
import {
  deriveGovernmentCase,
  recordGovernmentAppointment,
  recordGovernmentDeadline,
  setGovernmentAppointmentCompleted,
  setGovernmentDeadlineCompleted,
} from "@/lib/government";
import { useDemo } from "@/lib/store";
import { Panel } from "@/components/common";
import { Button } from "@/components/ui/button";
import { VerificationProgressRing } from "@/components/verification-progress-ring";
import type { VerificationStatus } from "@/lib/progress";

const statusLabel: Record<VerificationStatus, string> = {
  "not-checked": "Not checked",
  "needs-information": "Needs information",
  "user-reviewed": "User recorded",
  prepared: "Prepared locally",
  "official-confirmation-required": "Confirm with authority",
  "officially-verified": "Confirm with authority",
};

function displayDate(value: string) {
  if (typeof value !== "string" || !value.trim()) return "Date not valid";
  const date = new Date(value);
  return Number.isFinite(date.getTime())
    ? new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(date)
    : "Date not valid";
}

export function GovernmentCasePanel({
  application,
}: {
  application: Application;
}) {
  const { state, update } = useDemo();
  const [appointmentError, setAppointmentError] = useState("");
  const [deadlineError, setDeadlineError] = useState("");
  const governmentCase = deriveGovernmentCase(state, application);
  const money = (amount: number | null, currency: string) =>
    amount === null
      ? "Amount not recorded"
      : new Intl.NumberFormat("en", {
          style: "currency",
          currency,
          maximumFractionDigits: 2,
        }).format(amount);

  function addAppointment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const values = new FormData(form);
    const title = String(values.get("appointmentTitle") ?? "").trim();
    const scheduledAt = String(values.get("appointmentDate") ?? "");
    if (!title || !scheduledAt) {
      setAppointmentError("Enter an appointment name and planned date.");
      return;
    }
    update((current) =>
      recordGovernmentAppointment(current, application.id, {
        title,
        scheduledAt,
        location: String(values.get("appointmentLocation") ?? "").trim() || undefined,
      }),
    );
    form.reset();
    setAppointmentError("");
  }

  function addDeadline(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const values = new FormData(form);
    const title = String(values.get("deadlineTitle") ?? "").trim();
    const date = String(values.get("deadlineDate") ?? "");
    if (!title || !date) {
      setDeadlineError("Enter a deadline name and date.");
      return;
    }
    update((current) =>
      recordGovernmentDeadline(current, application.id, { title, date }),
    );
    form.reset();
    setDeadlineError("");
  }

  return (
    <Panel
      title="Government case preparation"
      description={`${application.destination} · local preparation record`}
      className="government-case-panel"
    >
      <div className="government-case-overview">
        <VerificationProgressRing
          completed={governmentCase.progress.completed}
          total={governmentCase.progress.total}
          size={72}
          status={governmentCase.status}
          label={statusLabel[governmentCase.status]}
        />
        <div>
          <strong>{statusLabel[governmentCase.status]}</strong>
          <p>
            {governmentCase.progress.completed}/{governmentCase.progress.total}{" "}
            applicable steps prepared locally. This is not an eligibility
            decision, submission confirmation, or government verification.
          </p>
          <p>
            Responsible authority: <strong>{governmentCase.authority.name}</strong>
            {" "}({governmentCase.authority.jurisdiction}); authority and route
            applicability still need confirmation.
          </p>
        </div>
      </div>

      {governmentCase.nextAction && (
        <div className="government-case-next">
          <strong>Next action</strong>
          <span>{governmentCase.nextAction.title}</span>
          {governmentCase.nextAction.dependencies.length > 0 && (
            <small>
              Prerequisite:{" "}
              {governmentCase.steps
                .filter((step) =>
                  governmentCase.nextAction!.dependencies.includes(step.id),
                )
                .map((step) => step.title)
                .join(", ")}
            </small>
          )}
          {governmentCase.nextAction.missingInformation.length > 0 && (
            <small>
              Confirm: {governmentCase.nextAction.missingInformation.join(", ")}
            </small>
          )}
        </div>
      )}

      <div className="government-case-compact">
        <strong>Appointments</strong>
        <span>
          {governmentCase.appointments.length
            ? `${governmentCase.appointments.length} planning record(s)`
            : "None recorded"}
        </span>
        <strong>Deadlines</strong>
        <span>
          {governmentCase.deadlines.length
            ? `${governmentCase.deadlines.length} planning record(s)`
            : "None recorded"}
        </span>
        <strong>Government costs</strong>
        <span>
          {governmentCase.costs.map((cost) => `${cost.title}: ${money(cost.amount, cost.currency)} (${cost.certainty})`).join("; ")}
        </span>
      </div>

      <div className="government-case-forms">
        <section>
          <h3>Add appointment</h3>
          <p>Planning records only; Meridian does not book appointments.</p>
          <form className="government-case-form" onSubmit={addAppointment}>
            <label>
              Appointment
              <input name="appointmentTitle" maxLength={120} required placeholder="e.g. Biometrics" />
            </label>
            <label>
              Planned date and time
              <input name="appointmentDate" type="datetime-local" required />
            </label>
            <label>
              Location (optional)
              <input name="appointmentLocation" maxLength={160} />
            </label>
            <Button size="sm" type="submit">Add appointment</Button>
            {appointmentError && <small role="alert">{appointmentError}</small>}
          </form>
          {governmentCase.appointments.length && (
            <ul>
              {governmentCase.appointments.map((appointment) => (
                <li key={appointment.id} className="government-case-record">
                  <span>
                    <strong>{appointment.title}</strong> · {displayDate(appointment.scheduledAt)}
                    {appointment.location ? ` · ${appointment.location}` : ""}
                    <small> User-recorded; not a booking confirmation.</small>
                  </span>
                  <label>
                    <input
                      type="checkbox"
                      checked={appointment.completed}
                      onChange={(event) =>
                        update((current) =>
                          setGovernmentAppointmentCompleted(
                            current,
                            application.id,
                            appointment.id,
                            event.target.checked,
                          ),
                        )
                      }
                    />
                    Completed
                  </label>
                </li>
              ))}
            </ul>
          )}
        </section>
        <section>
          <h3>Add deadline</h3>
          <form className="government-case-form" onSubmit={addDeadline}>
            <label>
              Deadline
              <input name="deadlineTitle" maxLength={120} required placeholder="e.g. Submit application" />
            </label>
            <label>
              Date
              <input name="deadlineDate" type="date" required />
            </label>
            <Button size="sm" type="submit">Add deadline</Button>
            {deadlineError && <small role="alert">{deadlineError}</small>}
          </form>
          {governmentCase.deadlines.length && (
            <ul>
              {governmentCase.deadlines.map((deadline) => (
                <li key={deadline.id} className="government-case-record">
                  <span><strong>{deadline.title}</strong> · {displayDate(deadline.date)}</span>
                  <label>
                    <input
                      type="checkbox"
                      checked={deadline.completed}
                      onChange={(event) =>
                        update((current) =>
                          setGovernmentDeadlineCompleted(
                            current,
                            application.id,
                            deadline.id,
                            event.target.checked,
                          ),
                        )
                      }
                    />
                    Completed
                  </label>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <details className="government-case-details">
        <summary>Procedure and dependencies ({governmentCase.steps.length})</summary>
        <div className="government-case-steps">
          {governmentCase.steps.map((step) => (
            <article className="government-case-step" key={step.id}>
              <VerificationProgressRing
                completed={step.status === "prepared" ? 1 : 0}
                total={1}
                size={32}
                status={step.status}
                label={`${step.title}: ${statusLabel[step.status]}`}
              />
              <div>
                <strong>{step.title}</strong>
                <span>
                  {step.applicability.replaceAll("-", " ")} ·{" "}
                  {statusLabel[step.status]}
                </span>
                {step.dependencies.length > 0 && (
                  <small>
                    Depends on:{" "}
                    {governmentCase.steps
                      .filter((item) => step.dependencies.includes(item.id))
                      .map((item) => item.title)
                      .join(", ")}
                  </small>
                )}
                {step.missingInformation.length > 0 && (
                  <small>To confirm: {step.missingInformation.join(", ")}</small>
                )}
                {step.source ? (
                  <>
                    <a href={step.source.url} target="_blank" rel="noreferrer">
                      {step.source.name} <ExternalLink size={12} />
                    </a>
                    <small>Coverage: {step.source.coverage}</small>
                  </>
                ) : (
                  <small>No registered official reference for this jurisdiction.</small>
                )}
                <small>
                  Responsible authority: {step.authority.name} · source{" "}
                  {step.source?.freshness === "stale"
                    ? "may be stale"
                    : step.source?.lastChecked
                      ? `last checked ${step.source.lastChecked}; not live-verified`
                      : "freshness not known"}
                </small>
              </div>
            </article>
          ))}
        </div>
      </details>

      <details className="government-case-details">
        <summary>Recorded activity ({governmentCase.timeline.length})</summary>
        {governmentCase.timeline.length ? (
          <ol className="government-case-timeline">
            {governmentCase.timeline.slice(0, 5).map((event) => (
              <li key={event.id}>
                <VerificationProgressRing
                  completed={1}
                  total={1}
                  size={32}
                  status={event.kind === "application" ? "user-reviewed" : "prepared"}
                  label={event.title}
                />
                <span>{event.title}</span>
                <small>
                  {event.date
                    ? displayDate(event.date)
                    : "Recorded; date not captured"}
                </small>
              </li>
            ))}
          </ol>
        ) : (
          <p>No task completion or application activity recorded.</p>
        )}
      </details>

      <div className="government-case-costs">
        {governmentCase.costs.map((cost) => (
          <div key={cost.id}>
            <span>{cost.title}: {money(cost.amount, cost.currency)} ({cost.certainty})</span>
            {cost.sourceUrl && (
              <a href={cost.sourceUrl} target="_blank" rel="noreferrer">
                Recorded reference <ExternalLink size={12} />
              </a>
            )}
          </div>
        ))}
        <small>
          Confirm current costs and application instructions with the responsible
          authority. For consular or emergency assistance, consult{" "}
          <Link href="/app/safety">official assistance references</Link>.
        </small>
      </div>

      <footer className="government-case-footer">
        <span>Official confirmation is required; no government connection.</span>
        <Button asChild size="sm" variant="outline">
          <a href={application.officialUrl || "/app/entry"}>
            {application.officialUrl ? "Official route reference" : "Review entry requirements"}
          </a>
        </Button>
      </footer>
    </Panel>
  );
}
