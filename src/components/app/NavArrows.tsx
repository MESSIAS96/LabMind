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

export type NavScreen = "input" | "parsed" | "qc" | "plan" | "review" | "compare";
type Screen = NavScreen;

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

function useArrowState(current: Screen) {
  const navigate = useNavigate();
  const s = useApp();

  const idx = ORDER.indexOf(current);
  const prev = idx > 0 ? ORDER[idx - 1] : null;
  const next = idx >= 0 && idx < ORDER.length - 1 ? ORDER[idx + 1] : null;

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
  return { prev, next, canForward, goBack, goForward };
}

/**
 * Compact header arrows (desktop). Sits inline in the header between
 * the breadcrumb and the theme toggle. Icon-only, 32x32px.
 */
export function NavArrowsHeader({ current }: { current: Screen }) {
  const { prev, next, canForward, goBack, goForward } = useArrowState(current);
  return (
    <TooltipProvider delayDuration={200}>
      <div className="hidden items-center gap-1 md:flex">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size="icon"
              variant="outline"
              onClick={goBack}
              disabled={!prev}
              aria-label="Back"
              className="h-8 w-8 rounded-full border-primary/40 text-primary hover:bg-primary/10 disabled:cursor-not-allowed disabled:opacity-40"
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
              className="h-8 w-8 rounded-full border-primary/40 text-primary hover:bg-primary/10 disabled:cursor-not-allowed disabled:opacity-40"
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

/**
 * Full-width mobile arrow bar. Renders below the header on small screens.
 */
export function NavArrowsMobile({ current }: { current: Screen }) {
  const { prev, next, canForward, goBack, goForward } = useArrowState(current);
  return (
    <div className="flex items-center justify-between gap-2 border-b bg-background/85 px-4 py-2 backdrop-blur md:hidden">
      <Button
        variant="outline"
        size="sm"
        onClick={goBack}
        disabled={!prev}
        className="flex-1 border-primary/40 text-primary hover:bg-primary/10 disabled:cursor-not-allowed disabled:opacity-40"
      >
        <ArrowLeft className="mr-1.5 h-4 w-4" />
        {prev ? `Back: ${SCREEN_LABEL[prev]}` : "Back"}
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={goForward}
        disabled={!next || !canForward}
        className="flex-1 border-primary/40 text-primary hover:bg-primary/10 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {next && canForward ? `Forward: ${SCREEN_LABEL[next]}` : "Forward"}
        <ArrowRight className="ml-1.5 h-4 w-4" />
      </Button>
    </div>
  );
}

/**
 * Backwards-compatible wrapper: render mobile bar on small screens.
 * The desktop arrows live inside AppHeader directly via NavArrowsHeader.
 */
export function NavArrows({ current }: { current: Screen }) {
  return <NavArrowsMobile current={current} />;
}