import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { AppHeader } from "@/components/app/Stepper";
import { NavArrows } from "@/components/app/NavArrows";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Star,
  ArrowRight,
  CheckCircle2,
  ArrowLeft,
  Download,
  ChevronDown,
  Loader2,
  FileText,
  FileSpreadsheet,
  Image as ImageIcon,
  FileType,
  Bot,
  Info,
} from "lucide-react";
import { useApp } from "@/lib/store";
import { cn } from "@/lib/utils";
import { useServerFn } from "@tanstack/react-start";
import {
  generateProtocol,
  generateMaterials,
  generateBudget,
  generateTimeline,
  generateValidation,
} from "@/server/ai.functions";
import { Spinner } from "@/components/app/Spinner";
import { toast } from "sonner";
import type { Correction } from "@/lib/types";
import { useEffect, useRef } from "react";
import { mapDAToReviewCorrections } from "@/lib/daToReview";
import { getRelevantMemory, savePlanToMemory } from "@/lib/memoryBank";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { downloadPlanText } from "@/lib/exportPlan";
import { exportToPDF, exportProtocolRecipePDF } from "@/lib/exportPdf";
import { exportToXLSX } from "@/lib/exportXlsx";

export const Route = createFileRoute("/review")({
  head: () => ({ meta: [{ title: "Scientist review — AI Scientist" }] }),
  component: ReviewScreen,
});

const SECTIONS: { key: Correction["section"]; label: string }[] = [
  { key: "protocol", label: "Protocol" },
  { key: "materials", label: "Materials" },
  { key: "budget", label: "Budget" },
  { key: "timeline", label: "Timeline" },
  { key: "validation", label: "Validation" },
];

const ISSUES = [
  "unrealistic",
  "incomplete",
  "missing control",
  "missing supplier",
  "weak validation",
  "budget issue",
];

function ReviewCard({
  sectionKey,
  label,
}: {
  sectionKey: Correction["section"];
  label: string;
}) {
  const s = useApp();
  const existing = s.review.corrections.find((c) => c.section === sectionKey);
  const [rating, setRating] = useState<number>(existing?.rating ?? 0);
  const [tags, setTags] = useState<string[]>(existing?.issue_tags ?? []);
  const [notes, setNotes] = useState<string>(existing?.notes ?? "");

  const save = (next: { rating?: number; tags?: string[]; notes?: string }) => {
    const r = next.rating ?? rating;
    const t = next.tags ?? tags;
    const n = next.notes ?? notes;
    s.addCorrection({ section: sectionKey, rating: r, issue_tags: t, notes: n });
  };

  return (
    <div className="rounded-xl border bg-card p-5">
      <div className="flex items-center justify-between">
        <h3 className="font-medium">{label}</h3>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              onClick={() => {
                setRating(n);
                save({ rating: n });
              }}
              aria-label={`Rate ${n}`}
            >
              <Star
                className={cn(
                  "h-4 w-4",
                  n <= rating ? "fill-primary text-primary" : "text-muted-foreground",
                )}
              />
            </button>
          ))}
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {ISSUES.map((tag) => {
          const on = tags.includes(tag);
          return (
            <button
              key={tag}
              onClick={() => {
                const next = on ? tags.filter((x) => x !== tag) : [...tags, tag];
                setTags(next);
                save({ tags: next });
              }}
              className={cn(
                "rounded-full border px-2.5 py-1 text-xs transition-colors",
                on
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border text-muted-foreground hover:text-foreground",
              )}
            >
              {tag}
            </button>
          );
        })}
      </div>
      <Textarea
        value={notes}
        onChange={(e) => {
          setNotes(e.target.value);
          save({ notes: e.target.value });
        }}
        rows={3}
        placeholder="Specific corrections, missing controls, recommended changes…"
        className="mt-3"
      />
    </div>
  );
}

function ReviewScreen() {
  const s = useApp();
  const navigate = useNavigate();
  const [stage, setStage] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  // Part F — pre-fill DA findings into the review form on first mount when
  // (a) the user has run Devil's Advocate and (b) hasn't already entered any
  // manual content yet. Banner is shown whenever the prefill happened in this
  // session. The user may freely edit / clear any field afterwards.
  const [daBannerOpen, setDaBannerOpen] = useState(false);
  const prefilledRef = useRef(false);

  useEffect(() => {
    if (prefilledRef.current) return;
    if (!s.devils_advocate?.critiques?.length) return;
    const existing = s.review.corrections;
    const hasUserContent = existing.some(
      (c) => c.notes.trim() || c.issue_tags.length > 0 || c.rating > 0,
    );
    if (hasUserContent) {
      // User already has corrections — don't overwrite, but still surface banner
      // so they know DA results are available.
      setDaBannerOpen(true);
      prefilledRef.current = true;
      return;
    }
    const mapped = mapDAToReviewCorrections(s.devils_advocate);
    if (!mapped.length) return;
    for (const c of mapped) s.addCorrection(c);
    setDaBannerOpen(true);
    prefilledRef.current = true;
  }, [s]);

  const fProto = useServerFn(generateProtocol);
  const fMat = useServerFn(generateMaterials);
  const fBud = useServerFn(generateBudget);
  const fTim = useServerFn(generateTimeline);
  const fVal = useServerFn(generateValidation);

  if (!s.parsed_hypothesis) {
    return (
      <div className="min-h-screen">
        <AppHeader stage="review" current="review" />
        <main className="mx-auto max-w-2xl px-6 py-16 text-center">
          <p className="text-muted-foreground">Generate a plan first.</p>
          <Button asChild className="mt-4">
            <Link to="/input">Start</Link>
          </Button>
        </main>
      </div>
    );
  }

  const flagged = s.review.corrections.filter(
    (c) => c.rating > 0 || c.issue_tags.length || c.notes.trim(),
  );

  const runExport = async (kind: "pdf" | "recipe" | "xlsx" | "txt") => {
    setExporting(true);
    try {
      if (kind === "pdf") await exportToPDF(s);
      else if (kind === "recipe") await exportProtocolRecipePDF(s);
      else if (kind === "xlsx") exportToXLSX(s);
      else downloadPlanText(s);
      toast.success("Downloaded successfully");
    } catch (e) {
      console.error(e);
      toast.error(e instanceof Error ? e.message : "Export failed — please try again");
    } finally {
      setExporting(false);
    }
  };

  const regenerate = async () => {
    if (!s.parsed_hypothesis) return;
    const cors = s.review.corrections;
    const memory = getRelevantMemory(s.parsed_hypothesis, s.experiment_type);
    try {
      setStage("Regenerating protocol…");
      const protocol = await fProto({
        data: {
          parsed: s.parsed_hypothesis,
          protocol_evidence: s.retrieval_results.protocolSources,
          corrections: cors,
          memory,
        },
      });
      s.setRegeneratedPart("protocol", protocol);

      setStage("Regenerating materials…");
      const materials = await fMat({
        data: {
          parsed: s.parsed_hypothesis,
          supplier_evidence: [
            ...s.retrieval_results.supplierSources,
            ...s.retrieval_results.plasmidSources,
          ],
          corrections: cors,
          memory,
        },
      });
      s.setRegeneratedPart("materials", materials);

      setStage("Regenerating budget…");
      const budget = await fBud({
        data: {
          parsed: s.parsed_hypothesis,
          materials,
          budget_cap: s.budget_cap,
          corrections: cors,
          memory,
        },
      });
      s.setRegeneratedPart("budget", budget);

      setStage("Regenerating timeline…");
      const timeline = await fTim({
        data: {
          parsed: s.parsed_hypothesis,
          protocol,
          timeline_target: s.timeline_target,
          corrections: cors,
          memory,
        },
      });
      s.setRegeneratedPart("timeline", timeline);

      setStage("Regenerating validation…");
      const validation = await fVal({
        data: {
          parsed: s.parsed_hypothesis,
          validation_evidence: s.retrieval_results.validationSources,
          corrections: cors,
          memory,
        },
      });
      s.setRegeneratedPart("validation", validation);

      // Persist regenerated plan into the learning memory bank
      try {
        savePlanToMemory({
          state: s,
          finalPlan: { protocol, materials, budget, timeline, validation },
          approved: false,
          revision_count: 2,
        });
      } catch (err) {
        console.warn("memory save failed", err);
      }

      navigate({ to: "/compare" });
    } catch (e) {
      console.error(e);
      toast.error(e instanceof Error ? e.message : "Regeneration failed");
    } finally {
      setStage(null);
    }
  };

  return (
    <div className="min-h-screen">
      <AppHeader stage="review" current="review" />
      <NavArrows current="review" />
      <main className="mx-auto max-w-4xl px-6 py-10">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Scientist Review</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Rate each section, flag issues, and add corrections. The next pass will incorporate your notes.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link to="/plan">
                <ArrowLeft className="mr-2 h-4 w-4" /> Back to plan
              </Link>
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" disabled={exporting}>
                  {exporting ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Download className="mr-2 h-4 w-4" />
                  )}
                  Export pre-review plan
                  <ChevronDown className="ml-1 h-4 w-4 opacity-60" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64">
                <DropdownMenuItem onSelect={(e) => { e.preventDefault(); runExport("pdf"); }}>
                  <FileText className="mr-2 h-4 w-4 text-primary" /> Full Report PDF
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={(e) => { e.preventDefault(); runExport("recipe"); }}>
                  <FileText className="mr-2 h-4 w-4 text-primary" /> Detailed Protocol Recipe PDF
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={(e) => { e.preventDefault(); runExport("xlsx"); }}>
                  <FileSpreadsheet className="mr-2 h-4 w-4 text-primary" /> Supplier & Budget XLSX
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={(e) => { e.preventDefault(); runExport("txt"); }}>
                  <FileText className="mr-2 h-4 w-4 text-muted-foreground" /> Plan Summary TXT
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {daBannerOpen && (
          <div className="mt-6 flex items-start gap-3 rounded-lg border border-primary/30 bg-primary/10 px-4 py-3 text-sm">
            <Bot className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <div className="min-w-0 flex-1">
              <div className="font-medium">
                Devil's Advocate findings have been pre-loaded as a starting point.
              </div>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Edit, remove, or add your own corrections below. Each pre-filled note is marked 🤖.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setDaBannerOpen(false)}
              className="rounded p-1 text-muted-foreground hover:text-foreground"
              aria-label="Dismiss"
            >
              ✕
            </button>
          </div>
        )}
        {!daBannerOpen && !s.devils_advocate && (
          <div className="mt-6 flex items-start gap-3 rounded-lg border bg-muted/40 px-4 py-3 text-sm">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
            <div className="text-xs text-muted-foreground">
              Review each section and enter corrections. The plan will be improved based on your input.
            </div>
          </div>
        )}

        <div className="mt-6 grid gap-4">
          {SECTIONS.map((sec) => (
            <ReviewCard
              key={`${sec.key}-${prefilledRef.current ? "da" : "plain"}`}
              sectionKey={sec.key}
              label={sec.label}
            />
          ))}
        </div>

        <div className="mt-6 rounded-xl border bg-accent/30 p-5">
          <h3 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
            Flagged corrections
          </h3>
          {flagged.length === 0 ? (
            <p className="mt-2 text-sm text-muted-foreground">None yet.</p>
          ) : (
            <ul className="mt-3 space-y-2 text-sm">
              {flagged.map((c, i) => (
                <li key={i} className="rounded-md border bg-card p-3">
                  <div className="font-medium capitalize">{c.section}</div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    Rating {c.rating}/5 · {c.issue_tags.join(", ") || "no tags"}
                  </div>
                  {c.notes && <p className="mt-1 text-sm">{c.notes}</p>}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="mt-8 flex flex-wrap items-center gap-3">
          <Button onClick={regenerate} disabled={!!stage} size="lg">
            {stage ? "Regenerating…" : "Save corrections and regenerate"}
            {!stage && <ArrowRight className="ml-2 h-4 w-4" />}
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              try {
                savePlanToMemory({
                  state: s,
                  finalPlan: s.review.regenerated_plan ?? s.experiment_plan,
                  approved: true,
                  revision_count: s.review.regenerated_plan ? 2 : 1,
                });
              } catch (err) {
                console.warn("memory save failed", err);
              }
              toast.success("Plan approved · saved to learning memory");
              navigate({ to: "/plan" });
            }}
          >
            <CheckCircle2 className="mr-2 h-4 w-4" /> Approve current plan
          </Button>
          {stage && <Spinner label={stage} />}
        </div>
      </main>
    </div>
  );
}