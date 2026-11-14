import type { DemoState } from "./types";
import { budgetTotals, dueDate, formatDate, money, readiness } from "./planning";
import { requirementContext } from "./workspace-context";
import { getRequirements } from "./requirements";

export type AssistantReply = {
  intent: string;
  text: string;
  links: { label: string; href: string }[];
};
/** Offline intent routing; never sends conversation or identity data to a service. */
export function assistantReply(question: string, state: DemoState): AssistantReply {
  const q = question.trim().toLowerCase().replace(/[?!.,]+$/g, "");
  const j = state.journeys.find((x) => x.id === state.activeJourneyId);
  const reply = (intent: string, text: string, page?: string, label?: string): AssistantReply => ({
    intent, text, links: page ? [{ href: `/app/${page}`, label: label ?? "Open workspace" }] : [],
  });
  if (/^(hi|hello|hey|good morning|good afternoon|good evening|thanks|thank you)( there| meridian)?$/.test(q))
    return reply("greeting", "Hello! How can I help you prepare for travel?");
  if (/what (is|can).*meridian|how.*(work|use)|help|who are you|about (you|this)/.test(q))
    return reply("product", "Meridian organizes cross-border requirements, application steps, documents and deadlines around your passport and journey. I can find information in your workspace using local intent matching.", "entry", "Visa & entry");
  if (!j) return reply("unknown", "Create a journey first so I can use your travel context.", "journeys", "Journeys");
  const traveler = state.travelers.find((t) => t.id === state.activeTravelerId);
  const tasks = state.tasks.filter((t) => t.journeyId === j.id);
  const pending = tasks.filter((t) => !t.done);
  if (/change|update|edit|reschedul|move my|add.*traveler/.test(q))
    return reply("changes", "Open journey details to change your route, travelers or dates. I haven’t changed anything; your task dates will follow a saved departure-date change.", "journey", "Edit journey");
  if (/embassy|consul/.test(q))
    return reply("embassy", `Find the official consular directory for ${traveler?.nationality ?? "your passport country"} in Visa & entry. Contact details remain unconfirmed unless an official source is recorded.`, "entry", "Consular information");
  if (/transit|layover|connection|doha|qatar/.test(q))
    return reply("transit", `${j.transit ? `Your route includes ${j.transit}.` : "No transit point is recorded."} Check whether you remain airside, collect baggage or cross immigration. These details can change the permission needed. Official confirmation required.`, "entry", "Review transit requirements");
  if (/visa|eligib|immigra|permission|rule|passport|entry|requirement/.test(q)) {
    const records = getRequirements(requirementContext(j, traveler));
    const financial = records.find((record) => /financ|money|fund/i.test(record.title));
    const featured = [...records.slice(0, 2), ...(financial ? [financial] : records.slice(2, 3))]
      .filter((record, index, list) => list.findIndex((item) => item.id === record.id) === index);
    const topics = featured.map(record => `• ${record.title}${record.sourceName ? ` — ${record.sourceName}` : ""}`).join("\n");
    return reply("entry", `${traveler?.nationality ?? "Unspecified"} passport · resident in ${traveler?.residence ?? "an unspecified country"} · ${j.country} · ${j.purpose}.\n\n${topics}\n\nOfficial confirmation required. Open the records for their source, conditions and evidence links.`, "entry", "Review source-backed records");
  }
  if (/budget|cost|spend|money|expense/.test(q)) {
    const totals = budgetTotals(state.expenses.filter((e) => e.journeyId === j.id), j.budgetAllowance ?? 5000);
    return reply("budget", `${j.name}\nPlanned: ${money(totals.planned)}\nRecorded: ${money(totals.actual)}\nRemaining against the workspace allowance: ${money(totals.remaining)}.`, "budget", "Expenses");
  }
  if (/document|evidence|pack|bring/.test(q)) {
    const docs = state.documents.filter((d) => d.journeyId === j.id);
    return reply("documents", docs.length ? `${docs.length} document records for ${j.name}:\n${docs.map((d) => `• ${d.name} — ${d.category}`).join("\n")}\nReview preparation and requirement links in Documents.` : `No document records are linked to ${j.name}. Start with the evidence categories in Visa & entry.`, "documents", "Prepare documents");
  }
  if (/arrival|arrive|settle|housing|accommodation|transport/.test(q))
    return reply("arrival", `For arrival in ${j.destination}, organize your transfer, accommodation, local contacts and first-day essentials. Your Arrival checklist tracks what you have prepared.`, "arrival", "Arrival checklist");
  if (/task|next|outstanding|before.*fly|to.do|deadline/.test(q))
    return reply("tasks", pending.length ? `${pending.length} outstanding tasks for ${j.name}:\n${pending.slice(0, 5).map((t) => `• ${t.title} — planning target ${formatDate(dueDate(j.departure, t.offset))}`).join("\n")}` : `All recorded tasks for ${j.name} are complete. This records preparation, not permission to travel.`, "tasks", "Manage tasks");
  if (/summary|journey|readiness|ready|progress|travel plan/.test(q))
    return reply("summary", `${j.name}\n${j.origin} → ${j.destination}${j.transit ? ` via ${j.transit}` : ""}\nDeparture: ${formatDate(j.departure, { day: "numeric", month: "long", year: "numeric" })}\n${readiness(tasks)}% of preparation tasks complete; ${pending.length} remain.`, "journey", "Journey workspace");
  return reply("unknown", "I couldn’t match that to a workspace action. Are you asking about entry requirements, documents, tasks, transit, arrival or expenses?");
}
