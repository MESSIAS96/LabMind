import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { AppHeader } from "@/components/app/Stepper";
import { AppFooter } from "@/components/app/AppFooter";
import { Button } from "@/components/ui/button";
import { useApp } from "@/lib/store";
import { PlanTabs } from "@/components/app/PlanTabs";
import { NoveltyBadge } from "@/components/app/NoveltyBadge";
import { DevilsAdvocatePanel, ConfidenceStars } from "@/components/app/DevilsAdvocate";
import { Download, MessageSquare } from "lucide-react";
import { downloadPlanText } from "@/lib/exportPlan";
import { useServerFn } from "@tanstack/react-start";
import { runDevilsAdvocate } from "@/server/ai.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/plan")({
  head: () => ({ meta: [{ title: "Experiment plan — AI Scientist" }] }),
  component: PlanScreen,
});

function PlanScreen() {
  const s = useApp();
  const navigate = useNavigate();
  const p = s.parsed_hypothesis;
  const [daLoading, setDaLoading] = useState(false);
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

  if (!p) {
    return (
      <div className="min-h-screen">
        <AppHeader stage="plan" />
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

  return (
    <div className="min-h-screen">
      <AppHeader stage="plan" />
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
            <Button variant="outline" onClick={() => downloadPlanText(s)}>
              <Download className="mr-2 h-4 w-4" /> Export plan (.txt)
            </Button>
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