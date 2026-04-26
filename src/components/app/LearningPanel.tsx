import { useState } from "react";
import { Brain, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import type { MemoryContext } from "@/lib/memoryBank";

export function LearningPanel({ memory }: { memory: MemoryContext }) {
  const [open, setOpen] = useState(false);
  const sp = memory.similar_plans.length;
  const rc = memory.relevant_corrections.length;
  const lp = memory.learned_patterns.length;
  const empty = sp + rc + lp === 0;
  return (
    <div className="rounded-xl border bg-card">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
      >
        <div className="flex items-center gap-3">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Brain className="h-4 w-4" />
          </span>
          <div>
            <div className="font-medium">Learning from prior reviewed plans</div>
            <p className="text-xs text-muted-foreground">
              {empty
                ? "No prior reviewed plans yet — your corrections will train future runs."
                : `Similar plans: ${sp} · Corrections applied: ${rc} · Patterns used: ${lp}`}
            </p>
          </div>
        </div>
        <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", open && "rotate-180")} />
      </button>
      {open && !empty && (
        <div className="space-y-4 border-t px-4 py-4 text-sm">
          {sp > 0 && (
            <div>
              <div className="mb-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                Similar prior plans
              </div>
              <ul className="space-y-1.5">
                {memory.similar_plans.map((p) => (
                  <li key={p.id} className="rounded-md border bg-background/40 p-2 text-xs">
                    <div className="font-medium">
                      {p.parsed_hypothesis.intervention} → {p.parsed_hypothesis.primary_endpoint}
                    </div>
                    <div className="text-muted-foreground">
                      {p.parsed_hypothesis.model_system} · quality {p.quality_score}/10
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {lp > 0 && (
            <div>
              <div className="mb-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                Learned patterns
              </div>
              <ul className="space-y-1.5">
                {memory.learned_patterns.map((p) => (
                  <li key={p.id} className="rounded-md border bg-background/40 p-2 text-xs">
                    <span className="mr-2 rounded-full border px-1.5 py-0.5 text-[10px] uppercase tracking-wide">
                      {p.confidence}
                    </span>
                    {p.lesson}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {rc > 0 && (
            <div>
              <div className="mb-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                Recently applied corrections
              </div>
              <ul className="space-y-1.5">
                {memory.relevant_corrections.slice(0, 5).map((c) => (
                  <li key={c.id} className="rounded-md border bg-background/40 p-2 text-xs">
                    <span className="font-medium capitalize">{c.section}</span>
                    <span className="ml-1 text-muted-foreground">· {c.issue_type}</span>
                    <p className="mt-0.5 text-muted-foreground">{c.notes.slice(0, 200)}</p>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}