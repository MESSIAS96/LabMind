import { createServerFn } from "@tanstack/react-start";
import type {
  ParsedHypothesis,
  SearchResult,
  Reference,
  NoveltySignal,
  Protocol,
  Materials,
  Budget,
  Timeline,
  Validation,
  Correction,
  ExperimentPlan,
} from "@/lib/types";

const AI_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const MODEL = "google/gemini-3-flash-preview";

type AIMsg = { role: "system" | "user" | "assistant"; content: string };

async function callAIJson<T>(
  system: string,
  user: string,
  toolName: string,
  parameters: unknown,
): Promise<T> {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) throw new Error("LOVABLE_API_KEY not configured");

  const messages: AIMsg[] = [
    { role: "system", content: system },
    { role: "user", content: user },
  ];

  const res = await fetch(AI_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL,
      messages,
      tools: [
        {
          type: "function",
          function: {
            name: toolName,
            description: `Return ${toolName} as structured JSON.`,
            parameters,
          },
        },
      ],
      tool_choice: { type: "function", function: { name: toolName } },
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`AI gateway ${res.status}: ${text.slice(0, 200)}`);
  }

  const data = await res.json();
  const tc = data?.choices?.[0]?.message?.tool_calls?.[0];
  const argStr = tc?.function?.arguments;
  if (!argStr) throw new Error("AI returned no tool call");
  try {
    return JSON.parse(argStr) as T;
  } catch {
    throw new Error("AI returned invalid JSON");
  }
}

/* -------------------- Tavily helpers -------------------- */

async function tavilySearch(
  query: string,
  domains: string[],
  depth: "basic" | "advanced",
  maxResults: number,
): Promise<SearchResult[]> {
  const key = process.env.TAVILY_API_KEY;
  if (!key) return [];
  try {
    const res = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query,
        search_depth: depth,
        include_answer: false,
        max_results: maxResults,
        include_domains: domains,
      }),
    });
    if (!res.ok) return [];
    const data = await res.json();
    const results: SearchResult[] = (data?.results ?? []).map((r: { title?: string; url?: string; content?: string }) => ({
      title: r.title ?? "",
      url: r.url ?? "",
      content: (r.content ?? "").slice(0, 500),
    }));
    return results;
  } catch {
    return [];
  }
}

/* -------------------- Server functions -------------------- */

export const parseHypothesis = createServerFn({ method: "POST" })
  .inputValidator((input: { hypothesis: string; experiment_type: string }) => input)
  .handler(async ({ data }) => {
    const parsed = await callAIJson<ParsedHypothesis>(
      "You are a bioscience research analyst. Extract structured fields from the user's hypothesis. Be specific and concise; use 'unspecified' when truly absent.",
      `Hypothesis: ${data.hypothesis}\nExperiment type: ${data.experiment_type}`,
      "parsed_hypothesis",
      {
        type: "object",
        properties: {
          intervention: { type: "string" },
          model_system: { type: "string" },
          primary_endpoint: { type: "string" },
          threshold: { type: "string" },
          mechanism: { type: "string" },
          control_condition: { type: "string" },
          duration: { type: "string" },
          assay_method: { type: "string" },
        },
        required: [
          "intervention",
          "model_system",
          "primary_endpoint",
          "threshold",
          "mechanism",
          "control_condition",
          "duration",
          "assay_method",
        ],
      },
    );
    return parsed;
  });

export const searchProtocols = createServerFn({ method: "POST" })
  .inputValidator((input: { parsed: ParsedHypothesis }) => input)
  .handler(async ({ data }) => {
    const p = data.parsed;
    const query = `${p.intervention} ${p.assay_method} ${p.model_system} protocol`;
    const results = await tavilySearch(
      query,
      [
        "protocols.io",
        "bio-protocol.org",
        "openwetware.org",
        "jove.com",
        "nature.com",
        "thermofisher.com",
      ],
      "advanced",
      7,
    );
    return { results: results.slice(0, 5) };
  });

export const searchSuppliers = createServerFn({ method: "POST" })
  .inputValidator((input: { parsed: ParsedHypothesis; reagents: string[] }) => input)
  .handler(async ({ data }) => {
    const reagents = data.reagents.length ? data.reagents : [data.parsed.intervention];
    const all: SearchResult[] = [];
    for (const r of reagents.slice(0, 4)) {
      const q = `${r} ${data.parsed.model_system} catalog supplier`;
      const res = await tavilySearch(
        q,
        [
          "thermofisher.com",
          "sigmaaldrich.com",
          "promega.com",
          "qiagen.com",
          "idtdna.com",
          "atcc.org",
          "addgene.org",
        ],
        "advanced",
        4,
      );
      all.push(...res.slice(0, 2));
    }
    return { results: all };
  });

export const searchValidation = createServerFn({ method: "POST" })
  .inputValidator((input: { parsed: ParsedHypothesis }) => input)
  .handler(async ({ data }) => {
    const p = data.parsed;
    const q = `${p.assay_method} validation controls ${p.model_system} protocol`;
    const results = await tavilySearch(
      q,
      [
        "ncbi.nlm.nih.gov",
        "nature.com",
        "thermofisher.com",
        "promega.com",
        "qiagen.com",
      ],
      "basic",
      5,
    );
    return { results: results.slice(0, 3) };
  });

export const searchSemanticScholar = createServerFn({ method: "POST" })
  .inputValidator((input: { parsed: ParsedHypothesis }) => input)
  .handler(async ({ data }) => {
    const p = data.parsed;
    const q = encodeURIComponent(`${p.intervention} ${p.assay_method} ${p.model_system}`);
    try {
      const res = await fetch(
        `https://api.semanticscholar.org/graph/v1/paper/search?query=${q}&fields=title,abstract,url,year,authors&limit=5`,
      );
      if (!res.ok) return { results: [] as SearchResult[] };
      const data2 = await res.json();
      const results: SearchResult[] = (data2?.data ?? []).map((p2: {
        title?: string;
        abstract?: string;
        url?: string;
        year?: number;
        authors?: { name?: string }[];
      }) => ({
        title: `${p2.title ?? "Untitled"}${p2.year ? ` (${p2.year})` : ""}`,
        url: p2.url ?? "",
        content: ((p2.abstract ?? "") + " — " + (p2.authors?.map((a) => a.name).filter(Boolean).join(", ") ?? "")).slice(0, 500),
      }));
      return { results };
    } catch {
      return { results: [] as SearchResult[] };
    }
  });

export const classifyNovelty = createServerFn({ method: "POST" })
  .inputValidator(
    (input: {
      parsed: ParsedHypothesis;
      tavily: SearchResult[];
      scholar: SearchResult[];
    }) => input,
  )
  .handler(async ({ data }) => {
    const evidence = [...data.tavily, ...data.scholar]
      .slice(0, 10)
      .map((r, i) => `[${i + 1}] ${r.title}\n${r.url}\n${r.content}`)
      .join("\n\n");

    const result = await callAIJson<{
      novelty_signal: NoveltySignal;
      references: Reference[];
    }>(
      "You are a literature analyst. Classify whether the proposed experiment is novel, similar to prior work, or an exact match. Cite 1-3 most relevant references from the evidence list.",
      `Hypothesis fields:\n${JSON.stringify(data.parsed, null, 2)}\n\nEvidence:\n${evidence || "No evidence retrieved."}`,
      "novelty_assessment",
      {
        type: "object",
        properties: {
          novelty_signal: {
            type: "string",
            enum: ["not_found", "similar_work_exists", "exact_match_found"],
          },
          references: {
            type: "array",
            items: {
              type: "object",
              properties: {
                title: { type: "string" },
                source: { type: "string" },
                url: { type: "string" },
                relevance: { type: "string" },
              },
              required: ["title", "source", "url", "relevance"],
            },
          },
        },
        required: ["novelty_signal", "references"],
      },
    );
    return result;
  });

/* -------------------- Plan generators -------------------- */

function evidenceBlock(items: SearchResult[]) {
  return items.length
    ? items
        .slice(0, 6)
        .map((r, i) => `[${i + 1}] ${r.title}\n${r.url}\n${r.content}`)
        .join("\n\n")
    : "No external evidence retrieved.";
}

function correctionsBlock(corrections: Correction[] | undefined, section: string) {
  if (!corrections?.length) return "";
  const relevant = corrections.filter((c) => c.section === section);
  if (!relevant.length) return "";
  return `\n\nUSER EXPERT CORRECTIONS to incorporate:\n${relevant
    .map(
      (c) =>
        `- Rating: ${c.rating}/5; Issues: ${c.issue_tags.join(", ") || "none"}; Notes: ${c.notes || "—"}`,
    )
    .join("\n")}`;
}

export const generateProtocol = createServerFn({ method: "POST" })
  .inputValidator(
    (input: {
      parsed: ParsedHypothesis;
      protocol_evidence: SearchResult[];
      corrections?: Correction[];
    }) => input,
  )
  .handler(async ({ data }) => {
    return callAIJson<Protocol>(
      "You are a bioscience protocol designer. Generate a numbered, step-by-step laboratory protocol grounded in the retrieved protocol evidence. Include concentrations, temperatures, timing, controls, and replicate guidance. Mark uncertain parameters as 'to validate experimentally'.",
      `Hypothesis fields:\n${JSON.stringify(data.parsed, null, 2)}\n\nProtocol evidence:\n${evidenceBlock(data.protocol_evidence)}${correctionsBlock(data.corrections, "protocol")}`,
      "protocol",
      {
        type: "object",
        properties: {
          protocol_steps: {
            type: "array",
            items: {
              type: "object",
              properties: {
                step: { type: "number" },
                title: { type: "string" },
                description: { type: "string" },
                critical_parameters: { type: "string" },
              },
              required: ["step", "title", "description"],
            },
          },
          assumptions: { type: "array", items: { type: "string" } },
          risk_points: { type: "array", items: { type: "string" } },
          source_links: { type: "array", items: { type: "string" } },
        },
        required: ["protocol_steps", "assumptions", "risk_points", "source_links"],
      },
    );
  });

export const generateMaterials = createServerFn({ method: "POST" })
  .inputValidator(
    (input: {
      parsed: ParsedHypothesis;
      supplier_evidence: SearchResult[];
      corrections?: Correction[];
    }) => input,
  )
  .handler(async ({ data }) => {
    return callAIJson<Materials>(
      "You are a lab supply specialist. Generate a practical materials list using the retrieved supplier evidence. For each item include: item_name, supplier, catalog_number (or 'catalog to confirm'), purpose, quantity_estimate, confidence (confirmed | estimated | inferred).",
      `Hypothesis fields:\n${JSON.stringify(data.parsed, null, 2)}\n\nSupplier evidence:\n${evidenceBlock(data.supplier_evidence)}${correctionsBlock(data.corrections, "materials")}`,
      "materials",
      {
        type: "object",
        properties: {
          materials: {
            type: "array",
            items: {
              type: "object",
              properties: {
                item_name: { type: "string" },
                supplier: { type: "string" },
                catalog_number: { type: "string" },
                purpose: { type: "string" },
                quantity_estimate: { type: "string" },
                confidence: {
                  type: "string",
                  enum: ["confirmed", "estimated", "inferred"],
                },
              },
              required: [
                "item_name",
                "supplier",
                "catalog_number",
                "purpose",
                "quantity_estimate",
                "confidence",
              ],
            },
          },
        },
        required: ["materials"],
      },
    );
  });

export const generateBudget = createServerFn({ method: "POST" })
  .inputValidator(
    (input: {
      parsed: ParsedHypothesis;
      materials: Materials;
      budget_cap?: string;
      corrections?: Correction[];
    }) => input,
  )
  .handler(async ({ data }) => {
    return callAIJson<Budget>(
      "You are estimating costs for a bioscience experiment. Break costs into materials, consumables, assay kits, cell lines or biological materials, equipment access, and labor. If live prices are unavailable, state a range and mark as estimated. Use EUR (€).",
      `Hypothesis fields:\n${JSON.stringify(data.parsed, null, 2)}\n\nMaterials list:\n${JSON.stringify(data.materials, null, 2)}\n\nBudget cap: ${data.budget_cap || "none"}${correctionsBlock(data.corrections, "budget")}`,
      "budget",
      {
        type: "object",
        properties: {
          budget_lines: {
            type: "array",
            items: {
              type: "object",
              properties: {
                category: { type: "string" },
                item: { type: "string" },
                quantity: { type: "string" },
                unit_cost: { type: "string" },
                total: { type: "string" },
                notes: { type: "string" },
              },
              required: ["category", "item", "quantity", "unit_cost", "total"],
            },
          },
          subtotal_materials: { type: "string" },
          subtotal_operations: { type: "string" },
          total_estimated_cost: { type: "string" },
          cost_driver_note: { type: "string" },
        },
        required: [
          "budget_lines",
          "subtotal_materials",
          "subtotal_operations",
          "total_estimated_cost",
          "cost_driver_note",
        ],
      },
    );
  });

export const generateTimeline = createServerFn({ method: "POST" })
  .inputValidator(
    (input: {
      parsed: ParsedHypothesis;
      protocol: Protocol;
      timeline_target?: string;
      corrections?: Correction[];
    }) => input,
  )
  .handler(async ({ data }) => {
    return callAIJson<Timeline>(
      "You are creating an execution timeline for a bioscience experiment. Produce phased breakdown: preparation, setup, experimental run, measurement, analysis, validation reporting. Include duration, dependencies, and bottlenecks.",
      `Hypothesis fields:\n${JSON.stringify(data.parsed, null, 2)}\n\nProtocol summary:\n${data.protocol.protocol_steps.map((s) => `${s.step}. ${s.title}`).join("\n")}\n\nTarget timeline: ${data.timeline_target || "none"}${correctionsBlock(data.corrections, "timeline")}`,
      "timeline",
      {
        type: "object",
        properties: {
          phases: {
            type: "array",
            items: {
              type: "object",
              properties: {
                phase: { type: "string" },
                duration: { type: "string" },
                dependencies: { type: "string" },
                notes: { type: "string" },
              },
              required: ["phase", "duration", "dependencies", "notes"],
            },
          },
          total_duration: { type: "string" },
          key_dependencies: { type: "array", items: { type: "string" } },
          bottlenecks: { type: "array", items: { type: "string" } },
        },
        required: ["phases", "total_duration", "key_dependencies", "bottlenecks"],
      },
    );
  });

export const generateValidation = createServerFn({ method: "POST" })
  .inputValidator(
    (input: {
      parsed: ParsedHypothesis;
      validation_evidence: SearchResult[];
      corrections?: Correction[];
    }) => input,
  )
  .handler(async ({ data }) => {
    return callAIJson<Validation>(
      "You are designing the validation strategy for this experiment. Define primary endpoint, secondary endpoints, controls, readout methods, success criteria, and failure criteria.",
      `Hypothesis fields:\n${JSON.stringify(data.parsed, null, 2)}\n\nValidation evidence:\n${evidenceBlock(data.validation_evidence)}${correctionsBlock(data.corrections, "validation")}`,
      "validation",
      {
        type: "object",
        properties: {
          primary_endpoint: { type: "string" },
          secondary_endpoints: { type: "array", items: { type: "string" } },
          controls: { type: "array", items: { type: "string" } },
          readouts: { type: "array", items: { type: "string" } },
          success_criteria: { type: "string" },
          failure_criteria: { type: "string" },
        },
        required: [
          "primary_endpoint",
          "secondary_endpoints",
          "controls",
          "readouts",
          "success_criteria",
          "failure_criteria",
        ],
      },
    );
  });

export type { ExperimentPlan };