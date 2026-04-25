import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import type { Phase, Timeline } from "@/lib/types";

type ViewMode = "Day" | "Week" | "Month";

type Bar = {
  phase: string;
  startDay: number;
  durationDays: number;
  dependencies: string[];
  isBottleneck: boolean;
  isCritical: boolean;
};

function parseDuration(s: string): number {
  if (!s) return 5;
  const m = s.match(/(\d+(?:\.\d+)?)\s*(day|week|month|hour)/i);
  if (!m) {
    const n = parseFloat(s);
    return Number.isFinite(n) && n > 0 ? Math.ceil(n) : 5;
  }
  const n = parseFloat(m[1]);
  const unit = m[2].toLowerCase();
  if (unit === "hour") return Math.max(1, Math.ceil(n / 8));
  if (unit === "day") return Math.ceil(n);
  if (unit === "week") return Math.ceil(n * 5);
  if (unit === "month") return Math.ceil(n * 21);
  return 5;
}

function parseDeps(raw: string, phaseNames: string[]): string[] {
  if (!raw) return [];
  const norm = raw.toLowerCase();
  if (/^(none|n\/a|-+|no dependencies?)$/i.test(raw.trim())) return [];
  return phaseNames.filter((n) => norm.includes(n.toLowerCase().slice(0, Math.min(8, n.length))));
}

function addBusinessDays(start: Date, days: number): Date {
  const d = new Date(start);
  let added = 0;
  while (added < days) {
    d.setDate(d.getDate() + 1);
    const dow = d.getDay();
    if (dow !== 0 && dow !== 6) added++;
  }
  return d;
}

function fmt(d: Date): string {
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function buildBars(timeline: Timeline): { bars: Bar[]; totalDays: number; startDate: Date } {
  const phaseNames = timeline.phases.map((p) => p.phase);
  const bottleneckSet = new Set(
    (timeline.bottlenecks ?? []).map((b) => b.toLowerCase()),
  );
  const durations = timeline.phases.map((p: Phase) => parseDuration(p.duration));
  const deps = timeline.phases.map((p) => parseDeps(p.dependencies, phaseNames));

  const startDays: number[] = new Array(timeline.phases.length).fill(0);
  const endDays: number[] = new Array(timeline.phases.length).fill(0);

  // simple topological-ish: iterate until stable
  for (let iter = 0; iter < timeline.phases.length + 1; iter++) {
    for (let i = 0; i < timeline.phases.length; i++) {
      const depIdxs = deps[i]
        .map((name) => phaseNames.findIndex((n) => n === name))
        .filter((x) => x >= 0 && x !== i);
      const start = depIdxs.length
        ? Math.max(...depIdxs.map((idx) => endDays[idx]))
        : 0;
      startDays[i] = start;
      endDays[i] = start + durations[i];
    }
  }

  const totalDays = Math.max(1, ...endDays);

  // Critical path = phases that touch the longest finish time
  const critical = new Set<number>();
  let cursor = endDays.indexOf(totalDays);
  while (cursor >= 0) {
    critical.add(cursor);
    const depIdxs = deps[cursor]
      .map((name) => phaseNames.findIndex((n) => n === name))
      .filter((x) => x >= 0 && x !== cursor);
    if (!depIdxs.length) break;
    cursor = depIdxs.reduce((acc, idx) => (endDays[idx] > endDays[acc] ? idx : acc), depIdxs[0]);
  }

  const today = new Date();
  const startDate = addBusinessDays(today, 5); // 5 business day procurement lead

  const bars: Bar[] = timeline.phases.map((p, i) => ({
    phase: p.phase,
    startDay: startDays[i],
    durationDays: Math.max(1, durations[i]),
    dependencies: deps[i],
    isBottleneck: bottleneckSet.has(p.phase.toLowerCase()) ||
      (timeline.bottlenecks ?? []).some((b) => b.toLowerCase().includes(p.phase.toLowerCase())),
    isCritical: critical.has(i),
  }));

  return { bars, totalDays, startDate };
}

export function GanttChart({ timeline }: { timeline: Timeline }) {
  const [view, setView] = useState<ViewMode>("Week");
  const { bars, totalDays, startDate } = useMemo(() => buildBars(timeline), [timeline]);

  // pixels per business day depending on view
  const pxPerDay = view === "Day" ? 36 : view === "Week" ? 14 : 6;
  const chartWidth = Math.max(400, totalDays * pxPerDay);
  const rowHeight = 38;
  const barHeight = 24;
  const headerHeight = 36;
  const labelWidth = 180;

  // Compute weekend overlay positions (calendar weekend gaps within business-day axis)
  // We render a tick every "step" days and label them with calendar dates
  const step = view === "Day" ? 1 : view === "Week" ? 5 : 21;
  const ticks: { x: number; label: string }[] = [];
  for (let d = 0; d <= totalDays; d += step) {
    const date = addBusinessDays(startDate, d);
    ticks.push({ x: d * pxPerDay, label: fmt(date) });
  }

  const todayBusinessOffset = (() => {
    // today is before startDate by definition (startDate = today + 5 business days)
    return -5 * pxPerDay;
  })();

  const totalHeight = headerHeight + bars.length * rowHeight + 16;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="inline-flex rounded-md border bg-card p-0.5 text-xs">
          {(["Day", "Week", "Month"] as ViewMode[]).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setView(v)}
              className={cn(
                "rounded px-2.5 py-1 transition-colors",
                view === v
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {v}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-sm bg-primary" /> Phase
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-sm bg-[oklch(0.35_0.08_195)]" /> Critical path
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-sm bg-[oklch(0.7_0.16_70)]" /> Bottleneck
          </span>
        </div>
      </div>

      <div
        id="gantt-container"
        className="overflow-x-auto rounded-xl border bg-card"
        style={{ ["--gantt-bg" as string]: "var(--card)" }}
      >
        <div
          className="relative"
          style={{ width: labelWidth + chartWidth + 24, height: totalHeight }}
        >
          {/* Header */}
          <div
            className="sticky top-0 z-10 flex border-b bg-card"
            style={{ height: headerHeight }}
          >
            <div
              className="shrink-0 border-r bg-muted/30 px-3 py-2 text-xs font-medium text-muted-foreground"
              style={{ width: labelWidth }}
            >
              Phase
            </div>
            <div className="relative flex-1" style={{ width: chartWidth }}>
              {ticks.map((t, i) => (
                <div
                  key={i}
                  className="absolute top-0 h-full border-l border-border/60 px-1.5 py-2 text-[10px] text-muted-foreground"
                  style={{ left: t.x }}
                >
                  {t.label}
                </div>
              ))}
            </div>
          </div>

          {/* Today marker */}
          {todayBusinessOffset >= -labelWidth && (
            <div
              className="pointer-events-none absolute z-0 border-l-2 border-dashed border-primary/60"
              style={{
                left: labelWidth + todayBusinessOffset,
                top: headerHeight,
                height: bars.length * rowHeight,
              }}
            >
              <span className="absolute -top-4 left-1 text-[10px] font-medium text-primary">
                Today
              </span>
            </div>
          )}

          {/* Rows */}
          {bars.map((b, i) => {
            const x = b.startDay * pxPerDay;
            const w = Math.max(8, b.durationDays * pxPerDay);
            const tone = b.isBottleneck
              ? "bg-[oklch(0.7_0.16_70)]"
              : b.isCritical
                ? "bg-[oklch(0.35_0.08_195)]"
                : "bg-primary";
            return (
              <div
                key={i}
                className="absolute left-0 flex border-b border-border/40"
                style={{
                  top: headerHeight + i * rowHeight,
                  height: rowHeight,
                  width: labelWidth + chartWidth,
                }}
              >
                <div
                  className="shrink-0 truncate border-r bg-muted/20 px-3 py-2 text-xs font-medium"
                  style={{ width: labelWidth }}
                  title={b.phase}
                >
                  {b.phase}
                </div>
                <div className="relative flex-1">
                  <div
                    className={cn(
                      "absolute rounded-md text-[10px] font-medium text-white shadow-sm transition-all",
                      tone,
                    )}
                    style={{
                      left: x,
                      top: (rowHeight - barHeight) / 2,
                      width: w,
                      height: barHeight,
                    }}
                    title={`${b.phase}: ${b.durationDays}d${b.dependencies.length ? ` · depends on ${b.dependencies.join(", ")}` : ""}`}
                  >
                    <span className="block truncate px-2 py-1">
                      {b.durationDays}d{b.isBottleneck ? " ⚠" : ""}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="text-xs text-muted-foreground">
        Schedule starts {fmt(startDate)} (today + 5 business days for procurement). Total duration:{" "}
        <span className="font-medium text-foreground">{timeline.total_duration}</span>.
      </div>
    </div>
  );
}
