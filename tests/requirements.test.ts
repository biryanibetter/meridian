import assert from "node:assert/strict";
import test from "node:test";
import { getRequirements, type RequirementContext } from "../lib/requirements";

const indiaUkStudy: RequirementContext = {
  nationality: "India",
  residence: "India",
  destination: "United Kingdom",
  transit: "Qatar",
  purpose: "International study",
  departure: "2027-08-28",
};

test("UK study requirements include contextual official checks, not eligibility claims", () => {
  const requirements = getRequirements(indiaUkStudy);
  assert.ok(
    requirements.some(
      (item) => item.id === "uk-study-application" && item.procedural,
    ),
  );
  assert.ok(requirements.some((item) => item.category === "Documents"));
  assert.ok(requirements.some((item) => item.category === "Transit"));
  assert.ok(
    requirements.every(
      (item) => item.status === "official-confirmation-required",
    ),
  );
  assert.ok(
    requirements.some(
      (item) => item.sourceUrl === "https://www.gov.uk/student-visa",
    ),
  );
});

test("work and tourism receive purpose-specific guidance, not student requirements", () => {
  const work = getRequirements({ ...indiaUkStudy, purpose: "Work" });
  const tourism = getRequirements({ ...indiaUkStudy, purpose: "Tourism" });
  assert.notDeepEqual(
    work.map((item) => item.id),
    tourism.map((item) => item.id),
  );
  assert.ok(!work.some((item) => item.id === "uk-student-route"));
  assert.ok(!tourism.some((item) => item.id === "uk-student-route"));
});

test("unsupported destination returns preparation templates and no invented source", () => {
  const requirements = getRequirements({
    ...indiaUkStudy,
    destination: "Atlantis",
    transit: "",
  });
  assert.ok(requirements.length > 0);
  assert.ok(requirements.every((item) => item.sourceUrl === null));
  assert.ok(
    requirements.every(
      (item) => item.status === "official-confirmation-required",
    ),
  );
});

test("unknown destination keeps its gap when a known Qatar transit is also present", () => {
  const requirements = getRequirements({
    ...indiaUkStudy,
    destination: "Atlantis",
    transit: "Qatar",
  });
  assert.ok(requirements.some((item) => item.id === "coverage-gap"));
  assert.ok(requirements.some((item) => item.id === "qatar-transit"));
  assert.equal(
    requirements.find((item) => item.id === "coverage-gap")?.sourceUrl,
    null,
  );
});

test("Doha transit is normalized as Qatar without hiding an unsupported destination", () => {
  const requirements = getRequirements({
    ...indiaUkStudy,
    destination: "Atlantis",
    transit: "Doha",
  });
  assert.ok(requirements.some((item) => item.id === "coverage-gap"));
  assert.ok(requirements.some((item) => item.id === "qatar-transit"));
});

test("journey contexts preserve passport, permit and stay-condition inputs", () => {
  const requirements = getRequirements({
    ...indiaUkStudy,
    passportType: "ordinary",
    residencePermitStatus: "valid",
    existingVisaStatus: "unknown",
    returnDate: "2028-07-01",
    ageBand: "18plus",
  });
  assert.ok(
    requirements.every((item) => item.context.passportType === "ordinary"),
  );
  assert.ok(
    requirements.every(
      (item) => item.context.residencePermitStatus === "valid",
    ),
  );
  assert.ok(
    requirements.every((item) => item.context.existingVisaStatus === "unknown"),
  );
  assert.ok(
    requirements.every((item) => item.context.returnDate === "2028-07-01"),
  );
  assert.ok(
    requirements
      .filter((item) => item.destination === "United Kingdom")
      .some((item) => item.lastVerified === "2026-11-14"),
  );
  assert.ok(
    requirements.every(
      (item) => item.status === "official-confirmation-required",
    ),
  );
});

test("date of birth is reduced to an age band at departure and not retained in context", () => {
  const requirements = getRequirements({
    ...indiaUkStudy,
    dateOfBirth: "2010-08-29",
  });
  assert.ok(requirements.every((item) => item.context.ageBand === "under18"));
  assert.ok(requirements.every((item) => !("dateOfBirth" in item.context)));
});

test("researched UK student evidence covers only official, condition-dependent categories", () => {
  const requirements = getRequirements(indiaUkStudy);
  const evidence = requirements.find((item) => item.id === "uk-study-cas");
  assert.ok(
    evidence?.sourceUrl?.endsWith("/student-visa/documents-you-must-provide"),
  );
  assert.match(evidence?.preparation ?? "", /CAS/i);
  assert.ok(requirements.some((item) => item.id === "uk-study-finances"));
  assert.ok(
    requirements.some(
      (item) =>
        item.id === "uk-study-atas" && item.applicability === "Conditional",
    ),
  );
  assert.ok(
    requirements.some(
      (item) =>
        item.id === "uk-study-tb" &&
        item.applicability === "Confirmation needed",
    ),
  );
  assert.equal(evidence?.lastVerified, "2026-11-14");
  assert.ok(evidence?.sourceFetchedAt);
});

test("different nationality remains explicit context and does not inherit India-specific records", () => {
  const requirements = getRequirements({
    ...indiaUkStudy,
    nationality: "Canada",
  });
  assert.ok(requirements.every((item) => item.nationalityContext === "Canada"));
});
