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

function nodeId(i: number): string {
  // Excel-style A, B, ... Z, AA, AB ...
  let n = i;
  let s = "";
  do {
    s = String.fromCharCode(65 + (n % 26)) + s;
    n = Math.floor(n / 26) - 1;
  } while (n >= 0);
  return "N" + s;
}

/**
 * Build a Mermaid flowchart definition from protocol steps + validation plan.
 * - Caps interior nodes at ~10 to keep diagram readable (Start + interior + decision + end)
 * - Adds a QC-checkpoint decision diamond before validation
 * - Adds a "Repeat failed step" loop-back arrow
 */
export function generateMermaidFlowchart(
  protocol: Protocol | undefined,
  validation: Validation | undefined,
): string {
  const steps = protocol?.protocol_steps ?? [];
  const maxInterior = 9;
  let interior: { id: string; label: string }[] = [];

  if (steps.length <= maxInterior) {
    interior = steps.map((s, i) => ({
      id: nodeId(i + 1),
      label: sanitize(`${s.step_number}. ${s.title}`),
    }));
  } else {
    // Merge by even sampling — keep first, last, and evenly spaced middle steps
    const indices = new Set<number>([0, steps.length - 1]);
    const slots = maxInterior - 2;
    for (let k = 1; k <= slots; k++) {
      const idx = Math.round((k * (steps.length - 1)) / (slots + 1));
      indices.add(idx);
    }
    const sorted = Array.from(indices).sort((a, b) => a - b);
    interior = sorted.map((idx, i) => ({
      id: nodeId(i + 1),
      label: sanitize(`${steps[idx].step_number}. ${steps[idx].title}`),
    }));
  }

  const lines: string[] = ["flowchart TD"];
  const startId = "N0";
  lines.push(`  ${startId}([Start])`);

  let prev = startId;
  for (const node of interior) {
    lines.push(`  ${node.id}["${node.label}"]`);
    lines.push(`  ${prev} --> ${node.id}`);
    prev = node.id;
  }

  // QC decision diamond
  const hasControls = (validation?.controls?.length ?? 0) > 0;
  const decisionLabel = hasControls ? "Controls acceptable?" : "QC checkpoint passed?";
  const decisionId = "NQ";
  lines.push(`  ${decisionId}{${decisionLabel}}`);
  lines.push(`  ${prev} --> ${decisionId}`);

  // Validation / end
  const validationLabel = sanitize(
    validation?.primary_endpoint
      ? `Validate: ${validation.primary_endpoint}`
      : "Validation and report",
  );
  const validationId = "NV";
  const endId = "NE";
  lines.push(`  ${validationId}["${validationLabel}"]`);
  lines.push(`  ${endId}([End])`);
  lines.push(`  ${decisionId} -->|Yes| ${validationId}`);

  // Loop-back: repeat failed step (back to last interior node)
  const loopTarget = interior.length > 0 ? interior[interior.length - 1].id : startId;
  const repeatId = "NR";
  lines.push(`  ${repeatId}[Repeat failed step]`);
  lines.push(`  ${decisionId} -->|No| ${repeatId}`);
  lines.push(`  ${repeatId} --> ${loopTarget}`);
  lines.push(`  ${validationId} --> ${endId}`);

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