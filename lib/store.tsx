"use client";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { createSeed } from "./demo";
import { isDemoState } from "./planning";
import type { DemoState } from "./types";
import { normalizeJourneyState } from "./journey-state";
import { normalizeVisaState } from "./visa-workflow";
type Store = {
  state: DemoState;
  update: (fn: (s: DemoState) => DemoState) => void;
  toast: (s: string) => void;
  selectJourney: (id: string) => void;
  ready: boolean;
};
const Context = createContext<Store | null>(null);
export function DemoProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<DemoState>(() =>
    normalizeVisaState(createSeed()),
  );
  const [ready, setReady] = useState(false);
  const [message, setMessage] = useState("");
  const [storageCompatible, setStorageCompatible] = useState(true);
  useEffect(() => {
    let active = true;
    queueMicrotask(() => {
      if (!active) return;
      try {
        const raw = localStorage.getItem("meridian-demo-v1");
        if (raw) {
          const parsed: unknown = JSON.parse(raw);
          if (isDemoState(parsed)) {
            // Keep an untouched recovery copy before introducing normalized links.
            if (
              !parsed.visaSchemaVersion &&
              !localStorage.getItem("meridian-before-visa-v1")
            ) {
              try {
                localStorage.setItem("meridian-before-visa-v1", raw);
              } catch {
                setMessage(
                  "Saved workspace restored. Storage is full; a migration backup could not be saved.",
                );
              }
            }
            setState(normalizeVisaState(normalizeJourneyState(parsed)));
          } else {
            setStorageCompatible(false);
            setMessage(
              "Saved workspace could not be read. Its storage is preserved; this preview will not overwrite it.",
            );
          }
        }
      } catch {
        setStorageCompatible(false);
        setMessage(
          "Saved workspace could not be read. Existing storage is preserved; changes will last for this session.",
        );
      }
      setReady(true);
    });
    return () => {
      active = false;
    };
  }, []);
  useEffect(() => {
    if (ready && storageCompatible) {
      try {
        localStorage.setItem("meridian-demo-v1", JSON.stringify(state));
      } catch {
        /* Session state remains usable without storage. */
      }
    }
  }, [state, ready, storageCompatible]);
  useEffect(() => {
    document.documentElement.dataset.theme = state.theme;
  }, [state.theme]);
  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => setMessage(""), 4200);
      return () => clearTimeout(timer);
    }
  }, [message]);
  const update = (fn: (s: DemoState) => DemoState) =>
    setState((current) =>
      normalizeVisaState(normalizeJourneyState(fn(current))),
    );
  const selectJourney = (id: string) =>
    setState((s) => {
      const journey = s.journeys.find((j) => j.id === id && !j.archived);
      return journey
        ? {
            ...s,
            activeJourneyId: id,
            activeTravelerId: journey.travelers[0] ?? s.activeTravelerId,
          }
        : normalizeJourneyState(s);
    });
  return (
    <Context.Provider
      value={{ state, update, toast: setMessage, selectJourney, ready }}
    >
      {children}
      {message && (
        <div className="toast" role="status">
          {message}
        </div>
      )}
    </Context.Provider>
  );
}
export function useDemo() {
  const store = useContext(Context);
  if (!store) throw new Error("DemoProvider is required");
  return store;
}
