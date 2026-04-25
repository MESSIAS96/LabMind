import { Link } from "@tanstack/react-router";
import { Check, FlaskConical, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "./ThemeToggle";
import { DemoToggle } from "./DemoToggle";
import { Button } from "@/components/ui/button";
import { useApp } from "@/lib/store";

export type Stage = "input" | "qc" | "plan" | "review";

const STAGES: { key: Stage; label: string }[] = [
  { key: "input", label: "Hypothesis" },
  { key: "qc", label: "Literature QC" },
  { key: "plan", label: "Experiment Plan" },
  { key: "review", label: "Review" },
];

export function Stepper({ current }: { current: Stage }) {
  const idx = STAGES.findIndex((s) => s.key === current);
  return (
    <nav className="flex items-center" aria-label="Progress">
      {STAGES.map((s, i) => {
        const done = i < idx;
        const active = i === idx;
        return (
          <div key={s.key} className="flex items-center">
            <div className="flex items-center gap-2">
              <div
                className={cn(
                  "flex h-6 w-6 items-center justify-center rounded-full border text-[10px] font-semibold transition-colors",
                  done && "bg-primary text-primary-foreground border-primary",
                  active && "border-primary text-primary bg-primary/10",
                  !done && !active && "border-border text-muted-foreground",
                )}
              >
                {done ? <Check className="h-3 w-3" /> : i + 1}
              </div>
              <span
                className={cn(
                  "hidden text-xs lg:inline",
                  active ? "font-medium text-foreground" : "text-muted-foreground",
                )}
              >
                {s.label}
              </span>
            </div>
            {i < STAGES.length - 1 && (
              <div
                className={cn(
                  "mx-2 h-0.5 w-6 rounded-full transition-colors lg:w-10",
                  i < idx ? "bg-primary" : "bg-border",
                )}
              />
            )}
          </div>
        );
      })}
    </nav>
  );
}

function FlaskMark() {
  return (
    <span className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/15 text-primary">
      <FlaskConical className="h-4 w-4" />
    </span>
  );
}

export function AppHeader({ stage }: { stage?: Stage }) {
  const reset = useApp((s) => s.reset);
  return (
    <header className="sticky top-0 z-40 border-b bg-background/85 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4">
        <Link to="/" className="flex shrink-0 items-center gap-2 font-semibold tracking-tight">
          <FlaskMark />
          <span className="hidden sm:inline">AI Scientist</span>
        </Link>
        <div className="min-w-0 flex-1 overflow-x-auto">
          {stage && (
            <div className="flex justify-center">
              <Stepper current={stage} />
            </div>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <DemoToggle />
          <ThemeToggle />
          <Button
            asChild
            variant="outline"
            size="sm"
            className="hidden sm:inline-flex"
            onClick={() => reset()}
          >
            <Link to="/input">
              <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
              New
            </Link>
          </Button>
        </div>
      </div>
      {stage && (
        <div className="border-t bg-muted/30 px-4 py-1.5 text-center text-[11px] uppercase tracking-wide text-muted-foreground lg:hidden">
          Stage: {STAGES.find((s) => s.key === stage)?.label}
        </div>
      )}
    </header>
  );
}