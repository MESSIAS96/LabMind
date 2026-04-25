import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { AppHeader } from "@/components/app/Stepper";
import { NavArrows } from "@/components/app/NavArrows";
import { Spinner } from "@/components/app/Spinner";
import { NoveltyBadge } from "@/components/app/NoveltyBadge";
import { Button } from "@/components/ui/button";
import { useApp } from "@/lib/store";
import { ArrowRight, Check, ExternalLink, Loader2, X } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import {
  fetchProtocolsIO,
  fetchPubMed,
  fetchAddgene,
  fetchTavilyProtocols,
  fetchTavilySuppliers,
  fetchTavilyValidation,
  searchSemanticScholar,
  classifyNovelty,
  generateProtocol,
  generateMaterials,
  generateBudget,
  generateTimeline,
  generateValidation,
} from "@/server/ai.functions";
import { toast } from "sonner";
import type { RetrievalResults, SearchResult } from "@/lib/types";
import { cn } from "@/lib/utils";
import { SourceBadge } from "@/components/app/SourceBadge";
import { useDemoAutoAdvance } from "@/components/app/DemoToggle";
import { AppFooter } from "@/components/app/AppFooter";

export const Route = createFileRoute("/qc")({
  head: () => ({ meta: [{ title: "Literature QC — AI Scientist" }] }),
  component: QCScreen,
});

type Status = "pending" | "loading" | "done" | "error";

const SOURCE_KEYS = [
  "protocolsIO",
  "pubMed",
  "scholar",
  "addgene",
  "tavilyProtocols",
  "tavilySuppliers",
  "tavilyValidation",
] as const;
type SourceKey = (typeof SOURCE_KEYS)[number];

const SOURCE_LABELS: Record<SourceKey, string> = {
  protocolsIO: "protocols.io",
  pubMed: "PubMed",
  scholar: "Semantic Scholar",
  addgene: "Addgene",
  tavilyProtocols: "Protocol repositories",
  tavilySuppliers: "Supplier catalogs",
  tavilyValidation: "Validation references",
};

function QCScreen() {
  const s = useApp();
  const navigate = useNavigate();
  const [genStage, setGenStage] = useState<string | null>(null);
  const [statuses, setStatuses] = useState<Record<SourceKey, Status>>(() =>
    Object.fromEntries(SOURCE_KEYS.map((k) => [k, "pending"])) as Record<SourceKey, Status>,
  );
  const [counts, setCounts] = useState<Record<SourceKey, number>>(() =>
    Object.fromEntries(SOURCE_KEYS.map((k) => [k, 0])) as Record<SourceKey, number>,
  );
  const startedRef = useRef(false);

  const fProto = useServerFn(generateProtocol);
  const fMat = useServerFn(generateMaterials);
  const fBud = useServerFn(generateBudget);
  const fTim = useServerFn(generateTimeline);
  const fVal = useServerFn(generateValidation);

  const fProtocolsIO = useServerFn(fetchProtocolsIO);
  const fPubMed = useServerFn(fetchPubMed);
  const fScholar = useServerFn(searchSemanticScholar);
  const fAddgene = useServerFn(fetchAddgene);
  const fTavProto = useServerFn(fetchTavilyProtocols);
  const fTavSup = useServerFn(fetchTavilySuppliers);
  const fTavVal = useServerFn(fetchTavilyValidation);
  const fNov = useServerFn(classifyNovelty);

  const ready = !!s.literature_qc;

  // Demo mode: pause 5s on novelty, then auto-generate plan.
  useDemoAutoAdvance(ready && !genStage && !s.experiment_plan.protocol, 5000, () => {
    void generate();
  });

  useEffect(() => {
    if (!s.parsed_hypothesis) return;
    if (ready) return;
    if (startedRef.current) return;
    startedRef.current = true;

    const parsed = s.parsed_hypothesis;

    const setStatus = (k: SourceKey, st: Status, count = 0) => {
      setStatuses((cur) => ({ ...cur, [k]: st }));
      if (st === "done") setCounts((cur) => ({ ...cur, [k]: count }));
    };

    const wrap = async <T,>(
      key: SourceKey,
      promise: Promise<{ results: SearchResult[] } | T>,
    ): Promise<SearchResult[]> => {
      setStatus(key, "loading");
      try {
        const r = (await promise) as { results: SearchResult[] };
        const arr = r.results ?? [];
        setStatus(key, "done", arr.length);
        return arr;
      } catch (e) {
        console.error(`${key} failed`, e);
        setStatus(key, "error");
        return [];
      }
    };

    (async () => {
      const settled = await Promise.allSettled([
        wrap("protocolsIO", fProtocolsIO({ data: { parsed } })),
        wrap("pubMed", fPubMed({ data: { parsed } })),
        wrap("scholar", fScholar({ data: { parsed } })),
        wrap("addgene", fAddgene({ data: { parsed, experiment_type: s.experiment_type } })),
        wrap("tavilyProtocols", fTavProto({ data: { parsed } })),
        wrap("tavilySuppliers", fTavSup({ data: { parsed } })),
        wrap("tavilyValidation", fTavVal({ data: { parsed } })),
      ]);

      const get = (i: number): SearchResult[] =>
        settled[i].status === "fulfilled" ? (settled[i] as PromiseFulfilledResult<SearchResult[]>).value : [];

      const retrieval: RetrievalResults = {
        protocolSources: [...get(0), ...get(4)],
        literatureSources: [...get(1), ...get(2)],
        supplierSources: get(5),
        plasmidSources: get(3),
        validationSources: get(6),
      };
      s.set("retrieval_results", retrieval);

      try {
        const qc = await fNov({
          data: {
            parsed,
            tavily: retrieval.protocolSources,
            scholar: retrieval.literatureSources,
          },
        });
        s.set("literature_qc", qc);
      } catch (e) {
        console.error("novelty failed", e);
        toast.error("Novelty classification failed");
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [s.parsed_hypothesis, ready]);

  if (!s.parsed_hypothesis) {
    return (
      <div className="min-h-screen">
        <AppHeader stage="qc" />
        <NavArrows current="qc" />
        <main className="mx-auto max-w-2xl px-6 py-16 text-center">
          <p className="text-muted-foreground">Start from the hypothesis screen.</p>
          <Button asChild className="mt-4">
            <Link to="/input">Go to input</Link>
          </Button>
        </main>
      </div>
    );
  }

  if (!ready) {
    return (
      <div className="min-h-screen">
        <AppHeader stage="qc" />
        <NavArrows current="qc" />
        <main className="mx-auto max-w-2xl px-6 py-12">
          <h1 className="text-2xl font-semibold tracking-tight">Searching scientific sources…</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Querying direct APIs and domain-constrained scrapers in parallel. Estimated time: ~15 seconds.
          </p>
          <ul className="mt-6 space-y-2 rounded-xl border bg-card p-4">
            {SOURCE_KEYS.map((k) => (
              <li key={k} className="flex items-center justify-between gap-3 text-sm">
                <span className="flex items-center gap-2">
                  <StatusIcon status={statuses[k]} />
                  <span className={cn(statuses[k] === "done" && "text-foreground", statuses[k] !== "done" && "text-muted-foreground")}>
                    {SOURCE_LABELS[k]}
                  </span>
                </span>
                {statuses[k] === "done" && (
                  <span className="text-xs text-muted-foreground">{counts[k]} result{counts[k] === 1 ? "" : "s"}</span>
                )}
                {statuses[k] === "error" && <span className="text-xs text-destructive">failed</span>}
              </li>
            ))}
          </ul>
          <div className="mt-4 text-xs text-muted-foreground">
            Classifying novelty once retrieval completes…
          </div>
        </main>
      </div>
    );
  }

  const generate = async () => {
    if (!s.parsed_hypothesis) return;
    try {
      const r = s.retrieval_results;
      setGenStage("Generating protocol…");
      const protocol = await fProto({
        data: { parsed: s.parsed_hypothesis, protocol_evidence: r.protocolSources },
      });
      s.setPlanPart("protocol", protocol);

      setGenStage("Building materials list…");
      const materials = await fMat({
        data: {
          parsed: s.parsed_hypothesis,
          supplier_evidence: [...r.supplierSources, ...r.plasmidSources],
        },
      });
      s.setPlanPart("materials", materials);

      setGenStage("Estimating budget…");
      const budget = await fBud({
        data: { parsed: s.parsed_hypothesis, materials, budget_cap: s.budget_cap },
      });
      s.setPlanPart("budget", budget);

      setGenStage("Building timeline…");
      const timeline = await fTim({
        data: { parsed: s.parsed_hypothesis, protocol, timeline_target: s.timeline_target },
      });
      s.setPlanPart("timeline", timeline);

      setGenStage("Defining validation approach…");
      const validation = await fVal({
        data: { parsed: s.parsed_hypothesis, validation_evidence: r.validationSources },
      });
      s.setPlanPart("validation", validation);

      navigate({ to: "/plan" });
    } catch (e) {
      console.error(e);
      toast.error(e instanceof Error ? e.message : "Generation failed");
    } finally {
      setGenStage(null);
    }
  };

  const qc = s.literature_qc!;
  const retrieval = s.retrieval_results;
  const protocols = retrieval.protocolSources.slice(0, 5);

  return (
    <div className="min-h-screen">
      <AppHeader stage="qc" />
      <NavArrows current="qc" />
      <main className="mx-auto max-w-4xl px-6 py-10">
        <h1 className="text-2xl font-semibold tracking-tight">Literature Quality Control</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Novelty signal and supporting references from peer-reviewed sources and protocol repositories.
        </p>

        <div className="mt-6">
          <NoveltyBadge signal={qc.novelty_signal} />
        </div>

        <section className="mt-8">
          <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-muted-foreground">
            Top references
          </h2>
          <div className="grid gap-3">
            {qc.references.length === 0 && (
              <div className="rounded-lg border bg-card p-4 text-sm text-muted-foreground">
                No references returned.
              </div>
            )}
            {qc.references.map((r, i) => (
              <a
                key={i}
                href={r.url}
                target="_blank"
                rel="noreferrer"
                className="group rounded-lg border bg-card p-4 transition-colors hover:border-primary/60"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-medium leading-snug">{r.title}</div>
                    <div className="mt-1 text-xs text-muted-foreground">{r.source}</div>
                    <p className="mt-2 text-sm text-muted-foreground">{r.relevance}</p>
                  </div>
                  <ExternalLink className="h-4 w-4 shrink-0 text-muted-foreground transition-colors group-hover:text-primary" />
                </div>
              </a>
            ))}
          </div>
        </section>

        <section className="mt-8">
          <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-muted-foreground">
            Protocol evidence
          </h2>
          <div className="grid gap-3">
            {protocols.length === 0 && (
              <div className="rounded-lg border bg-card p-4 text-sm text-muted-foreground">
                No protocol sources retrieved.
              </div>
            )}
            {protocols.map((r, i) => (
              <a
                key={i}
                href={r.url}
                target="_blank"
                rel="noreferrer"
                className="group rounded-lg border bg-card p-4 transition-colors hover:border-primary/60"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <SourceBadge source={r.source ?? "Other"} />
                      <div className="font-medium leading-snug">{r.title}</div>
                    </div>
                    <div className="truncate text-xs text-muted-foreground">{r.url}</div>
                  </div>
                  <ExternalLink className="h-4 w-4 shrink-0 text-muted-foreground" />
                </div>
              </a>
            ))}
          </div>
        </section>

        <div className="mt-10 flex items-center gap-4">
          <Button size="lg" onClick={generate} disabled={!!genStage}>
            {genStage ? "Generating…" : "Generate experiment plan"}
            {!genStage && <ArrowRight className="ml-2 h-4 w-4" />}
          </Button>
          {genStage && <Spinner label={genStage} />}
        </div>
      </main>
      <AppFooter />
    </div>
  );
}

function StatusIcon({ status }: { status: Status }) {
  if (status === "done")
    return (
      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/15 text-primary">
        <Check className="h-3 w-3" />
      </span>
    );
  if (status === "loading")
    return <Loader2 className="h-4 w-4 animate-spin text-primary" />;
  if (status === "error")
    return (
      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-destructive/15 text-destructive">
        <X className="h-3 w-3" />
      </span>
    );
  return <span className="h-2 w-2 rounded-full bg-muted-foreground/30" />;
}