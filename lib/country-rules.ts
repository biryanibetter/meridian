export type TravelPurpose = "study" | "tourism" | "work" | "other";

export interface RequirementConditions {
  passportType: string;
  residencePermit: string;
  existingVisa: string;
  stayDuration: string;
  ageBand: string;
  effectiveDate: string;
}

export interface CountryRule {
  id: string;
  jurisdiction: string;
  destination: string;
  category: "Visa" | "Documents" | "Passport" | "Transit" | "Entry";
  title: string;
  preparation: string;
  purpose: TravelPurpose[];
  sourceName: string;
  officialUrl: string;
  sourceCoverage: string;
  sourceVersion: string;
  sourceFetchedAt: string | null;
  lastVerified: string | null;
  passportScope: string;
  residenceScope: string;
  dateScope: string;
  conditions: RequirementConditions;
  nationalityConditions?: string[];
  residenceConditions?: string[];
  ageConditions?: string[];
}

// These are source-linked prompts, not legal rules or eligibility results.
const individualContext = {
  passportScope:
    "Traveller-specific; nationality is not adjudicated in this registry.",
  residenceScope:
    "Traveller-specific; residence is not adjudicated in this registry.",
  dateScope: "Recheck for the journey's planned departure date.",
  conditions: {
    passportType:
      "Passport type can affect the result; verify with the official source.",
    residencePermit:
      "Residence and any permit are traveller-specific; not assessed here.",
    existingVisa:
      "Existing visas, dual nationality and prior immigration history are not assessed.",
    stayDuration: "Confirm the applicable rule for the complete planned stay.",
    ageBand: "Age can affect requirements; confirm with the official source.",
    effectiveDate: "Applicability is not verified for a travel date.",
  },
};
export const countryRules: CountryRule[] = [
  {
    id: "uk-study-passport",
    ...individualContext,
    jurisdiction: "United Kingdom",
    destination: "United Kingdom",
    category: "Passport",
    title: "Prepare a valid passport or travel document",
    preparation:
      "Provide a current passport or other valid travel document with the Student visa application.",
    purpose: ["study"],
    sourceName: "GOV.UK · Student visa documents",
    officialUrl: "https://www.gov.uk/student-visa/documents-you-must-provide",
    sourceCoverage: "Official Student visa document list.",
    sourceVersion: "GOV.UK page read 2026-11-14",
    sourceFetchedAt: "2026-11-14",
    lastVerified: "2026-11-14",
  },
  {
    id: "uk-study-cas",
    ...individualContext,
    jurisdiction: "United Kingdom",
    destination: "United Kingdom",
    category: "Documents",
    title: "Provide your Confirmation of Acceptance for Studies (CAS)",
    preparation:
      "Obtain the Confirmation of Acceptance for Studies (CAS) issued by your course provider; the CAS also states course fees and provides your reference.",
    purpose: ["study"],
    sourceName: "GOV.UK · Student visa documents",
    officialUrl: "https://www.gov.uk/student-visa/documents-you-must-provide",
    sourceCoverage:
      "Official Student visa document list; separate from passport evidence.",
    sourceVersion: "GOV.UK page read 2026-11-14",
    sourceFetchedAt: "2026-11-14",
    lastVerified: "2026-11-14",
  },
  {
    id: "uk-study-admission",
    ...individualContext,
    jurisdiction: "United Kingdom",
    destination: "United Kingdom",
    category: "Documents",
    title: "Confirm your course offer from a licensed student sponsor",
    preparation:
      "The Student route requires an offer of a place on a course from a licensed student sponsor. Confirm the provider and course offer; your provider issues the CAS separately.",
    purpose: ["study"],
    sourceName: "GOV.UK · Student visa",
    officialUrl: "https://www.gov.uk/student-visa",
    sourceCoverage:
      "Course offer from a licensed student sponsor is a route requirement; personal offer not assessed here.",
    sourceVersion: "GOV.UK page read 2026-11-14",
    sourceFetchedAt: "2026-11-14",
    lastVerified: "2026-11-14",
  },
  {
    id: "uk-study-finances",
    ...individualContext,
    jurisdiction: "United Kingdom",
    destination: "United Kingdom",
    category: "Documents",
    title: "Prepare tuition and living-cost evidence",
    preparation:
      "You must meet the financial requirement for course fees and living costs. Check the current amount, required holding period and accepted evidence. Some applicants do not need to submit evidence upfront (including certain nationalities), but UKVI may request it; this does not remove the underlying requirement. A valid UK visa for at least 12 months before application and certain other circumstances may exempt proof. Confirm your circumstances and the current official guidance.",
    purpose: ["study"],
    sourceName: "GOV.UK · Student visa money and financial evidence",
    officialUrl:
      "https://www.gov.uk/guidance/financial-evidence-for-student-and-child-student-route-applicants",
    sourceCoverage:
      "Financial requirement applies subject to stated exceptions; upfront evidence rules vary.",
    sourceVersion: "GOV.UK pages read 2026-11-14",
    sourceFetchedAt: "2026-11-14",
    lastVerified: "2026-11-14",
  },
  {
    id: "uk-study-english",
    ...individualContext,
    jurisdiction: "United Kingdom",
    destination: "United Kingdom",
    category: "Documents",
    title: "Prove English proficiency",
    preparation:
      "You usually need to prove English ability. Check exemptions (including listed nationalities and qualifying prior qualifications or previous visa evidence) and accepted qualification routes. For degree-level study, your Higher Education Provider (HEP) may assess English itself at CEFR B2; below degree level the required level is B1. A SELT from an approved provider is needed only where applicable and no accepted alternative route applies. Check approved tests and providers: https://www.gov.uk/guidance/prove-your-english-language-abilities-with-a-secure-english-language-test-selt",
    purpose: ["study"],
    sourceName: "GOV.UK · Student visa knowledge of English",
    officialUrl: "https://www.gov.uk/student-visa/knowledge-of-english",
    sourceCoverage:
      "English route, exemptions and evidence depend on course and personal circumstances.",
    sourceVersion: "GOV.UK pages read 2026-11-14",
    sourceFetchedAt: "2026-11-14",
    lastVerified: "2026-11-14",
  },
  {
    id: "uk-study-tb",
    ...individualContext,
    jurisdiction: "United Kingdom",
    destination: "United Kingdom",
    category: "Documents",
    title: "Confirm whether a TB certificate is required",
    preparation:
      "A TB test is required when all relevant conditions apply, including a UK stay of 6 months or more, at least 6 months living in a listed country, and living in a listed country within the 6 months before application. Your residence history, stay duration and exceptions are not fully known here; confirm with the official guidance and country list. Include an approved clinic certificate if required.",
    purpose: ["study"],
    sourceName: "GOV.UK · Tuberculosis tests for visa applicants",
    officialUrl: "https://www.gov.uk/tb-test-visa",
    sourceCoverage:
      "Residence-history and duration conditional; nationality alone does not determine the requirement.",
    sourceVersion: "GOV.UK pages read 2026-11-14",
    sourceFetchedAt: "2026-11-14",
    lastVerified: "2026-11-14",
  },
  {
    id: "uk-study-atas",
    ...individualContext,
    jurisdiction: "United Kingdom",
    destination: "United Kingdom",
    category: "Documents",
    title: "Check whether your course requires ATAS clearance",
    preparation:
      "ATAS applies only to some courses and nationalities. Ask your provider for the course CAH3 code and check the official guidance; if required for a Student visa, obtain the certificate before applying.",
    purpose: ["study"],
    sourceName: "GOV.UK · Academic Technology Approval Scheme",
    officialUrl:
      "https://www.gov.uk/guidance/academic-technology-approval-scheme",
    sourceCoverage:
      "Course subject and nationality determine applicability; not inferred here.",
    sourceVersion: "GOV.UK page read 2026-11-14",
    sourceFetchedAt: "2026-11-14",
    lastVerified: "2026-11-14",
  },
  {
    id: "uk-study-under18",
    ...individualContext,
    jurisdiction: "United Kingdom",
    destination: "United Kingdom",
    category: "Documents",
    title: "Provide under-18 consent and relationship evidence",
    preparation:
      "If you are under 18, provide written consent from both parents or legal guardians (or one with sole responsibility) covering the visa application, UK living and care arrangements, and travel. Also provide a birth certificate or other government-issued document showing parent names.",
    purpose: ["study"],
    sourceName: "GOV.UK · Student visa documents — under 18",
    officialUrl: "https://www.gov.uk/student-visa/documents-you-must-provide",
    sourceCoverage: "Applies only to applicants under 18.",
    sourceVersion: "GOV.UK page read 2026-11-14",
    sourceFetchedAt: "2026-11-14",
    lastVerified: "2026-11-14",
  },
  {
    id: "uk-study-sponsorship-consent",
    ...individualContext,
    jurisdiction: "United Kingdom",
    destination: "United Kingdom",
    category: "Documents",
    title: "Check financial sponsor consent",
    preparation:
      "If you received financial sponsorship for course fees and living costs in the last 12 months, check whether written sponsor consent for this application is required.",
    purpose: ["study"],
    sourceName: "GOV.UK · Student visa documents",
    officialUrl: "https://www.gov.uk/student-visa/documents-you-must-provide",
    sourceCoverage:
      "Conditional on financial sponsorship in the last 12 months.",
    sourceVersion: "GOV.UK page read 2026-11-14",
    sourceFetchedAt: "2026-11-14",
    lastVerified: "2026-11-14",
  },
  {
    id: "uk-study-application",
    ...individualContext,
    jurisdiction: "United Kingdom",
    destination: "United Kingdom",
    category: "Entry",
    title: "Prepare the online Student visa application",
    preparation:
      "Review the official route and application instructions, including when and where you can apply. Complete the application through GOV.UK; Meridian does not submit or verify applications.",
    purpose: ["study"],
    sourceName: "GOV.UK · Student visa",
    officialUrl: "https://www.gov.uk/student-visa",
    sourceCoverage: "Procedural application information only.",
    sourceVersion: "GOV.UK page read 2026-11-14",
    sourceFetchedAt: "2026-11-14",
    lastVerified: "2026-11-14",
  },
  {
    id: "uk-study-fees-health",
    ...individualContext,
    jurisdiction: "United Kingdom",
    destination: "United Kingdom",
    category: "Entry",
    title: "Pay the application fee and healthcare surcharge",
    preparation:
      "Review and pay applicable visa fees and the immigration health surcharge through the official application process; amounts depend on circumstances and can change.",
    purpose: ["study"],
    sourceName: "GOV.UK · Student visa",
    officialUrl: "https://www.gov.uk/student-visa",
    sourceCoverage: "Procedural payment step; confirm current amounts.",
    sourceVersion: "GOV.UK page read 2026-11-14",
    sourceFetchedAt: "2026-11-14",
    lastVerified: "2026-11-14",
  },
  {
    id: "uk-study-identity",
    ...individualContext,
    jurisdiction: "United Kingdom",
    destination: "United Kingdom",
    category: "Entry",
    title: "Complete identity and biometric checks",
    preparation:
      "Follow the application service instructions for proving identity, attending an appointment and providing biometrics if instructed.",
    purpose: ["study"],
    sourceName: "GOV.UK · Student visa",
    officialUrl: "https://www.gov.uk/student-visa",
    sourceCoverage:
      "Procedural step; exact instructions are provided during application.",
    sourceVersion: "GOV.UK page read 2026-11-14",
    sourceFetchedAt: "2026-11-14",
    lastVerified: "2026-11-14",
  },
  {
    id: "uk-study-submission",
    ...individualContext,
    jurisdiction: "United Kingdom",
    destination: "United Kingdom",
    category: "Entry",
    title: "Submit the Student visa application",
    preparation:
      "Submit the completed application and required evidence through the official service. Meridian does not submit or verify an application.",
    purpose: ["study"],
    sourceName: "GOV.UK · Student visa",
    officialUrl: "https://www.gov.uk/student-visa",
    sourceCoverage: "Procedural submission step only.",
    sourceVersion: "GOV.UK page read 2026-11-14",
    sourceFetchedAt: "2026-11-14",
    lastVerified: "2026-11-14",
  },
  {
    id: "uk-study-decision",
    ...individualContext,
    jurisdiction: "United Kingdom",
    destination: "United Kingdom",
    category: "Entry",
    title: "Check the application decision",
    preparation:
      "Wait for and review the decision communicated through the official application process. Any estimated decision time is not a guarantee; Meridian cannot verify application status.",
    purpose: ["study"],
    sourceName: "GOV.UK · Student visa",
    officialUrl: "https://www.gov.uk/student-visa",
    sourceCoverage:
      "Procedural status step only; no decision outcome inferred.",
    sourceVersion: "GOV.UK page read 2026-11-14",
    sourceFetchedAt: "2026-11-14",
    lastVerified: "2026-11-14",
  },
  {
    id: "uk-nationality-check",
    ...individualContext,
    jurisdiction: "United Kingdom",
    destination: "United Kingdom",
    category: "Visa",
    title: "Check visa requirements for your nationality and purpose",
    preparation:
      "Use the official checker with the traveller's passport nationality and intended activity. Check again if the purpose or travel details change.",
    purpose: ["tourism", "work", "other"],
    sourceName: "GOV.UK · Check if you need a UK visa",
    officialUrl: "https://www.gov.uk/check-uk-visa",
    sourceCoverage:
      "Official interactive starting point; no result inferred here.",
    sourceVersion: "GOV.UK page fetched 2026-11-13",
    sourceFetchedAt: "2026-11-13",
    lastVerified: null,
  },
  {
    id: "uk-visitor-route",
    ...individualContext,
    jurisdiction: "United Kingdom",
    destination: "United Kingdom",
    category: "Visa",
    title: "Check visitor guidance for your visit",
    preparation:
      "Review the official visitor guidance and check whether a visitor route fits your stated plans. The correct route is not determined here.",
    purpose: ["tourism"],
    sourceName: "GOV.UK · Visit the UK",
    officialUrl: "https://www.gov.uk/standard-visitor",
    sourceCoverage:
      "Official visitor route starting point; link not reviewed for current details.",
    sourceVersion: "Directory link only",
    sourceFetchedAt: null,
    lastVerified: null,
  },
  {
    id: "uk-work-route",
    ...individualContext,
    jurisdiction: "United Kingdom",
    destination: "United Kingdom",
    category: "Visa",
    title: "Find the appropriate UK work route",
    preparation:
      "Review official work visa routes and confirm which route, if any, fits the proposed activity and individual circumstances.",
    purpose: ["work"],
    sourceName: "GOV.UK · Work in the UK",
    officialUrl: "https://www.gov.uk/browse/visas-immigration/work-visas",
    sourceCoverage:
      "Official route directory; link not reviewed for current details.",
    sourceVersion: "Directory link only",
    sourceFetchedAt: null,
    lastVerified: null,
  },
  {
    id: "uk-work-evidence",
    ...individualContext,
    jurisdiction: "United Kingdom",
    destination: "United Kingdom",
    category: "Documents",
    title: "Check employer evidence for your selected work route",
    preparation:
      "Work routes have different conditions. Confirm whether your chosen route requires an employer, sponsor or other evidence using the official route guidance; there is no universal employer document list here.",
    purpose: ["work"],
    sourceName: "GOV.UK · Work visas",
    officialUrl: "https://www.gov.uk/browse/visas-immigration/work-visas",
    sourceCoverage:
      "Official work-route directory; exact evidence depends on route and circumstances.",
    sourceVersion: "Directory link only",
    sourceFetchedAt: null,
    lastVerified: null,
  },
  {
    id: "uk-transit",
    ...individualContext,
    jurisdiction: "United Kingdom",
    destination: "United Kingdom",
    category: "Transit",
    title: "Check UK transit guidance for this itinerary",
    preparation:
      "Confirm whether your itinerary passes through UK border control and check the official guidance. Nationality and route details matter.",
    purpose: ["study", "tourism", "work", "other"],
    sourceName: "GOV.UK · Transit visa",
    officialUrl: "https://www.gov.uk/transit-visa",
    sourceCoverage:
      "Official transit routes overview; no individual outcome inferred.",
    sourceVersion: "GOV.UK page fetched 2026-11-13",
    sourceFetchedAt: "2026-11-13",
    lastVerified: null,
  },
  {
    id: "qatar-transit",
    ...individualContext,
    jurisdiction: "Qatar",
    destination: "Qatar",
    category: "Transit",
    title: "Confirm Qatar transfer arrangements",
    preparation:
      "Check current airline and airport transfer information for your specific itinerary. This directory does not determine whether you may enter Qatar.",
    purpose: ["study", "tourism", "work", "other"],
    sourceName: "Hamad International Airport",
    officialUrl: "https://dohahamadairport.com/",
    sourceCoverage:
      "Official airport starting point only; immigration conditions not covered.",
    sourceVersion: "Unverified directory link",
    sourceFetchedAt: null,
    lastVerified: null,
  },
];
