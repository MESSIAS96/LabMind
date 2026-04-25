import type { AppState } from "./types";

function line(s = "") {
  return s + "\n";
}

function rule() {
  return line("=".repeat(72));
}

function section(title: string) {
  return line() + rule() + line(title.toUpperCase()) + rule();
}

export function buildPlanText(state: AppState): string {
  let out = "";
  out += line("AI SCIENTIST — EXPERIMENT PLAN");
  out += line(`Generated: ${new Date().toISOString()}`);
  out += line(`Experiment type: ${state.experiment_type}`);

  out += section("Hypothesis");
  out += line(state.input_hypothesis);

  if (state.parsed_hypothesis) {
    out += section("Parsed hypothesis");
    for (const [k, v] of Object.entries(state.parsed_hypothesis)) {
      if (Array.isArray(v)) out += line(`${k}: ${v.join(", ")}`);
      else out += line(`${k}: ${v}`);
    }
  }

  if (state.literature_qc) {
    out += section("Novelty signal");
    out += line(`Signal: ${state.literature_qc.novelty_signal}`);
    state.literature_qc.references.forEach((r, i) => {
      out += line(`  [${i + 1}] ${r.title} — ${r.source}`);
      out += line(`      ${r.url}`);
      out += line(`      Relevance: ${r.relevance}`);
    });
  }

  if (state.devils_advocate) {
    out += section("Devil's Advocate review");
    out += line(`Overall confidence: ${state.devils_advocate.overall_confidence}/5`);
    out += line(`Verdict: ${state.devils_advocate.verdict}`);
    state.devils_advocate.critiques.forEach((c, i) => {
      out += line(`  ${i + 1}. [${c.section} · ${c.issue_type}] ${c.critique}`);
      out += line(`     → ${c.suggestion}`);
    });
  }

  const plan = state.experiment_plan;
  if (plan.protocol) {
    out += section("Protocol");
    plan.protocol.protocol_steps.forEach((s) => {
      out += line(`${s.step}. ${s.title}`);
      out += line(`   ${s.description}`);
      if (s.critical_parameters) out += line(`   Critical: ${s.critical_parameters}`);
    });
    if (plan.protocol.assumptions.length) {
      out += line();
      out += line("Assumptions:");
      plan.protocol.assumptions.forEach((a) => (out += line(`  - ${a}`)));
    }
    if (plan.protocol.risk_points.length) {
      out += line();
      out += line("Risk points:");
      plan.protocol.risk_points.forEach((a) => (out += line(`  - ${a}`)));
    }
  }

  if (plan.materials) {
    out += section("Materials");
    out += line("Item | Supplier | Catalog # | Qty | Confidence | Purpose");
    out += line("-".repeat(72));
    plan.materials.materials.forEach((m) => {
      out += line(
        `${m.item_name} | ${m.supplier} | ${m.catalog_number} | ${m.quantity_estimate} | ${m.confidence} | ${m.purpose}`,
      );
    });
  }

  if (plan.budget) {
    out += section("Budget");
    out += line("Category | Item | Qty | Unit cost | Total");
    out += line("-".repeat(72));
    plan.budget.budget_lines.forEach((b) => {
      out += line(`${b.category} | ${b.item} | ${b.quantity} | ${b.unit_cost} | ${b.total}`);
    });
    out += line();
    out += line(`Materials subtotal: ${plan.budget.subtotal_materials}`);
    out += line(`Operations subtotal: ${plan.budget.subtotal_operations}`);
    out += line(`Total estimated: ${plan.budget.total_estimated_cost}`);
    out += line(`Cost driver: ${plan.budget.cost_driver_note}`);
  }

  if (plan.timeline) {
    out += section("Timeline");
    out += line("Phase | Duration | Dependencies | Notes");
    out += line("-".repeat(72));
    plan.timeline.phases.forEach((p) => {
      out += line(`${p.phase} | ${p.duration} | ${p.dependencies} | ${p.notes}`);
    });
    out += line();
    out += line(`Total duration: ${plan.timeline.total_duration}`);
    if (plan.timeline.bottlenecks.length) {
      out += line(`Bottlenecks: ${plan.timeline.bottlenecks.join("; ")}`);
    }
  }

  if (plan.validation) {
    out += section("Validation");
    out += line(`Primary endpoint: ${plan.validation.primary_endpoint}`);
    if (plan.validation.secondary_endpoints.length)
      out += line(`Secondary endpoints: ${plan.validation.secondary_endpoints.join("; ")}`);
    if (plan.validation.controls.length)
      out += line(`Controls: ${plan.validation.controls.join("; ")}`);
    if (plan.validation.readouts.length)
      out += line(`Readouts: ${plan.validation.readouts.join("; ")}`);
    out += line(`Success criteria: ${plan.validation.success_criteria}`);
    out += line(`Failure criteria: ${plan.validation.failure_criteria}`);
    if (plan.validation.strength_score) {
      out += line(`Validation strength: ${plan.validation.strength_score}/5`);
      if (plan.validation.strength_rationale)
        out += line(`  ${plan.validation.strength_rationale}`);
    }
  }

  out += section("Sources");
  const groups: Array<[string, typeof state.retrieval_results.protocolSources]> = [
    ["Protocol sources", state.retrieval_results.protocolSources],
    ["Literature", state.retrieval_results.literatureSources],
    ["Supplier references", state.retrieval_results.supplierSources],
    ["Plasmid / cell line references", state.retrieval_results.plasmidSources],
    ["Validation references", state.retrieval_results.validationSources],
  ];
  for (const [label, items] of groups) {
    out += line();
    out += line(`${label}:`);
    if (!items.length) {
      out += line("  (none)");
      continue;
    }
    items.forEach((r, i) => {
      out += line(`  [${i + 1}] ${r.title || r.url}`);
      out += line(`      ${r.url}`);
    });
  }

  return out;
}

export function downloadPlanText(state: AppState) {
  const text = buildPlanText(state);
  const date = new Date().toISOString().slice(0, 10);
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `experiment_plan_${date}.txt`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}