/**
 * Pass 10 — Part A: Self-learning memory bank
 *
 * Persistent localStorage store of prior reviewed plans, corrections, and
 * derived patterns. Used to inject "prior learned context" into generation
 * prompts so subsequent plans for similar experiments are visibly better.
 *
 * Storage key: "labmind_memory_bank"
 */
import type {
  AppState,
  Correction,
  DevilsAdvocateReview,
  ExperimentPlan,
  ParsedHypothesis,
  NoveltySignal,
} from "./types";

export type MemoryPlanRecord = {
  id: string;
  created_at: string;
  experiment_type: string;
  hypothesis_text: string;
  parsed_hypothesis: ParsedHypothesis;
  novelty_signal?: NoveltySignal;
  final_plan: ExperimentPlan;
  devils_advocate?: DevilsAdvocateReview;
  scientist_review?: { corrections: Correction[] };
  revision_count: number;
  accepted: boolean;
  quality_score: number;
  domain_tags: string[];
};

export type MemoryCorrectionRecord = {
  id: string;
  source_plan_id: string;
  section: Correction["section"];
  issue_type: string;
  notes: string;
  source: "scientist_manual" | "devil_advocate_auto";
  experiment_type: string;
  domain_tags: string[];
  score: number;
  created_at: string;
};

export type MemoryPatternRecord = {
  id: string;
  experiment_type: string;
  domain_tags: string[];
  pattern_type:
    | "protocol_detail"
    | "control_design"
    | "supplier_specificity"
    | "budget_realism"
    | "validation_strength";
  lesson: string;
  evidence_count: number;
  confidence: "high" | "medium" | "low";
  created_at: string;
};

export type MemoryBank = {
  plans: MemoryPlanRecord[];
  corrections: MemoryCorrectionRecord[];
  patterns: MemoryPatternRecord[];
};

export type MemoryContext = {
  similar_plans: MemoryPlanRecord[];
  relevant_corrections: MemoryCorrectionRecord[];
  learned_patterns: MemoryPatternRecord[];
};

const KEY = "labmind_memory_bank";
const MAX_PLANS = 100;
const MAX_CORRECTIONS = 300;
const MAX_PATTERNS = 60;

function emptyBank(): MemoryBank {
  return { plans: [], corrections: [], patterns: [] };
}

function isBrowser() {
  return typeof window !== "undefined" && typeof localStorage !== "undefined";
}

export function loadMemoryBank(): MemoryBank {
  if (!isBrowser()) return emptyBank();
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return emptyBank();
    const parsed = JSON.parse(raw) as { memory_bank?: MemoryBank };
    const bank = parsed?.memory_bank ?? emptyBank();
    return {
      plans: bank.plans ?? [],
      corrections: bank.corrections ?? [],
      patterns: bank.patterns ?? [],
    };
  } catch {
    return emptyBank();
  }
}

export function saveMemoryBank(bank: MemoryBank) {
  if (!isBrowser()) return;
  try {
    const trimmed: MemoryBank = {
      plans: bank.plans.slice(-MAX_PLANS),
      corrections: bank.corrections.slice(-MAX_CORRECTIONS),
      patterns: bank.patterns.slice(-MAX_PATTERNS),
    };
    localStorage.setItem(KEY, JSON.stringify({ memory_bank: trimmed }));
  } catch {
    /* swallow quota errors */
  }
}

export function clearMemoryBank() {
  if (!isBrowser()) return;
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* noop */
  }
}

function uuid(): string {
  if (isBrowser() && "crypto" in window && "randomUUID" in window.crypto) {
    try {
      return window.crypto.randomUUID();
    } catch {
      /* fallthrough */
    }
  }
  return `id_${Math.random().toString(36).slice(2)}_${Date.now()}`;
}

const STOP = new Set([
  "the","a","an","of","and","or","with","to","in","on","for","by","at","is","be","as","from",
  "that","this","these","those","will","would","may","can","than","into","using","using",
  "least","most","more","less","measured","compared","control","controls","cells","cell",
  "experiment","experiments","study","studies","method","methods","assay","assays",
]);

function tokens(text: string): string[] {
  return (text || "")
    .toLowerCase()
    .replace(/[^a-z0-9\-_/.\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOP.has(w));
}

/** Normalise an experiment type string into a canonical lower-snake key. */
export function normaliseExperimentType(t: string): string {
  const v = (t || "").toLowerCase();
  if (v.includes("microbio")) return "microbiology";
  if (v.includes("neuro")) return "neuroscience";
  if (v.includes("diagnost")) return "diagnostics";
  if (v.includes("molecular")) return "molecular_biology";
  if (v.includes("cell")) return "cell_biology";
  if (v.includes("vivo") || v.includes("animal")) return "in_vivo";
  return v.replace(/\s+/g, "_") || "other";
}

export function deriveDomainTags(parsed: ParsedHypothesis): string[] {
  const fields = [
    parsed.intervention,
    parsed.assay_method,
    parsed.model_system,
    parsed.primary_endpoint,
    parsed.mechanism,
    ...(parsed.key_entities ?? []),
  ];
  const all = fields.flatMap((f) => tokens(String(f ?? "")));
  return Array.from(new Set(all)).slice(0, 12);
}

/* -------------------- quality score -------------------- */

export function computeQualityScore(input: {
  plan: ExperimentPlan;
  devils_advocate?: DevilsAdvocateReview;
  validation_strength?: number;
  approved?: boolean;
}): number {
  let s = 0;
  if ((input.validation_strength ?? 0) >= 4) s += 2;
  if ((input.devils_advocate?.overall_confidence ?? 0) >= 4) s += 2;
  if (input.approved) s += 2;
  const mats = input.plan.materials?.materials ?? [];
  if (mats.length > 0) {
    const confirmed = mats.filter((m) => m.confidence === "confirmed").length;
    if (confirmed / mats.length >= 0.5) s += 2;
  }
  const v = input.plan.validation;
  if (v && v.controls?.length && v.success_criteria) s += 2;
  return Math.min(10, s);
}

/* -------------------- saving -------------------- */

export type SavePlanInput = {
  state: AppState;
  finalPlan: ExperimentPlan;
  approved: boolean;
  revision_count: number;
};

export function savePlanToMemory(input: SavePlanInput): MemoryPlanRecord | null {
  if (!isBrowser()) return null;
  const { state, finalPlan, approved, revision_count } = input;
  if (!state.parsed_hypothesis) return null;
  const bank = loadMemoryBank();

  const tags = deriveDomainTags(state.parsed_hypothesis);
  const quality_score = computeQualityScore({
    plan: finalPlan,
    devils_advocate: state.devils_advocate,
    validation_strength: finalPlan.validation?.strength_score,
    approved,
  });

  const record: MemoryPlanRecord = {
    id: uuid(),
    created_at: new Date().toISOString(),
    experiment_type: normaliseExperimentType(state.experiment_type),
    hypothesis_text: state.input_hypothesis,
    parsed_hypothesis: state.parsed_hypothesis,
    novelty_signal: state.literature_qc?.novelty_signal,
    final_plan: finalPlan,
    devils_advocate: state.devils_advocate,
    scientist_review: state.review.corrections.length
      ? { corrections: state.review.corrections }
      : undefined,
    revision_count,
    accepted: approved,
    quality_score,
    domain_tags: tags,
  };
  bank.plans.push(record);

  // Save manual + DA corrections derived from this plan
  const manualSection = state.review.corrections.filter(
    (c) => c.notes.trim() || c.issue_tags.length || c.rating > 0,
  );
  for (const c of manualSection) {
    bank.corrections.push({
      id: uuid(),
      source_plan_id: record.id,
      section: c.section,
      issue_type: c.issue_tags[0] ?? "general",
      notes: c.notes,
      source: "scientist_manual",
      experiment_type: record.experiment_type,
      domain_tags: tags,
      score: c.rating || 3,
      created_at: record.created_at,
    });
  }
  for (const c of state.devils_advocate?.critiques ?? []) {
    bank.corrections.push({
      id: uuid(),
      source_plan_id: record.id,
      section: c.section.toLowerCase() as Correction["section"],
      issue_type: c.issue_type,
      notes: `${c.critique} → ${c.suggestion}`,
      source: "devil_advocate_auto",
      experiment_type: record.experiment_type,
      domain_tags: tags,
      score: state.devils_advocate?.overall_confidence ?? 3,
      created_at: record.created_at,
    });
  }

  // Re-derive patterns from accumulated corrections
  bank.patterns = derivePatterns(bank);
  saveMemoryBank(bank);
  return record;
}

/** Derive lightweight "lessons" by clustering recurring correction issue_types. */
function derivePatterns(bank: MemoryBank): MemoryPatternRecord[] {
  const buckets = new Map<
    string,
    { count: number; experiment_type: string; section: string; tags: Set<string> }
  >();
  for (const c of bank.corrections) {
    const key = `${c.experiment_type}::${c.section}::${c.issue_type.toLowerCase()}`;
    const cur = buckets.get(key) ?? {
      count: 0,
      experiment_type: c.experiment_type,
      section: c.section,
      tags: new Set<string>(),
    };
    cur.count += 1;
    c.domain_tags.slice(0, 4).forEach((t) => cur.tags.add(t));
    buckets.set(key, cur);
  }
  const patterns: MemoryPatternRecord[] = [];
  for (const [key, b] of buckets) {
    if (b.count < 2) continue;
    const issueType = key.split("::")[2];
    const lesson = lessonFor(b.section as Correction["section"], issueType, b.experiment_type);
    patterns.push({
      id: `pat_${key.replace(/[^a-z0-9]/gi, "_")}`,
      experiment_type: b.experiment_type,
      domain_tags: Array.from(b.tags),
      pattern_type: patternTypeFor(b.section as Correction["section"], issueType),
      lesson,
      evidence_count: b.count,
      confidence: b.count >= 5 ? "high" : b.count >= 3 ? "medium" : "low",
      created_at: new Date().toISOString(),
    });
  }
  // newest / strongest first
  patterns.sort((a, b) => b.evidence_count - a.evidence_count);
  return patterns.slice(0, MAX_PATTERNS);
}

function patternTypeFor(
  section: Correction["section"],
  issue: string,
): MemoryPatternRecord["pattern_type"] {
  if (section === "validation") return "validation_strength";
  if (section === "budget") return "budget_realism";
  if (section === "materials") return "supplier_specificity";
  if (issue.includes("control")) return "control_design";
  return "protocol_detail";
}

function lessonFor(
  section: Correction["section"],
  issue: string,
  experiment_type: string,
): string {
  const sec = section.charAt(0).toUpperCase() + section.slice(1);
  const et = experiment_type.replace(/_/g, " ");
  if (issue === "missing_control" || issue.includes("control"))
    return `In ${et} experiments, ${sec} sections recurringly need explicit control conditions and randomisation details.`;
  if (issue === "unrealistic" || issue === "UNREALISTIC")
    return `In ${et} experiments, reviewers repeatedly flag ${sec} parameters as unrealistic — prefer evidence-anchored ranges over single-point precision.`;
  if (issue === "missing_supplier" || issue === "MISSING")
    return `In ${et} experiments, ${sec} entries benefit from explicit supplier names and catalog numbers tied to retrieved evidence.`;
  if (issue === "weak_validation")
    return `In ${et} experiments, validation strengthens noticeably when each endpoint pairs an assay with a positive and a negative control.`;
  if (issue === "budget_issue")
    return `In ${et} budgets, line items are often underestimated for consumables and operations — include a contingency.`;
  return `In ${et} ${section} sections, prior reviewers flagged "${issue}" multiple times — address it explicitly.`;
}

/* -------------------- retrieval -------------------- */

function overlapScore(a: string[], b: string[]): number {
  if (!a.length || !b.length) return 0;
  const setB = new Set(b);
  let n = 0;
  for (const t of a) if (setB.has(t)) n += 1;
  return n;
}

export function getRelevantMemory(parsed: ParsedHypothesis, experiment_type: string): MemoryContext {
  const bank = loadMemoryBank();
  const targetType = normaliseExperimentType(experiment_type);
  const tags = deriveDomainTags(parsed);

  const rankedPlans = bank.plans
    .filter((p) => p.quality_score >= 6)
    .map((p) => ({
      p,
      score:
        (p.experiment_type === targetType ? 3 : 0) +
        overlapScore(tags, p.domain_tags) +
        (p.parsed_hypothesis.assay_method === parsed.assay_method ? 2 : 0) +
        (p.parsed_hypothesis.model_system === parsed.model_system ? 2 : 0),
    }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map((x) => x.p);

  const rankedCorrections = bank.corrections
    .map((c) => ({
      c,
      score:
        (c.experiment_type === targetType ? 2 : 0) + overlapScore(tags, c.domain_tags),
    }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
    .map((x) => x.c);

  const rankedPatterns = bank.patterns
    .map((pt) => ({
      pt,
      score:
        (pt.experiment_type === targetType ? 2 : 0) +
        overlapScore(tags, pt.domain_tags) +
        (pt.confidence === "high" ? 2 : pt.confidence === "medium" ? 1 : 0),
    }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map((x) => x.pt);

  return {
    similar_plans: rankedPlans,
    relevant_corrections: rankedCorrections,
    learned_patterns: rankedPatterns,
  };
}

/** Compact, prompt-safe summary string for memory injection in AI prompts. */
export function memoryToPromptBlock(mem: MemoryContext): string {
  if (
    !mem.similar_plans.length &&
    !mem.relevant_corrections.length &&
    !mem.learned_patterns.length
  )
    return "";
  const parts: string[] = ["\n\nPRIOR LEARNED CONTEXT (use as guidance, do not copy verbatim):"];
  if (mem.similar_plans.length) {
    parts.push("\nPrior successful plans for similar experiments:");
    mem.similar_plans.forEach((p, i) => {
      const v = p.final_plan.validation;
      const proto = p.final_plan.protocol?.protocol_steps?.length ?? 0;
      parts.push(
        `  [${i + 1}] (q=${p.quality_score}/10) ${p.parsed_hypothesis.intervention} → ${p.parsed_hypothesis.primary_endpoint} in ${p.parsed_hypothesis.model_system}; ${proto} protocol steps; controls: ${(v?.controls ?? []).slice(0, 2).join("; ") || "—"}`,
      );
    });
  }
  if (mem.relevant_corrections.length) {
    parts.push("\nPreviously applied corrections for similar experiments:");
    mem.relevant_corrections.forEach((c, i) => {
      parts.push(
        `  [${i + 1}] ${c.section} · ${c.issue_type}: ${c.notes.slice(0, 200)}`,
      );
    });
  }
  if (mem.learned_patterns.length) {
    parts.push("\nLearned patterns from reviewed plans:");
    mem.learned_patterns.forEach((p, i) => {
      parts.push(`  [${i + 1}] (${p.confidence}) ${p.lesson}`);
    });
  }
  return parts.join("\n");
}

export function memoryStats() {
  const b = loadMemoryBank();
  return {
    plans: b.plans.length,
    corrections: b.corrections.length,
    patterns: b.patterns.length,
  };
}

export function exportMemoryJson(): string {
  return JSON.stringify({ memory_bank: loadMemoryBank() }, null, 2);
}