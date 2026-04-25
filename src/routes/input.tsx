import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowRight, ChevronDown } from "lucide-react";
import { AppHeader } from "@/components/app/Stepper";
import { Spinner } from "@/components/app/Spinner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useApp } from "@/lib/store";
import { parseHypothesis } from "@/server/ai.functions";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { useDemoAutoAdvance } from "@/components/app/DemoToggle";
import { AppFooter } from "@/components/app/AppFooter";

export const Route = createFileRoute("/input")({
  head: () => ({
    meta: [{ title: "Enter hypothesis — AI Scientist" }],
  }),
  component: InputScreen,
});

function InputScreen() {
  const navigate = useNavigate();
  const s = useApp();
  const [open, setOpen] = useState(false);
  const [stage, setStage] = useState<string | null>(null);

  const fParse = useServerFn(parseHypothesis);

  // Demo mode: auto-submit after 2s if hypothesis is non-empty.
  useDemoAutoAdvance(!!s.input_hypothesis.trim() && !stage, 2000, () => {
    void run();
  });

  const run = async () => {
    if (!s.input_hypothesis.trim()) {
      toast.error("Enter a hypothesis first");
      return;
    }
    try {
      setStage("Parsing hypothesis…");
      const parsed = await fParse({
        data: { hypothesis: s.input_hypothesis, experiment_type: s.experiment_type },
      });
      s.set("parsed_hypothesis", parsed);
      // Reset prior retrieval & QC so QC screen knows to re-run.
      s.set("retrieval_results", {
        protocolSources: [],
        literatureSources: [],
        supplierSources: [],
        plasmidSources: [],
        validationSources: [],
      });
      s.set("literature_qc", undefined);
      navigate({ to: "/parsed" });
    } catch (e) {
      console.error(e);
      toast.error(e instanceof Error ? e.message : "Failed to parse hypothesis");
    } finally {
      setStage(null);
    }
  };

  return (
    <div className="min-h-screen">
      <AppHeader stage="input" />
      <main className="mx-auto max-w-2xl px-6 py-10">
        <h1 className="text-2xl font-semibold tracking-tight">
          Enter your scientific hypothesis
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          A clear, falsifiable hypothesis with a quantitative endpoint produces the best plan.
        </p>

        <div className="mt-6 space-y-5">
          <div>
            <Label htmlFor="hyp" className="text-sm">
              Hypothesis
            </Label>
            <Textarea
              id="hyp"
              value={s.input_hypothesis}
              onChange={(e) => s.set("input_hypothesis", e.target.value)}
              rows={6}
              className="mt-2"
              placeholder="e.g. Replacing sucrose with trehalose as a cryoprotectant will increase post-thaw viability of HeLa cells by at least 15 percentage points compared to standard DMSO protocol."
            />
          </div>

          <div>
            <Label className="text-sm">Experiment type</Label>
            <Select
              value={s.experiment_type}
              onValueChange={(v) => s.set("experiment_type", v)}
            >
              <SelectTrigger className="mt-2">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[
                  "Cell Biology",
                  "Diagnostics",
                  "Molecular Biology",
                  "Microbiology",
                  "Other",
                ].map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ChevronDown
              className={`h-3.5 w-3.5 transition-transform ${open ? "rotate-180" : ""}`}
            />
            Optional constraints
          </button>
          {open && (
            <div className="grid gap-4 rounded-lg border bg-card p-4 sm:grid-cols-3">
              <div>
                <Label className="text-xs">Budget cap (€)</Label>
                <Input
                  className="mt-1"
                  value={s.budget_cap ?? ""}
                  onChange={(e) => s.set("budget_cap", e.target.value)}
                  placeholder="5000"
                />
              </div>
              <div>
                <Label className="text-xs">Preferred suppliers</Label>
                <Input
                  className="mt-1"
                  value={s.preferred_suppliers ?? ""}
                  onChange={(e) => s.set("preferred_suppliers", e.target.value)}
                  placeholder="Sigma, Thermo"
                />
              </div>
              <div>
                <Label className="text-xs">Timeline target</Label>
                <Input
                  className="mt-1"
                  value={s.timeline_target ?? ""}
                  onChange={(e) => s.set("timeline_target", e.target.value)}
                  placeholder="4 weeks"
                />
              </div>
            </div>
          )}

          <div className="flex items-center gap-4 pt-2">
            <Button onClick={run} disabled={!!stage} size="lg" className="h-11">
              {stage ? "Working…" : "Run Literature QC"}
              {!stage && <ArrowRight className="ml-2 h-4 w-4" />}
            </Button>
            {stage && <Spinner label={stage} />}
          </div>
        </div>
      </main>
      <AppFooter />
    </div>
  );
}