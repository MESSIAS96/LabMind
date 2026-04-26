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
  step_number: number;
  title: string;
  /** Short objective sentence — one-line summary used in Standard view */
  objective: string;
  /** Step-specific reagents / consumables / equipment */
  materials: string[];
  /** Numbered actions in order */
  actions: string[];
  /** Critical parameter dictionary (any subset present) */
  parameters?: {
    concentration?: string;
    volume?: string;
    temperature?: string;
    duration?: string;
    other_conditions?: string;
  };
  /** Expected observation / QC checkpoint */
  checkpoint?: string;
  /** Most likely failure mode */
  failure_mode?: string;
  /** Troubleshooting note */
  troubleshooting?: string;
  /** Safety / handling note */
  safety?: string;
  /** Evidence-grounding confidence */
  confidence?: "high" | "medium" | "low";
  /** Optional source links from retrieved evidence */
  source_links?: string[];
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
  strength_score?: number;
  strength_rationale?: string;
};

export type ExperimentPlan = {
  protocol?: Protocol;
  materials?: Materials;
  budget?: Budget;
  timeline?: Timeline;
  validation?: Validation;
};

export type DevilsAdvocateIssueType =
  | "RISK"
  | "ASSUMPTION"
  | "MISSING"
  | "UNREALISTIC"
  | "ALTERNATIVE";

export type DevilsAdvocateCritique = {
  section: "Protocol" | "Materials" | "Budget" | "Timeline" | "Validation";
  issue_type: DevilsAdvocateIssueType;
  critique: string;
  suggestion: string;
};

export type DevilsAdvocateReview = {
  overall_confidence: number;
  verdict: string;
  critiques: DevilsAdvocateCritique[];
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
  devils_advocate?: DevilsAdvocateReview;
  review: {
    corrections: Correction[];
    regenerated_plan?: ExperimentPlan;
  };
};