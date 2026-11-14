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
type Store = {
  state: DemoState;
  update: (fn: (s: DemoState) => DemoState) => void;
  toast: (s: string) => void;
  selectJourney: (id: string) => void;
  ready: boolean;
};
const Context = createContext<Store | null>(null);
export function DemoProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<DemoState>(createSeed);
  const [ready, setReady] = useState(false);
  const [message, setMessage] = useState("");
  useEffect(() => {
    let active = true;
    queueMicrotask(() => {
      if (!active) return;
      try {
        const raw = localStorage.getItem("meridian-demo-v1");
        if (raw) {
          const parsed: unknown = JSON.parse(raw);
          if (isDemoState(parsed)) setState(normalizeJourneyState(parsed));
          else
            setMessage(
              "Saved workspace was incompatible. A fresh preview is ready.",
            );
        }
      } catch {
        setMessage(
          "Browser storage is unavailable. Changes will last for this session.",
        );
      }
      setReady(true);
    });
    return () => {
      active = false;
    };
  }, []);
  useEffect(() => {
    if (ready) {
      try {
        localStorage.setItem("meridian-demo-v1", JSON.stringify(state));
      } catch {
        /* Session state remains usable without storage. */
      }
    }
  }, [state, ready]);
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
    setState((current) => normalizeJourneyState(fn(current)));
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
