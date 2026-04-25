import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type {
  AppState,
  ParsedHypothesis,
  SearchResult,
  LiteratureQC,
  ExperimentPlan,
  Correction,
  RetrievalResults,
} from "./types";

const SAMPLE =
  "Replacing sucrose with trehalose as a cryoprotectant in the freezing medium will increase post-thaw viability of HeLa cells by at least 15 percentage points compared to the standard DMSO protocol, due to trehalose's superior membrane stabilization at low temperatures.";

type StoreState = AppState & {
  set: <K extends keyof AppState>(key: K, value: AppState[K]) => void;
  setPlanPart: <K extends keyof ExperimentPlan>(key: K, value: ExperimentPlan[K]) => void;
  setRegeneratedPart: <K extends keyof ExperimentPlan>(key: K, value: ExperimentPlan[K]) => void;
  addCorrection: (c: Correction) => void;
  reset: () => void;
};

const emptyRetrieval: RetrievalResults = {
  protocolSources: [],
  literatureSources: [],
  supplierSources: [],
  plasmidSources: [],
  validationSources: [],
};

const initial: AppState = {
  input_hypothesis: SAMPLE,
  experiment_type: "Cell Biology",
  retrieval_results: emptyRetrieval,
  experiment_plan: {},
  review: { corrections: [] },
};

const isBrowser = typeof window !== "undefined";

export const useApp = create<StoreState>()(
  persist(
    (set) => ({
      ...initial,
      set: (key, value) => set({ [key]: value } as Partial<StoreState>),
      setPlanPart: (key, value) =>
        set((s) => ({ experiment_plan: { ...s.experiment_plan, [key]: value } })),
      setRegeneratedPart: (key, value) =>
        set((s) => ({
          review: {
            ...s.review,
            regenerated_plan: { ...(s.review.regenerated_plan ?? {}), [key]: value },
          },
        })),
      addCorrection: (c) =>
        set((s) => ({
          review: {
            ...s.review,
            corrections: [...s.review.corrections.filter((x) => x.section !== c.section), c],
          },
        })),
      reset: () => set({ ...initial }),
    }),
    {
      name: "ai-scientist-state-v2",
      storage: createJSONStorage(() =>
        isBrowser ? sessionStorage : { getItem: () => null, setItem: () => {}, removeItem: () => {} },
      ),
    },
  ),
);

export type { ParsedHypothesis, SearchResult, LiteratureQC, ExperimentPlan, Correction, RetrievalResults };