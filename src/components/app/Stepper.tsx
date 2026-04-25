import { Link } from "@tanstack/react-router";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

const STAGES = [
  { key: "input", label: "Input", paths: ["/input"] },
  { key: "qc", label: "QC", paths: ["/parsed", "/qc"] },
  { key: "plan", label: "Plan", paths: ["/plan"] },
  { key: "review", label: "Review", paths: ["/review", "/compare"] },
];

export function Stepper({ current }: { current: "input" | "qc" | "plan" | "review" }) {
  const idx = STAGES.findIndex((s) => s.key === current);
  return (
    <nav className="flex items-center gap-2 text-sm" aria-label="Progress">
      {STAGES.map((s, i) => {
        const done = i < idx;
        const active = i === idx;
        return (
          <div key={s.key} className="flex items-center gap-2">
            <div
              className={cn(
                "flex h-7 w-7 items-center justify-center rounded-full border text-xs font-medium",
                done && "bg-primary text-primary-foreground border-primary",
                active && "border-primary text-primary",
                !done && !active && "border-border text-muted-foreground",
              )}
            >
              {done ? <Check className="h-3.5 w-3.5" /> : i + 1}
            </div>
            <span
              className={cn(
                "hidden sm:inline",
                active && "text-foreground font-medium",
                !active && "text-muted-foreground",
              )}
            >
              {s.label}
            </span>
            {i < STAGES.length - 1 && <div className="mx-2 h-px w-8 bg-border" />}
          </div>
        );
      })}
    </nav>
  );
}

export function AppHeader({ stage }: { stage?: "input" | "qc" | "plan" | "review" }) {
  return (
    <header className="sticky top-0 z-40 border-b bg-background/85 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        <Link to="/" className="flex items-center gap-2 font-semibold tracking-tight">
          <div className="h-6 w-6 rounded-sm bg-primary" />
          AI Scientist
        </Link>
        {stage && <Stepper current={stage} />}
        <div className="flex items-center gap-2">
          <ThemeToggleSlot />
        </div>
      </div>
    </header>
  );
}

import { ThemeToggle as ThemeToggleSlot } from "./ThemeToggle";