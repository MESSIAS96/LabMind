import { cn } from "@/lib/utils";
import type { SourceTag } from "@/lib/types";

const STYLES: Record<SourceTag, string> = {
  "protocols.io": "bg-[oklch(0.6_0.16_250)/0.14] text-[oklch(0.4_0.16_250)] dark:text-[oklch(0.82_0.13_250)] border-[oklch(0.6_0.16_250)/0.3]",
  PubMed: "bg-[oklch(0.55_0.18_300)/0.14] text-[oklch(0.4_0.18_300)] dark:text-[oklch(0.82_0.14_300)] border-[oklch(0.55_0.18_300)/0.3]",
  "Semantic Scholar": "bg-[oklch(0.5_0.1_50)/0.16] text-[oklch(0.38_0.1_50)] dark:text-[oklch(0.78_0.09_60)] border-[oklch(0.5_0.1_50)/0.3]",
  Addgene: "bg-[oklch(0.6_0.14_150)/0.16] text-[oklch(0.4_0.14_150)] dark:text-[oklch(0.82_0.13_150)] border-[oklch(0.6_0.14_150)/0.3]",
  Supplier: "bg-[oklch(0.7_0.16_55)/0.16] text-[oklch(0.45_0.16_50)] dark:text-[oklch(0.85_0.14_60)] border-[oklch(0.7_0.16_55)/0.3]",
  "Protocol Repository": "bg-[oklch(0.6_0.12_220)/0.14] text-[oklch(0.4_0.12_220)] dark:text-[oklch(0.82_0.1_220)] border-[oklch(0.6_0.12_220)/0.3]",
  "Validation Reference": "bg-[oklch(0.6_0.1_180)/0.14] text-[oklch(0.4_0.1_180)] dark:text-[oklch(0.82_0.08_180)] border-[oklch(0.6_0.1_180)/0.3]",
  Other: "bg-muted text-muted-foreground border-border",
};

export function SourceBadge({ source, className }: { source: SourceTag; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide",
        STYLES[source] ?? STYLES.Other,
        className,
      )}
    >
      {source}
    </span>
  );
}