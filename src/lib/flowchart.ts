import type { Protocol, Validation } from "@/lib/types";

function sanitize(text: string): string {
  return (text || "")
    .replace(/["`]/g, "")
    .replace(/[\n\r]+/g, " ")
    .replace(/\s+/g, " ")
    .replace(/[\[\]{}|]/g, "")
    .trim()
    .slice(0, 60);
}

/** Shorten a step title to 3–6 words for compact node labels. */
function shortLabel(text: string): string {
  const cleaned = sanitize(text).replace(/^\s*\d+(?:\.\d+)?[.\)\-:]?\s+/, "");
  const words = cleaned.split(/\s+/).filter(Boolean);
  const max = 6;
  return (words.length > max ? words.slice(0, max).join(" ") + "…" : words.join(" ")) || "Step";
}

function nodeId(i: number): string {
  let n = i;
  let s = "";
  do {
    s = String.fromCharCode(65 + (n % 26)) + s;
    n = Math.floor(n / 26) - 1;
  } while (n >= 0);
  return "N" + s;
}

type StepCategory =
  | "prep"
  | "model"
  | "treatment"
  | "incubation"
  | "measurement"
  | "analysis"
  | "validation"
  | "interpretation"
  | "other";

const PHASE_ORDER: StepCategory[] = [
  "prep",
  "model",
  "treatment",
  "incubation",
  "measurement",
  "analysis",
  "validation",
  "interpretation",
  "other",
];

function categorize(text: string): StepCategory {
  const t = (text || "").toLowerCase();
  if (/(repeat|retry|fail|troubleshoot)/.test(t)) return "other";
  if (/(interpret|report|conclude|summari[sz]e|publish)/.test(t)) return "interpretation";
  if (/(validat|verif|qc\b|quality control|confirm)/.test(t)) return "validation";
  if (/(analy[sz]|statistic|quantif|normali[sz]|compute|calculat)/.test(t)) return "analysis";
  if (/(measur|read\s*out|readout|imag|assay|detect|record|scan|elisa|mtt|western|qpcr|\bpcr\b|sequenc|cytomet)/.test(t)) return "measurement";
  if (/(incubat|cultur|grow|wait|recover|rest)/.test(t)) return "incubation";
  if (/(treat|administ|dose|apply|inject|transfect|stimul|induce|expos)/.test(t)) return "treatment";
  if (/(seed|plate|harvest|isolate|lyse|fix|stain|wash|extract|prepare\s+(cells|tissue|sample)|cell\s+prep|sample\s+prep|model)/.test(t)) return "model";
  if (/(prepar|reagent|buffer|stock|aliquot|setup|set up|equip|materi)/.test(t)) return "prep";
  return "other";
}

/** Sort step indices by phase order, preserving relative order within a phase. */
function orderedStepIndices(categories: StepCategory[]): number[] {
  const rank = (c: StepCategory) => PHASE_ORDER.indexOf(c);
  return categories
    .map((c, i) => ({ i, r: rank(c) }))
    .sort((a, b) => a.r - b.r || a.i - b.i)
    .map((x) => x.i);
}

/**
 * Build a Mermaid flowchart definition from the actual protocol steps.
 * Pass 12 rules:
 *  - Represent every major step (cap 15); merge adjacent prep/model substeps if exceeded
 *  - Reorder by scientific phase (prep → model → treatment → incubation → measurement
 *    → analysis → validation → interpretation), preserving in-phase order
 *  - QC decision diamond only if checkpoint/control language is present
 *  - Loop-back occurs BEFORE End; End is the single terminal node
 *  - End has zero outgoing edges
 */
export function generateMermaidFlowchart(
  protocol: Protocol | undefined,
  validation: Validation | undefined,
): string {
  const steps = protocol?.protocol_steps ?? [];
  if (!steps.length) {
    return "flowchart TD\n  N0([Start]) --> NE([End])";
  }

  const categories: StepCategory[] = steps.map((s) =>
    categorize(`${s.title ?? ""} ${s.objective ?? ""}`),
  );

  let order = orderedStepIndices(categories);

  const MAX_NODES = 15;
  if (order.length > MAX_NODES) {
    // Merge consecutive same-category prep/model substeps
    const merged: number[] = [];
    let lastCat: StepCategory | null = null;
    for (const i of order) {
      const c = categories[i];
      const isMergeable = (c === "prep" || c === "model") && c === lastCat;
      if (isMergeable && merged.length >= MAX_NODES - 2) continue;
      merged.push(i);
      lastCat = c;
    }
    order = merged.slice(0, MAX_NODES);
  }

  const interior = order.map((srcIdx, i) => ({
    id: nodeId(i + 1),
    label: shortLabel(steps[srcIdx].title || `Step ${steps[srcIdx].step_number}`),
    cat: categories[srcIdx],
  }));

  const lines: string[] = ["flowchart TD"];
  const startId = "N0";
  lines.push(`  ${startId}([Start])`);

  let prev = startId;
  for (const node of interior) {
    lines.push(`  ${node.id}["${node.label}"]`);
    lines.push(`  ${prev} --> ${node.id}`);
    prev = node.id;
  }

  const hasControls = (validation?.controls?.length ?? 0) > 0;
  const hasCheckpointLang =
    hasControls ||
    interior.some((n) => n.cat === "validation") ||
    (protocol?.protocol_steps ?? []).some((s) =>
      /(checkpoint|qc|quality control|repeat|retry|fail)/i.test(
        `${s.checkpoint ?? ""} ${s.failure_mode ?? ""} ${s.troubleshooting ?? ""}`,
      ),
    );
  const measurementNode = [...interior].reverse().find(
    (n) => n.cat === "measurement" || n.cat === "incubation",
  );

  const endId = "NE";

  if (hasCheckpointLang && measurementNode) {
    const decisionId = "NQ";
    const decisionLabel = hasControls ? "QC and controls acceptable?" : "QC checkpoint passed?";
    lines.push(`  ${decisionId}{${decisionLabel}}`);
    lines.push(`  ${prev} --> ${decisionId}`);

    const interpretId = "NI";
    const interpretLabel = validation?.primary_endpoint
      ? shortLabel(`Interpret ${validation.primary_endpoint}`)
      : "Interpret results";
    lines.push(`  ${interpretId}["${interpretLabel}"]`);
    lines.push(`  ${decisionId} -->|Yes| ${interpretId}`);

    const repeatId = "NR";
    lines.push(`  ${repeatId}[Repeat assay]`);
    lines.push(`  ${decisionId} -->|No| ${repeatId}`);
    lines.push(`  ${repeatId} --> ${measurementNode.id}`);

    lines.push(`  ${endId}([End])`);
    lines.push(`  ${interpretId} --> ${endId}`);
  } else {
    lines.push(`  ${endId}([End])`);
    lines.push(`  ${prev} --> ${endId}`);
  }

  return lines.join("\n");
}

export function downloadFlowchartSVG(svgEl: SVGElement | null): void {
  if (!svgEl) throw new Error("No flowchart available");
  const clone = svgEl.cloneNode(true) as SVGElement;
  if (!clone.getAttribute("xmlns")) {
    clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  }
  const xml = new XMLSerializer().serializeToString(clone);
  const svg = xml.startsWith("<?xml") ? xml : `<?xml version="1.0" encoding="UTF-8"?>\n${xml}`;
  const blob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  const date = new Date().toISOString().slice(0, 10);
  a.download = `labmind_flowchart_${date}.svg`;
  a.click();
  URL.revokeObjectURL(url);
}
