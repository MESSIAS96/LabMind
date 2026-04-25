import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { AppHeader } from "@/components/app/Stepper";
import { Button } from "@/components/ui/button";
import { useApp } from "@/lib/store";
import { PlanTabs } from "@/components/app/PlanTabs";
import { NoveltyBadge } from "@/components/app/NoveltyBadge";
import { Download, MessageSquare } from "lucide-react";
import { exportPlanPdf } from "@/lib/exportPdf";

export const Route = createFileRoute("/plan")({
  head: () => ({ meta: [{ title: "Experiment plan — AI Scientist" }] }),
  component: PlanScreen,
});

function PlanScreen() {
  const s = useApp();
  const navigate = useNavigate();
  const p = s.parsed_hypothesis;

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
              <span className="text-xs text-muted-foreground">
                Experiment type: {s.experiment_type}
              </span>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => exportPlanPdf(s)}>
              <Download className="mr-2 h-4 w-4" /> Export PDF
            </Button>
            <Button onClick={() => navigate({ to: "/review" })}>
              <MessageSquare className="mr-2 h-4 w-4" /> Scientist Review
            </Button>
          </div>
        </div>

        <div className="mt-8">
          <PlanTabs
            plan={s.experiment_plan}
            retrieval={s.retrieval_results}
          />
        </div>
      </main>
    </div>
  );
}