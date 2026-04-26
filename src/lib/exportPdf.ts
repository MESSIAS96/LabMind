import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import type { AppState } from "./types";
import { captureElement } from "./exportCanvas";
import { generateMermaidFlowchart } from "./flowchart";
import mermaid from "mermaid";

const TEAL: [number, number, number] = [1, 105, 111];
const TEAL_LIGHT: [number, number, number] = [212, 233, 233];
const TEXT: [number, number, number] = [40, 37, 29];
const MUTED: [number, number, number] = [120, 121, 116];
const GREEN: [number, number, number] = [212, 223, 204];
const AMBER: [number, number, number] = [233, 224, 198];
const RED: [number, number, number] = [224, 206, 215];

const PAGE_W = 210;
const PAGE_H = 297;
const MARGIN = 20;
const CONTENT_W = PAGE_W - MARGIN * 2;
const LINE_HEIGHT = 5; // mm — Pass 11 spacing
const PARAGRAPH_GAP = 2; // mm extra between paragraphs
const SECTION_GAP_AFTER = 6; // mm after a section block
const TABLE_GAP = 6; // mm after a table

/** Pass 11 — strip a leading "1. " / "2) " / "1.1 " enumeration from a step's title text. */
function stripLeadingNumber(text: string): string {
  if (!text) return text;
  return text.replace(/^\s*\d+(?:\.\d+)?[.\)\-:]?\s+/, "");
}

function setHeader(doc: jsPDF, text: string, y: number) {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(...TEAL);
  doc.text(text, MARGIN, y);
  doc.setDrawColor(...TEAL);
  doc.setLineWidth(0.4);
  doc.line(MARGIN, y + 1.5, MARGIN + 40, y + 1.5);
  return y + 10; // Pass 11 — more breathing room after section header
}

function body(doc: jsPDF) {
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(...TEXT);
}

function paragraph(doc: jsPDF, text: string, y: number, maxWidth = CONTENT_W): number {
  body(doc);
  const lines = doc.splitTextToSize(text || "—", maxWidth) as string[];
  doc.text(lines, MARGIN, y);
  return y + lines.length * LINE_HEIGHT + PARAGRAPH_GAP;
}

function ensure(doc: jsPDF, y: number, needed = 30): number {
  if (y + needed > PAGE_H - MARGIN - 10) {
    doc.addPage();
    return MARGIN;
  }
  return y;
}

/**
 * Pass 9 — Part E
 * Link rendering helpers. URLs always live on their own line, indented
 * with "    → ", in 8pt teal, with the full URL preserved as the
 * clickable target. 4mm vertical breathing room before/after.
 */
function truncateUrl(url: string): string {
  return url.length > 60 ? url.slice(0, 57) + "..." : url;
}

function drawUrlLine(doc: jsPDF, url: string, y: number): number {
  if (!url) return y;
  y = ensure(doc, y, 12);
  y += 2; // 2mm space before
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...TEAL);
  doc.textWithLink("    → " + truncateUrl(url), MARGIN, y, { url });
  // restore body defaults
  doc.setFontSize(10);
  doc.setTextColor(...TEXT);
  return y + 4 + 2; // line height + 2mm space after
}

function drawCoverLogo(doc: jsPDF, x: number, y: number) {
  doc.setDrawColor(...TEAL);
  doc.setFillColor(...TEAL);
  doc.setLineWidth(0.6);
  // simple flask
  doc.line(x + 4, y, x + 8, y);
  doc.line(x + 5, y, x + 5, y + 5);
  doc.line(x + 7, y, x + 7, y + 5);
  doc.triangle(x + 5, y + 5, x + 7, y + 5, x + 6, y + 12, "S");
  doc.circle(x + 6, y + 9, 0.6, "F");
}

function addPageNumbers(doc: jsPDF) {
  const total = doc.getNumberOfPages();
  for (let i = 1; i <= total; i++) {
    doc.setPage(i);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...MUTED);
    doc.text(`Page ${i} of ${total}`, PAGE_W - MARGIN, PAGE_H - 10, { align: "right" });
    doc.text("LabMind · Experiment Plan", MARGIN, PAGE_H - 10);
  }
}

function noveltyColor(signal?: string): [number, number, number] {
  if (signal === "not_found") return [180, 220, 195];
  if (signal === "similar_work_exists") return [240, 220, 175];
  if (signal === "exact_match_found") return [230, 195, 200];
  return [220, 220, 220];
}

let _mermaidReady = false;
function ensureMermaidReady() {
  if (_mermaidReady) return;
  try {
    mermaid.initialize({
      startOnLoad: false,
      theme: "neutral",
      securityLevel: "loose",
      flowchart: { useMaxWidth: true, htmlLabels: true },
    });
  } catch {
    /* already initialized */
  }
  _mermaidReady = true;
}

/** Render a Mermaid SVG string to a PNG dataURL via a Canvas. */
async function mermaidSvgToPng(svgMarkup: string): Promise<{ dataUrl: string; width: number; height: number } | null> {
  return new Promise((resolve) => {
    try {
      const blob = new Blob([svgMarkup], { type: "image/svg+xml;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const img = new Image();
      img.onload = () => {
        try {
          // upscale for crisp output
          const scale = 2;
          const w = (img.naturalWidth || 800) * scale;
          const h = (img.naturalHeight || 600) * scale;
          const canvas = document.createElement("canvas");
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext("2d");
          if (!ctx) {
            URL.revokeObjectURL(url);
            resolve(null);
            return;
          }
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(0, 0, w, h);
          ctx.drawImage(img, 0, 0, w, h);
          const dataUrl = canvas.toDataURL("image/png");
          URL.revokeObjectURL(url);
          resolve({ dataUrl, width: w, height: h });
        } catch {
          URL.revokeObjectURL(url);
          resolve(null);
        }
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        resolve(null);
      };
      img.src = url;
    } catch {
      resolve(null);
    }
  });
}

async function addFlowchartPage(doc: jsPDF, state: AppState) {
  const proto = state.experiment_plan.protocol;
  if (!proto || !proto.protocol_steps?.length) return;
  try {
    ensureMermaidReady();
    const def = generateMermaidFlowchart(proto, state.experiment_plan.validation);
    const id = `pdfflow_${Date.now()}`;
    const { svg } = await mermaid.render(id, def);
    const png = await mermaidSvgToPng(svg);
    if (!png) return;

    doc.addPage();
    let y = MARGIN;
    y = setHeader(doc, "Experimental Flowchart", y);
    body(doc);
    doc.setTextColor(...MUTED);
    doc.setFontSize(10);
    doc.text("Visual sequence of the main protocol stages.", MARGIN, y);
    y += 8;
    doc.setTextColor(...TEXT);

    const maxW = Math.min(CONTENT_W, 170);
    const ratio = png.height / png.width;
    let drawW = maxW;
    let drawH = drawW * ratio;
    const availableH = PAGE_H - y - MARGIN - 10;
    if (drawH > availableH) {
      drawH = availableH;
      drawW = drawH / ratio;
    }
    const x = (PAGE_W - drawW) / 2;
    doc.addImage(png.dataUrl, "PNG", x, y, drawW, drawH);
  } catch (e) {
    console.warn("Flowchart PDF embed failed:", e);
  }
}

function confidenceColor(c: string): [number, number, number] {
  if (c === "confirmed") return GREEN;
  if (c === "estimated") return AMBER;
  return RED;
}

export async function exportToPDF(state: AppState) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const today = new Date().toLocaleDateString();
  const hyp = state.input_hypothesis || "";
  const novelty = state.literature_qc?.novelty_signal ?? "—";

  // ── PAGE 1 — Cover ──────────────────────────────────────
  drawCoverLogo(doc, MARGIN, MARGIN);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(28);
  doc.setTextColor(...TEAL);
  doc.text("LabMind", MARGIN + 18, MARGIN + 8);
  doc.setFontSize(11);
  doc.setTextColor(...MUTED);
  doc.text("AI Scientist · Experiment Plan", MARGIN + 18, MARGIN + 14);

  doc.setDrawColor(...TEAL);
  doc.setLineWidth(0.8);
  doc.line(MARGIN, 80, PAGE_W - MARGIN, 80);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(24);
  doc.setTextColor(...TEXT);
  doc.text("Experiment Plan", MARGIN, 100);

  body(doc);
  doc.setFontSize(11);
  const subtitle = hyp.slice(0, 120) + (hyp.length > 120 ? "…" : "");
  const subLines = doc.splitTextToSize(subtitle, CONTENT_W) as string[];
  doc.text(subLines, MARGIN, 112);

  autoTable(doc, {
    startY: 140,
    head: [["Field", "Value"]],
    body: [
      ["Experiment type", state.experiment_type ?? "—"],
      ["Novelty signal", novelty],
      ["Generated", today],
      ["Sources", "protocols.io · PubMed · Semantic Scholar · Addgene"],
    ],
    theme: "grid",
    headStyles: { fillColor: TEAL, textColor: 255, fontStyle: "bold", fontSize: 10 },
    bodyStyles: { fontSize: 10, textColor: TEXT },
    margin: { left: MARGIN, right: MARGIN },
  });

  doc.setFontSize(9);
  doc.setTextColor(...MUTED);
  doc.text(
    "Generated by LabMind · Hack-Nation Global AI Hackathon 2026",
    PAGE_W / 2,
    PAGE_H - 25,
    { align: "center" },
  );

  // ── PAGE 2 — Hypothesis & Literature QC ────────────────
  doc.addPage();
  let y = MARGIN;
  y = setHeader(doc, "Hypothesis", y);
  y = paragraph(doc, hyp, y);
  y += 4;

  if (state.parsed_hypothesis) {
    y = ensure(doc, y, 40);
    y = setHeader(doc, "Parsed Fields", y);
    const rows = Object.entries(state.parsed_hypothesis)
      .filter(([, v]) => typeof v === "string" || typeof v === "number")
      .map(([k, v]) => [k.replace(/_/g, " "), String(v)]);
    autoTable(doc, {
      startY: y,
      head: [["Field", "Value"]],
      body: rows,
      theme: "striped",
      headStyles: { fillColor: TEAL, textColor: 255, fontSize: 9 },
      bodyStyles: { fontSize: 9, textColor: TEXT },
      margin: { left: MARGIN, right: MARGIN },
    });
    y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8;
  }

  if (state.literature_qc) {
    y = ensure(doc, y, 50);
    y = setHeader(doc, "Literature Quality Control", y);
    const c = noveltyColor(state.literature_qc.novelty_signal);
    doc.setFillColor(...c);
    doc.setDrawColor(...c);
    doc.roundedRect(MARGIN, y - 2, 70, 8, 1.5, 1.5, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(...TEXT);
    doc.text(state.literature_qc.novelty_signal.replace(/_/g, " ").toUpperCase(), MARGIN + 3, y + 3.5);
    y += 12;
    body(doc);
    state.literature_qc.references.forEach((r, i) => {
      y = ensure(doc, y, 18);
      doc.setFont("helvetica", "bold");
      doc.text(`${i + 1}. ${r.title}`, MARGIN, y, { maxWidth: CONTENT_W });
      y += 4.5;
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...MUTED);
      doc.text(`${r.source}`, MARGIN, y);
      doc.setTextColor(...TEXT);
      y += 5;
      if (r.url) y = drawUrlLine(doc, r.url, y);
      y += 2;
    });
  }

  // ── PAGE 3 — Protocol ─────────────────────────────────
  if (state.experiment_plan.protocol) {
    doc.addPage();
    y = MARGIN;
    y = setHeader(doc, "Protocol Overview", y);
    body(doc);
    doc.setTextColor(...MUTED);
    doc.setFontSize(9);
    doc.text(
      "High-level summary. For the full bench-ready recipe (materials, actions, parameters, checkpoints, troubleshooting, safety) export the dedicated Detailed Protocol Recipe PDF.",
      MARGIN,
      y,
      { maxWidth: CONTENT_W },
    );
    y += 10;
    doc.setTextColor(...TEXT);
    doc.setFontSize(10);
    const proto = state.experiment_plan.protocol;
    autoTable(doc, {
      startY: y,
      head: [["#", "Title", "Objective", "Key parameters"]],
      body: proto.protocol_steps.map((s) => {
        const params = s.parameters
          ? Object.entries(s.parameters)
              .filter(([, v]) => v)
              .map(([k, v]) => `${k.replace(/_/g, " ")}: ${v}`)
              .join("; ")
          : "";
        return [
          String(s.step_number),
          stripLeadingNumber(s.title),
          stripLeadingNumber(s.objective ?? "—"),
          params || "—",
        ];
      }),
      theme: "grid",
      headStyles: { fillColor: TEAL, textColor: 255, fontSize: 9 },
      bodyStyles: { fontSize: 9, textColor: TEXT, valign: "top" },
      columnStyles: { 0: { cellWidth: 10 }, 1: { cellWidth: 36 }, 3: { cellWidth: 50 } },
      margin: { left: MARGIN, right: MARGIN },
    });
    y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8;

    if (proto.assumptions.length) {
      y = ensure(doc, y, 20);
      y = setHeader(doc, "Assumptions", y);
      proto.assumptions.forEach((a) => {
        y = ensure(doc, y, 8);
        y = paragraph(doc, "• " + a, y);
      });
    }
    if (proto.risk_points.length) {
      y = ensure(doc, y, 20);
      y = setHeader(doc, "Risk points", y);
      proto.risk_points.forEach((a) => {
        y = ensure(doc, y, 8);
        y = paragraph(doc, "• " + a, y);
      });
    }
  }

  // ── PAGE 4 — Materials ────────────────────────────────
  if (state.experiment_plan.materials) {
    doc.addPage();
    y = MARGIN;
    y = setHeader(doc, "Materials & Supply Chain", y);
    autoTable(doc, {
      startY: y,
      head: [["#", "Item", "Supplier", "Catalog #", "Purpose", "Qty", "Confidence"]],
      body: state.experiment_plan.materials.materials.map((m, i) => [
        String(i + 1),
        m.item_name,
        m.supplier,
        m.catalog_number,
        m.purpose,
        m.quantity_estimate,
        m.confidence,
      ]),
      theme: "grid",
      headStyles: { fillColor: TEAL, textColor: 255, fontSize: 9 },
      bodyStyles: { fontSize: 9, textColor: TEXT, valign: "top" },
      margin: { left: MARGIN, right: MARGIN },
      didParseCell: (d) => {
        if (d.section === "body" && d.column.index === 6) {
          const text = String(d.cell.raw ?? "").toLowerCase();
          d.cell.styles.fillColor = confidenceColor(text);
          d.cell.styles.fontStyle = "bold";
        }
      },
    });
    y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 6;
    body(doc);
    doc.setFontSize(8);
    doc.setTextColor(...MUTED);
    doc.text(
      "Catalog numbers sourced from Thermo Fisher, Sigma-Aldrich, Promega, Qiagen, IDT, ATCC, Addgene via LabMind retrieval.",
      MARGIN,
      y,
      { maxWidth: CONTENT_W },
    );
  }

  // ── PAGE 5 — Budget ───────────────────────────────────
  if (state.experiment_plan.budget) {
    doc.addPage();
    y = MARGIN;
    y = setHeader(doc, "Budget Estimate", y);
    const b = state.experiment_plan.budget;
    autoTable(doc, {
      startY: y,
      head: [["Category", "Item", "Qty", "Unit cost (€)", "Total (€)"]],
      body: [
        ...b.budget_lines.map((l) => [l.category, l.item, l.quantity, l.unit_cost, l.total]),
        ["Materials subtotal", "", "", "", b.subtotal_materials],
        ["Operations subtotal", "", "", "", b.subtotal_operations],
        ["TOTAL", "", "", "", b.total_estimated_cost],
      ],
      theme: "grid",
      headStyles: { fillColor: TEAL, textColor: 255, fontSize: 9 },
      bodyStyles: { fontSize: 9, textColor: TEXT },
      margin: { left: MARGIN, right: MARGIN },
      didParseCell: (d) => {
        if (d.section !== "body") return;
        const lines = b.budget_lines.length;
        if (d.row.index === lines || d.row.index === lines + 1) {
          d.cell.styles.fillColor = TEAL_LIGHT;
          d.cell.styles.fontStyle = "bold";
        } else if (d.row.index === lines + 2) {
          d.cell.styles.fillColor = TEAL;
          d.cell.styles.textColor = [255, 255, 255];
          d.cell.styles.fontStyle = "bold";
        }
      },
    });
    y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 6;
    y = paragraph(doc, "Cost driver: " + b.cost_driver_note, y);
    body(doc);
    doc.setFontSize(8);
    doc.setTextColor(...MUTED);
    doc.text(
      "Cost estimates based on supplier class and historical ranges. Confirm current prices before ordering.",
      MARGIN,
      y,
      { maxWidth: CONTENT_W },
    );
  }

  // ── PAGE 6 — Timeline ─────────────────────────────────
  if (state.experiment_plan.timeline) {
    doc.addPage();
    y = MARGIN;
    y = setHeader(doc, "Execution Timeline", y);
    const t = state.experiment_plan.timeline;
    autoTable(doc, {
      startY: y,
      head: [["Phase", "Duration", "Dependencies", "Notes"]],
      body: t.phases.map((p) => [p.phase, p.duration, p.dependencies, p.notes]),
      theme: "grid",
      headStyles: { fillColor: TEAL, textColor: 255, fontSize: 9 },
      bodyStyles: { fontSize: 9, textColor: TEXT, valign: "top" },
      margin: { left: MARGIN, right: MARGIN },
    });
    y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 6;
    body(doc);
    doc.setFont("helvetica", "bold");
    doc.text(`Total duration: ${t.total_duration}`, MARGIN, y);
    y += 6;
    if (t.bottlenecks?.length) {
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...MUTED);
      doc.text("Bottlenecks: " + t.bottlenecks.join("; "), MARGIN, y, { maxWidth: CONTENT_W });
    }

    // Try to embed live gantt snapshot
    try {
      const el = document.getElementById("gantt-container");
      if (el) {
        const canvas = await captureElement(el as HTMLElement);
        const img = canvas.toDataURL("image/png");
        doc.addPage();
        let yy = MARGIN;
        yy = setHeader(doc, "Timeline (Gantt View)", yy);
        const w = CONTENT_W;
        const h = (canvas.height * w) / canvas.width;
        doc.addImage(img, "PNG", MARGIN, yy, w, Math.min(h, PAGE_H - MARGIN * 2 - 20));
      }
    } catch (e) {
      // skip silently
    }
  }

  // ── PAGE 7 — Validation ───────────────────────────────
  if (state.experiment_plan.validation) {
    doc.addPage();
    y = MARGIN;
    y = setHeader(doc, "Validation Approach", y);
    const v = state.experiment_plan.validation;
    autoTable(doc, {
      startY: y,
      body: [
        ["Primary endpoint", v.primary_endpoint],
        ["Secondary endpoints", v.secondary_endpoints.join("; ") || "—"],
        ["Controls", v.controls.join("; ") || "—"],
        ["Readouts", v.readouts.join("; ") || "—"],
        ["Success criteria", v.success_criteria],
        ["Failure criteria", v.failure_criteria],
      ],
      theme: "grid",
      bodyStyles: { fontSize: 9, textColor: TEXT, valign: "top" },
      columnStyles: { 0: { fontStyle: "bold", cellWidth: 45, fillColor: [245, 244, 240] } },
      margin: { left: MARGIN, right: MARGIN },
    });
    y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 6;
    if (typeof v.strength_score === "number") {
      body(doc);
      doc.setFont("helvetica", "bold");
      doc.text(`Validation strength: ${v.strength_score}/5`, MARGIN, y);
      y += 5;
      if (v.strength_rationale) {
        doc.setFont("helvetica", "normal");
        doc.setTextColor(...MUTED);
        const lines = doc.splitTextToSize(v.strength_rationale, CONTENT_W) as string[];
        doc.text(lines, MARGIN, y);
      }
    }
  }

  // ── PAGE 8 — Devil's Advocate ─────────────────────────
  if (state.devils_advocate) {
    doc.addPage();
    y = MARGIN;
    y = setHeader(doc, "Critical Review (Devil's Advocate)", y);
    const da = state.devils_advocate;
    body(doc);
    doc.setFont("helvetica", "bold");
    doc.text(`Overall confidence: ${da.overall_confidence}/5`, MARGIN, y);
    y += 6;
    doc.setFont("helvetica", "normal");
    y = paragraph(doc, da.verdict, y);
    autoTable(doc, {
      startY: y,
      head: [["Section", "Issue", "Critique", "Suggestion"]],
      body: da.critiques.map((c) => [c.section, c.issue_type, c.critique, c.suggestion]),
      theme: "grid",
      headStyles: { fillColor: TEAL, textColor: 255, fontSize: 9 },
      bodyStyles: { fontSize: 9, textColor: TEXT, valign: "top" },
      columnStyles: { 0: { cellWidth: 25 }, 1: { cellWidth: 25 } },
      margin: { left: MARGIN, right: MARGIN },
    });
  }

  // ── Flowchart page (Pass 11 Part D) ───────────────────
  await addFlowchartPage(doc, state);

  // ── PAGE 9 — Sources ──────────────────────────────────
  doc.addPage();
  y = MARGIN;
  y = setHeader(doc, "References & Sources", y);
  const groups: Array<[string, AppState["retrieval_results"]["protocolSources"]]> = [
    ["Protocol sources", state.retrieval_results.protocolSources],
    ["Literature", state.retrieval_results.literatureSources],
    ["Supplier references", state.retrieval_results.supplierSources],
    ["Plasmid / cell line", state.retrieval_results.plasmidSources],
    ["Validation references", state.retrieval_results.validationSources],
  ];
  for (const [label, items] of groups) {
    y = ensure(doc, y, 15);
    body(doc);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...TEAL);
    doc.text(label, MARGIN, y);
    y += 5;
    doc.setTextColor(...TEXT);
    doc.setFont("helvetica", "normal");
    if (!items.length) {
      doc.setTextColor(...MUTED);
      doc.text("(none)", MARGIN, y);
      y += 5;
      continue;
    }
    for (const r of items) {
      y = ensure(doc, y, 16);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(...TEXT);
      const t = doc.splitTextToSize(r.title || r.url, CONTENT_W) as string[];
      doc.text(t, MARGIN, y);
      y += t.length * 5;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(...MUTED);
      doc.text(r.source ?? "", MARGIN, y);
      doc.setTextColor(...TEXT);
      doc.setFontSize(10);
      y += 5;
      y = drawUrlLine(doc, r.url, y);
      y += 2;
    }
    y += 4;
  }

  // ── Last page footer ──────────────────────────────────
  doc.addPage();
  y = MARGIN + 10;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(...TEAL);
  doc.text("Disclaimer & Credits", MARGIN, y);
  y += 12;
  body(doc);
  y = paragraph(doc, `This plan was generated by LabMind on ${today}.`, y);
  y = paragraph(
    doc,
    "All protocol steps should be validated by a qualified scientist before execution.",
    y,
  );
  y = paragraph(
    doc,
    "Contact: LabMind · Hack-Nation 2026 · Powered by Semantic Scholar, PubMed, protocols.io, Addgene",
    y,
  );

  addPageNumbers(doc);

  const date = new Date().toISOString().slice(0, 10);
  doc.save(`labmind_experiment_plan_${date}.pdf`);
}

export async function exportGanttPDF() {
  const el = document.getElementById("gantt-container");
  if (!el) throw new Error("Gantt chart not found");
  const canvas = await captureElement(el as HTMLElement);
  const img = canvas.toDataURL("image/png");
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(...TEAL);
  doc.text("Experiment Timeline — LabMind", 20, 18);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...MUTED);
  doc.text(`Generated: ${new Date().toLocaleDateString()}`, 20, 26);
  const w = 257;
  const h = (canvas.height * w) / canvas.width;
  doc.addImage(img, "PNG", 20, 32, w, Math.min(h, 160));
  doc.save(`labmind_gantt_${new Date().toISOString().slice(0, 10)}.pdf`);
}

export async function exportGanttPNG() {
  const el = document.getElementById("gantt-container");
  if (!el) throw new Error("Gantt chart not found");
  const canvas = await captureElement(el as HTMLElement);
  const link = document.createElement("a");
  link.download = `labmind_gantt_${new Date().toISOString().slice(0, 10)}.png`;
  link.href = canvas.toDataURL("image/png");
  link.click();
}

/**
 * Pass 10 — dedicated detailed protocol recipe PDF.
 * Kept separate from the main report to keep the report concise.
 */
export async function exportProtocolRecipePDF(state: AppState) {
  const proto = state.experiment_plan.protocol;
  if (!proto || !proto.protocol_steps?.length) {
    throw new Error("No protocol available to export");
  }
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const today = new Date().toLocaleDateString();
  const hyp = state.input_hypothesis || "";

  // Cover
  drawCoverLogo(doc, MARGIN, MARGIN);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(24);
  doc.setTextColor(...TEAL);
  doc.text("LabMind", MARGIN + 18, MARGIN + 8);
  doc.setFontSize(10);
  doc.setTextColor(...MUTED);
  doc.text("Detailed Protocol Recipe", MARGIN + 18, MARGIN + 14);

  doc.setDrawColor(...TEAL);
  doc.setLineWidth(0.6);
  doc.line(MARGIN, 60, PAGE_W - MARGIN, 60);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.setTextColor(...TEXT);
  doc.text("Bench-Ready Recipe", MARGIN, 78);

  body(doc);
  doc.setFontSize(10);
  doc.setTextColor(...MUTED);
  const sub = doc.splitTextToSize(hyp.slice(0, 240) + (hyp.length > 240 ? "…" : ""), CONTENT_W) as string[];
  doc.text(sub, MARGIN, 88);

  doc.setFontSize(9);
  doc.text(
    `Generated ${today} · Experiment type: ${state.experiment_type ?? "—"} · ${proto.protocol_steps.length} step(s)`,
    MARGIN,
    PAGE_H - 25,
  );

  // Steps
  doc.addPage();
  let y = MARGIN;
  y = setHeader(doc, "Step-by-Step Recipe", y);

  for (const s of proto.protocol_steps) {
    y = ensure(doc, y, 40);
    // Step header bar
    doc.setFillColor(...TEAL_LIGHT);
    doc.rect(MARGIN, y - 5, CONTENT_W, 8, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(...TEAL);
    const conf = s.confidence ? `  [${s.confidence.toUpperCase()}]` : "";
    doc.text(`Step ${s.step_number} — ${stripLeadingNumber(s.title)}${conf}`, MARGIN + 2, y);
    y += 6;

    body(doc);
    if (s.objective) {
      doc.setFont("helvetica", "bold");
      doc.text("Objective:", MARGIN, y);
      y += 4;
      doc.setFont("helvetica", "normal");
      y = paragraph(doc, stripLeadingNumber(s.objective), y);
    }

    if (s.materials?.length) {
      y = ensure(doc, y, 12);
      doc.setFont("helvetica", "bold");
      doc.text("Materials for this step:", MARGIN, y);
      y += 4;
      doc.setFont("helvetica", "normal");
      for (const m of s.materials) {
        y = ensure(doc, y, 6);
        y = paragraph(doc, `  • ${m}`, y);
      }
    }

    if (s.actions?.length) {
      y = ensure(doc, y, 12);
      doc.setFont("helvetica", "bold");
      doc.text("Actions:", MARGIN, y);
      y += 4;
      doc.setFont("helvetica", "normal");
      for (let i = 0; i < s.actions.length; i++) {
        y = ensure(doc, y, 8);
        y = paragraph(doc, `  ${i + 1}. ${stripLeadingNumber(s.actions[i])}`, y);
      }
    }

    const params = s.parameters
      ? Object.entries(s.parameters).filter(([, v]) => v)
      : [];
    if (params.length) {
      y = ensure(doc, y, 24);
      autoTable(doc, {
        startY: y,
        head: [["Parameter", "Value"]],
        body: params.map(([k, v]) => [k.replace(/_/g, " "), String(v)]),
        theme: "grid",
        headStyles: { fillColor: TEAL, textColor: 255, fontSize: 9 },
        bodyStyles: { fontSize: 9, textColor: TEXT, valign: "top" },
        margin: { left: MARGIN, right: MARGIN },
        columnStyles: { 0: { cellWidth: 45, fontStyle: "bold" } },
      });
      y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 4;
    }

    if (s.checkpoint) {
      y = ensure(doc, y, 10);
      doc.setFont("helvetica", "bold");
      doc.text("Checkpoint:", MARGIN, y);
      y += 4;
      doc.setFont("helvetica", "normal");
      y = paragraph(doc, s.checkpoint, y);
    }
    if (s.failure_mode) {
      y = ensure(doc, y, 10);
      doc.setFont("helvetica", "bold");
      doc.text("Common failure mode:", MARGIN, y);
      y += 4;
      doc.setFont("helvetica", "normal");
      y = paragraph(doc, s.failure_mode, y);
    }
    if (s.troubleshooting) {
      y = ensure(doc, y, 10);
      doc.setFont("helvetica", "bold");
      doc.text("Troubleshooting:", MARGIN, y);
      y += 4;
      doc.setFont("helvetica", "normal");
      y = paragraph(doc, s.troubleshooting, y);
    }
    if (s.safety) {
      y = ensure(doc, y, 10);
      doc.setFont("helvetica", "bold");
      doc.text("Safety:", MARGIN, y);
      y += 4;
      doc.setFont("helvetica", "normal");
      y = paragraph(doc, s.safety, y);
    }

    // Divider
    y += 2;
    doc.setDrawColor(220, 220, 215);
    doc.setLineWidth(0.2);
    doc.line(MARGIN, y, PAGE_W - MARGIN, y);
    y += 6;
  }

  if (proto.assumptions.length) {
    y = ensure(doc, y, 20);
    y = setHeader(doc, "Assumptions", y);
    proto.assumptions.forEach((a) => {
      y = ensure(doc, y, 8);
      y = paragraph(doc, "• " + a, y);
    });
  }
  if (proto.risk_points.length) {
    y = ensure(doc, y, 20);
    y = setHeader(doc, "Risk points", y);
    proto.risk_points.forEach((a) => {
      y = ensure(doc, y, 8);
      y = paragraph(doc, "• " + a, y);
    });
  }

  addPageNumbers(doc);
  const date = new Date().toISOString().slice(0, 10);
  doc.save(`labmind_protocol_recipe_${date}.pdf`);
}
