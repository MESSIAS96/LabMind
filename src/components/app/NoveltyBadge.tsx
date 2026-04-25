import { cn } from "@/lib/utils";
import type { NoveltySignal } from "@/lib/types";

const MAP: Record<
  NoveltySignal,
  { label: string; dot: string; bg: string; text: string; border: string }
> = {
  not_found: {
    label: "NOT FOUND — No closely matching experiment",
    dot: "bg-[oklch(0.6_0.13_150)]",
    bg: "bg-[oklch(0.6_0.13_150)/0.08]",
    text: "text-[oklch(0.4_0.13_150)] dark:text-[oklch(0.8_0.14_150)]",
    border: "border-[oklch(0.6_0.13_150)/0.35]",
  },
  similar_work_exists: {
    label: "SIMILAR WORK EXISTS — Related approaches published",
    dot: "bg-[oklch(0.75_0.14_80)]",
    bg: "bg-[oklch(0.75_0.14_80)/0.1]",
    text: "text-[oklch(0.45_0.13_70)] dark:text-[oklch(0.85_0.14_80)]",
    border: "border-[oklch(0.75_0.14_80)/0.4]",
  },
  exact_match_found: {
    label: "EXACT MATCH FOUND — Close variant already exists",
    dot: "bg-[oklch(0.6_0.2_27)]",
    bg: "bg-[oklch(0.6_0.2_27)/0.08]",
    text: "text-[oklch(0.45_0.2_27)] dark:text-[oklch(0.78_0.18_27)]",
    border: "border-[oklch(0.6_0.2_27)/0.4]",
  },
};

export function NoveltyBadge({
  signal,
  compact,
}: {
  signal: NoveltySignal;
  compact?: boolean;
}) {
  const v = MAP[signal];
  return (
    <div
      className={cn(
        "inline-flex items-center gap-2 rounded-full border font-medium",
        v.bg,
        v.text,
        v.border,
        compact ? "px-3 py-1 text-xs" : "px-4 py-2 text-sm",
      )}
    >
      <span className={cn("h-2.5 w-2.5 rounded-full", v.dot)} />
      {v.label}
    </div>
  );
}