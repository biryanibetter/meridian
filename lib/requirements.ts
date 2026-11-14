import {
  countryRules,
  type CountryRule,
  type TravelPurpose,
} from "./country-rules";

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
  applicationDate?: string;
  tbResidenceDurationMonths?: number;
  tbStayMonths?: number;
  tbListedCountryRecentResidence?: boolean;
  courseLevel?: string;
  courseCah3Code?: string;
  financialSponsorshipWithin12Months?: boolean;
  englishPathway?: string;
  financialEvidenceException?: string;
  atasRequired?: boolean;
}

export interface TravelRequirement {
  id: string;
  jurisdiction: string;
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
  lastVerified: string | null;
  group: string;
  applicability:
    "Required" | "Conditional" | "Not applicable" | "Confirmation needed";
  evidenceTypes: string[];
  missingInformation: string[];
  acceptedEvidence: string[];
  procedural: boolean;
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
  if (!dateOfBirth || !/^\d{4}-\d{2}-\d{2}$/.test(dateOfBirth))
    return "Not provided";
  const birth = new Date(`${dateOfBirth}T12:00:00Z`);
  const travel = new Date(`${departure}T12:00:00Z`);
  if (
    !Number.isFinite(birth.getTime()) ||
    !Number.isFinite(travel.getTime()) ||
    birth > travel
  )
    return "Not provided";
  let age = travel.getUTCFullYear() - birth.getUTCFullYear();
  if (
    travel.getUTCMonth() < birth.getUTCMonth() ||
    (travel.getUTCMonth() === birth.getUTCMonth() &&
      travel.getUTCDate() < birth.getUTCDate())
  )
    age -= 1;
  return age < 18 ? "under18" : "18plus";
}

function ageAtDate(dateOfBirth: string | undefined, date: string | undefined) {
  if (!date) return "Not provided";
  return ageAtDeparture(dateOfBirth, date);
}

function englishPathwayKey(pathway: string | undefined) {
  const value = normalize(pathway ?? "").replace(/[\s_]+/g, "-");
  if (["exempt", "exemption"].includes(value)) return "exempt";
  if (
    ["qualification", "qualifications", "accepted-qualification"].includes(
      value,
    )
  )
    return "qualification";
  if (
    [
      "hep",
      "hep-assessment",
      "provider-assessment",
      "higher-education-provider",
    ].includes(value)
  )
    return "hep";
  if (["selt", "secure-english-language-test"].includes(value)) return "selt";
  return "";
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
    sourceCoverage:
      "No registered jurisdiction coverage; generic preparation prompt only.",
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

export function getRequirements(
  context: RequirementContext,
): TravelRequirement[] {
  const destination = context.destination.trim();
  const purpose = purposeKey(context.purpose);
  const matched = countryRules.filter(
    (rule) =>
      normalize(rule.destination) === normalize(destination) &&
      rule.category !== "Transit" &&
      rule.purpose.includes(purpose) &&
      (!rule.nationalityConditions ||
        rule.nationalityConditions.some(
          (value) => normalize(value) === normalize(context.nationality),
        )) &&
      (!rule.residenceConditions ||
        rule.residenceConditions.some(
          (value) => normalize(value) === normalize(context.residence),
        )) &&
      (!rule.ageConditions ||
        rule.ageConditions.includes(
          context.ageBand ??
            ageAtDeparture(context.dateOfBirth, context.departure),
        )),
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
  const records = destinationCovered
    ? matched
    : [coverageGap(destination), ...matched];
  const durationDays = durationInDays(context.departure, context.returnDate);
  const applicationDate =
    context.applicationDate ?? new Date().toISOString().slice(0, 10);
  const applicationAge =
    context.ageBand ?? ageAtDate(context.dateOfBirth, applicationDate);
  return records.map((record) => {
    let applicability: TravelRequirement["applicability"] =
      "Confirmation needed";
    if (
      [
        "uk-study-passport",
        "uk-study-cas",
        "uk-study-application",
        "uk-study-fees-health",
        "uk-study-identity",
        "uk-study-submission",
        "uk-study-decision",
      ].includes(record.id)
    ) {
      applicability = "Required";
    } else if (record.id === "uk-study-under18") {
      applicability =
        applicationAge === "under18"
          ? "Required"
          : applicationAge === "18plus"
            ? "Not applicable"
            : "Confirmation needed";
    } else if (record.id === "uk-study-sponsorship-consent") {
      applicability =
        context.financialSponsorshipWithin12Months === true
          ? "Required"
          : context.financialSponsorshipWithin12Months === false
            ? "Not applicable"
            : "Confirmation needed";
    } else if (record.id === "uk-study-tb") {
      const stayMonths =
        context.tbStayMonths ??
        (durationDays === null ? undefined : durationDays / 30.4375);
      if (
        context.tbListedCountryRecentResidence === false ||
        (context.tbResidenceDurationMonths !== undefined &&
          context.tbResidenceDurationMonths < 6)
      ) {
        applicability = "Not applicable";
      } else if (
        context.tbListedCountryRecentResidence === true &&
        context.tbResidenceDurationMonths !== undefined &&
        context.tbResidenceDurationMonths >= 6 &&
        stayMonths !== undefined &&
        stayMonths >= 6
      ) {
        applicability = "Required";
      } else {
        applicability = "Confirmation needed";
      }
    } else if (record.id === "uk-study-english") {
      const pathway = englishPathwayKey(context.englishPathway);
      applicability =
        pathway === "hep" && context.courseLevel !== "degree"
          ? "Confirmation needed"
          : pathway === "exempt"
            ? "Not applicable"
            : ["qualification", "hep", "selt"].includes(pathway)
              ? "Required"
              : "Conditional";
    } else if (record.id === "uk-study-atas") {
      applicability =
        context.atasRequired === true
          ? "Required"
          : context.atasRequired === false
            ? "Not applicable"
            : "Conditional";
    } else if (record.id === "uk-study-finances") {
      applicability =
        normalize(context.financialEvidenceException ?? "") === "none"
          ? "Required"
          : "Conditional";
    } else if (record.id === "uk-study-admission") {
      applicability = "Conditional";
    }
    const evidenceTypes: string[] =
      (
        {
          "uk-study-passport": ["Passport"],
          "uk-study-cas": ["CAS"],
          "uk-study-admission": ["Admission"],
          "uk-study-finances": ["Financial evidence"],
          "uk-study-english": ["English evidence"],
          "uk-study-tb": ["TB certificate"],
          "uk-study-atas": ["ATAS"],
          "uk-study-under18": ["Consent"],
          "uk-study-sponsorship-consent": ["Sponsorship"],
        } as Record<string, string[]>
      )[record.id] ?? [];
    const procedural = evidenceTypes.length === 0;
    const missingInformation =
      record.id === "uk-study-tb"
        ? [
            ...(context.tbStayMonths === undefined && durationDays === null
              ? ["UK stay duration"]
              : []),
            ...(context.tbResidenceDurationMonths === undefined
              ? ["Duration lived in listed TB country"]
              : []),
            ...(context.tbListedCountryRecentResidence === undefined
              ? ["Residence in a listed TB country within the last 6 months"]
              : []),
          ]
        : record.id === "uk-study-atas"
          ? context.atasRequired !== undefined
            ? []
            : [
                ...(context.courseCah3Code
                  ? []
                  : ["Course CAH3 code from education provider"]),
                ...(context.courseLevel ? [] : ["Course level and subject"]),
                "Confirm whether the course code requires ATAS for this nationality and immigration status",
              ]
          : record.id === "uk-study-under18"
            ? applicationAge === "18plus" || applicationAge === "under18"
              ? []
              : ["Age at application"]
            : record.id === "uk-study-finances"
              ? [
                  "Course fees and location",
                  "Funds/evidence source",
                  ...([
                    "none",
                    "differential-evidence",
                    "12-month-visa",
                    "sabbatical-officer",
                    "doctor-dentist-training",
                  ].includes(
                    normalize(context.financialEvidenceException ?? ""),
                  )
                    ? []
                    : ["Potential evidence exception applicability"]),
                ]
              : record.id === "uk-study-english"
                ? englishPathwayKey(context.englishPathway)
                  ? englishPathwayKey(context.englishPathway) === "hep" &&
                    context.courseLevel !== "degree"
                    ? [
                        "Degree-level course and provider assessment eligibility must be confirmed",
                      ]
                    : englishPathwayKey(context.englishPathway) === "selt" &&
                        !context.courseLevel
                      ? ["Course level for the applicable CEFR threshold"]
                      : []
                  : [
                      ...(context.courseLevel ? [] : ["Course level"]),
                      "English qualification, prior assessment, or exemption circumstances",
                    ]
                : record.id === "uk-study-sponsorship-consent"
                  ? context.financialSponsorshipWithin12Months === undefined
                    ? [
                        "Whether sponsorship covered fees and living costs in the last 12 months",
                      ]
                    : []
                  : [];
    return {
      id: record.id,
      category: record.category,
      title: record.title,
      preparation:
        record.id === "uk-study-finances" &&
        [
          "differential-evidence",
          "12-month-visa",
          "sabbatical-officer",
          "doctor-dentist-training",
        ].includes(normalize(context.financialEvidenceException ?? ""))
          ? `${record.preparation} Recorded evidence exception: ${context.financialEvidenceException}. The underlying financial requirement remains.`
          : record.id === "uk-study-finances"
            ? `${record.preparation} ${normalize(context.nationality) === "canada" ? "Canada is listed under the differential evidence requirement; UKVI may still ask for financial evidence." : normalize(context.nationality) === "india" ? "India is not on the differential evidence nationality list; check other exceptions before deciding what to provide." : "Check the official differential evidence nationality list for your passport."}`
            : record.preparation,
      destination: record.destination,
      jurisdiction: record.jurisdiction,
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
      lastVerified: record.lastVerified,
      group: [
        "uk-study-passport",
        "uk-study-cas",
        "uk-study-admission",
      ].includes(record.id)
        ? "Identity & admission"
        : record.id === "uk-study-english"
          ? "English"
          : record.id === "uk-study-finances"
            ? "Financial"
            : [
                  "uk-study-tb",
                  "uk-study-atas",
                  "uk-study-under18",
                  "uk-study-sponsorship-consent",
                ].includes(record.id)
              ? "Health & additional requirements"
              : "Application process",
      applicability,
      evidenceTypes,
      missingInformation,
      acceptedEvidence:
        record.id === "uk-study-passport"
          ? ["Current passport or other valid travel document"]
          : record.id === "uk-study-cas"
            ? ["Confirmation of Acceptance for Studies (CAS)"]
            : record.id === "uk-study-admission"
              ? ["Course offer from a licensed student sponsor"]
              : record.id === "uk-study-english"
                ? [
                    "UK school GCSE, A level, Scottish National Qualification level 4 or 5, or Scottish Higher/Advanced Higher in English (subject to conditions)",
                    "UK degree-level qualification taught in English",
                    "Overseas degree taught in English with an Ecctis assessment confirming UK bachelor degree equivalence or higher",
                    "HEP assessment at CEFR B2 for degree-level study",
                    "SELT from a GOV.UK-approved provider at CEFR B2 (degree level) or B1 (below degree level), when applicable",
                    "For SELT, use an approved test and centre: IELTS for UKVI or PTE Academic UKVI are listed test routes, not ordinary IELTS. The Student route needs reading, writing, speaking and listening.",
                    "Approved providers outside the UK: IELTS SELT Consortium, LANGUAGECERT, Pearson and PSI Services (UK) Ltd. In the UK: IELTS SELT Consortium, LANGUAGECERT, Pearson and Trinity College London. Confirm the exact approved test on GOV.UK.",
                  ]
                : record.id === "uk-study-finances"
                  ? [
                      "Personal bank or building society statements, passbook, certificate of deposit, or bank/building society letter",
                      "Student loan letter meeting GOV.UK conditions",
                      "Official financial sponsorship evidence and sponsor confirmation letter when not recorded on the CAS",
                      "Parent or partner funds with required letter/evidence where applicable",
                    ]
                  : record.id === "uk-study-under18"
                    ? [
                        "Written parent/legal guardian consent",
                        "Birth certificate or other government-issued document showing parent names",
                      ]
                    : record.id === "uk-study-tb"
                      ? ["TB certificate from an approved clinic (if required)"]
                      : record.id === "uk-study-atas"
                        ? ["ATAS certificate (if required)"]
                        : [],
      procedural,
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
        ageBand: applicationAge,
      },
    };
  });
}
