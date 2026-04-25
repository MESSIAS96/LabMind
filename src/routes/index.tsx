import { createFileRoute, Link } from "@tanstack/react-router";
import { useNavigate } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { AppHeader } from "@/components/app/Stepper";
import { Button } from "@/components/ui/button";
import { AppFooter } from "@/components/app/AppFooter";
import { useApp } from "@/lib/store";
import labmindLogo from "@/assets/labmind-logo.png";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "LabMind — Turn any scientific idea into a lab-ready experiment plan" },
      {
        name: "description",
        content:
          "Turn any scientific idea into a lab-ready experiment plan in minutes. Literature check, grounded protocol, real suppliers, budget, timeline, standards compliance.",
      },
      { property: "og:title", content: "LabMind" },
      {
        property: "og:description",
        content: "Turn any scientific idea into a lab-ready experiment plan — in minutes.",
      },
    ],
  }),
  component: Landing,
});

const EXAMPLES = [
  {
    emoji: "🧫",
    border: "border-l-[oklch(0.6_0.13_150)]",
    glow: "hover:shadow-[0_0_0_3px_oklch(0.55_0.07_180/0.18)]",
    question: "Does a probiotic strengthen the gut lining in mice?",
    hypothesis:
      "Supplementing C57BL/6 mice with Lactobacillus rhamnosus GG for 4 weeks will reduce intestinal permeability by at least 30% compared to untreated controls, measured by FITC-dextran assay.",
    experiment_type: "Cell Biology",
  },
  {
    emoji: "🩸",
    border: "border-l-[oklch(0.6_0.13_220)]",
    glow: "hover:shadow-[0_0_0_3px_oklch(0.55_0.07_180/0.18)]",
    question: "Can we build a fast blood test for inflammation without lab equipment?",
    hypothesis:
      "A paper-based electrochemical biosensor functionalized with anti-CRP antibodies will detect C-reactive protein in whole blood at concentrations below 0.5 mg/L within 10 minutes, matching standard ELISA sensitivity.",
    experiment_type: "Diagnostics",
  },
  {
    emoji: "❄️",
    border: "border-l-[oklch(0.7_0.16_55)]",
    glow: "hover:shadow-[0_0_0_3px_oklch(0.55_0.07_180/0.18)]",
    question: "Can we keep more cells alive during freezing by swapping one ingredient?",
    hypothesis:
      "Replacing sucrose with trehalose as a cryoprotectant will increase post-thaw viability of HeLa cells by at least 15 percentage points compared to the standard DMSO protocol.",
    experiment_type: "Cell Biology",
  },
] as const;

function Landing() {
  const navigate = useNavigate();
  const setField = useApp((s) => s.set);

  const useExample = (e: (typeof EXAMPLES)[number]) => {
    setField("input_hypothesis", e.hypothesis);
    setField("experiment_type", e.experiment_type);
    navigate({ to: "/input" });
  };

  const scrollToExamples = () => {
    document.getElementById("examples")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="mx-auto max-w-5xl px-6 pt-16 pb-20">
        {/* HERO */}
        <section className="flex flex-col items-center text-center">
          <img
            src={labmindLogo}
            alt="LabMind"
            width={48}
            height={48}
            className="h-12 w-12"
          />
          <h1 className="mt-5 text-balance text-5xl font-semibold tracking-tight text-[#01696f] sm:text-6xl">
            LabMind
          </h1>
          <p className="mt-5 max-w-2xl text-balance text-lg font-medium text-foreground sm:text-xl">
            Turn any scientific idea into a lab-ready experiment plan — in minutes.
          </p>
          <p className="mt-3 max-w-2xl text-balance text-sm text-muted-foreground">
            Literature check. Grounded protocol. Real suppliers. Budget. Timeline. Standards compliance.
          </p>
          <div className="mt-9 flex flex-col items-center gap-3">
            <Button asChild size="lg" className="h-12 px-7 text-base">
              <Link to="/input">
                Start planning <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <button
              type="button"
              onClick={scrollToExamples}
              className="text-sm text-primary underline-offset-4 hover:underline"
            >
              See an example →
            </button>
          </div>
        </section>

        {/* WHAT YOU GET */}
        <section className="mt-24">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            What you get
          </h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            {/* Card 1 */}
            <div className="rounded-xl border bg-card p-5">
              <div className="text-2xl">🔬</div>
              <div className="mt-3 font-medium">Novelty Check</div>
              <p className="mt-1 text-sm text-muted-foreground">
                Instant signal — Not found / Similar work exists / Exact match
              </p>
              <div className="mt-3">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-[oklch(0.6_0.13_150)/0.4] bg-[oklch(0.6_0.13_150)/0.12] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-[oklch(0.4_0.13_150)] dark:text-[oklch(0.8_0.14_150)]">
                  <span className="h-1.5 w-1.5 rounded-full bg-[oklch(0.55_0.13_150)]" />
                  Not found
                </span>
              </div>
            </div>
            {/* Card 2 */}
            <div className="rounded-xl border bg-card p-5">
              <div className="text-2xl">📋</div>
              <div className="mt-3 font-medium">Full Experiment Plan</div>
              <p className="mt-1 text-sm text-muted-foreground">
                Protocol · Materials · Budget · Timeline · Validation
              </p>
              <div className="mt-3 overflow-hidden rounded-md border bg-background/60 text-[11px]">
                <div className="grid grid-cols-4 gap-2 px-2.5 py-1.5">
                  <span className="font-medium">Trehalose</span>
                  <span className="text-muted-foreground">Sigma</span>
                  <span className="text-muted-foreground">T0167</span>
                  <span className="text-right font-medium">€45</span>
                </div>
              </div>
            </div>
            {/* Card 3 */}
            <div className="rounded-xl border bg-card p-5">
              <div className="text-2xl">📦</div>
              <div className="mt-3 font-medium">Export-Ready</div>
              <p className="mt-1 text-sm text-muted-foreground">
                PDF report · XLSX supplier list · Gantt chart
              </p>
              <div className="mt-3 flex gap-2 text-[11px]">
                <span className="rounded border bg-background/60 px-2 py-1">📄 PDF</span>
                <span className="rounded border bg-background/60 px-2 py-1">📊 XLSX</span>
                <span className="rounded border bg-background/60 px-2 py-1">📅 PNG</span>
              </div>
            </div>
          </div>
        </section>

        {/* EXAMPLES */}
        <section id="examples" className="mt-20 scroll-mt-20">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Start with an example
          </h2>
          <div className="mt-4 grid gap-3">
            {EXAMPLES.map((e) => (
              <button
                key={e.question}
                type="button"
                onClick={() => useExample(e)}
                className={`group flex items-center justify-between gap-4 rounded-2xl border border-l-4 bg-card px-5 py-4 text-left transition-all hover:border-primary/50 ${e.border} ${e.glow}`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-2xl">{e.emoji}</span>
                  <span className="truncate text-sm font-medium sm:text-base">{e.question}</span>
                </div>
                <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition-colors group-hover:text-primary" />
              </button>
            ))}
          </div>
        </section>
      </main>
      <AppFooter />
    </div>
  );
}
