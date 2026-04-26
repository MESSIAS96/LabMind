import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import type { ExperimentPlan, ProtocolStep } from "@/lib/types";
import { cn } from "@/lib/utils";
import type { RetrievalResults } from "@/lib/types";
import { SourceBadge } from "@/components/app/SourceBadge";
import type { SourceTag } from "@/lib/types";
import { GanttChart } from "@/components/app/GanttChart";
import { Button } from "@/components/ui/button";
import { Download, FileImage, Copy } from "lucide-react";
import { exportGanttPNG, exportGanttPDF } from "@/lib/exportPdf";
import { toast } from "sonner";
import { useState } from "react";

function inferSupplierTag(supplier: string): SourceTag {
  const s = supplier.toLowerCase();
  if (s.includes("addgene")) return "Addgene";
  if (
    s.includes("thermo") ||
    s.includes("sigma") ||
    s.includes("merck") ||
    s.includes("promega") ||
    s.includes("qiagen") ||
    s.includes("idt") ||
    s.includes("atcc")
  )
    return "Supplier";
  return "Other";
}

function Empty({ label }: { label: string }) {
  return (
    <div className="rounded-lg border border-dashed bg-card/50 p-8 text-center text-sm text-muted-foreground">
      {label}
    </div>
  );
}

const CONFIDENCE_STYLE: Record<string, string> = {
  confirmed: "bg-[oklch(0.6_0.13_150)/0.12] text-[oklch(0.4_0.13_150)] dark:text-[oklch(0.8_0.14_150)]",
  estimated: "bg-[oklch(0.75_0.14_80)/0.15] text-[oklch(0.45_0.13_70)] dark:text-[oklch(0.85_0.14_80)]",
  inferred: "bg-muted text-muted-foreground",
};

const STEP_CONFIDENCE_STYLE: Record<string, string> = {
  high: "bg-[oklch(0.6_0.13_150)/0.12] text-[oklch(0.4_0.13_150)] dark:text-[oklch(0.8_0.14_150)] border-[oklch(0.55_0.13_150)/0.4]",
  medium: "bg-[oklch(0.75_0.14_80)/0.15] text-[oklch(0.45_0.13_70)] dark:text-[oklch(0.85_0.14_80)] border-[oklch(0.65_0.14_70)/0.4]",
  low: "bg-muted text-muted-foreground border-border",
};

export function PlanTabs({
  plan,
  retrieval,
}: {
  plan: ExperimentPlan;
  retrieval: RetrievalResults;
}) {
  const [recipeView, setRecipeView] = useState<"detailed" | "standard">("detailed");
  return (
    <Tabs defaultValue="protocol" className="w-full">
      <TabsList className="grid w-full grid-cols-3 sm:grid-cols-6">
        <TabsTrigger value="protocol">Protocol</TabsTrigger>
        <TabsTrigger value="materials">Materials</TabsTrigger>
        <TabsTrigger value="budget">Budget</TabsTrigger>
        <TabsTrigger value="timeline">Timeline</TabsTrigger>
        <TabsTrigger value="validation">Validation</TabsTrigger>
        <TabsTrigger value="sources">Sources</TabsTrigger>
      </TabsList>

      <TabsContent value="protocol" className="mt-6">
        {!plan.protocol ? (
          <Empty label="Protocol not generated yet." />
        ) : (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Protocol depth: {recipeView === "detailed" ? "Detailed Scientific Recipe Mode" : "Standard"}
              </div>
              <div className="inline-flex rounded-md border bg-card p-0.5">
                <button
                  type="button"
                  onClick={() => setRecipeView("standard")}
                  className={cn(
                    "rounded px-2.5 py-1 text-xs",
                    recipeView === "standard" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  Standard view
                </button>
                <button
                  type="button"
                  onClick={() => setRecipeView("detailed")}
                  className={cn(
                    "rounded px-2.5 py-1 text-xs",
                    recipeView === "detailed" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  Detailed recipe
                </button>
              </div>
            </div>
            {recipeView === "standard" ? (
              <Accordion type="multiple" className="rounded-xl border bg-card">
                {plan.protocol.protocol_steps.map((s) => (
                  <AccordionItem key={s.step_number} value={`s${s.step_number}`} className="px-4">
                    <AccordionTrigger className="hover:no-underline">
                      <div className="flex items-center gap-3 text-left">
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-medium text-primary-foreground">
                          {s.step_number}
                        </span>
                        <span className="font-medium">{s.title}</span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-2 pl-9 text-sm">
                        <p className="text-muted-foreground">{s.objective}</p>
                        {s.actions?.length > 0 && (
                          <ol className="list-decimal space-y-1 pl-5 text-sm">
                            {s.actions.map((a, i) => (
                              <li key={i}>{a}</li>
                            ))}
                          </ol>
                        )}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            ) : (
              <Accordion type="multiple" className="rounded-xl border bg-card">
                {plan.protocol.protocol_steps.map((s) => (
                  <RecipeStepItem key={s.step_number} s={s} />
                ))}
              </Accordion>
            )}

            {plan.protocol.assumptions.length > 0 && (
              <Section title="Assumptions" items={plan.protocol.assumptions} />
            )}
            {plan.protocol.risk_points.length > 0 && (
              <Section title="Risk points" items={plan.protocol.risk_points} />
            )}
          </div>
        )}
      </TabsContent>

      <TabsContent value="materials" className="mt-6">
        {!plan.materials ? (
          <Empty label="Materials list not generated yet." />
        ) : (
          <div className="rounded-xl border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead>Supplier</TableHead>
                  <TableHead>Catalog #</TableHead>
                  <TableHead>Purpose</TableHead>
                  <TableHead>Qty</TableHead>
                  <TableHead>Confidence</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {plan.materials.materials.map((m, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-medium">{m.item_name}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <SourceBadge source={inferSupplierTag(m.supplier)} />
                        <span>{m.supplier}</span>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-xs">{m.catalog_number}</TableCell>
                    <TableCell className="text-muted-foreground">{m.purpose}</TableCell>
                    <TableCell>{m.quantity_estimate}</TableCell>
                    <TableCell>
                      <span
                        className={cn(
                          "inline-block rounded-full px-2 py-0.5 text-xs",
                          CONFIDENCE_STYLE[m.confidence],
                        )}
                      >
                        {m.confidence}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </TabsContent>

      <TabsContent value="budget" className="mt-6">
        {!plan.budget ? (
          <Empty label="Budget not generated yet." />
        ) : (
          <div className="space-y-4">
            <div className="rounded-xl border bg-card">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Category</TableHead>
                    <TableHead>Item</TableHead>
                    <TableHead>Qty</TableHead>
                    <TableHead>Unit cost (€)</TableHead>
                    <TableHead>Total (€)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {plan.budget.budget_lines.map((b, i) => (
                    <TableRow key={i}>
                      <TableCell className="text-xs uppercase text-muted-foreground">
                        {b.category}
                      </TableCell>
                      <TableCell className="font-medium">{b.item}</TableCell>
                      <TableCell>{b.quantity}</TableCell>
                      <TableCell>{b.unit_cost}</TableCell>
                      <TableCell className="font-medium">{b.total}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <Stat label="Materials subtotal" value={plan.budget.subtotal_materials} />
              <Stat label="Operations subtotal" value={plan.budget.subtotal_operations} />
              <Stat label="Total estimated" value={plan.budget.total_estimated_cost} highlight />
            </div>
            <div className="rounded-lg border bg-accent/30 p-4 text-sm">
              <div className="font-medium">Cost driver</div>
              <p className="mt-1 text-muted-foreground">{plan.budget.cost_driver_note}</p>
            </div>
          </div>
        )}
      </TabsContent>

      <TabsContent value="timeline" className="mt-6">
        {!plan.timeline ? (
          <Empty label="Timeline not generated yet." />
        ) : (
          <div className="space-y-4">
            <GanttChart timeline={plan.timeline} />
            <div className="flex flex-wrap justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={async () => {
                  try {
                    await exportGanttPNG();
                    toast.success("Gantt PNG downloaded");
                  } catch (e) {
                    toast.error(e instanceof Error ? e.message : "Export failed");
                  }
                }}
              >
                <FileImage className="mr-2 h-4 w-4" /> Download PNG
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={async () => {
                  try {
                    await exportGanttPDF();
                    toast.success("Gantt PDF downloaded");
                  } catch (e) {
                    toast.error(e instanceof Error ? e.message : "Export failed");
                  }
                }}
              >
                <Download className="mr-2 h-4 w-4" /> Download PDF
              </Button>
            </div>
            <div className="rounded-xl border bg-card">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Phase</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Dependencies</TableHead>
                    <TableHead>Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {plan.timeline.phases.map((p, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-medium">{p.phase}</TableCell>
                      <TableCell>{p.duration}</TableCell>
                      <TableCell className="text-muted-foreground">{p.dependencies}</TableCell>
                      <TableCell className="text-muted-foreground">{p.notes}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Stat label="Total duration" value={plan.timeline.total_duration} highlight />
              <Section title="Bottlenecks" items={plan.timeline.bottlenecks} compact />
            </div>
          </div>
        )}
      </TabsContent>

      <TabsContent value="validation" className="mt-6">
        {!plan.validation ? (
          <Empty label="Validation not generated yet." />
        ) : (
          <div className="space-y-4">
            {typeof plan.validation.strength_score === "number" && (
              <ValidationStrength
                score={plan.validation.strength_score}
                rationale={plan.validation.strength_rationale}
              />
            )}
            <div className="grid gap-4 sm:grid-cols-2">
            <Stat label="Primary endpoint" value={plan.validation.primary_endpoint} highlight />
            <Section title="Secondary endpoints" items={plan.validation.secondary_endpoints} />
            <Section title="Controls" items={plan.validation.controls} />
            <Section title="Readouts" items={plan.validation.readouts} />
            <div className="rounded-lg border bg-[oklch(0.6_0.13_150)/0.08] p-4 sm:col-span-1">
              <div className="text-xs font-medium uppercase tracking-wide text-[oklch(0.4_0.13_150)] dark:text-[oklch(0.8_0.14_150)]">
                Success criteria
              </div>
              <p className="mt-2 text-sm">{plan.validation.success_criteria}</p>
            </div>
            <div className="rounded-lg border bg-[oklch(0.6_0.2_27)/0.06] p-4 sm:col-span-1">
              <div className="text-xs font-medium uppercase tracking-wide text-[oklch(0.5_0.2_27)] dark:text-[oklch(0.78_0.18_27)]">
                Failure criteria
              </div>
              <p className="mt-2 text-sm">{plan.validation.failure_criteria}</p>
            </div>
            </div>
          </div>
        )}
      </TabsContent>

      <TabsContent value="sources" className="mt-6">
        <div className="space-y-6">
          <SourceList title="Protocol sources" items={retrieval.protocolSources} />
          <SourceList title="Literature" items={retrieval.literatureSources} />
          <SourceList title="Supplier references" items={retrieval.supplierSources} />
          <SourceList title="Plasmid / cell line references" items={retrieval.plasmidSources} />
          <SourceList title="Validation references" items={retrieval.validationSources} />
        </div>
      </TabsContent>
    </Tabs>
  );
}

function RecipeStepItem({ s }: { s: ProtocolStep }) {
  const copyStep = () => {
    const text = formatStepText(s);
    navigator.clipboard.writeText(text).then(
      () => toast.success(`Step ${s.step_number} copied`),
      () => toast.error("Copy failed"),
    );
  };
  return (
    <AccordionItem value={`s${s.step_number}`} className="px-4">
      <AccordionTrigger className="hover:no-underline">
        <div className="flex w-full items-center gap-3 text-left">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-medium text-primary-foreground">
            {s.step_number}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-medium">{s.title}</span>
              {s.confidence && (
                <span
                  className={cn(
                    "rounded-full border px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide",
                    STEP_CONFIDENCE_STYLE[s.confidence],
                  )}
                >
                  {s.confidence}
                </span>
              )}
            </div>
            <p className="mt-0.5 truncate text-xs font-normal text-muted-foreground">{s.objective}</p>
          </div>
        </div>
      </AccordionTrigger>
      <AccordionContent>
        <div className="space-y-3 pl-9 text-sm">
          {s.objective && (
            <RecipeBlock label="Objective">{s.objective}</RecipeBlock>
          )}
          {s.materials?.length > 0 && (
            <RecipeBlock label="Materials for this step">
              <ul className="list-disc space-y-0.5 pl-5">
                {s.materials.map((m, i) => (
                  <li key={i}>{m}</li>
                ))}
              </ul>
            </RecipeBlock>
          )}
          {s.actions?.length > 0 && (
            <RecipeBlock label="Actions">
              <ol className="list-decimal space-y-1 pl-5">
                {s.actions.map((a, i) => (
                  <li key={i}>{a}</li>
                ))}
              </ol>
            </RecipeBlock>
          )}
          {s.parameters && Object.values(s.parameters).some(Boolean) && (
            <div>
              <div className="mb-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Parameters</div>
              <div className="rounded-md border bg-accent/30 p-3 text-xs">
                <dl className="grid grid-cols-1 gap-x-6 gap-y-1 sm:grid-cols-2">
                  {(["concentration", "volume", "temperature", "duration", "other_conditions"] as const)
                    .filter((k) => s.parameters?.[k])
                    .map((k) => (
                      <div key={k} className="flex gap-2">
                        <dt className="min-w-24 text-muted-foreground capitalize">{k.replace(/_/g, " ")}:</dt>
                        <dd className="font-medium">{s.parameters?.[k]}</dd>
                      </div>
                    ))}
                </dl>
              </div>
            </div>
          )}
          {s.checkpoint && (
            <div className="rounded-md border border-[oklch(0.6_0.13_150)/0.3] bg-[oklch(0.6_0.13_150)/0.06] p-3 text-xs">
              <div className="mb-0.5 font-medium text-[oklch(0.4_0.13_150)] dark:text-[oklch(0.8_0.14_150)]">Checkpoint</div>
              <p>{s.checkpoint}</p>
            </div>
          )}
          {s.failure_mode && (
            <RecipeBlock label="Common failure mode">{s.failure_mode}</RecipeBlock>
          )}
          {s.troubleshooting && (
            <RecipeBlock label="Troubleshooting">{s.troubleshooting}</RecipeBlock>
          )}
          {s.safety && (
            <div className="rounded-md border border-[oklch(0.6_0.2_27)/0.3] bg-[oklch(0.6_0.2_27)/0.06] p-3 text-xs">
              <div className="mb-0.5 font-medium text-[oklch(0.5_0.2_27)] dark:text-[oklch(0.82_0.18_27)]">Safety</div>
              <p>{s.safety}</p>
            </div>
          )}
          <div className="pt-1">
            <Button variant="outline" size="sm" onClick={copyStep}>
              <Copy className="mr-2 h-3.5 w-3.5" /> Copy step
            </Button>
          </div>
        </div>
      </AccordionContent>
    </AccordionItem>
  );
}

function RecipeBlock({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div className="text-sm">{children}</div>
    </div>
  );
}

function formatStepText(s: ProtocolStep): string {
  const lines: string[] = [];
  lines.push(`Step ${s.step_number} — ${s.title}`);
  if (s.objective) lines.push(`Objective: ${s.objective}`);
  if (s.materials?.length) {
    lines.push("Materials:");
    s.materials.forEach((m) => lines.push(`  - ${m}`));
  }
  if (s.actions?.length) {
    lines.push("Actions:");
    s.actions.forEach((a, i) => lines.push(`  ${i + 1}. ${a}`));
  }
  if (s.parameters) {
    const pp = Object.entries(s.parameters).filter(([, v]) => v);
    if (pp.length) {
      lines.push("Parameters:");
      pp.forEach(([k, v]) => lines.push(`  - ${k.replace(/_/g, " ")}: ${v}`));
    }
  }
  if (s.checkpoint) lines.push(`Checkpoint: ${s.checkpoint}`);
  if (s.failure_mode) lines.push(`Common failure mode: ${s.failure_mode}`);
  if (s.troubleshooting) lines.push(`Troubleshooting: ${s.troubleshooting}`);
  if (s.safety) lines.push(`Safety: ${s.safety}`);
  if (s.confidence) lines.push(`Confidence: ${s.confidence}`);
  return lines.join("\n");
}

function Section({
  title,
  items,
  compact,
}: {
  title: string;
  items: string[];
  compact?: boolean;
}) {
  if (!items?.length) return null;
  return (
    <div className={cn("rounded-lg border bg-card p-4", compact && "h-full")}>
      <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {title}
      </div>
      <ul className="mt-2 space-y-1.5 text-sm">
        {items.map((it, i) => (
          <li key={i} className="flex gap-2">
            <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-primary" />
            <span>{it}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Stat({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-lg border bg-card p-4",
        highlight && "border-primary/40 bg-primary/5",
      )}
    >
      <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div className="mt-1 text-lg font-semibold">{value}</div>
    </div>
  );
}

function SourceList({
  title,
  items,
}: {
  title: string;
  items: { title: string; url: string; source?: import("@/lib/types").SourceTag }[];
}) {
  return (
    <div>
      <div className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {title}
      </div>
      {items.length === 0 ? (
        <div className="rounded-lg border border-dashed bg-card/50 p-4 text-sm text-muted-foreground">
          None retrieved.
        </div>
      ) : (
        <ul className="space-y-2">
          {items.map((s, i) => (
            <li key={i}>
              <a
                href={s.url}
                target="_blank"
                rel="noreferrer"
                className="block rounded-md border bg-card p-3 text-sm hover:border-primary/60"
              >
                <div className="flex flex-wrap items-center gap-2">
                  {s.source && <SourceBadge source={s.source} />}
                  <div className="font-medium leading-snug">{s.title || s.url}</div>
                </div>
                <div className="mt-0.5 truncate text-xs text-muted-foreground">{s.url}</div>
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function ValidationStrength({
  score,
  rationale,
}: {
  score: number;
  rationale?: string;
}) {
  const clamped = Math.max(1, Math.min(5, Math.round(score)));
  const pct = (clamped / 5) * 100;
  const label =
    clamped >= 5
      ? "Gold standard"
      : clamped >= 4
        ? "Strong"
        : clamped === 3
          ? "Reasonable — some gaps"
          : clamped === 2
            ? "Weak controls"
            : "Insufficient";
  const tone =
    clamped >= 4
      ? "bg-[oklch(0.6_0.14_150)]"
      : clamped === 3
        ? "bg-[oklch(0.7_0.16_70)]"
        : "bg-[oklch(0.6_0.2_27)]";
  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Validation strength
        </div>
        <div className="text-sm font-semibold">
          {clamped}/5 · <span className="text-muted-foreground font-normal">{label}</span>
        </div>
      </div>
      <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={cn("h-full rounded-full transition-all", tone)}
          style={{ width: `${pct}%` }}
        />
      </div>
      {rationale && <p className="mt-2 text-xs text-muted-foreground">{rationale}</p>}
    </div>
  );
}