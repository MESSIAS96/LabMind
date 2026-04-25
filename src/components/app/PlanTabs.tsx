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
import type { ExperimentPlan } from "@/lib/types";
import { cn } from "@/lib/utils";

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

export function PlanTabs({
  plan,
  sources,
}: {
  plan: ExperimentPlan;
  sources: { protocol: { title: string; url: string }[]; supplier: { title: string; url: string }[]; validation: { title: string; url: string }[]; scholar: { title: string; url: string }[] };
}) {
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
            <Accordion type="multiple" className="rounded-xl border bg-card">
              {plan.protocol.protocol_steps.map((s) => (
                <AccordionItem key={s.step} value={`s${s.step}`} className="px-4">
                  <AccordionTrigger className="hover:no-underline">
                    <div className="flex items-center gap-3 text-left">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-medium text-primary-foreground">
                        {s.step}
                      </span>
                      <span className="font-medium">{s.title}</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-3 pl-9 text-sm">
                      <p className="text-muted-foreground">{s.description}</p>
                      {s.critical_parameters && (
                        <div className="rounded-md bg-accent/40 p-3 text-xs">
                          <span className="font-medium text-accent-foreground">
                            Critical parameters:
                          </span>{" "}
                          <span className="text-muted-foreground">{s.critical_parameters}</span>
                        </div>
                      )}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>

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
                    <TableCell>{m.supplier}</TableCell>
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
                    <TableHead>Unit cost</TableHead>
                    <TableHead>Total</TableHead>
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
        )}
      </TabsContent>

      <TabsContent value="sources" className="mt-6">
        <div className="space-y-6">
          <SourceList title="Protocol sources" items={sources.protocol} />
          <SourceList title="Supplier sources" items={sources.supplier} />
          <SourceList title="Validation sources" items={sources.validation} />
          <SourceList title="Literature (Semantic Scholar)" items={sources.scholar} />
        </div>
      </TabsContent>
    </Tabs>
  );
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
  items: { title: string; url: string }[];
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
                <div className="font-medium leading-snug">{s.title || s.url}</div>
                <div className="mt-0.5 truncate text-xs text-muted-foreground">{s.url}</div>
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}