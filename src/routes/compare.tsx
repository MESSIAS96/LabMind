import { createFileRoute, Link } from "@tanstack/react-router";
import { AppHeader } from "@/components/app/Stepper";
import { Button } from "@/components/ui/button";
import { useApp } from "@/lib/store";
import { PlanTabs } from "@/components/app/PlanTabs";

export const Route = createFileRoute("/compare")({
  head: () => ({ meta: [{ title: "Plan comparison — AI Scientist" }] }),
  component: CompareScreen,
});

function CompareScreen() {
  const s = useApp();
  const regen = s.review.regenerated_plan;

  if (!regen) {
    return (
      <div className="min-h-screen">
        <AppHeader stage="review" />
        <main className="mx-auto max-w-2xl px-6 py-16 text-center">
          <p className="text-muted-foreground">No regenerated plan yet.</p>
          <Button asChild className="mt-4">
            <Link to="/review">Go to review</Link>
          </Button>
        </main>
      </div>
    );
  }

  const sources = {
    protocol: s.tavily_protocol_results,
    supplier: s.tavily_supplier_results,
    validation: s.tavily_validation_results,
    scholar: s.semantic_scholar_results,
  };

  return (
    <div className="min-h-screen">
      <AppHeader stage="review" />
      <main className="mx-auto max-w-7xl px-6 py-10">
        <h1 className="text-2xl font-semibold tracking-tight">Plan comparison</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          This plan incorporates your expert corrections. Sections updated by the regeneration are
          outlined in green.
        </p>

        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <div>
            <div className="mb-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Original
            </div>
            <div className="rounded-xl border bg-card p-4">
              <PlanTabs plan={s.experiment_plan} sources={sources} />
            </div>
          </div>
          <div>
            <div className="mb-3 flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-[oklch(0.4_0.13_150)] dark:text-[oklch(0.8_0.14_150)]">
              <span className="h-1.5 w-1.5 rounded-full bg-[oklch(0.6_0.13_150)]" />
              Improved
            </div>
            <div className="rounded-xl border-2 border-[oklch(0.6_0.13_150)/0.5] bg-[oklch(0.6_0.13_150)/0.04] p-4">
              <PlanTabs plan={regen} sources={sources} />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}