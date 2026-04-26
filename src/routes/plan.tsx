import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { AppHeader } from "@/components/app/Stepper";
import { NavArrows } from "@/components/app/NavArrows";
import { AppFooter } from "@/components/app/AppFooter";
import { Button } from "@/components/ui/button";
import { useApp } from "@/lib/store";
import { PlanTabs } from "@/components/app/PlanTabs";
import { NoveltyBadge } from "@/components/app/NoveltyBadge";
import { DevilsAdvocatePanel, ConfidenceStars } from "@/components/app/DevilsAdvocate";
import { Download, MessageSquare, FileText, FileSpreadsheet, ChevronDown, Loader2, Image as ImageIcon, FileType } from "lucide-react";
import { downloadPlanText } from "@/lib/exportPlan";
import { exportToPDF, exportGanttPNG, exportGanttPDF } from "@/lib/exportPdf";
import { exportToXLSX } from "@/lib/exportXlsx";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useServerFn } from "@tanstack/react-start";
import { runDevilsAdvocate } from "@/server/ai.functions";
import { toast } from "sonner";
import { getRelevantMemory } from "@/lib/memoryBank";
import { LearningPanel } from "@/components/app/LearningPanel";

export const Route = createFileRoute("/plan")({
  head: () => ({ meta: [{ title: "Experiment plan — AI Scientist" }] }),
  component: PlanScreen,
});

function PlanScreen() {
  const s = useApp();
  const navigate = useNavigate();
  const p = s.parsed_hypothesis;
  const [daLoading, setDaLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const fDA = useServerFn(runDevilsAdvocate);

  const runDA = async () => {
    if (!p) return;
    setDaLoading(true);
    try {
      const review = await fDA({
        data: {
          parsed: p,
          plan: s.experiment_plan,
          protocol_evidence: s.retrieval_results.protocolSources.slice(0, 3),
        },
      });
      s.set("devils_advocate", review);
    } catch (e) {
      console.error(e);
      toast.error(e instanceof Error ? e.message : "Devil's Advocate failed");
    } finally {
      setDaLoading(false);
    }
  };

  const runExport = async (kind: "pdf" | "xlsx" | "gantt-png" | "gantt-pdf" | "txt") => {
    setExporting(true);
    try {
      if (kind === "pdf") await exportToPDF(s);
      else if (kind === "xlsx") exportToXLSX(s);
      else if (kind === "gantt-png") await exportGanttPNG();
      else if (kind === "gantt-pdf") await exportGanttPDF();
      else downloadPlanText(s);
      toast.success("Downloaded successfully");
    } catch (e) {
      console.error(e);
      toast.error(e instanceof Error ? e.message : "Export failed — please try again");
    } finally {
      setExporting(false);
    }
  };

  if (!p) {
    return (
      <div className="min-h-screen">
        <AppHeader stage="plan" current="plan" />
        <main className="mx-auto max-w-2xl px-6 py-16 text-center">
          <p className="text-muted-foreground">No plan available yet.</p>
          <Button asChild className="mt-4">
            <Link to="/input">Start over</Link>
          </Button>
        </main>
      </div>
    );
  }

  const title = `${p.intervention} → ${p.primary_endpoint} in ${p.model_system}`;
  const memory = getRelevantMemory(p, s.experiment_type);

  return (
    <div className="min-h-screen">
      <AppHeader stage="plan" current="plan" />
      <NavArrows current="plan" />
      <main className="mx-auto max-w-6xl px-6 py-10">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-3">
              {s.literature_qc && (
                <NoveltyBadge signal={s.literature_qc.novelty_signal} compact />
              )}
              {s.devils_advocate && (
                <span className="inline-flex items-center gap-1.5 rounded-full border bg-card px-2 py-0.5 text-xs">
                  <span className="text-muted-foreground">DA:</span>
                  <ConfidenceStars score={s.devils_advocate.overall_confidence} compact />
                </span>
              )}
              <span className="text-xs text-muted-foreground">
                Experiment type: {s.experiment_type}
              </span>
            </div>
          </div>
          <div className="flex gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" disabled={exporting}>
                  {exporting ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Download className="mr-2 h-4 w-4" />
                  )}
                  Export
                  <ChevronDown className="ml-1 h-4 w-4 opacity-60" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-72">
                <ExportRow
                  icon={<FileText className="h-4 w-4 text-primary" />}
                  label="Full Report PDF"
                  sub="Complete plan, all sections"
                  onSelect={() => runExport("pdf")}
                />
                <ExportRow
                  icon={<FileSpreadsheet className="h-4 w-4 text-primary" />}
                  label="Supplier & Budget XLSX"
                  sub="Materials, costs, links, checklist"
                  onSelect={() => runExport("xlsx")}
                />
                <ExportRow
                  icon={<ImageIcon className="h-4 w-4 text-primary" />}
                  label="Gantt Chart PNG"
                  sub="Timeline as image"
                  onSelect={() => runExport("gantt-png")}
                />
                <ExportRow
                  icon={<FileType className="h-4 w-4 text-primary" />}
                  label="Gantt Chart PDF"
                  sub="Timeline, landscape A4"
                  onSelect={() => runExport("gantt-pdf")}
                />
                <ExportRow
                  icon={<FileText className="h-4 w-4 text-muted-foreground" />}
                  label="Plan Summary TXT"
                  sub="Quick plain-text overview"
                  onSelect={() => runExport("txt")}
                />
              </DropdownMenuContent>
            </DropdownMenu>
            <Button onClick={() => navigate({ to: "/review" })}>
              <MessageSquare className="mr-2 h-4 w-4" /> Scientist Review
            </Button>
          </div>
        </div>

        <div className="mt-6">
          <DevilsAdvocatePanel
            review={s.devils_advocate}
            loading={daLoading}
            onRun={runDA}
          />
        </div>

        <div className="mt-4">
          <LearningPanel memory={memory} />
        </div>

        <div className="mt-8">
          <PlanTabs
            plan={s.experiment_plan}
            retrieval={s.retrieval_results}
          />
        </div>
      </main>
      <AppFooter />
    </div>
  );
}

function ExportRow({
  icon,
  label,
  sub,
  onSelect,
}: {
  icon: React.ReactNode;
  label: string;
  sub: string;
  onSelect: () => void;
}) {
  return (
    <DropdownMenuItem
      onSelect={(e) => {
        e.preventDefault();
        onSelect();
      }}
      className="flex items-start gap-3 px-3 py-2.5"
    >
      <span className="mt-0.5">{icon}</span>
      <span className="flex flex-col">
        <span className="text-sm font-medium leading-tight">{label}</span>
        <span className="text-xs text-muted-foreground">{sub}</span>
      </span>
    </DropdownMenuItem>
  );
}