import type { ExperimentPlan, AppState } from "./types";

export type PlanSectionKey = keyof ExperimentPlan;

export const PLAN_SECTIONS: { key: PlanSectionKey; label: string }[] = [
  { key: "protocol", label: "Protocol" },
  { key: "materials", label: "Materials" },
  { key: "budget", label: "Budget" },
  { key: "timeline", label: "Timeline" },
  { key: "validation", label: "Validation" },
];

export function sectionChanged(
  original: ExperimentPlan,
  improved: ExperimentPlan,
  key: PlanSectionKey,
): boolean {
  const a = original[key];
  const b = improved[key];
  if (!a && !b) return false;
  if (!a || !b) return true;
  try {
    return JSON.stringify(a) !== JSON.stringify(b);
  } catch {
    return true;
  }
}

export function changedSections(
  original: ExperimentPlan,
  improved: ExperimentPlan,
): PlanSectionKey[] {
  return PLAN_SECTIONS.filter((s) => sectionChanged(original, improved, s.key)).map(
    (s) => s.key,
  );
}

function preview(value: unknown): string {
  if (value == null) return "(empty)";
  if (typeof value === "string") return value;
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

export function buildChangeLog(state: AppState): string {
  const original = state.experiment_plan;
  const improved = state.review.regenerated_plan ?? {};
  const changed = changedSections(original, improved);
  const corrections = state.review.corrections;
  const lines: string[] = [];
  lines.push("LabMind — Plan Revision Log");
  lines.push(`Generated: ${new Date().toISOString()}`);
  lines.push(`Experiment: ${state.experiment_type}`);
  lines.push(`Sections changed: ${changed.length}`);
  lines.push(`Corrections applied: ${corrections.length}`);
  lines.push("");
  lines.push("---");
  for (const key of changed) {
    const label = PLAN_SECTIONS.find((s) => s.key === key)?.label ?? key;
    const correction = corrections.find((c) => c.section === key);
    lines.push("");
    lines.push(`SECTION: ${label}`);
    if (correction) {
      const tags = correction.issue_tags.join(", ") || "n/a";
      lines.push(`ISSUE: ${tags} (Scientist manual)`);
      if (correction.notes) lines.push(`NOTES: ${correction.notes}`);
    } else {
      lines.push(`ISSUE: (refined automatically)`);
    }
    lines.push("ORIGINAL:");
    lines.push(preview(original[key]));
    lines.push("IMPROVED:");
    lines.push(preview(improved[key]));
  }
  return lines.join("\n");
}

export function downloadChangeLog(state: AppState) {
  const text = buildChangeLog(state);
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const date = new Date().toISOString().slice(0, 10);
  a.href = url;
  a.download = `labmind_revision_log_${date}.txt`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}