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
  passportScope: "Traveller-specific; nationality is not adjudicated in this registry.",
  residenceScope: "Traveller-specific; residence is not adjudicated in this registry.",
  dateScope: "Recheck for the journey's planned departure date.",
  conditions: {
    passportType: "Passport type can affect the result; verify with the official source.",
    residencePermit: "Residence and any permit are traveller-specific; not assessed here.",
    existingVisa: "Existing visas, dual nationality and prior immigration history are not assessed.",
    stayDuration: "Confirm the applicable rule for the complete planned stay.",
    ageBand: "Age can affect requirements; confirm with the official source.",
    effectiveDate: "Applicability is not verified for a travel date.",
  },
};
export const countryRules: CountryRule[] = [
  {
    id: "uk-study-passport-cas", ...individualContext,
    jurisdiction: "United Kingdom", destination: "United Kingdom", category: "Passport",
    title: "Passport or travel document and CAS",
    preparation: "Prepare a current passport or other valid travel document and the Confirmation of Acceptance for Studies (CAS) reference issued by your education provider. Check the official document guidance for your circumstances.",
    purpose: ["study"],
    sourceName: "GOV.UK · Student visa documents",
    officialUrl: "https://www.gov.uk/student-visa/documents-you-must-provide",
    sourceCoverage: "Official Student visa document guidance; individual applicability is not verified.",
    sourceVersion: "1 · source read 2026-11-13", sourceFetchedAt: "2026-11-13", lastVerified: null,
  },
  {
    id: "uk-study-english", ...individualContext,
    jurisdiction: "United Kingdom", destination: "United Kingdom", category: "Documents",
    title: "Review English-language evidence",
    preparation: "Check how the Student visa English-language requirement applies and which evidence or assessment route the official guidance accepts for your course and circumstances.",
    purpose: ["study"],
    sourceName: "GOV.UK · Student visa knowledge of English",
    officialUrl: "https://www.gov.uk/student-visa/knowledge-of-english",
    sourceCoverage: "Official English-language guidance; no personal result is inferred.",
    sourceVersion: "1 · source read 2026-11-13", sourceFetchedAt: "2026-11-13", lastVerified: null,
  },
  {
    id: "uk-study-atas", ...individualContext,
    jurisdiction: "United Kingdom", destination: "United Kingdom", category: "Documents",
    title: "Check whether ATAS applies",
    preparation: "Some courses and nationalities can require an Academic Technology Approval Scheme certificate. Use the official checker and your course information; Meridian does not determine applicability.",
    purpose: ["study"],
    sourceName: "GOV.UK · Academic Technology Approval Scheme",
    officialUrl: "https://www.gov.uk/guidance/academic-technology-approval-scheme",
    sourceCoverage: "Official ATAS guidance; course and nationality conditions require confirmation.",
    sourceVersion: "1 · source read 2026-11-13", sourceFetchedAt: "2026-11-13", lastVerified: null,
  },
  {
    id: "uk-study-application", ...individualContext,
    jurisdiction: "United Kingdom", destination: "United Kingdom", category: "Entry",
    title: "Application, identity and biometrics steps",
    preparation: "Follow the official application pathway. The service explains whether identity is proved through an app or at an appointment and what to do next. Record progress here only after completing it externally.",
    purpose: ["study"],
    sourceName: "GOV.UK · Apply for a Student visa",
    officialUrl: "https://www.gov.uk/student-visa/apply",
    sourceCoverage: "Official application pathway; Meridian does not submit or verify an application.",
    sourceVersion: "1 · source read 2026-11-13", sourceFetchedAt: "2026-11-13", lastVerified: null,
  },
  {
    id: "uk-study-fees-health", ...individualContext,
    jurisdiction: "United Kingdom", destination: "United Kingdom", category: "Entry",
    title: "Confirm application fee and healthcare surcharge",
    preparation: "Review the current official Student visa fee and immigration health surcharge information immediately before payment. No amount or payment outcome is stored or inferred here.",
    purpose: ["study"],
    sourceName: "GOV.UK · Student visa overview",
    officialUrl: "https://www.gov.uk/student-visa",
    sourceCoverage: "Official route overview; current amounts must be confirmed on GOV.UK.",
    sourceVersion: "1 · source read 2026-11-13", sourceFetchedAt: "2026-11-13", lastVerified: null,
  },
  {
    id: "uk-study-under18", ...individualContext,
    jurisdiction: "United Kingdom", destination: "United Kingdom", category: "Documents",
    title: "Review parental consent and relationship evidence",
    preparation: "The Student visa document guidance lists parental or guardian consent and relationship evidence for under-18 applicants. Review the official instructions for the visa application, living and care arrangements, and travel. Confirm the correct study route before applying.",
    purpose: ["study"], ageConditions: ["under18"],
    sourceName: "GOV.UK · Student visa documents — under 18",
    officialUrl: "https://www.gov.uk/student-visa/documents-you-must-provide",
    sourceCoverage: "Under-18 evidence preparation; does not confirm route eligibility.",
    sourceVersion: "1 · source read 2026-11-13", sourceFetchedAt: "2026-11-13", lastVerified: null,
  },
  {
    id: "uk-study-india-finances", ...individualContext,
    jurisdiction: "United Kingdom", destination: "United Kingdom", category: "Documents",
    title: "Review financial evidence for an Indian passport",
    preparation: "India is not in the differential-evidence nationality list on the researched GOV.UK page. Review financial evidence instructions, including other possible exceptions such as prior UK residence. This does not determine your individual document obligations.",
    purpose: ["study"], nationalityConditions: ["India"],
    sourceName: "GOV.UK · Student visa — money",
    officialUrl: "https://www.gov.uk/student-visa/money",
    sourceCoverage: "Nationality-specific preparation prompt. Other exceptions and requests can apply.",
    sourceVersion: "1 · source read 2026-11-13", sourceFetchedAt: "2026-11-13", lastVerified: null,
  },
  {
    id: "uk-study-canada-finances", ...individualContext,
    jurisdiction: "United Kingdom", destination: "United Kingdom", category: "Documents",
    title: "Review Canada’s differential-evidence guidance",
    preparation: "Canada is in the differential-evidence nationality list on the researched GOV.UK page. Applicants may still be asked for financial evidence before a decision. An evidence exception does not remove the financial requirement.",
    purpose: ["study"], nationalityConditions: ["Canada"],
    sourceName: "GOV.UK · Student visa — money",
    officialUrl: "https://www.gov.uk/student-visa/money",
    sourceCoverage: "Nationality-specific preparation prompt, not an eligibility decision or personal exemption.",
    sourceVersion: "1 · source read 2026-11-13", sourceFetchedAt: "2026-11-13", lastVerified: null,
  },
  {
    id: "uk-india-clinic-discovery", ...individualContext,
    jurisdiction: "United Kingdom", destination: "United Kingdom", category: "Documents",
    title: "Review India’s approved TB clinic directory if testing applies",
    preparation: "India appears in GOV.UK’s TB-country directory. Current residence alone does not establish whether a test is needed: review residence history, stay length, age and exceptions first. Use an approved clinic only if the applicable guidance calls for testing.",
    purpose: ["study"], residenceConditions: ["India"],
    sourceName: "GOV.UK · TB testing countries and clinics",
    officialUrl: "https://www.gov.uk/tb-test-visa/countries-where-you-need-a-tb-test-to-enter-the-uk",
    sourceCoverage: "India residence triggers a clinic-discovery prompt, not a testing determination.",
    sourceVersion: "1 · source read 2026-11-13", sourceFetchedAt: "2026-11-13", lastVerified: null,
  },
  {
    id: "uk-student-route",
    ...individualContext,
    jurisdiction: "United Kingdom",
    destination: "United Kingdom",
    category: "Visa",
    title: "Check the UK Student visa route",
    preparation:
      "For study, review the official Student visa guidance and confirm the correct route for your circumstances before applying.",
    purpose: ["study"],
    sourceName: "GOV.UK · Student visa",
    officialUrl: "https://www.gov.uk/student-visa",
    sourceCoverage: "Official route overview; not a personalized eligibility assessment.",
    sourceVersion: "GOV.UK page fetched 2026-11-13",
    sourceFetchedAt: "2026-11-13",
    lastVerified: null,
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
    sourceCoverage: "Official interactive starting point; no result inferred here.",
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
    sourceCoverage: "Official visitor route starting point; link not reviewed for current details.",
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
    sourceCoverage: "Official route directory; link not reviewed for current details.",
    sourceVersion: "Directory link only",
    sourceFetchedAt: null,
    lastVerified: null,
  },
  {
    id: "uk-study-evidence",
    ...individualContext,
    jurisdiction: "United Kingdom",
    destination: "United Kingdom",
    category: "Documents",
    title: "Review study application evidence",
    preparation:
      "GOV.UK identifies a valid passport or travel document and a Confirmation of Acceptance for Studies (CAS). Depending on circumstances, it also lists funds evidence, an ATAS certificate, TB test results or sponsor consent; under-18 applicants have additional consent and relationship evidence. Check the linked page for the current instructions that apply to you.",
    purpose: ["study"],
    sourceName: "GOV.UK · Student visa documents",
    officialUrl: "https://www.gov.uk/student-visa/documents-you-must-provide",
    sourceCoverage: "Official document guidance; conditional items depend on individual circumstances.",
    sourceVersion: "GOV.UK page fetched 2026-11-13",
    sourceFetchedAt: "2026-11-13",
    lastVerified: null,
    conditions: {
      ...individualContext.conditions,
      passportType: "The page lists a current passport or other valid travel document.",
      stayDuration: "Funds evidence, an ATAS certificate, TB results and sponsor consent are conditional on circumstances.",
      ageBand: "Under-18 applicants have additional parental or guardian consent and relationship evidence described on the page.",
    },
  },
  {
    id: "uk-study-tb",
    ...individualContext,
    jurisdiction: "United Kingdom",
    destination: "United Kingdom",
    category: "Documents",
    title: "Check whether TB guidance applies to your study stay",
    preparation:
      "GOV.UK says a TB test is required for some visa applicants coming for 6 months or more who have lived for at least 6 months in a listed country and were living in a listed country within the last 6 months. Check the official guidance and country list for your residence history; nationality alone does not establish this.",
    purpose: ["study"],
    sourceName: "GOV.UK · Tuberculosis tests for visa applicants",
    officialUrl: "https://www.gov.uk/tb-test-visa",
    sourceCoverage: "Official conditional guidance; residence history and stay length matter. No individual result inferred.",
    sourceVersion: "GOV.UK page fetched 2026-11-13",
    sourceFetchedAt: "2026-11-13",
    lastVerified: null,
    conditions: {
      ...individualContext.conditions,
      residencePermit: "Check where you have lived for the required period and in the recent period; passport nationality alone is insufficient.",
      stayDuration: "The general rule described on the source page refers to stays of 6 months or more, subject to other conditions and exceptions.",
    },
  },
  {
    id: "uk-study-logistics",
    ...individualContext,
    jurisdiction: "United Kingdom",
    destination: "United Kingdom",
    category: "Documents",
    title: "Plan accommodation and healthcare separately",
    preparation:
      "Check accommodation arrangements with your education provider and review official healthcare guidance for your own route. This is a planning prompt, not a claim that either is a universal Student visa document.",
    purpose: ["study"],
    sourceName: "GOV.UK · Student visa",
    officialUrl: "https://www.gov.uk/student-visa",
    sourceCoverage: "Planning prompt only; not a universal visa-document requirement.",
    sourceVersion: "GOV.UK page fetched 2026-11-13",
    sourceFetchedAt: "2026-11-13",
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
    sourceCoverage: "Official work-route directory; exact evidence depends on route and circumstances.",
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
    sourceCoverage: "Official transit routes overview; no individual outcome inferred.",
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
    sourceCoverage: "Official airport starting point only; immigration conditions not covered.",
    sourceVersion: "Unverified directory link",
    sourceFetchedAt: null,
    lastVerified: null,
  },
];
