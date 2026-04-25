export type ParsedHypothesis = {
  intervention: string;
  model_system: string;
  primary_endpoint: string;
  threshold: string;
  mechanism: string;
  control_condition: string;
  duration: string;
  assay_method: string;
  key_entities?: string[];
  search_queries?: string[];
};

export type SearchResult = {
  title: string;
  url: string;
  content: string;
  source?: SourceTag;
  meta?: {
    authors?: string;
    year?: string | number;
    citations?: number;
    doi?: string;
    pmid?: string;
    addgene_id?: string | number;
    steps_count?: number;
  };
};

export type SourceTag =
  | "protocols.io"
  | "PubMed"
  | "Semantic Scholar"
  | "Addgene"
  | "Protocol Repository"
  | "Supplier"
  | "Validation Reference"
  | "Other";

export type RetrievalResults = {
  protocolSources: SearchResult[];
  literatureSources: SearchResult[];
  supplierSources: SearchResult[];
  plasmidSources: SearchResult[];
  validationSources: SearchResult[];
};

export type Reference = {
  title: string;
  source: string;
  url: string;
  relevance: string;
};

export type NoveltySignal = "not_found" | "similar_work_exists" | "exact_match_found";

export type LiteratureQC = {
  novelty_signal: NoveltySignal;
  references: Reference[];
};

export type ProtocolStep = {
  step: number;
  title: string;
  description: string;
  critical_parameters?: string;
};

export type Protocol = {
  protocol_steps: ProtocolStep[];
  assumptions: string[];
  risk_points: string[];
  source_links: string[];
};

export type Material = {
  item_name: string;
  supplier: string;
  catalog_number: string;
  purpose: string;
  quantity_estimate: string;
  confidence: "confirmed" | "estimated" | "inferred";
};

export type Materials = { materials: Material[] };

export type BudgetLine = {
  category: string;
  item: string;
  quantity: string;
  unit_cost: string;
  total: string;
  notes?: string;
};

export type Budget = {
  budget_lines: BudgetLine[];
  subtotal_materials: string;
  subtotal_operations: string;
  total_estimated_cost: string;
  cost_driver_note: string;
};

export type Phase = {
  phase: string;
  duration: string;
  dependencies: string;
  notes: string;
};

export type Timeline = {
  phases: Phase[];
  total_duration: string;
  key_dependencies: string[];
  bottlenecks: string[];
};

export type Validation = {
  primary_endpoint: string;
  secondary_endpoints: string[];
  controls: string[];
  readouts: string[];
  success_criteria: string;
  failure_criteria: string;
};

export type ExperimentPlan = {
  protocol?: Protocol;
  materials?: Materials;
  budget?: Budget;
  timeline?: Timeline;
  validation?: Validation;
};

export type Correction = {
  section: "protocol" | "materials" | "budget" | "timeline" | "validation";
  rating: number;
  issue_tags: string[];
  notes: string;
};

export type AppState = {
  input_hypothesis: string;
  experiment_type: string;
  budget_cap?: string;
  preferred_suppliers?: string;
  timeline_target?: string;
  parsed_hypothesis?: ParsedHypothesis;
  retrieval_results: RetrievalResults;
  literature_qc?: LiteratureQC;
  experiment_plan: ExperimentPlan;
  review: {
    corrections: Correction[];
    regenerated_plan?: ExperimentPlan;
  };
};