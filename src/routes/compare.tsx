import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppHeader } from "@/components/app/Stepper";
import { NavArrows } from "@/components/app/NavArrows";
import { AppFooter } from "@/components/app/AppFooter";
import { Button } from "@/components/ui/button";
import { useApp } from "@/lib/store";
import { PlanTabs } from "@/components/app/PlanTabs";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ArrowLeft,
  CheckCircle2,
  Eye,
  Plus,
  X,
  Download,
  FileText,
  FileSpreadsheet,
  Image as ImageIcon,
  FileType,
  ChevronDown,
  Loader2,
} from "lucide-react";
import { changedSections, downloadChangeLog, PLAN_SECTIONS } from "@/lib/diffPlan";
import { downloadPlanText } from "@/lib/exportPlan";
import { exportToPDF, exportGanttPNG, exportGanttPDF } from "@/lib/exportPdf";
import { exportToXLSX } from "@/lib/exportXlsx";
import { toast } from "sonner";
import { getRelevantMemory, savePlanToMemory } from "@/lib/memoryBank";
import { LearningPanel } from "@/components/app/LearningPanel";

export const Route = createFileRoute("/compare")({
  head: () => ({ meta: [{ title: "Improved plan — LabMind" }] }),
  component: ImprovedPlanScreen,
});

function ImprovedPlanScreen() {
  const s = useApp();
  const navigate = useNavigate();
  const regen = s.review.regenerated_plan;
  const [bannerOpen, setBannerOpen] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    if (!bannerOpen) return;
    const t = window.setTimeout(() => setBannerOpen(false), 8000);
    return () => window.clearTimeout(t);
  }, [bannerOpen]);

  if (!regen) {
    return (
      <div className="min-h-screen">
        <AppHeader stage="review" current="compare" />
        <main className="mx-auto max-w-2xl px-6 py-16 text-center">
          <p className="text-muted-foreground">No improved plan yet.</p>
          <Button asChild className="mt-4">
            <Link to="/review">Go to review</Link>
          </Button>
        </main>
      </div>
    );
  }

  const p = s.parsed_hypothesis;
  const title = p
    ? `${p.intervention} → ${p.primary_endpoint} in ${p.model_system}`
    : "Improved experiment plan";

  const changed = changedSections(s.experiment_plan, regen);
  const corrections = s.review.corrections;
  const manualCount = corrections.filter((c) => c.notes.trim() || c.issue_tags.length || c.rating > 0).length;

  // Build a state-like object whose experiment_plan is the regenerated one,
  // so existing exports operate on the improved plan.
  const improvedState = { ...s, experiment_plan: regen };
  const memory = p ? getRelevantMemory(p, s.experiment_type) : { similar_plans: [], relevant_corrections: [], learned_patterns: [] };

  const runExport = async (kind: "pdf" | "xlsx" | "gantt-png" | "gantt-pdf" | "txt") => {
    setExporting(true);
    try {
      if (kind === "pdf") await exportToPDF(improvedState);
      else if (kind === "xlsx") exportToXLSX(improvedState);
      else if (kind === "gantt-png") await exportGanttPNG();
      else if (kind === "gantt-pdf") await exportGanttPDF();
      else downloadPlanText(improvedState);
      toast.success("Downloaded successfully");
    } catch (e) {
      console.error(e);
      toast.error(e instanceof Error ? e.message : "Export failed — please try again");
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="min-h-screen">
      <AppHeader stage="review" current="compare" />
      <NavArrows current="compare" />
      <main className="mx-auto max-w-6xl px-6 py-8">
        {bannerOpen && (
          <div className="mb-4 flex items-center justify-between gap-3 rounded-lg border border-primary/30 bg-primary/10 px-4 py-2.5 text-sm text-foreground">
            <span>
              <CheckCircle2 className="mr-2 inline h-4 w-4 text-primary" />
              Plan improved · {changed.length} section{changed.length === 1 ? "" : "s"} updated · {manualCount} correction{manualCount === 1 ? "" : "s"} applied
            </span>
            <button
              type="button"
              onClick={() => setBannerOpen(false)}
              className="rounded p-1 text-muted-foreground hover:text-foreground"
              aria-label="Dismiss"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="rounded-full border border-primary/40 bg-primary/10 px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide text-primary">
                v2 — Improved plan
              </span>
            </div>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight">{title}</h1>
            <p className="mt-1 text-xs text-muted-foreground">
              This plan incorporates your corrections. Updated sections are marked with a green border.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => navigate({ to: "/review" })}>
              <ArrowLeft className="mr-2 h-4 w-4" /> Revise again
            </Button>
            <Button variant="outline" size="sm" onClick={() => setDrawerOpen(true)}>
              <Eye className="mr-2 h-4 w-4" /> View changes
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" disabled={exporting}>
                  {exporting ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Download className="mr-2 h-4 w-4" />
                  )}
                  Export
                  <ChevronDown className="ml-1 h-4 w-4 opacity-60" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64">
                <DropdownMenuItem onSelect={(e) => { e.preventDefault(); runExport("pdf"); }}>
                  <FileText className="mr-2 h-4 w-4 text-primary" /> Full Report PDF
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={(e) => { e.preventDefault(); runExport("xlsx"); }}>
                  <FileSpreadsheet className="mr-2 h-4 w-4 text-primary" /> Supplier & Budget XLSX
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={(e) => { e.preventDefault(); runExport("gantt-png"); }}>
                  <ImageIcon className="mr-2 h-4 w-4 text-primary" /> Gantt Chart PNG
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={(e) => { e.preventDefault(); runExport("gantt-pdf"); }}>
                  <FileType className="mr-2 h-4 w-4 text-primary" /> Gantt Chart PDF
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={(e) => { e.preventDefault(); runExport("txt"); }}>
                  <FileText className="mr-2 h-4 w-4 text-muted-foreground" /> Plan Summary TXT
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                s.reset();
                navigate({ to: "/input" });
              }}
            >
              <Plus className="mr-2 h-4 w-4" /> Start new
            </Button>
          </div>
        </div>

        <div className="mt-8">
          <ImprovedPlanView changed={changed} regen={regen} retrieval={s.retrieval_results} />
        </div>

        <div className="mt-4">
          <LearningPanel memory={memory} />
        </div>
      </main>
      <AppFooter />

      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-[480px]">
          <SheetHeader>
            <SheetTitle>What changed</SheetTitle>
            <SheetDescription>
              {changed.length} of {PLAN_SECTIONS.length} sections were improved in this pass.
            </SheetDescription>
          </SheetHeader>
          <div className="mt-6 space-y-5">
            {changed.length === 0 && (
              <p className="text-sm text-muted-foreground">No sections were modified.</p>
            )}
            {changed.map((key) => {
              const label = PLAN_SECTIONS.find((x) => x.key === key)?.label ?? key;
              const correction = corrections.find((c) => c.section === key);
              return (
                <div key={key} className="rounded-lg border bg-card p-3">
                  <div className="text-sm font-medium">{label}</div>
                  <div className="mt-2 grid gap-2">
                    <div className="rounded-md border border-[oklch(0.6_0.2_27)/0.3] bg-[oklch(0.6_0.2_27)/0.08] p-2 text-xs">
                      <div className="mb-1 font-medium text-[oklch(0.5_0.2_27)] dark:text-[oklch(0.82_0.18_27)]">
                        Original
                      </div>
                      <pre className="whitespace-pre-wrap break-words font-sans text-[11px] leading-relaxed">
                        {summarize(s.experiment_plan[key])}
                      </pre>
                    </div>
                    <div className="rounded-md border border-[oklch(0.6_0.13_150)/0.4] bg-[oklch(0.6_0.13_150)/0.08] p-2 text-xs">
                      <div className="mb-1 font-medium text-[oklch(0.4_0.13_150)] dark:text-[oklch(0.8_0.14_150)]">
                        Improved
                      </div>
                      <pre className="whitespace-pre-wrap break-words font-sans text-[11px] leading-relaxed">
                        {summarize(regen[key])}
                      </pre>
                    </div>
                  </div>
                  {correction && (
                    <div className="mt-2 text-[11px] text-muted-foreground">
                      👩‍🔬 Scientist: {correction.issue_tags.join(", ") || "general"}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <SheetFooter className="mt-6 flex-row justify-between gap-2 sm:justify-between">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                try {
                  downloadChangeLog(s);
                  toast.success("Change log downloaded");
                } catch (e) {
                  toast.error("Failed to export change log");
                  console.error(e);
                }
              }}
            >
              <Download className="mr-2 h-4 w-4" /> Export change log
            </Button>
            <Button size="sm" onClick={() => setDrawerOpen(false)}>
              Close
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}

function ImprovedPlanView({
  changed,
  regen,
  retrieval,
}: {
  changed: ReturnType<typeof changedSections>;
  regen: ReturnType<typeof Object>;
  retrieval: ReturnType<typeof Object>;
}) {
  // Render the improved plan via PlanTabs; surface a small chip listing improved sections.
  return (
    <div className="space-y-4">
      {changed.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="text-muted-foreground">Improved:</span>
          {changed.map((k) => {
            const label = PLAN_SECTIONS.find((x) => x.key === k)?.label ?? k;
            return (
              <span
                key={k as string}
                className="rounded-full border border-[oklch(0.6_0.13_150)/0.4] bg-[oklch(0.6_0.13_150)/0.08] px-2 py-0.5 font-medium text-[oklch(0.4_0.13_150)] dark:text-[oklch(0.8_0.14_150)]"
              >
                ✓ {label}
              </span>
            );
          })}
        </div>
      )}
      <div
        className={
          changed.length > 0
            ? "rounded-xl border-l-2 border-l-[oklch(0.55_0.13_150)] border bg-card p-4"
            : "rounded-xl border bg-card p-4"
        }
      >
        <PlanTabs plan={regen} retrieval={retrieval} />
      </div>
    </div>
  );
}

function summarize(value: unknown): string {
  if (value == null) return "(empty)";
  if (typeof value === "string") return value;
  try {
    const json = JSON.stringify(value, null, 2);
    return json.length > 600 ? json.slice(0, 600) + "\n…" : json;
  } catch {
    return String(value);
  }
}