import { useEffect, useId, useRef, useState } from "react";
import mermaid from "mermaid";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import type { Protocol, Validation } from "@/lib/types";
import { generateMermaidFlowchart, downloadFlowchartSVG } from "@/lib/flowchart";
import { toast } from "sonner";

let mermaidInitialized = false;
function ensureMermaidInit() {
  if (mermaidInitialized) return;
  mermaid.initialize({
    startOnLoad: false,
    theme: "neutral",
    securityLevel: "loose",
    flowchart: { useMaxWidth: true, htmlLabels: true },
  });
  mermaidInitialized = true;
}

export function FlowchartPanel({
  protocol,
  validation,
  version,
}: {
  protocol: Protocol | undefined;
  validation: Validation | undefined;
  version: number;
}) {
  const reactId = useId().replace(/[^a-zA-Z0-9]/g, "");
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [error, setError] = useState<string | null>(null);

  const definition = protocol ? generateMermaidFlowchart(protocol, validation) : "";

  useEffect(() => {
    let cancelled = false;
    if (!definition) return;
    ensureMermaidInit();
    (async () => {
      try {
        const id = `flow_${reactId}_${Date.now()}`;
        const { svg } = await mermaid.render(id, definition);
        if (!cancelled && containerRef.current) {
          containerRef.current.innerHTML = svg;
          setError(null);
        }
      } catch (e) {
        if (!cancelled) {
          console.error("mermaid render failed", e);
          setError("Could not render flowchart.");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [definition, reactId]);

  if (!protocol) {
    return (
      <div className="rounded-lg border border-dashed bg-card/50 p-8 text-center text-sm text-muted-foreground">
        Generate a protocol to see the experimental workflow.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-base font-semibold">Experimental workflow</h3>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Visual sequence of the main protocol stages.
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Generated directly from the current protocol steps.
        </p>
      </div>
      <div className="rounded-xl border bg-white p-6 dark:bg-white">
        {error ? (
          <div className="space-y-1 text-sm">
            <div className="text-destructive">{error}</div>
            <div className="text-muted-foreground">
              Flowchart could not be mapped perfectly from protocol. Review protocol steps manually.
            </div>
          </div>
        ) : (
          <div ref={containerRef} className="mermaid-host overflow-x-auto [&_svg]:mx-auto [&_svg]:h-auto [&_svg]:max-w-full" />
        )}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-xs text-muted-foreground">Generated from protocol version v{version}</div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            try {
              const svgEl = containerRef.current?.querySelector("svg") as SVGElement | null;
              downloadFlowchartSVG(svgEl);
              toast.success("Flowchart SVG downloaded");
            } catch (e) {
              toast.error(e instanceof Error ? e.message : "Download failed");
            }
          }}
        >
          <Download className="mr-2 h-4 w-4" /> Download SVG
        </Button>
      </div>
    </div>
  );
}