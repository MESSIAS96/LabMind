import { createFileRoute, Link } from "@tanstack/react-router";
import { useNavigate } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { AppHeader } from "@/components/app/Stepper";
import { Button } from "@/components/ui/button";
import { AppFooter } from "@/components/app/AppFooter";
import { useApp } from "@/lib/store";

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
        content: "Turn any scientific idea into a lab-ready experiment plan in minutes.",
      },
    ],
  }),
  component: Landing,
});

const TEAL = "#01696f";

/** 72×72 line-art molecule logo mark. */
function LabMindMark() {
  return (
    <svg
      viewBox="0 0 72 72"
      width={72}
      height={72}
      fill="none"
      stroke={TEAL}
      strokeWidth={2.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {/* central node */}
      <circle cx="36" cy="36" r="6" />
      {/* outer nodes — molecular geometry */}
      <circle cx="14" cy="22" r="4" />
      <circle cx="58" cy="22" r="4" />
      <circle cx="14" cy="50" r="4" />
      <circle cx="58" cy="50" r="4" />
      {/* bonds */}
      <line x1="18" y1="24" x2="31" y2="33" />
      <line x1="54" y1="24" x2="41" y2="33" />
      <line x1="18" y1="48" x2="31" y2="39" />
      <line x1="54" y1="48" x2="41" y2="39" />
    </svg>
  );
}

const EXAMPLES = [
  {
    category: "MICROBIOLOGY",
    question: "Does a probiotic strengthen the gut lining in mice?",
    hypothesis:
      "Supplementing C57BL/6 mice with Lactobacillus rhamnosus GG for 4 weeks will reduce intestinal permeability by at least 30% compared to untreated controls, measured by FITC-dextran assay.",
    experiment_type: "Cell Biology",
  },
  {
    category: "ONCOLOGY",
    question: "Can a common drug slow cancer cell growth in the lab?",
    hypothesis:
      "Treatment of MCF-7 breast cancer cells with 10 µM metformin for 48 hours will reduce cell proliferation by at least 40% compared to untreated controls, measured by MTT assay, due to inhibition of the mTOR signaling pathway.",
    experiment_type: "Cell Biology",
  },
  {
    category: "NEUROSCIENCE",
    question: "Does sleep deprivation increase a key Alzheimer's marker in the brain?",
    hypothesis:
      "Subjecting C57BL/6 mice to 48 hours of sleep deprivation will increase hippocampal amyloid-beta (Aβ1-42) levels by at least 25% compared to rested controls, measured by ELISA, due to impaired glymphatic clearance during sleep loss.",
    experiment_type: "Neuroscience / In Vivo",
  },
] as const;

/* Inline scientific icons (24×24, stroke teal) */
function IconMagnifier() {
  return (
    <svg viewBox="0 0 24 24" width={24} height={24} fill="none" stroke={TEAL} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.35-4.35" />
    </svg>
  );
}
function IconClipboard() {
  return (
    <svg viewBox="0 0 24 24" width={24} height={24} fill="none" stroke={TEAL} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="8" y="2" width="8" height="4" rx="1" />
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
      <line x1="9" y1="12" x2="15" y2="12" />
      <line x1="9" y1="16" x2="13" y2="16" />
    </svg>
  );
}
function IconDownload() {
  return (
    <svg viewBox="0 0 24 24" width={24} height={24} fill="none" stroke={TEAL} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7,10 12,15 17,10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  );
}

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
    <div className="min-h-screen" style={{ backgroundColor: "#f9f8f5" }}>
      <AppHeader />
      <main className="mx-auto max-w-5xl px-6 pt-14 pb-20">
        {/* HERO */}
        <section className="flex flex-col items-center text-center">
          <LabMindMark />
          <h1
            className="mt-6 font-semibold tracking-tight"
            style={{ color: TEAL, fontSize: "2.8rem", lineHeight: 1.1 }}
          >
            LabMind
          </h1>

          {/* Tagline block with 3px teal left border */}
          <div
            className="mt-6 max-w-2xl border-l-[3px] pl-4 text-left sm:text-center sm:border-l-0 sm:pl-0"
            style={{ borderColor: TEAL }}
          >
            <p className="text-balance text-lg font-medium text-foreground sm:text-xl">
              Turn any scientific idea into a lab-ready experiment plan in minutes.
            </p>
            <p className="mt-3 text-balance text-sm text-muted-foreground">
              Literature check. Grounded protocol. Real suppliers. Budget. Timeline. Standards compliance.
            </p>
          </div>

          {/* Thin horizontal rule */}
          <div className="mt-8 h-px w-full max-w-md" style={{ backgroundColor: "#d4d1ca" }} />

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
              <IconMagnifier />
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
              <IconClipboard />
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
              <IconDownload />
              <div className="mt-3 font-medium">Export-Ready</div>
              <p className="mt-1 text-sm text-muted-foreground">
                PDF report · XLSX supplier list · Gantt chart
              </p>
              <div className="mt-3 flex gap-2 text-[11px]">
                <span className="rounded border bg-background/60 px-2 py-1">PDF</span>
                <span className="rounded border bg-background/60 px-2 py-1">XLSX</span>
                <span className="rounded border bg-background/60 px-2 py-1">PNG</span>
              </div>
            </div>
          </div>
        </section>

        {/* EXAMPLES — scientific cards, no emoji */}
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
                className="group flex items-center justify-between gap-4 rounded-lg border bg-card px-5 py-4 text-left transition-shadow hover:shadow-md"
                style={{ borderLeftWidth: 3, borderLeftColor: TEAL }}
              >
                <div className="min-w-0">
                  <div
                    className="text-[10px] font-semibold uppercase text-muted-foreground"
                    style={{ letterSpacing: "0.08em" }}
                  >
                    {e.category}
                  </div>
                  <div
                    className="mt-1 text-foreground"
                    style={{ fontSize: "15px", fontWeight: 400 }}
                  >
                    {e.question}
                  </div>
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
