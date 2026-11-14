import assert from "node:assert/strict";
import test from "node:test";
import { getRequirements, type RequirementContext } from "../lib/requirements";

const base: RequirementContext = {
  nationality: "India",
  residence: "India",
  destination: "United Kingdom",
  transit: "",
  purpose: "study",
  departure: "2027-09-01",
};

test("UK Student pack separates passport and CAS and exposes structured obligations", () => {
  const requirements = getRequirements(base);
  const passport = requirements.find((item) => item.id === "uk-study-passport");
  const cas = requirements.find((item) => item.id === "uk-study-cas");
  assert.ok(passport);
  assert.ok(cas);
  assert.equal(passport.id, "uk-study-passport");
  assert.equal(cas.id, "uk-study-cas");
  assert.notEqual(passport.id, cas.id);
  assert.equal(passport.group, "Identity & admission");
  assert.equal(cas.group, "Identity & admission");
  assert.ok(
    requirements.every(
      (item) =>
        typeof item.group === "string" &&
        [
          "Required",
          "Conditional",
          "Not applicable",
          "Confirmation needed",
        ].includes(item.applicability) &&
        Array.isArray(item.evidenceTypes) &&
        Array.isArray(item.missingInformation) &&
        Array.isArray(item.acceptedEvidence) &&
        typeof item.procedural === "boolean",
    ),
  );
});

test("English obligation explains provider assessment, exemptions and conditional SELT", () => {
  const english = getRequirements(base).find(
    (item) => item.id === "uk-study-english",
  );
  assert.equal(english?.title, "Prove English proficiency");
  assert.match(english?.preparation ?? "", /higher education provider/i);
  assert.match(english?.preparation ?? "", /B2/i);
  assert.match(english?.preparation ?? "", /exemption/i);
  assert.match(english?.preparation ?? "", /SELT/i);
  assert.match(
    english?.preparation ?? "",
    /gov.uk\/guidance\/prove-your-english-language-abilities-with-a-secure-english-language-test-selt/,
  );
});

test("financial evidence is distinguished from the financial requirement for all nationalities", () => {
  for (const nationality of ["India", "Canada"]) {
    const finance = getRequirements({ ...base, nationality }).find(
      (item) => item.id === "uk-study-finances",
    );
    assert.ok(finance);
    assert.equal(finance.applicability, "Conditional");
    assert.match(finance.preparation, /requirement/i);
    assert.match(finance.preparation, /evidence/i);
    assert.match(finance.preparation, /12 months/i);
  }
});

test("under-18 unknown status requires confirmation; adult consent is not applicable", () => {
  const unknown = getRequirements(base).find(
    (item) => item.id === "uk-study-under18",
  );
  const adult = getRequirements({ ...base, ageBand: "18plus" }).find(
    (item) => item.id === "uk-study-under18",
  );
  assert.equal(unknown?.applicability, "Confirmation needed");
  assert.equal(adult?.applicability, "Not applicable");
  assert.deepEqual(adult?.missingInformation, []);
  assert.equal(
    getRequirements({ ...base, ageBand: "under18" }).find(
      (item) => item.id === "uk-study-under18",
    )?.applicability,
    "Required",
  );
  assert.equal(
    getRequirements({
      ...base,
      dateOfBirth: "2008-11-15",
      applicationDate: "2026-11-14",
    }).find((item) => item.id === "uk-study-under18")?.applicability,
    "Required",
  );
  assert.equal(
    getRequirements({
      ...base,
      dateOfBirth: "2008-11-13",
      applicationDate: "2026-11-14",
    }).find((item) => item.id === "uk-study-under18")?.applicability,
    "Not applicable",
  );
  assert.ok(unknown?.evidenceTypes.includes("Consent"));
});

test("TB and ATAS remain conditional with unprovided history or course details", () => {
  const requirements = getRequirements(base);
  assert.equal(
    requirements.find((item) => item.id === "uk-study-tb")?.applicability,
    "Confirmation needed",
  );
  assert.equal(
    requirements.find((item) => item.id === "uk-study-atas")?.applicability,
    "Conditional",
  );
  assert.equal(
    getRequirements({
      ...base,
      returnDate: "2028-09-01",
      tbResidenceDurationMonths: 8,
      tbListedCountryRecentResidence: true,
    }).find((item) => item.id === "uk-study-tb")?.applicability,
    "Required",
  );
  assert.equal(
    getRequirements({
      ...base,
      returnDate: "2028-09-01",
      tbResidenceDurationMonths: 8,
      tbListedCountryRecentResidence: false,
    }).find((item) => item.id === "uk-study-tb")?.applicability,
    "Not applicable",
  );
  assert.equal(
    getRequirements({ ...base, financialSponsorshipWithin12Months: true }).find(
      (item) => item.id === "uk-study-sponsorship-consent",
    )?.applicability,
    "Required",
  );
  assert.equal(
    getRequirements({
      ...base,
      financialSponsorshipWithin12Months: false,
    }).find((item) => item.id === "uk-study-sponsorship-consent")
      ?.applicability,
    "Not applicable",
  );
  assert.equal(
    getRequirements({ ...base, atasRequired: true }).find(
      (item) => item.id === "uk-study-atas",
    )?.applicability,
    "Required",
  );
  assert.equal(
    getRequirements({ ...base, atasRequired: false }).find(
      (item) => item.id === "uk-study-atas",
    )?.applicability,
    "Not applicable",
  );
});

test("procedural steps do not claim documentary evidence", () => {
  const procedures = getRequirements(base).filter((item) => item.procedural);
  assert.deepEqual(
    procedures.map((item) => item.id),
    [
      "uk-study-application",
      "uk-study-fees-health",
      "uk-study-identity",
      "uk-study-submission",
      "uk-study-decision",
    ],
  );
  assert.ok(procedures.every((item) => item.evidenceTypes.length === 0));
});

test("English evidence is conditional and identifies authoritative evidence routes", () => {
  const english = getRequirements(base).find(
    (item) => item.id === "uk-study-english",
  );
  assert.equal(english?.applicability, "Conditional");
  assert.ok(english?.acceptedEvidence.some((value) => /HEP.*B2/i.test(value)));
  assert.ok(
    english?.acceptedEvidence.some((value) =>
      /SELT.*approved provider/i.test(value),
    ),
  );
  assert.ok(
    english?.acceptedEvidence.some((value) =>
      /degree.*English|GCSE|A level/i.test(value),
    ),
  );
});

test("financial evidence lists source-backed evidence routes", () => {
  const finance = getRequirements(base).find(
    (item) => item.id === "uk-study-finances",
  );
  assert.ok(
    finance?.acceptedEvidence.some((value) => /bank.*statements/i.test(value)),
  );
  assert.ok(
    finance?.acceptedEvidence.some((value) =>
      /student loan letter/i.test(value),
    ),
  );
  assert.ok(
    finance?.acceptedEvidence.some((value) => /sponsor.*letter/i.test(value)),
  );
});

test("explicit English and financial evidence context resolves missing-information prompts", () => {
  const exemptEnglish = getRequirements({
    ...base,
    englishPathway: "exempt",
  }).find((item) => item.id === "uk-study-english");
  const seltEnglish = getRequirements({
    ...base,
    englishPathway: "selt",
    courseLevel: "below-degree",
  }).find((item) => item.id === "uk-study-english");
  assert.equal(exemptEnglish?.applicability, "Not applicable");
  assert.deepEqual(exemptEnglish?.missingInformation, []);
  assert.equal(seltEnglish?.applicability, "Required");
  assert.deepEqual(seltEnglish?.missingInformation, []);
  const finance = getRequirements({
    ...base,
    financialEvidenceException: "differential-evidence",
  }).find((item) => item.id === "uk-study-finances");
  assert.ok(
    !finance?.missingInformation.some((value) => /exception/i.test(value)),
  );
  assert.match(
    finance?.preparation ?? "",
    /underlying financial requirement remains/i,
  );
});

test("HEP assessment cannot be assumed valid below degree level", () => {
  const english = getRequirements({
    ...base,
    englishPathway: "hep",
    courseLevel: "below-degree",
  }).find((r) => r.id === "uk-study-english")!;
  assert.equal(english.applicability, "Confirmation needed");
  assert.ok(english.missingInformation.some((item) => /degree/i.test(item)));
});
