/**
 * Pass 8 — Part G
 * Persistent forward / backward navigation arrows pinned top-right.
 * Enabled state is determined by app state — arrows only allow forward
 * navigation to screens whose prerequisite data has already been computed.
 */
import { useNavigate } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useApp } from "@/lib/store";
import { toast } from "sonner";

type Screen = "input" | "parsed" | "qc" | "plan" | "review" | "compare";

const SCREEN_LABEL: Record<Screen, string> = {
  input: "Hypothesis",
  parsed: "Parsed hypothesis",
  qc: "Literature QC",
  plan: "Experiment plan",
  review: "Scientist review",
  compare: "Improved plan",
};

const SCREEN_PATH: Record<Screen, "/input" | "/parsed" | "/qc" | "/plan" | "/review" | "/compare"> = {
  input: "/input",
  parsed: "/parsed",
  qc: "/qc",
  plan: "/plan",
  review: "/review",
  compare: "/compare",
};

const ORDER: Screen[] = ["input", "parsed", "qc", "plan", "review", "compare"];

export function NavArrows({ current }: { current: Screen }) {
  const navigate = useNavigate();
  const s = useApp();

  const idx = ORDER.indexOf(current);
  const prev = idx > 0 ? ORDER[idx - 1] : null;
  const next = idx >= 0 && idx < ORDER.length - 1 ? ORDER[idx + 1] : null;

  // Forward gate — only allow if the next screen's data exists.
  const canForward = (() => {
    if (!next) return false;
    switch (next) {
      case "parsed":
        return !!s.parsed_hypothesis;
      case "qc":
        return !!s.parsed_hypothesis;
      case "plan":
        return !!s.literature_qc && !!s.experiment_plan.protocol;
      case "review":
        return !!s.experiment_plan.protocol;
      case "compare":
        return !!s.review.regenerated_plan;
      default:
        return false;
    }
  })();

  const goBack = () => {
    if (!prev) return;
    if (current === "plan") {
      toast.message("Your plan is preserved — you can return to it");
    }
    navigate({ to: SCREEN_PATH[prev] });
  };
  const goForward = () => {
    if (!next || !canForward) return;
    navigate({ to: SCREEN_PATH[next] });
  };

  return (
    <TooltipProvider delayDuration={200}>
      <div className="fixed right-5 top-4 z-50 flex items-center gap-2">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size="icon"
              variant="outline"
              onClick={goBack}
              disabled={!prev}
              aria-label="Back"
              className="h-9 w-9 rounded-full border-primary/40 text-primary shadow-sm backdrop-blur disabled:opacity-30"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            {prev ? `Back to ${SCREEN_LABEL[prev]}` : "Nothing behind"}
          </TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size="icon"
              variant="outline"
              onClick={goForward}
              disabled={!next || !canForward}
              aria-label="Forward"
              className="h-9 w-9 rounded-full border-primary/40 text-primary shadow-sm backdrop-blur disabled:opacity-30"
            >
              <ArrowRight className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            {next && canForward ? `Forward to ${SCREEN_LABEL[next]}` : "Complete this step first"}
          </TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  );
}