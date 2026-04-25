import { jsPDF } from "jspdf";
import type { AppState } from "./types";

export function exportPlanPdf(state: AppState) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const margin = 48;
  const width = doc.internal.pageSize.getWidth() - margin * 2;
  let y = margin;

  const ensure = (h: number) => {
    if (y + h > doc.internal.pageSize.getHeight() - margin) {
      doc.addPage();
      y = margin;
    }
  };

  const h1 = (t: string) => {
    ensure(28);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.text(t, margin, y);
    y += 24;
  };
  const h2 = (t: string) => {
    ensure(22);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.text(t, margin, y);
    y += 18;
  };
  const p = (t: string) => {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    const lines = doc.splitTextToSize(t, width);
    for (const line of lines) {
      ensure(14);
      doc.text(line, margin, y);
      y += 13;
    }
    y += 4;
  };

  h1("AI Scientist — Experiment Plan");
  p(state.input_hypothesis);
  if (state.parsed_hypothesis) {
    h2("Parsed hypothesis");
    Object.entries(state.parsed_hypothesis).forEach(([k, v]) =>
      p(`${k}: ${v}`),
    );
  }

  const plan = state.experiment_plan;
  if (plan.protocol) {
    h2("Protocol");
    plan.protocol.protocol_steps.forEach((s) =>
      p(`${s.step}. ${s.title} — ${s.description}`),
    );
  }
  if (plan.materials) {
    h2("Materials");
    plan.materials.materials.forEach((m) =>
      p(`${m.item_name} | ${m.supplier} | ${m.catalog_number} | qty ${m.quantity_estimate} | ${m.confidence}`),
    );
  }
  if (plan.budget) {
    h2("Budget");
    plan.budget.budget_lines.forEach((b) =>
      p(`[${b.category}] ${b.item} — ${b.quantity} × ${b.unit_cost} = ${b.total}`),
    );
    p(`Total: ${plan.budget.total_estimated_cost}`);
  }
  if (plan.timeline) {
    h2("Timeline");
    plan.timeline.phases.forEach((ph) =>
      p(`${ph.phase}: ${ph.duration} (${ph.dependencies}) — ${ph.notes}`),
    );
    p(`Total duration: ${plan.timeline.total_duration}`);
  }
  if (plan.validation) {
    h2("Validation");
    p(`Primary endpoint: ${plan.validation.primary_endpoint}`);
    p(`Controls: ${plan.validation.controls.join(", ")}`);
    p(`Success: ${plan.validation.success_criteria}`);
    p(`Failure: ${plan.validation.failure_criteria}`);
  }

  doc.save("experiment-plan.pdf");
}