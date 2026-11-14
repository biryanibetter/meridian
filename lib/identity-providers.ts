export interface IdentityProvider {
  id: string;
  name: string;
  jurisdiction: string;
  description: string;
  connected: false;
  basis: "jurisdiction";
}

export const identityProviders: IdentityProvider[] = [
  {
    id: "india-aadhaar",
    name: "India — Aadhaar / UIDAI · Not connected",
    jurisdiction: "India",
    description: "Requires authorized access and user consent. Aadhaar is not evidence of citizenship.",
    connected: false,
    basis: "jurisdiction",
  },
  {
    id: "india-digilocker",
    name: "India — DigiLocker · Not connected",
    jurisdiction: "India",
    description: "Future consent-based document retrieval through an authorized adapter.",
    connected: false,
    basis: "jurisdiction",
  },
  {
    id: "qatar",
    name: "Qatar — national identity services · Not connected",
    jurisdiction: "Qatar",
    description: "An approved national identity adapter and authorized access would be required.",
    connected: false,
    basis: "jurisdiction",
  },
];
