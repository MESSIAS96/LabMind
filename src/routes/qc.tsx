import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppHeader } from "@/components/app/Stepper";
import { FullPageSpinner, Spinner } from "@/components/app/Spinner";
import { NoveltyBadge } from "@/components/app/NoveltyBadge";
import { Button } from "@/components/ui/button";
import { useApp } from "@/lib/store";
import { ArrowRight, ExternalLink } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import {
  generateProtocol,
  generateMaterials,
  generateBudget,
  generateTimeline,
  generateValidation,
} from "@/server/ai.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/qc")({
  head: () => ({ meta: [{ title: "Literature QC — AI Scientist" }] }),
  component: QCScreen,
});

function QCScreen() {
  const s = useApp();
  const navigate = useNavigate();
  const [genStage, setGenStage] = useState<string | null>(null);

  const fProto = useServerFn(generateProtocol);
  const fMat = useServerFn(generateMaterials);
  const fBud = useServerFn(generateBudget);
  const fTim = useServerFn(generateTimeline);
  const fVal = useServerFn(generateValidation);

  // Wait for QC results that input.tsx is producing in the background.
  const ready = !!s.literature_qc;

  useEffect(() => {
    // poll every 800ms until ready
    if (ready) return;
    const id = setInterval(() => useApp.getState(), 800);
    return () => clearInterval(id);
  }, [ready]);

  if (!s.parsed_hypothesis) {
    return (
      <div className="min-h-screen">
        <AppHeader stage="qc" />
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
        <main>
          <FullPageSpinner label="Searching protocol repositories and literature…" />
        </main>
      </div>
    );
  }

  const generate = async () => {
    if (!s.parsed_hypothesis) return;
    try {
      setGenStage("Generating protocol…");
      const protocol = await fProto({
        data: {
          parsed: s.parsed_hypothesis,
          protocol_evidence: s.tavily_protocol_results,
        },
      });
      s.setPlanPart("protocol", protocol);

      setGenStage("Building materials list…");
      const materials = await fMat({
        data: {
          parsed: s.parsed_hypothesis,
          supplier_evidence: s.tavily_supplier_results,
        },
      });
      s.setPlanPart("materials", materials);

      setGenStage("Estimating budget…");
      const budget = await fBud({
        data: {
          parsed: s.parsed_hypothesis,
          materials,
          budget_cap: s.budget_cap,
        },
      });
      s.setPlanPart("budget", budget);

      setGenStage("Building timeline…");
      const timeline = await fTim({
        data: {
          parsed: s.parsed_hypothesis,
          protocol,
          timeline_target: s.timeline_target,
        },
      });
      s.setPlanPart("timeline", timeline);

      setGenStage("Defining validation approach…");
      const validation = await fVal({
        data: {
          parsed: s.parsed_hypothesis,
          validation_evidence: s.tavily_validation_results,
        },
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
  const protocols = s.tavily_protocol_results.slice(0, 3);

  return (
    <div className="min-h-screen">
      <AppHeader stage="qc" />
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
                  <div className="min-w-0">
                    <div className="font-medium leading-snug">{r.title}</div>
                    <div className="mt-1 truncate text-xs text-muted-foreground">{r.url}</div>
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
    </div>
  );
}