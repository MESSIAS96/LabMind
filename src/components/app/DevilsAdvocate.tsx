import { useState } from "react";
import { ChevronDown, AlertTriangle, Loader2, Sparkles, Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import type { DevilsAdvocateReview, DevilsAdvocateIssueType } from "@/lib/types";

const ISSUE_STYLE: Record<DevilsAdvocateIssueType, string> = {
  RISK: "bg-[oklch(0.6_0.2_27)/0.12] text-[oklch(0.5_0.2_27)] dark:text-[oklch(0.82_0.18_27)] border-[oklch(0.6_0.2_27)/0.3]",
  ASSUMPTION: "bg-[oklch(0.7_0.16_55)/0.14] text-[oklch(0.45_0.16_50)] dark:text-[oklch(0.85_0.14_60)] border-[oklch(0.7_0.16_55)/0.3]",
  MISSING: "bg-[oklch(0.55_0.18_300)/0.14] text-[oklch(0.4_0.18_300)] dark:text-[oklch(0.82_0.14_300)] border-[oklch(0.55_0.18_300)/0.3]",
  UNREALISTIC: "bg-[oklch(0.6_0.13_25)/0.12] text-[oklch(0.42_0.16_27)] dark:text-[oklch(0.82_0.13_30)] border-[oklch(0.6_0.13_25)/0.3]",
  ALTERNATIVE: "bg-[oklch(0.6_0.13_220)/0.14] text-[oklch(0.4_0.13_220)] dark:text-[oklch(0.82_0.1_220)] border-[oklch(0.6_0.13_220)/0.3]",
};

const CONFIDENCE_LABEL: Record<number, string> = {
  1: "Needs major revision",
  2: "Significant gaps",
  3: "Plausible — verify key steps",
  4: "Solid with minor improvements",
  5: "Execution-ready",
};

export function DevilsAdvocatePanel({
  review,
  loading,
  onRun,
}: {
  review?: DevilsAdvocateReview;
  loading?: boolean;
  onRun: () => void;
}) {
  const [open, setOpen] = useState(true);

  return (
    <div className="rounded-xl border bg-card animate-fade-in">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
      >
        <div className="flex items-center gap-3 min-w-0">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[oklch(0.7_0.16_55)/0.18] text-[oklch(0.45_0.16_50)] dark:text-[oklch(0.85_0.14_60)]">
            <AlertTriangle className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <div className="flex items-center gap-2 font-medium">
              Devil's Advocate Review
              {review && <ConfidenceStars score={review.overall_confidence} compact />}
            </div>
            <p className="truncate text-xs text-muted-foreground">
              {review
                ? review.verdict
                : "Automated critical review by a simulated senior scientist."}
            </p>
          </div>
        </div>
        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 text-muted-foreground transition-transform",
            open && "rotate-180",
          )}
        />
      </button>

      {open && (
        <div className="border-t px-4 py-4 space-y-4">
          {!review && !loading && (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-dashed bg-background/50 p-4">
              <p className="text-sm text-muted-foreground">
                Run a second-pass critique to surface hidden assumptions, risky steps, and missing controls before your team executes the plan.
              </p>
              <Button onClick={onRun} size="sm">
                <Sparkles className="mr-2 h-4 w-4" />
                Run Devil's Advocate
              </Button>
            </div>
          )}

          {loading && (
            <div className="flex items-center gap-3 rounded-lg border bg-background/50 p-4 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
              Reviewing plan against retrieved evidence…
            </div>
          )}

          {review && (
            <>
              <div className="grid gap-3 sm:grid-cols-2">
                {review.critiques.map((c, i) => (
                  <div key={i} className="rounded-lg border bg-background/40 p-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        {c.section}
                      </span>
                      <span
                        className={cn(
                          "rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                          ISSUE_STYLE[c.issue_type],
                        )}
                      >
                        {c.issue_type}
                      </span>
                    </div>
                    <p className="mt-2 text-sm">{c.critique}</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      <span className="font-medium text-foreground">Suggestion: </span>
                      {c.suggestion}
                    </p>
                  </div>
                ))}
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-background/40 p-3">
                <div>
                  <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Overall confidence
                  </div>
                  <div className="mt-1 flex items-center gap-2">
                    <ConfidenceStars score={review.overall_confidence} />
                    <span className="text-sm font-medium">
                      {CONFIDENCE_LABEL[Math.round(review.overall_confidence)] ?? "—"}
                    </span>
                  </div>
                </div>
                <Button variant="outline" size="sm" onClick={onRun}>
                  Re-run review
                </Button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

export function ConfidenceStars({ score, compact }: { score: number; compact?: boolean }) {
  const rounded = Math.max(0, Math.min(5, Math.round(score)));
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={`${rounded}/5`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          className={cn(
            compact ? "h-3 w-3" : "h-4 w-4",
            n <= rounded
              ? "fill-[oklch(0.75_0.14_80)] text-[oklch(0.65_0.14_70)]"
              : "text-muted-foreground/40",
          )}
        />
      ))}
    </span>
  );
}