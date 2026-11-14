import { countryRules, type CountryRule, type TravelPurpose } from "./country-rules";

export interface RequirementContext {
  nationality: string;
  residence: string;
  destination: string;
  transit: string;
  purpose: string;
  departure: string;
  returnDate?: string;
  passportType?: string;
  residencePermitStatus?: string;
  existingVisaStatus?: string;
  ageBand?: string;
  dateOfBirth?: string;
}

export interface TravelRequirement {
  id: string;
  category: CountryRule["category"];
  title: string;
  preparation: string;
  destination: string;
  nationalityContext: string;
  residenceContext: string;
  purposeContext: string;
  departure: string;
  status: "official-confirmation-required";
  sourceName: string | null;
  sourceUrl: string | null;
  sourceCoverage: string;
  sourceVersion: string | null;
  sourceFetchedAt: string | null;
  lastVerified: null;
  conditions: CountryRule["conditions"];
  context: {
    nationality: string;
    residence: string;
    passportType: string;
    residencePermitStatus: string;
    existingVisaStatus: string;
    purpose: string;
    departure: string;
    returnDate: string;
    durationDays: number | null;
    ageBand: string;
  };
}

function purposeKey(purpose: string): TravelPurpose {
  const normalized = purpose.toLowerCase();
  if (/study|student|education/.test(normalized)) return "study";
  if (/work|business|employment/.test(normalized)) return "work";
  if (/tour|holiday|visit|family/.test(normalized)) return "tourism";
  return "other";
}

function normalize(value: string) {
  return value.trim().toLowerCase();
}

function transitJurisdiction(value: string) {
  const normalized = normalize(value);
  if (normalized === "doha" || normalized === "doha, qatar") return "qatar";
  return normalized;
}

function durationInDays(departure: string, returnDate?: string) {
  if (!returnDate) return null;
  const start = Date.parse(`${departure}T12:00:00Z`);
  const end = Date.parse(`${returnDate}T12:00:00Z`);
  return Number.isFinite(start) && Number.isFinite(end) && end >= start
    ? Math.floor((end - start) / 86_400_000)
    : null;
}

function ageAtDeparture(dateOfBirth: string | undefined, departure: string) {
  if (!dateOfBirth || !/^\d{4}-\d{2}-\d{2}$/.test(dateOfBirth)) return "Not provided";
  const birth = new Date(`${dateOfBirth}T12:00:00Z`);
  const travel = new Date(`${departure}T12:00:00Z`);
  if (!Number.isFinite(birth.getTime()) || !Number.isFinite(travel.getTime()) || birth > travel) return "Not provided";
  let age = travel.getUTCFullYear() - birth.getUTCFullYear();
  if (
    travel.getUTCMonth() < birth.getUTCMonth() ||
    (travel.getUTCMonth() === birth.getUTCMonth() && travel.getUTCDate() < birth.getUTCDate())
  ) age -= 1;
  return age < 18 ? "under18" : "18plus";
}

function coverageGap(destination: string): CountryRule {
  return {
    id: "coverage-gap",
    jurisdiction: destination,
    destination,
    category: "Entry",
    title: "Confirm requirements with the responsible authority",
    preparation:
      "Find the relevant official immigration authority and confirm requirements for this passport, residence, purpose and travel date. No jurisdiction-specific guidance is registered.",
    purpose: ["study", "tourism", "work", "other"],
    sourceName: "",
    officialUrl: "",
    sourceCoverage: "No registered jurisdiction coverage; generic preparation prompt only.",
    sourceVersion: "",
    sourceFetchedAt: null,
    lastVerified: null,
    passportScope: "Traveller-specific; confirm with the authority.",
    residenceScope: "Traveller-specific; confirm with the authority.",
    dateScope: "Confirm for the planned departure date.",
    conditions: {
      passportType: "Not assessed",
      residencePermit: "Not assessed",
      existingVisa: "Not assessed",
      stayDuration: "Confirm for the planned stay",
      ageBand: "Not assessed",
      effectiveDate: "Recheck for travel dates",
    },
  };
}

export function getRequirements(context: RequirementContext): TravelRequirement[] {
  const destination = context.destination.trim();
  const purpose = purposeKey(context.purpose);
  const matched = countryRules.filter(
    (rule) =>
      normalize(rule.destination) === normalize(destination) &&
      rule.category !== "Transit" &&
      rule.purpose.includes(purpose) &&
      (!rule.nationalityConditions || rule.nationalityConditions.some(value => normalize(value) === normalize(context.nationality))) &&
      (!rule.residenceConditions || rule.residenceConditions.some(value => normalize(value) === normalize(context.residence))) &&
      (!rule.ageConditions || rule.ageConditions.includes(context.ageBand ?? ageAtDeparture(context.dateOfBirth, context.departure))),
  );
  const destinationCovered = matched.length > 0;
  const transit = context.transit
    .split(",")
    .map(transitJurisdiction)
    .filter(Boolean);
  for (const jurisdiction of transit) {
    matched.push(
      ...countryRules.filter(
        (rule) =>
          rule.category === "Transit" &&
          normalize(rule.destination) === jurisdiction &&
          !matched.some((existing) => existing.id === rule.id),
      ),
    );
  }

  // Destination and transit coverage are independent: known transit guidance must
  // never mask an unknown destination.
  const records = destinationCovered ? matched : [coverageGap(destination), ...matched];
  const durationDays = durationInDays(context.departure, context.returnDate);
  return records.map((record) => ({
    id: record.id,
    category: record.category,
    title: record.title,
    preparation: record.preparation,
    destination: record.destination,
    nationalityContext: context.nationality,
    residenceContext: context.residence,
    purposeContext: context.purpose,
    departure: context.departure,
    status: "official-confirmation-required",
    sourceName: record.sourceName || null,
    sourceUrl: record.officialUrl || null,
    sourceCoverage: record.sourceCoverage,
    sourceVersion: record.sourceVersion || null,
    sourceFetchedAt: record.sourceFetchedAt,
    lastVerified: null,
    conditions: record.conditions,
    context: {
      nationality: context.nationality,
      residence: context.residence,
      passportType: context.passportType ?? "Not provided",
      residencePermitStatus: context.residencePermitStatus ?? "Not provided",
      existingVisaStatus: context.existingVisaStatus ?? "Not provided",
      purpose: context.purpose,
      departure: context.departure,
      returnDate: context.returnDate || "Not provided",
      durationDays,
      ageBand: context.ageBand ?? ageAtDeparture(context.dateOfBirth, context.departure),
    },
  }));
}
