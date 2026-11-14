export type TravelerProfileDetails = {
  name?: string;
  role?: string;
  nationality?: string;
  residence?: string;
  passportIssuingCountry?: string;
  passportType?: string;
  passportExpiry?: string;
};

/** Accept a suffix only; construct the mask, never save arbitrary identifier text. */
export function maskedPassportSuffix(input: string): string | null {
  const suffix = input.trim().replace(/^[•*]+\s*/, "");
  if (!suffix) return "";
  return /^[a-z0-9]{1,4}$/i.test(suffix) ? `••••${suffix.toUpperCase()}` : null;
}

export type ProfileReadiness = {
  completed: number;
  total: number;
  percentage: number;
  missing: string[];
  expiry: "missing" | "expired" | "due-soon" | "valid";
};

/** Local profile completeness only; it does not verify identity or eligibility. */
export function profileReadiness(
  traveler: TravelerProfileDetails,
  today = new Date().toISOString().slice(0, 10),
): ProfileReadiness {
  const checks: [string, boolean][] = [
    ["Name", Boolean(traveler.name?.trim())],
    ["Relationship", Boolean(traveler.role?.trim())],
    ["Nationality", Boolean(traveler.nationality?.trim())],
    ["Country of residence", Boolean(traveler.residence?.trim())],
    ["Passport issuing country", Boolean(traveler.passportIssuingCountry?.trim())],
    ["Passport type", Boolean(traveler.passportType?.trim())],
    ["Passport expiry", Boolean(traveler.passportExpiry)],
  ];
  const missing = checks.filter(([, complete]) => !complete).map(([name]) => name);
  let expiry: ProfileReadiness["expiry"] = "missing";
  if (traveler.passportExpiry) {
    const date = new Date(`${traveler.passportExpiry}T00:00:00Z`);
    const current = new Date(`${today}T00:00:00Z`);
    if (!Number.isNaN(date.getTime()) && !Number.isNaN(current.getTime())) {
      const days = Math.ceil((date.getTime() - current.getTime()) / 86_400_000);
      expiry = days < 0 ? "expired" : days <= 180 ? "due-soon" : "valid";
    }
  }
  const completed = checks.length - missing.length;
  return {
    completed,
    total: checks.length,
    percentage: Math.round((completed / checks.length) * 100),
    missing,
    expiry,
  };
}
