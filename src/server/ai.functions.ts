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
  RetrievalResults,
  DevilsAdvocateReview,
} from "@/lib/types";
import type { MemoryContext } from "@/lib/memoryBank";
import { memoryToPromptBlock } from "@/lib/memoryBank";

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

/* -------------------- Tier 1: Direct API helpers -------------------- */

async function searchProtocolsIO(query: string): Promise<SearchResult[]> {
  const token = process.env.PROTOCOLS_IO_TOKEN;
  try {
    const url = `https://www.protocols.io/api/v4/protocols?filter=public&key=${encodeURIComponent(query)}&order_field=activity&order_dir=desc&page_size=5`;
    const res = await fetch(url, {
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        "Content-Type": "application/json",
      },
    });
    if (!res.ok) return [];
    const data = await res.json();
    const items = data?.items ?? [];
    return items.map((p: {
      title?: string;
      uri?: string;
      authors?: { name?: string }[];
      published_on?: number | string;
      doi?: string;
      steps_count?: number;
    }) => ({
      title: p.title ?? "Untitled protocol",
      url: p.uri ? `https://www.protocols.io${p.uri}` : "https://www.protocols.io",
      content: `${p.authors?.map((a) => a.name).filter(Boolean).join(", ") ?? ""}${p.doi ? ` · DOI ${p.doi}` : ""}${p.steps_count ? ` · ${p.steps_count} steps` : ""}`,
      source: "protocols.io" as const,
      meta: {
        authors: p.authors?.map((a) => a.name).filter(Boolean).join(", "),
        doi: p.doi,
        steps_count: p.steps_count,
      },
    }));
  } catch {
    return [];
  }
}

/** Minimal XML extractor: pulls first occurrence of <tag>...</tag> inside a chunk. */
function pickTag(xml: string, tag: string): string | undefined {
  const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`);
  const m = xml.match(re);
  if (!m) return undefined;
  return m[1]
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .trim();
}

async function searchPubMed(query: string): Promise<SearchResult[]> {
  try {
    const searchUrl = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&term=${encodeURIComponent(query)}&retmax=5&retmode=json&usehistory=y`;
    const sRes = await fetch(searchUrl);
    if (!sRes.ok) return [];
    const sData = await sRes.json();
    const ids: string[] = sData?.esearchresult?.idlist ?? [];
    if (ids.length === 0) return [];
    const fetchUrl = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?db=pubmed&id=${ids.join(",")}&retmode=xml&rettype=abstract`;
    const fRes = await fetch(fetchUrl);
    if (!fRes.ok) return [];
    const xml = await fRes.text();
    // Split by <PubmedArticle>
    const articles = xml.split(/<PubmedArticle[\s>]/).slice(1);
    return articles.map((chunk, i) => {
      const title = pickTag(chunk, "ArticleTitle") ?? "No title";
      const abstract = pickTag(chunk, "AbstractText") ?? "";
      const pmid = pickTag(chunk, "PMID") ?? ids[i];
      const year = pickTag(chunk, "Year");
      return {
        title: `${title}${year ? ` (${year})` : ""}`,
        url: pmid ? `https://pubmed.ncbi.nlm.nih.gov/${pmid}/` : "https://pubmed.ncbi.nlm.nih.gov",
        content: abstract.slice(0, 500),
        source: "PubMed" as const,
        meta: { pmid, year },
      };
    });
  } catch {
    return [];
  }
}

async function searchSemanticScholarRaw(query: string): Promise<SearchResult[]> {
  try {
    const url = `https://api.semanticscholar.org/graph/v1/paper/search?query=${encodeURIComponent(query)}&fields=title,abstract,url,year,authors,citationCount&limit=5`;
    const res = await fetch(url);
    if (!res.ok) return [];
    const data = await res.json();
    return (data?.data ?? []).map((p: {
      title?: string;
      abstract?: string;
      url?: string;
      year?: number;
      authors?: { name?: string }[];
      citationCount?: number;
    }) => ({
      title: `${p.title ?? "Untitled"}${p.year ? ` (${p.year})` : ""}`,
      url: p.url ?? "",
      content: ((p.abstract ?? "") + (p.authors?.length ? ` — ${p.authors.map((a) => a.name).filter(Boolean).join(", ")}` : "")).slice(0, 500),
      source: "Semantic Scholar" as const,
      meta: {
        year: p.year,
        authors: p.authors?.map((a) => a.name).filter(Boolean).join(", "),
        citations: p.citationCount,
      },
    }));
  } catch {
    return [];
  }
}

async function searchAddgene(gene: string): Promise<SearchResult[]> {
  try {
    const url = `https://www.addgene.org/api/catalog/plasmids/?query=${encodeURIComponent(gene)}&page_size=5`;
    const res = await fetch(url, { headers: { Accept: "application/json" } });
    if (!res.ok) return [];
    const data = await res.json();
    const items = data?.results ?? [];
    return items.map((p: {
      name?: string;
      addgene_id?: number | string;
      purpose?: string;
      depositor?: string;
    }) => ({
      title: p.name ?? "Untitled plasmid",
      url: p.addgene_id ? `https://www.addgene.org/${p.addgene_id}/` : "https://www.addgene.org",
      content: `${p.purpose ?? ""}${p.depositor ? ` · Depositor: ${p.depositor}` : ""}`.slice(0, 500),
      source: "Addgene" as const,
      meta: { addgene_id: p.addgene_id },
    }));
  } catch {
    return [];
  }
}

async function tavilySearchProtocolRepos(queries: string[]): Promise<SearchResult[]> {
  const out: SearchResult[] = [];
  for (const q of queries.slice(0, 3)) {
    const r = await tavilySearch(
      q,
      ["bio-protocol.org", "jove.com", "openwetware.org", "nature.com", "protocols.io"],
      "advanced",
      5,
    );
    out.push(...r.map((x) => ({ ...x, source: "Protocol Repository" as const })));
  }
  return out;
}

async function tavilySearchSuppliersHelper(reagentQueries: string[]): Promise<SearchResult[]> {
  const out: SearchResult[] = [];
  for (const q of reagentQueries.slice(0, 5)) {
    const r = await tavilySearch(
      q,
      ["thermofisher.com", "sigmaaldrich.com", "promega.com", "qiagen.com", "idtdna.com", "atcc.org"],
      "advanced",
      5,
    );
    out.push(...r.map((x) => ({ ...x, source: "Supplier" as const })));
  }
  return out;
}

async function tavilySearchValidationHelper(query: string): Promise<SearchResult[]> {
  const r = await tavilySearch(
    query,
    ["ncbi.nlm.nih.gov", "nature.com", "thermofisher.com", "promega.com", "qiagen.com"],
    "basic",
    5,
  );
  return r.map((x) => ({ ...x, source: "Validation Reference" as const }));
}

/* -------------------- Tier 3: Orchestrated retrieval -------------------- */

const MOLECULAR_TYPES = new Set(["Molecular Biology", "Cell Biology"]);

export const runFullRetrieval = createServerFn({ method: "POST" })
  .inputValidator(
    (input: { parsed: ParsedHypothesis; experiment_type: string }) => input,
  )
  .handler(async ({ data }): Promise<RetrievalResults> => {
    const p = data.parsed;
    const baseQuery = `${p.intervention} ${p.assay_method} ${p.model_system}`.trim();
    const entities = p.key_entities && p.key_entities.length ? p.key_entities : [p.intervention];
    const searchQueries = p.search_queries && p.search_queries.length ? p.search_queries : [baseQuery];
    const wantsAddgene = MOLECULAR_TYPES.has(data.experiment_type);

    const [
      protocolsIO,
      pubMed,
      scholar,
      addgene,
      tavilyProtocols,
      tavilySuppliers,
      tavilyValidation,
    ] = await Promise.allSettled([
      searchProtocolsIO(baseQuery),
      searchPubMed(baseQuery),
      searchSemanticScholarRaw(baseQuery),
      wantsAddgene ? searchAddgene(entities[0] ?? baseQuery) : Promise.resolve<SearchResult[]>([]),
      tavilySearchProtocolRepos(searchQueries),
      tavilySearchSuppliersHelper(
        entities.map((e) => `${e} ${p.model_system} catalog`),
      ),
      tavilySearchValidationHelper(`${p.assay_method} validation controls ${p.model_system}`),
    ]);

    const get = <T>(r: PromiseSettledResult<T[]>): T[] =>
      r.status === "fulfilled" ? r.value : [];

    return {
      protocolSources: [...get(protocolsIO), ...get(tavilyProtocols)],
      literatureSources: [...get(pubMed), ...get(scholar)],
      supplierSources: get(tavilySuppliers),
      plasmidSources: get(addgene),
      validationSources: get(tavilyValidation),
    };
  });

/* Per-source server functions so the client can show live status indicators. */

export const fetchProtocolsIO = createServerFn({ method: "POST" })
  .inputValidator((input: { parsed: ParsedHypothesis }) => input)
  .handler(async ({ data }) => {
    const p = data.parsed;
    return { results: await searchProtocolsIO(`${p.intervention} ${p.assay_method} ${p.model_system}`) };
  });

export const fetchPubMed = createServerFn({ method: "POST" })
  .inputValidator((input: { parsed: ParsedHypothesis }) => input)
  .handler(async ({ data }) => {
    const p = data.parsed;
    return { results: await searchPubMed(`${p.intervention} ${p.assay_method} ${p.model_system}`) };
  });

export const fetchAddgene = createServerFn({ method: "POST" })
  .inputValidator((input: { parsed: ParsedHypothesis; experiment_type: string }) => input)
  .handler(async ({ data }) => {
    if (!MOLECULAR_TYPES.has(data.experiment_type)) return { results: [] as SearchResult[] };
    const entity = data.parsed.key_entities?.[0] ?? data.parsed.intervention;
    return { results: await searchAddgene(entity) };
  });

export const fetchTavilyProtocols = createServerFn({ method: "POST" })
  .inputValidator((input: { parsed: ParsedHypothesis }) => input)
  .handler(async ({ data }) => {
    const p = data.parsed;
    const queries = p.search_queries?.length
      ? p.search_queries
      : [`${p.intervention} ${p.assay_method} ${p.model_system}`];
    return { results: await tavilySearchProtocolRepos(queries) };
  });

export const fetchTavilySuppliers = createServerFn({ method: "POST" })
  .inputValidator((input: { parsed: ParsedHypothesis }) => input)
  .handler(async ({ data }) => {
    const p = data.parsed;
    const ents = p.key_entities?.length ? p.key_entities : [p.intervention];
    return {
      results: await tavilySearchSuppliersHelper(ents.map((e) => `${e} ${p.model_system} catalog`)),
    };
  });

export const fetchTavilyValidation = createServerFn({ method: "POST" })
  .inputValidator((input: { parsed: ParsedHypothesis }) => input)
  .handler(async ({ data }) => {
    const p = data.parsed;
    return {
      results: await tavilySearchValidationHelper(
        `${p.assay_method} validation controls ${p.model_system}`,
      ),
    };
  });

/* -------------------- Server functions -------------------- */

export const parseHypothesis = createServerFn({ method: "POST" })
  .inputValidator((input: { hypothesis: string; experiment_type: string }) => input)
  .handler(async ({ data }) => {
    const parsed = await callAIJson<ParsedHypothesis>(
      "You are a bioscience research analyst. Extract structured fields from the user's hypothesis. Be specific and concise; use 'unspecified' when truly absent. Also propose 2-4 key_entities (genes, plasmids, reagents, cell lines) and 2-3 search_queries that would surface the most relevant protocols.",
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
          key_entities: { type: "array", items: { type: "string" } },
          search_queries: { type: "array", items: { type: "string" } },
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
      "You are a literature analyst. Classify whether the proposed experiment is novel, similar to prior work, or an exact match. Cite up to 5 most relevant references from the evidence list, ordered by relevance. For the TOP 3 most relevant references, also include a short `why_match` field (1-2 concise sentences) explaining how that reference relates to the hypothesis — connect intervention, model system, readout/assay, or mechanism. For references ranked 4+, omit `why_match`.",
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
                why_match: { type: "string" },
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

function memoryBlock(mem: MemoryContext | undefined): string {
  if (!mem) return "";
  return memoryToPromptBlock(mem);
}

const REGEN_SYSTEM_PREFIX = `You are improving a laboratory experiment plan using:
1. the current plan,
2. current scientific review corrections,
3. prior reviewed high-quality plans from similar experiments,
4. learned correction patterns from previous users.

Your job is to produce a version that is more operationally realistic, more detailed, more reproducible, more standards-compliant, and more specific about controls, materials, and validation.

Rules:
- Apply explicit corrections first.
- Then apply relevant lessons from prior plans and correction patterns.
- Do not copy prior plans verbatim.
- Improve specificity where evidence exists; if precision is unsupported, mark it as needing experimental validation.
- Preserve correctness from the current version.
- Prefer clarity and executability over verbosity.
`;

export const generateProtocol = createServerFn({ method: "POST" })
  .inputValidator(
    (input: {
      parsed: ParsedHypothesis;
      protocol_evidence: SearchResult[];
      corrections?: Correction[];
      memory?: MemoryContext;
    }) => input,
  )
  .handler(async ({ data }) => {
    const hasReview = (data.corrections?.length ?? 0) > 0;
    const sysHeader = hasReview ? REGEN_SYSTEM_PREFIX + "\n\n" : "";
    return callAIJson<Protocol>(
      sysHeader +
        `You are a senior laboratory scientist writing a protocol that must be immediately usable by a real lab team.

Generate a highly detailed, operational protocol in a scientific recipe format.

Requirements:
- Use numbered major steps via step_number (start at 1).
- For each step include: title, objective, materials (step-specific), actions (numbered exact actions), parameters (concentration, volume, temperature, duration, other_conditions where relevant), checkpoint (expected observation), failure_mode, troubleshooting, safety (when relevant), confidence (high|medium|low).
- Write like a precise lab manual, not a summary.
- Prefer concrete details from retrieved evidence.
- If a numeric parameter is not supported by evidence, write "Parameter to validate experimentally" instead of inventing precision.
- Include replicates, control handling, labelling, and sterility notes where relevant.
- Keep steps easy to follow under bench conditions.`,
      `Hypothesis fields:\n${JSON.stringify(data.parsed, null, 2)}\n\nProtocol evidence:\n${evidenceBlock(data.protocol_evidence)}${correctionsBlock(data.corrections, "protocol")}${memoryBlock(data.memory)}`,
      "protocol",
      {
        type: "object",
        properties: {
          protocol_steps: {
            type: "array",
            items: {
              type: "object",
              properties: {
                step_number: { type: "number" },
                title: { type: "string" },
                objective: { type: "string" },
                materials: { type: "array", items: { type: "string" } },
                actions: { type: "array", items: { type: "string" } },
                parameters: {
                  type: "object",
                  properties: {
                    concentration: { type: "string" },
                    volume: { type: "string" },
                    temperature: { type: "string" },
                    duration: { type: "string" },
                    other_conditions: { type: "string" },
                  },
                },
                checkpoint: { type: "string" },
                failure_mode: { type: "string" },
                troubleshooting: { type: "string" },
                safety: { type: "string" },
                confidence: { type: "string", enum: ["high", "medium", "low"] },
                source_links: { type: "array", items: { type: "string" } },
              },
              required: ["step_number", "title", "objective", "actions"],
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
      memory?: MemoryContext;
    }) => input,
  )
  .handler(async ({ data }) => {
    const hasReview = (data.corrections?.length ?? 0) > 0;
    const sysHeader = hasReview ? REGEN_SYSTEM_PREFIX + "\n\n" : "";
    return callAIJson<Materials>(
      sysHeader +
        "You are a lab supply specialist. Generate a practical materials list using the retrieved supplier evidence. For each item include: item_name, supplier, catalog_number (or 'catalog to confirm'), purpose, quantity_estimate, confidence (confirmed | estimated | inferred).",
      `Hypothesis fields:\n${JSON.stringify(data.parsed, null, 2)}\n\nSupplier evidence:\n${evidenceBlock(data.supplier_evidence)}${correctionsBlock(data.corrections, "materials")}${memoryBlock(data.memory)}`,
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
      memory?: MemoryContext;
    }) => input,
  )
  .handler(async ({ data }) => {
    const hasReview = (data.corrections?.length ?? 0) > 0;
    const sysHeader = hasReview ? REGEN_SYSTEM_PREFIX + "\n\n" : "";
    return callAIJson<Budget>(
      sysHeader +
        "You are estimating costs for a bioscience experiment. Break costs into materials, consumables, assay kits, cell lines or biological materials, equipment access, and labor. If live prices are unavailable, state a range and mark as estimated. Use EUR (€).",
      `Hypothesis fields:\n${JSON.stringify(data.parsed, null, 2)}\n\nMaterials list:\n${JSON.stringify(data.materials, null, 2)}\n\nBudget cap: ${data.budget_cap || "none"}${correctionsBlock(data.corrections, "budget")}${memoryBlock(data.memory)}`,
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
      memory?: MemoryContext;
    }) => input,
  )
  .handler(async ({ data }) => {
    const hasReview = (data.corrections?.length ?? 0) > 0;
    const sysHeader = hasReview ? REGEN_SYSTEM_PREFIX + "\n\n" : "";
    return callAIJson<Timeline>(
      sysHeader +
        "You are creating an execution timeline for a bioscience experiment. Produce phased breakdown: preparation, setup, experimental run, measurement, analysis, validation reporting. Include duration, dependencies, and bottlenecks.",
      `Hypothesis fields:\n${JSON.stringify(data.parsed, null, 2)}\n\nProtocol summary:\n${data.protocol.protocol_steps.map((s) => `${s.step_number}. ${s.title}`).join("\n")}\n\nTarget timeline: ${data.timeline_target || "none"}${correctionsBlock(data.corrections, "timeline")}${memoryBlock(data.memory)}`,
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
      memory?: MemoryContext;
    }) => input,
  )
  .handler(async ({ data }) => {
    const hasReview = (data.corrections?.length ?? 0) > 0;
    const sysHeader = hasReview ? REGEN_SYSTEM_PREFIX + "\n\n" : "";
    return callAIJson<Validation>(
      sysHeader +
        "You are designing the validation strategy for this experiment. Define primary endpoint, secondary endpoints, controls, readout methods, success criteria, and failure criteria. Also score the validation strength on a 1-5 integer scale (5 = gold-standard controls + validated assay + clear quantitative endpoint; 3 = reasonable design with some gaps; 1 = insufficient controls or no clear success criterion) and provide a one-sentence rationale.",
      `Hypothesis fields:\n${JSON.stringify(data.parsed, null, 2)}\n\nValidation evidence:\n${evidenceBlock(data.validation_evidence)}${correctionsBlock(data.corrections, "validation")}${memoryBlock(data.memory)}`,
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
          strength_score: { type: "number" },
          strength_rationale: { type: "string" },
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

/* -------------------- Devil's Advocate review -------------------- */

export const runDevilsAdvocate = createServerFn({ method: "POST" })
  .inputValidator(
    (input: {
      parsed: ParsedHypothesis;
      plan: ExperimentPlan;
      protocol_evidence: SearchResult[];
    }) => input,
  )
  .handler(async ({ data }): Promise<DevilsAdvocateReview> => {
    const evidence = (data.protocol_evidence ?? [])
      .slice(0, 3)
      .map((r, i) => `[${i + 1}] ${r.title}\n${r.url}\n${(r.content ?? "").slice(0, 300)}`)
      .join("\n\n");

    return callAIJson<DevilsAdvocateReview>(
      `You are a senior research scientist with 20 years of bench experience.
You have just received a draft experiment plan generated by an AI tool.
Your job is to identify weaknesses, hidden assumptions, risks, and missing elements before the plan is sent to a lab.
Be constructively critical. Strengthen the plan so a real lab would not hit unexpected problems on day one.
For each section (Protocol, Materials, Budget, Timeline, Validation), identify the single most important issue.

Rules:
- Be specific. Do not say "verify this step" — say what exactly needs verifying and why.
- Flag any concentration, temperature, or timing that seems unusual or under-specified.
- Flag any material without a catalog number as a procurement risk.
- Flag budget items that seem significantly underestimated for the experiment type.
- Flag control conditions that appear incomplete or missing.
- Suggest a simpler or better-validated alternative method where one clearly exists.
- Do not fabricate issues. Only flag genuine weaknesses in the provided plan.
- Return between 4 and 6 critiques total, prioritising the most important.
- Score overall_confidence on 1-5 (1 = needs major revision, 3 = plausible verify key steps, 5 = execution-ready).`,
      `Parsed hypothesis:\n${JSON.stringify(data.parsed, null, 2)}\n\nDraft experiment plan:\n${JSON.stringify(data.plan, null, 2)}\n\nTop protocol evidence:\n${evidence || "None retrieved."}`,
      "devils_advocate_review",
      {
        type: "object",
        properties: {
          overall_confidence: { type: "number" },
          verdict: { type: "string" },
          critiques: {
            type: "array",
            items: {
              type: "object",
              properties: {
                section: {
                  type: "string",
                  enum: ["Protocol", "Materials", "Budget", "Timeline", "Validation"],
                },
                issue_type: {
                  type: "string",
                  enum: ["RISK", "ASSUMPTION", "MISSING", "UNREALISTIC", "ALTERNATIVE"],
                },
                critique: { type: "string" },
                suggestion: { type: "string" },
              },
              required: ["section", "issue_type", "critique", "suggestion"],
            },
          },
        },
        required: ["overall_confidence", "verdict", "critiques"],
      },
    );
  });