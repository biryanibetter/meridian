"use client";

import Link from "next/link";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { countryRules } from "@/lib/country-rules";
import { useDemo } from "@/lib/store";
import { activeApplication, applicationMetrics } from "@/lib/visa-workflow";
import { consularEntries } from "@/lib/consular";
import { RequirementsWorkspace } from "../requirements-workspace";
import { Badge, PageHeading, Panel } from "../common";
import { Button } from "../ui/button";

export function EntryView() {
  const { state } = useDemo();
  const application = activeApplication(state);
  const journey = state.journeys.find((j) => j.id === state.activeJourneyId);
  const traveler = state.travelers.find((t) => t.id === state.activeTravelerId);
  if (!application || !journey)
    return (
      <PageHeading
        title="Visa & entry requirements"
        description="Select a journey and traveler to begin."
      />
    );
  const metrics = applicationMetrics(state, application);
  const consulates = consularEntries(
    traveler?.nationality ?? "",
    traveler?.residence ?? "",
    journey.country,
  );
  return (
    <div className="visa-workspace">
      <PageHeading
        title="Visa & entry requirements"
        description={`${journey.country} · ${traveler?.name ?? "Traveler"} · ${journey.purpose}`}
      >
        <Button asChild size="sm" variant="outline">
          <Link href="/app/applications">
            Open application <ArrowRight size={13} />
          </Link>
        </Button>
      </PageHeading>
      <div className="entry-context">
        <div className="context-details">
          <span>
            {traveler?.name} · {traveler?.nationality} passport · Resident in{" "}
            {traveler?.residence} · Departure {journey.departure}
          </span>
        </div>
        <Badge tone="neutral">Eligibility not verified</Badge>
      </div>
      <Panel className="visa-stage-panel">
        <div className="visa-stage-heading">
          <h2>Applicable obligations</h2>
          <span className="muted">
            {metrics.requirementsAssessed}/{metrics.requirementsTotal} assessed
            by you
          </span>
        </div>
        <RequirementsWorkspace application={application} />
      </Panel>
      <div className="visa-stage-footer">
        <span className="muted">
          The same requirements and evidence links are used in Applications.
        </span>
        <Button asChild size="sm" variant="ghost">
          <Link href="/app/journey">Update journey details</Link>
        </Button>
      </div>
      <Panel className="spaced" title="Embassy & consular directory">
        {consulates.map((record) => (
          <div className="consular-record" key={record.website}>
            <div>
              <h3>{record.name}</h3>
              <p>
                {record.country} · {record.location}
              </p>
              <p>{record.services}</p>
            </div>
            <a href={record.website} target="_blank" rel="noreferrer">
              Official website <ArrowUpRight size={13} />
            </a>
          </div>
        ))}
        {!consulates.length && (
          <p className="panel-padding muted">
            No matching official mission is registered. Consult your passport
            country’s foreign affairs ministry.
          </p>
        )}
      </Panel>
    </div>
  );
}

export function SourcesView() {
  return (
    <>
      <PageHeading
        title="Official references"
        description="Official guidance and the scope of the recorded source checks."
      />
      <Panel title="Source registry">
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Authority</th>
                <th>Jurisdiction</th>
                <th>Coverage</th>
                <th>Source checked</th>
                <th>Personal eligibility</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {countryRules.map((rule) => (
                <tr key={rule.id}>
                  <td>
                    <strong>{rule.sourceName}</strong>
                    <small>{new URL(rule.officialUrl).hostname}</small>
                  </td>
                  <td>{rule.jurisdiction}</td>
                  <td>{rule.sourceCoverage}</td>
                  <td>
                    {rule.lastVerified ??
                      rule.sourceFetchedAt ??
                      "Not researched"}
                  </td>
                  <td>Not verified</td>
                  <td>
                    <a
                      href={rule.officialUrl}
                      target="_blank"
                      rel="noreferrer"
                      aria-label={`Visit ${rule.sourceName}`}
                    >
                      <ArrowUpRight size={17} />
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </>
  );
}
