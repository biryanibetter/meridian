export interface ConsularEntry {
  name: string;
  country: string;
  location: string;
  website: string;
  phone: null;
  email: null;
  services: string;
  sourceFetchedAt: string | null;
}

/** Directory references only. Missing contact fields must never be guessed. */
export function consularEntries(nationality: string, residence: string, destination: string): ConsularEntry[] {
  const records: ConsularEntry[] = [];
  if (residence === "India" && destination === "United Kingdom") records.push({
    name: "British High Commission New Delhi",
    country: "United Kingdom", location: "New Delhi, India",
    website: "https://www.gov.uk/world/organisations/british-high-commission-new-delhi",
    phone: null, email: null,
    services: "Official mission information. Visa applications follow the UKVI pathway; consular assistance eligibility must be checked separately.",
    sourceFetchedAt: "2026-11-13",
  });
  if (nationality === "India") records.push({
    name: "India — Ministry of External Affairs",
    country: "India", location: `Mission in ${destination}: contact unconfirmed`,
    website: "https://www.mea.gov.in/",
    phone: null, email: null,
    services: "Find the relevant Indian mission and its current consular services through the ministry. No local contact details are registered.",
    sourceFetchedAt: null,
  });
  if (nationality === "United Kingdom") records.push({
    name: "British embassies, high commissions and consulates",
    country: "United Kingdom", location: `Directory discovery for ${destination}`,
    website: "https://www.gov.uk/world/embassies",
    phone: null, email: null,
    services: "Official mission directory for British nationals abroad.",
    sourceFetchedAt: "2026-11-13",
  });
  return records;
}
