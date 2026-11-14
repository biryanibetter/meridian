"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowRight, ArrowUpRight, BookOpen, ChevronRight, Globe2, Info, ShieldCheck } from "lucide-react";
import { getRequirements, type TravelRequirement } from "@/lib/requirements";
import { countryRules } from "@/lib/country-rules";
import { useDemo } from "@/lib/store";
import { requirementContext } from "@/lib/workspace-context";
import { consularEntries } from "@/lib/consular";
import { Badge, PageHeading, Panel } from "../common";
import { Button } from "../ui/button";
import { Modal } from "../ui/dialog";

export function EntryView() {
  const { state, update } = useDemo();
  const journey = state.journeys.find((item) => item.id === state.activeJourneyId) ?? state.journeys[0];
  const traveler = state.travelers.find((item) => item.id === state.activeTravelerId);
  const [selected, setSelected] = useState<TravelRequirement | null>(null);
  const requirements = getRequirements(requirementContext(journey, traveler));
  const authority = countryRules.find((rule) => rule.destination === journey.country);

  return (
    <>
      <PageHeading title="Visa & entry requirements" description="A contextual checklist of official starting points—not an eligibility decision.">
        <Button asChild><Link href="/app/applications">Applications <ArrowRight size={14} /></Link></Button>
      </PageHeading>
      <div className="entry-context">
        <div className="entry-route">
          <span className="flag-icon"><Globe2 size={21} /></span>
          <div>
            <strong>{traveler?.nationality ?? "Traveler"} passport <ArrowRight size={14} /> {journey.country}</strong>
            <small>Residence: {traveler?.residence ?? "Not provided"} · Purpose: {journey.purpose} · Departure: {journey.departure}</small>
          </div>
        </div>
        <Badge tone="amber">Official confirmation required</Badge>
      </div>
      <div className="entry-stats">
        <div><BookOpen size={18} /><strong>{requirements.length}</strong><span>Topics to check</span></div>
        <div><ShieldCheck size={18} /><strong>No eligibility result</strong><span>Passport and purpose matter</span></div>
        <div><Info size={18} /><strong>{authority ? "Authority links" : "Coverage gap"}</strong><span>Review source coverage</span></div>
      </div>
      <div className="requirements-layout">
        <div className="table-scroll requirements-table">
          <table>
            <thead><tr><th>Requirement</th><th>Applicability</th><th>Document status</th><th>Deadline</th><th>Official source</th><th>Action</th></tr></thead>
            <tbody>{requirements.map((requirement) => {
              const documents = state.documents.filter((document) =>
                document.journeyId === journey.id && document.requirementId === requirement.id,
              );
              return <tr key={requirement.id}>
                <td><strong>{requirement.title}</strong><small>{requirement.category}</small></td>
                <td><Badge tone="amber">Confirm conditions</Badge></td>
                <td>{documents.length ? `${documents.filter((item) => item.prepared).length}/${documents.length} prepared` : "No record linked"}</td>
                <td>Before application</td>
                <td>{requirement.sourceName ?? "Source required"}</td>
                <td><button className="text-link" onClick={() => setSelected(requirement)}>View details <ChevronRight size={13} /></button></td>
              </tr>;
            })}</tbody>
          </table>
        </div>
        <aside>
          <Panel title="Applicability context">
            <div className="context-details">
              <span>Traveler<strong>{traveler?.name ?? "Not selected"}</strong></span>
              <span>Passport nationality<strong>{traveler?.nationality ?? "Not provided"}</strong></span>
              <span>Passport type<strong>{traveler?.passportType ?? "Not provided"}</strong></span>
              <span>Residence<strong>{traveler?.residence ?? "Not provided"}</strong></span>
              <span>Destination<strong>{journey.country}</strong></span>
              <span>Transit<strong>{journey.transit || "None entered"}</strong></span>
              <span>Purpose<strong>{journey.purpose}</strong></span>
            </div>
            <label className="context-input">Existing visa or permission
              <select value={traveler?.existingVisaStatus ?? "Not provided"} onChange={event => update(current => ({ ...current, travelers: current.travelers.map(person => person.id === state.activeTravelerId ? { ...person, existingVisaStatus: event.target.value } : person) }))}>
                <option>Not provided</option><option>No existing permission recorded</option><option>Recorded — applicability not confirmed</option>
              </select>
            </label>
            <Link href="/app/journey" className="panel-text-link">Update journey details <ArrowRight size={13} /></Link>
          </Panel>
          <div className="quiet-note"><Info size={17} /><h3>Sources are starting points.</h3><p>Applicability depends on details we do not assess, including passport, residence, route and purpose.</p><Link href="/app/sources">Review source coverage <ArrowUpRight size={13} /></Link></div>
        </aside>
      </div>
      <Panel className="spaced" title="Embassy & consular directory" description="Official mission references for this journey. Direct contact details remain unconfirmed.">
        {consularEntries(traveler?.nationality ?? "", traveler?.residence ?? "", journey.country).map(record => <div className="consular-record" key={record.website}>
          <div><h3>{record.name}</h3><p>{record.country} · {record.location}</p><p>{record.services}</p><small>Phone: not registered · Email: not registered</small></div>
          <a href={record.website} target="_blank" rel="noreferrer">Official website <ArrowUpRight size={13} /></a>
        </div>)}
        {!consularEntries(traveler?.nationality ?? "", traveler?.residence ?? "", journey.country).length && <p className="panel-padding">No matching official mission record is registered. Find your passport country’s foreign affairs ministry and confirm the relevant mission.</p>}
      </Panel>
      <Modal open={!!selected} onOpenChange={(open) => !open && setSelected(null)} title={selected?.title ?? "Requirement source"} description="Official source context · Meridian does not determine eligibility">
        {selected && <>
          <Badge tone="amber">Official confirmation required</Badge>
           <p className="detail-paragraph">{selected.preparation}</p>
           <Panel title="Preparation">
             <div className="requirement-detail-grid">
               <div><strong>What is needed</strong><p>{selected.preparation}</p></div>
               <div><strong>Who it applies to</strong><p>{selected.conditions.ageBand} {selected.conditions.stayDuration}</p></div>
               <div><strong>Traveler action</strong><p>Confirm applicability on the official source, then add and prepare the connected evidence record.</p></div>
               <div><strong>Connected documents</strong><p>{state.documents.filter((document) => document.journeyId === journey.id && document.requirementId === selected.id).map((document) => document.name).join(", ") || "No document records linked yet."}</p></div>
             </div>
           </Panel>
          <Panel title="Context used">
            <div className="context-details">
              <span>Nationality<strong>{selected.context.nationality}</strong></span>
              <span>Passport type<strong>{selected.context.passportType}</strong></span>
              <span>Residence<strong>{selected.context.residence}</strong></span>
              <span>Residence permit<strong>{selected.context.residencePermitStatus}</strong></span>
              <span>Existing visa<strong>{selected.context.existingVisaStatus}</strong></span>
              <span>Purpose<strong>{selected.context.purpose}</strong></span>
              <span>Travel dates<strong>{selected.context.departure} – {selected.context.returnDate}</strong></span>
              <span>Stay duration<strong>{selected.context.durationDays ?? "Not calculated"} days</strong></span>
              <span>Age band<strong>{selected.context.ageBand}</strong></span>
            </div>
            <p className="panel-padding">{selected.conditions.passportType} {selected.conditions.residencePermit} {selected.conditions.existingVisa} {selected.conditions.stayDuration} {selected.conditions.ageBand} {selected.conditions.effectiveDate}</p>
          </Panel>
          <div className="source-detail"><BookOpen size={18} /><div><strong>{selected.sourceName ?? "No matching authority registered"}</strong><p>{selected.sourceCoverage}</p>{selected.sourceUrl && <a href={selected.sourceUrl} target="_blank" rel="noreferrer">Open official source <ArrowUpRight size={13} /></a>}</div></div>
           <div className="dialog-footer"><span className="muted small">Source fetched: {selected.sourceFetchedAt ?? "not researched"} · Applicability verified: no</span><Button asChild><Link href={`/app/documents?requirement=${encodeURIComponent(selected.id)}`}>Related documents <ArrowRight size={14} /></Link></Button><Button asChild><Link href="/app/applications">Application step <ArrowRight size={14} /></Link></Button></div>
        </>}
      </Modal>
    </>
  );
}

export function SourcesView() {
  return <>
    <PageHeading title="Official references" description="Known official starting points and their limited coverage." />
    <Panel title="Source registry" description="Links do not imply that a rule applies to a traveler.">
      <div className="table-scroll"><table><thead><tr><th>Authority</th><th>Jurisdiction</th><th>Coverage</th><th>Source fetched</th><th>Applicability</th><th /></tr></thead>
        <tbody>{countryRules.map((rule) => <tr key={rule.id}><td><strong>{rule.sourceName}</strong><small>{new URL(rule.officialUrl).hostname}</small></td><td>{rule.jurisdiction}</td><td>{rule.sourceCoverage}</td><td>{rule.sourceFetchedAt ?? "Not researched"}</td><td>Not verified</td><td><a href={rule.officialUrl} target="_blank" rel="noreferrer" aria-label={`Visit ${rule.sourceName}`}><ArrowUpRight size={17} /></a></td></tr>)}</tbody>
      </table></div>
    </Panel>
  </>;
}
