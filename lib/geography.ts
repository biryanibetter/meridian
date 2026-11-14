export type Airport = {
  code: string;
  city: string;
  country: string;
  lat: number;
  lon: number;
  website?: string;
};
export const airports: Airport[] = [
  { code: "BOM", city: "Mumbai", country: "India", lat: 19.0896, lon: 72.8656 },
  {
    code: "DOH",
    city: "Doha",
    country: "Qatar",
    lat: 25.2731,
    lon: 51.6081,
    website: "https://dohahamadairport.com/",
  },
  {
    code: "LHR",
    city: "London",
    country: "United Kingdom",
    lat: 51.47,
    lon: -0.4543,
  },
  { code: "HND", city: "Tokyo", country: "Japan", lat: 35.5494, lon: 139.7798 },
  { code: "NRT", city: "Narita", country: "Japan", lat: 35.772, lon: 140.3929 },
  {
    code: "BER",
    city: "Berlin",
    country: "Germany",
    lat: 52.3667,
    lon: 13.5033,
  },
  {
    code: "DXB",
    city: "Dubai",
    country: "United Arab Emirates",
    lat: 25.2532,
    lon: 55.3657,
  },
  { code: "DEL", city: "Delhi", country: "India", lat: 28.5562, lon: 77.1 },
  {
    code: "SIN",
    city: "Singapore",
    country: "Singapore",
    lat: 1.3644,
    lon: 103.9915,
  },
  { code: "CDG", city: "Paris", country: "France", lat: 49.0097, lon: 2.5479 },
  {
    code: "JFK",
    city: "New York",
    country: "United States",
    lat: 40.6413,
    lon: -73.7781,
  },
  {
    code: "SYD",
    city: "Sydney",
    country: "Australia",
    lat: -33.9399,
    lon: 151.1753,
  },
  {
    code: "IST",
    city: "Istanbul",
    country: "Turkey",
    lat: 41.2753,
    lon: 28.7519,
  },
  {
    code: "FRA",
    city: "Frankfurt",
    country: "Germany",
    lat: 50.0379,
    lon: 8.5622,
  },
  {
    code: "LAX",
    city: "Los Angeles",
    country: "United States",
    lat: 33.9416,
    lon: -118.4085,
  },
  {
    code: "YYZ",
    city: "Toronto",
    country: "Canada",
    lat: 43.6777,
    lon: -79.6248,
  },
  {
    code: "KUL",
    city: "Kuala Lumpur",
    country: "Malaysia",
    lat: 2.7456,
    lon: 101.7072,
  },
  {
    code: "BKK",
    city: "Bangkok",
    country: "Thailand",
    lat: 13.69,
    lon: 100.7501,
  },
  {
    code: "LIS",
    city: "Lisbon",
    country: "Portugal",
    lat: 38.7742,
    lon: -9.1342,
  },
  {
    code: "SFO",
    city: "San Francisco",
    country: "United States",
    lat: 37.6213,
    lon: -122.379,
  },
  {
    code: "ORD",
    city: "Chicago",
    country: "United States",
    lat: 41.9742,
    lon: -87.9073,
  },
  {
    code: "ATL",
    city: "Atlanta",
    country: "United States",
    lat: 33.6407,
    lon: -84.4277,
  },
  {
    code: "MIA",
    city: "Miami",
    country: "United States",
    lat: 25.7959,
    lon: -80.287,
  },
  {
    code: "SEA",
    city: "Seattle",
    country: "United States",
    lat: 47.4502,
    lon: -122.3088,
  },
  {
    code: "BOS",
    city: "Boston",
    country: "United States",
    lat: 42.3656,
    lon: -71.0096,
  },
  {
    code: "EWR",
    city: "Newark",
    country: "United States",
    lat: 40.6895,
    lon: -74.1745,
  },
  {
    code: "MEX",
    city: "Mexico City",
    country: "Mexico",
    lat: 19.4363,
    lon: -99.0721,
  },
  {
    code: "GRU",
    city: "São Paulo",
    country: "Brazil",
    lat: -23.4356,
    lon: -46.4731,
  },
  {
    code: "EZE",
    city: "Buenos Aires",
    country: "Argentina",
    lat: -34.8222,
    lon: -58.5358,
  },
  {
    code: "JNB",
    city: "Johannesburg",
    country: "South Africa",
    lat: -26.1337,
    lon: 28.242,
  },
  { code: "CAI", city: "Cairo", country: "Egypt", lat: 30.1219, lon: 31.4056 },
  {
    code: "NBO",
    city: "Nairobi",
    country: "Kenya",
    lat: -1.3192,
    lon: 36.9278,
  },
  {
    code: "AMS",
    city: "Amsterdam",
    country: "Netherlands",
    lat: 52.3105,
    lon: 4.7683,
  },
  { code: "MAD", city: "Madrid", country: "Spain", lat: 40.4983, lon: -3.5676 },
  { code: "FCO", city: "Rome", country: "Italy", lat: 41.8003, lon: 12.2389 },
  {
    code: "ZRH",
    city: "Zurich",
    country: "Switzerland",
    lat: 47.4581,
    lon: 8.5555,
  },
  {
    code: "VIE",
    city: "Vienna",
    country: "Austria",
    lat: 48.1103,
    lon: 16.5697,
  },
  {
    code: "CMB",
    city: "Colombo",
    country: "Sri Lanka",
    lat: 7.1808,
    lon: 79.8841,
  },
  {
    code: "MNL",
    city: "Manila",
    country: "Philippines",
    lat: 14.5086,
    lon: 121.0198,
  },
  {
    code: "ICN",
    city: "Seoul",
    country: "South Korea",
    lat: 37.4602,
    lon: 126.4407,
  },
  {
    code: "PEK",
    city: "Beijing",
    country: "China",
    lat: 40.0799,
    lon: 116.6031,
  },
  {
    code: "PVG",
    city: "Shanghai",
    country: "China",
    lat: 31.1443,
    lon: 121.8083,
  },
  {
    code: "HKG",
    city: "Hong Kong",
    country: "China",
    lat: 22.308,
    lon: 113.9185,
  },
  {
    code: "AUH",
    city: "Abu Dhabi",
    country: "United Arab Emirates",
    lat: 24.433,
    lon: 54.6511,
  },
];
export function findAirport(value: string): Airport | undefined {
  const normalized = value.trim().toLowerCase().split(",")[0];
  return airports.find(
    (a) =>
      a.code.toLowerCase() === normalized ||
      a.city.toLowerCase() === normalized,
  );
}
/** Spherical interpolation on a unit sphere. Each point is [longitude, latitude]. */
export function greatCircle(a: Airport, b: Airport, steps = 64): number[][] {
  const radians = Math.PI / 180;
  const vector = (p: Airport) => [
    Math.cos(p.lat * radians) * Math.cos(p.lon * radians),
    Math.cos(p.lat * radians) * Math.sin(p.lon * radians),
    Math.sin(p.lat * radians),
  ];
  const u = vector(a),
    v = vector(b);
  const omega = Math.acos(
    Math.max(
      -1,
      Math.min(
        1,
        u.reduce((s, x, i) => s + x * v[i], 0),
      ),
    ),
  );
  return Array.from({ length: steps + 1 }, (_, i) => {
    const t = i / steps;
    if (omega < 1e-8) return [a.lon, a.lat];
    const sin = Math.sin(omega);
    const p = u.map(
      (x, j) =>
        (Math.sin((1 - t) * omega) / sin) * x +
        (Math.sin(t * omega) / sin) * v[j],
    );
    return [
      Math.atan2(p[1], p[0]) / radians,
      Math.atan2(p[2], Math.hypot(p[0], p[1])) / radians,
    ];
  });
}
