import type { DemoState, Journey, Rule, Source, Task } from "./types";
export const DEMO_TODAY = "2027-08-12";
export const sources: Source[] = [
  {
    id: "uk",
    name: "GOV.UK · UK Visas and Immigration",
    jurisdiction: "United Kingdom",
    url: "https://www.gov.uk/browse/visas-immigration",
    coverage: "Authority link only · rules not verified",
    checked: "Not verified",
  },
  {
    id: "qa",
    name: "Hamad International Airport",
    jurisdiction: "Qatar",
    url: "https://dohahamadairport.com/",
    coverage: "Airport facilities · immigration conditions not assessed",
    checked: "Not verified",
  },
  {
    id: "jp",
    name: "Ministry of Foreign Affairs of Japan",
    jurisdiction: "Japan",
    url: "https://www.mofa.go.jp/j_info/visit/visa/index.html",
    coverage: "Authority link only · rules not verified",
    checked: "Not verified",
  },
  {
    id: "de",
    name: "Federal Foreign Office",
    jurisdiction: "Germany",
    url: "https://www.auswaertiges-amt.de/en/visa-service",
    coverage: "Authority link only · rules not verified",
    checked: "Not verified",
  },
];
export const rules: Rule[] = [
  {
    id: "r1",
    category: "Visa",
    title: "Confirm your entry permission",
    detail:
      "Confirm the correct permission for your nationality, residence and travel purpose with the destination authority.",
    sourceId: "uk",
    status: "In progress",
    condition: "Depends on nationality, purpose and duration of stay.",
  },
  {
    id: "r2",
    category: "Passport",
    title: "Review passport validity",
    detail:
      "Check validity, blank pages and name consistency against official destination and transit guidance.",
    sourceId: "uk",
    status: "Example complete",
    condition: "Requirements vary by destination and passport type.",
  },
  {
    id: "r3",
    category: "Documents",
    title: "Prepare supporting documents",
    detail:
      "Prepare supporting documents relevant to your purpose of travel and confirm current requirements with the issuing authority.",
    sourceId: "uk",
    status: "Needs review",
    condition: "Requirements depend on your circumstances. Confirm with the issuing authority.",
  },
  {
    id: "r4",
    category: "Transit",
    title: "Check transit conditions separately",
    detail:
      "Airside connections and leaving the airport can have different conditions. Airline and airport guidance do not replace immigration authorization.",
    sourceId: "qa",
    status: "Needs review",
    condition:
      "Nationality, terminal changes, baggage collection and separate tickets may affect the connection.",
  },
  {
    id: "r5",
    category: "Entry",
    title: "Confirm your arrival checklist",
    detail:
      "Re-check official guidance close to departure. Health declarations, evidence and arrival procedures shown here are planning examples, not current legal requirements.",
    sourceId: "uk",
    status: "Needs review",
    condition: "Destination, travel history and dates are not verified.",
  },
];
export function makeTasks(j: Journey): Task[] {
  const purpose = j.purpose.toLowerCase();
  const study = /study|student|university|education/.test(purpose);
  const work = /work|business|employment/.test(purpose);
  const tourism = /tourism|tourist|holiday|vacation|visit/.test(purpose);
  const family = /family|relative/.test(purpose);
  const transit = Boolean(j.transit.trim());
  const relocation = /relocat|move|settle/.test(purpose) || j.mode === "Move";
  const purposeTask = study
    ? "Confirm university or course arrangements"
    : work
      ? "Confirm employer and workplace arrangements"
      : family
        ? "Coordinate plans for all family travelers"
        : /transit|connection/.test(purpose)
          ? "Confirm onward connection arrangements"
          : relocation
            ? "Confirm accommodation and settling-in plans"
            : tourism
              ? "Confirm itinerary and planned activities"
              : "Confirm plans for your stay";
  const tasks: Task[] = [
    {
      id: `${j.id}-t1`,
      journeyId: j.id,
      title: "Review passport details",
      category: "Documents",
      offset: -45,
      done: true,
      priority: "High",
      travelerId: j.travelers[0],
    },
    {
      id: `${j.id}-t2`,
      journeyId: j.id,
      title: purposeTask,
      category: "Planning",
      offset: -35,
      done: true,
      priority: "Medium",
      travelerId: j.travelers[0],
    },
    {
      id: `${j.id}-t3`,
      journeyId: j.id,
      title: "Save flight booking confirmation",
      category: "Travel",
      offset: -30,
      done: true,
      priority: "Medium",
      travelerId: j.travelers[0],
    },
    {
      id: `${j.id}-t4`,
      journeyId: j.id,
      title: "Confirm entry permission with official source",
      category: "Entry",
      offset: -21,
      done: false,
      priority: "High",
      travelerId: j.travelers[0],
      note: "Official confirmation required.",
    },
    {
      id: `${j.id}-t5`,
      journeyId: j.id,
      title: relocation
        ? "Add accommodation evidence"
        : "Prepare documents for your stay",
      category: "Documents",
      offset: -14,
      done: false,
      priority: "High",
      travelerId: j.travelers[0],
      dependency: `${j.id}-t2`,
      note: "Keep supporting documents together and confirm any requirements with the relevant authority.",
    },
    {
      id: `${j.id}-t6`,
      journeyId: j.id,
      title: "Arrange travel insurance",
      category: "Safety",
      offset: -10,
      done: true,
      priority: "Medium",
      travelerId: j.travelers[0],
    },
    {
      id: `${j.id}-t7`,
      journeyId: j.id,
      title: "Check transit guidance",
      category: "Entry",
      offset: -7,
      done: false,
      priority: "High",
      travelerId: j.travelers[0],
    },
    {
      id: `${j.id}-t8`,
      journeyId: j.id,
      title: "Save your journey details for travel day",
      category: "Travel",
      offset: -2,
      done: false,
      priority: "Low",
      travelerId: j.travelers[0],
    },
  ];
  return tasks.filter((task) => task.id !== `${j.id}-t7` || transit);
}
export function createSeed(): DemoState {
  const travelers = [
    {
      id: "maya",
      name: "Maya Bennett",
      initials: "MB",
      role: "Student · Primary traveler",
      nationality: "India",
      residence: "India",
      color: "lavender",
    },
    {
      id: "oliver",
      name: "Oliver Chen",
      initials: "OC",
      role: "Family organizer",
      nationality: "Canada",
      residence: "Canada",
      color: "blue",
    },
    {
      id: "elena",
      name: "Elena Chen",
      initials: "EC",
      role: "Adult",
      nationality: "Canada",
      residence: "Canada",
      color: "rose",
    },
    {
      id: "leo",
      name: "Leo Chen",
      initials: "LC",
      role: "Child · 9 years",
      nationality: "Canada",
      residence: "Canada",
      color: "amber",
    },
    {
      id: "alex",
      name: "Alex Morgan",
      initials: "AM",
      role: "Business traveler",
      nationality: "United States",
      residence: "United States",
      color: "green",
    },
  ];
  const journeys: Journey[] = [
    {
      id: "london",
      name: "London · International study",
      mode: "Move",
      origin: "Mumbai",
      originCode: "BOM",
      destination: "London",
      destinationCode: "LHR",
      country: "United Kingdom",
      transit: "Doha",
      departure: "2027-08-28",
      returnDate: "2028-07-01",
      purpose: "International study",
      travelers: ["maya"],
      archived: false,
      color: "blue",
    },
    {
      id: "tokyo",
      name: "Tokyo · Family visit",
      mode: "Family",
      origin: "Toronto",
      originCode: "YYZ",
      destination: "Tokyo",
      destinationCode: "HND",
      country: "Japan",
      transit: "Doha",
      departure: "2027-09-14",
      returnDate: "2027-09-28",
      purpose: "Family holiday",
      travelers: ["oliver", "elena", "leo"],
      archived: false,
      color: "rose",
    },
    {
      id: "berlin",
      name: "Berlin · Business travel",
      mode: "Trip",
      origin: "New York",
      originCode: "JFK",
      destination: "Berlin",
      destinationCode: "BER",
      country: "Germany",
      transit: "London",
      departure: "2027-09-05",
      returnDate: "2027-09-16",
      purpose: "Multi-country business",
      travelers: ["alex"],
      archived: false,
      color: "green",
    },
  ];
  return {
    version: 1,
    journeys,
    travelers,
    tasks: journeys.flatMap(makeTasks),
    documents: journeys.flatMap((j) => [
      {
        id: `${j.id}-d1`,
        journeyId: j.id,
         name: "Passport",
        category: "Passport",
        ownerId: j.travelers[0],
        expires: "2029-06-15",
        taskId: `${j.id}-t1`,
        added: "2027-07-21",
      },
      {
        id: `${j.id}-d2`,
        journeyId: j.id,
        name: "Flight confirmation",
        category: "Booking",
        ownerId: j.travelers[0],
        expires: j.departure,
        taskId: `${j.id}-t3`,
        added: "2027-08-04",
      },
      {
        id: `${j.id}-d3`,
        journeyId: j.id,
         name: "Travel insurance",
        category: "Insurance",
        ownerId: j.travelers[0],
        expires: "2028-08-01",
        taskId: `${j.id}-t6`,
        added: "2027-08-10",
      },
    ]),
    segments: journeys.flatMap((j) => [
      {
        id: `${j.id}-s1`,
        journeyId: j.id,
        from: j.origin,
        to: j.transit.split(",")[0],
        fromCode: j.originCode,
        toCode: j.id === "berlin" ? "LHR" : "DOH",
        depart: "04:10",
        arrive: "05:25",
        carrier: "Carrier not connected",
        flight: "MD 517",
        terminal: "Terminal 2",
        duration: "3h 45m",
      },
      {
        id: `${j.id}-s2`,
        journeyId: j.id,
        from: j.transit.split(",")[0],
        to: j.destination,
        fromCode: j.id === "berlin" ? "LHR" : "DOH",
        toCode: j.destinationCode,
        depart: "09:10",
        arrive: "14:05",
        carrier: "Carrier not connected",
        flight: "MD 203",
        terminal: "Terminal 1",
        duration: "7h 25m",
      },
    ]),
    bookings: journeys.map((j) => ({
      id: `${j.id}-b`,
      journeyId: j.id,
      name: "Flight booking",
      reference: `DEMO${j.id.slice(0, 2).toUpperCase()}`,
      category: "Flight",
    })),
    expenses: journeys.flatMap((j) => [
      {
        id: `${j.id}-e1`,
        journeyId: j.id,
        title: "Return flights",
        category: "Flights",
        planned: 950,
        actual: 890,
        currency: "USD",
      },
      {
        id: `${j.id}-e2`,
        journeyId: j.id,
        title:
          j.mode === "Move"
            ? "First month accommodation"
            : "Hotel & accommodation",
        category: "Housing",
        planned: 1500,
        actual: 1350,
        currency: "USD",
      },
      {
        id: `${j.id}-e3`,
        journeyId: j.id,
        title: "Entry application allowance",
        category: "Administration",
        planned: 500,
        actual: 0,
        currency: "USD",
      },
      {
        id: `${j.id}-e4`,
        journeyId: j.id,
        title: "Insurance",
        category: "Health",
        planned: 180,
        actual: 165,
        currency: "USD",
      },
      {
        id: `${j.id}-e5`,
        journeyId: j.id,
        title: "Airport transfer & local travel",
        category: "Transport",
        planned: 170,
        actual: 45,
        currency: "USD",
      },
    ]),
    notifications: [
      {
        id: "n1",
        journeyId: "london",
         title: "Review your supporting documents",
         detail:
          "Check that your supporting documents are ready and confirm current requirements with the relevant authority.",
        type: "Requirement",
        route: "entry",
        read: false,
      },
      {
        id: "n2",
        journeyId: "london",
        title: "Departure preparation reminder",
        detail:
          "Review outstanding preparation tasks before your London departure.",
        type: "Deadline",
        route: "tasks",
        read: false,
      },
      {
        id: "n3",
        journeyId: "london",
        title: "Insurance added to your vault",
        detail:
          "Travel insurance is linked to your safety checklist.",
        type: "Document",
        route: "documents",
        read: true,
      },
    ],
    activeJourneyId: "london",
    activeTravelerId: "maya",
    theme: "light",
    profile: "Maya Bennett",
    currency: "USD",
    language: "English",
    reviewedRules: [],
    arrivalDone: [],
    preferences: { deadlines: true, requirements: true, digest: false },
  };
}
