import type { RequirementContext } from "./requirements";
import type { OptimizationCandidate, SavedComparison } from "./optimization";

export type JourneyMode = "Trip" | "Move" | "Transit" | "Family";
export interface Traveler {
  id: string;
  name: string;
  initials: string;
  role: string;
  nationality: string;
  residence: string;
  color: string;
  passportIssuingCountry?: string;
  passportMasked?: string;
  passportExpiry?: string;
  passportType?: string;
  dateOfBirth?: string;
  existingVisaStatus?: string;
  residencePermitMasked?: string;
  residencePermitExpiry?: string;
  detailsReviewedAt?: string;
  consentLocalMetadata?: boolean;
}
export interface Journey {
  id: string;
  name: string;
  mode: JourneyMode;
  origin: string;
  originCountry?: string;
  originCode: string;
  destination: string;
  destinationCode: string;
  country: string;
  transit: string;
  departure: string;
  returnDate: string;
  longTerm?: boolean;
  purpose: string;
  travelers: string[];
  archived: boolean;
  color: string;
  budgetAllowance?: number;
}
export interface Task {
  id: string;
  journeyId: string;
  title: string;
  category: string;
  offset: number;
  done: boolean;
  priority: "High" | "Medium" | "Low";
  travelerId: string;
  dependency?: string;
  note?: string;
}
export interface Document {
  id: string;
  journeyId: string;
  name: string;
  category: string;
  ownerId: string;
  expires: string;
  taskId: string;
  added: string;
  requirementId?: string;
  sourceUrl?: string;
  preparationNote?: string;
  prepared?: boolean;
  reviewed?: boolean;
  issueDate?: string;
  preparationStatus?:
    "Missing" | "To prepare" | "Added" | "Needs review" | "Ready";
}
export type ApplicationStage =
  "requirements" | "documents" | "application" | "submission" | "status";
export interface Application {
  id: string;
  journeyId: string;
  travelerId: string;
  destination: string;
  visaCategory: string;
  stage: ApplicationStage;
  status:
    | "Not started"
    | "Preparing"
    | "Submitted"
    | "Awaiting decision"
    | "Decision received";
  officialUrl?: string;
  notes: string;
  submissionDate?: string;
  reference?: string;
  completedSteps: string[];
  appointments?: { id: string; title: string; scheduledAt: string; location: string; completed: boolean }[];
  deadlines?: { id: string; title: string; date: string; completed: boolean }[];
  contextSnapshot?: RequirementContext;
  legacyStatus?: string;
  ruleContext?: {
    courseLevel?: string;
    courseCah3Code?: string;
    tbResidenceDurationMonths?: number;
    tbListedCountryRecentResidence?: boolean;
    financialSponsorshipWithin12Months?: boolean;
    applicationDate?: string;
    englishPathway?: string;
    financialEvidenceException?: string;
    atasRequired?: boolean;
  };
}
export interface EvidenceLink {
  id: string;
  applicationId: string;
  requirementId: string;
  documentId: string;
  confirmedAt: string;
  reviewedAt?: string;
  verificationState: "unverified";
}
export interface ApplicationEvent {
  id: string;
  applicationId: string;
  type: string;
  detail: string;
  createdAt: string;
}
export interface Source {
  id: string;
  name: string;
  jurisdiction: string;
  url: string;
  coverage: string;
  checked: string;
}
export interface Rule {
  id: string;
  category: string;
  title: string;
  detail: string;
  sourceId: string;
  status: "Needs review" | "In progress" | "Example complete";
  condition: string;
  changed?: boolean;
}
export interface Requirement extends Rule {
  journeyId: string;
  travelerId: string;
}
export interface Segment {
  id: string;
  journeyId: string;
  from: string;
  to: string;
  fromCode: string;
  toCode: string;
  depart: string;
  arrive: string;
  carrier: string;
  flight: string;
  terminal: string;
  duration: string;
  gate?: string;
  seat?: string;
  status?: "Planned" | "Booked" | "Checked in" | "Completed" | "Cancelled";
}
export interface Booking {
  id: string;
  journeyId: string;
  name: string;
  reference: string;
  category: string;
}
export interface BudgetItem {
  id: string;
  journeyId: string;
  title: string;
  category: string;
  planned: number;
  actual: number;
  currency: string;
  applicationId?: string;
  certainty?: "known" | "estimated" | "unknown";
  sourceUrl?: string;
}
export interface Advisory {
  id: string;
  title: string;
  detail: string;
  severity: string;
}
export interface Notification {
  id: string;
  title: string;
  detail: string;
  type: string;
  route: string;
  read: boolean;
  journeyId?: string;
}
export interface DemoState {
  optimizationCandidates?: OptimizationCandidate[];
  savedComparisons?: SavedComparison[];
  visaSchemaVersion?: 1;
  applications?: Application[];
  evidenceLinks?: EvidenceLink[];
  applicationEvents?: ApplicationEvent[];
  requirementAssessments?: Record<
    string,
    { assessedAt: string; contextKey: string }
  >;
  workspaceHistory?: WorkspaceSnapshot[];
  version: 1;
  journeys: Journey[];
  travelers: Traveler[];
  tasks: Task[];
  documents: Document[];
  segments: Segment[];
  bookings: Booking[];
  expenses: BudgetItem[];
  notifications: Notification[];
  applicationRecords?: Record<
    string,
    { submissionDate: string; reference: string }
  >;
  activeJourneyId: string;
  activeTravelerId: string;
  pendingTravelerId?: string;
  theme: "light" | "dark";
  profile: string;
  currency: string;
  language: string;
  reviewedRules: string[];
  arrivalDone: string[];
  travelDayDone?: string[];
  preferences: Record<string, boolean>;
}
export interface WorkspaceSnapshot {
  name: string;
  savedAt: string;
  state: Omit<DemoState, "workspaceHistory">;
}
