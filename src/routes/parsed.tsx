import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { AppHeader } from "@/components/app/Stepper";
import { NavArrows } from "@/components/app/NavArrows";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useApp } from "@/lib/store";
import { ArrowRight } from "lucide-react";
import type { ParsedHypothesis } from "@/lib/types";
import { useDemoAutoAdvance } from "@/components/app/DemoToggle";
import { AppFooter } from "@/components/app/AppFooter";

export const Route = createFileRoute("/parsed")({
  head: () => ({ meta: [{ title: "Parsed hypothesis — AI Scientist" }] }),
  component: ParsedScreen,
});

const FIELDS: { key: keyof ParsedHypothesis; label: string }[] = [
  { key: "intervention", label: "Intervention" },
  { key: "model_system", label: "Model system" },
  { key: "primary_endpoint", label: "Primary endpoint" },
  { key: "threshold", label: "Threshold" },
  { key: "mechanism", label: "Mechanism" },
  { key: "control_condition", label: "Control condition" },
  { key: "duration", label: "Duration" },
  { key: "assay_method", label: "Assay method" },
];

function ParsedScreen() {
  const s = useApp();
  const navigate = useNavigate();
  const p = s.parsed_hypothesis;

  useDemoAutoAdvance(!!p, 2000, () => navigate({ to: "/qc" }));

  if (!p) {
    return (
      <div className="min-h-screen">
        <AppHeader stage="qc" />
        <main className="mx-auto max-w-2xl px-6 py-16 text-center">
          <p className="text-muted-foreground">No parsed hypothesis yet.</p>
          <Button asChild className="mt-4">
            <Link to="/input">Go to input</Link>
          </Button>
        </main>
      </div>
    );
  }

  const update = (key: keyof ParsedHypothesis, v: string) => {
    s.set("parsed_hypothesis", { ...p, [key]: v });
  };

  return (
    <div className="min-h-screen">
      <AppHeader stage="qc" />
      <NavArrows current="parsed" />
      <main className="mx-auto max-w-3xl px-6 py-10">
        <h1 className="text-2xl font-semibold tracking-tight">Parsed hypothesis</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Review the extracted fields before searching literature. Edit any value to correct parsing.
        </p>

        <div className="mt-6 grid gap-4 rounded-xl border bg-card p-6 sm:grid-cols-2">
          {FIELDS.map((f) => (
            <div key={f.key}>
              <Label className="text-xs">{f.label}</Label>
              <Input
                className="mt-1"
                value={p[f.key]}
                onChange={(e) => update(f.key, e.target.value)}
              />
            </div>
          ))}
        </div>

        <div className="mt-6 flex justify-end">
          <Button size="lg" onClick={() => navigate({ to: "/qc" })}>
            Confirm and search evidence <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </main>
      <AppFooter />
    </div>
  );
}