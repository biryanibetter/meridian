export type DocumentRetrievalResult = {
  status: "not-connected";
  records: never[];
  message: string;
};

/** Extension contract only: a connected implementation requires authorized credentials and explicit consent. */
export interface DocumentProviderAdapter {
  id: string;
  jurisdiction: string;
  connected: false;
  retrieveMetadata: () => Promise<DocumentRetrievalResult>;
}

export const documentProviders: DocumentProviderAdapter[] = [{
  id: "india-digilocker",
  jurisdiction: "India",
  connected: false,
  async retrieveMetadata() {
    return { status: "not-connected", records: [], message: "Authorized access and explicit consent are required." };
  },
}];
