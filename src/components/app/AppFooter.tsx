import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { clearMemoryBank, exportMemoryJson, memoryStats } from "@/lib/memoryBank";
import { toast } from "sonner";

export function AppFooter() {
  const [open, setOpen] = useState(false);
  const stats = open ? memoryStats() : { plans: 0, corrections: 0, patterns: 0 };
  return (
    <footer className="mt-16 border-t bg-background/60">
      <div className="mx-auto max-w-6xl px-6 py-6 text-center text-xs text-muted-foreground">
        <div>Built at Hack-Nation Global AI Hackathon 2026</div>
        <div className="mt-2 flex flex-wrap items-center justify-center gap-x-3 gap-y-1">
          <span>Powered by</span>
          {[
            "Semantic Scholar",
            "PubMed",
            "protocols.io",
            "Thermo Fisher",
            "Sigma-Aldrich",
            "Addgene",
          ].map((s) => (
            <span
              key={s}
              className="rounded-full border bg-card px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide"
            >
              {s}
            </span>
          ))}
        </div>
        <div className="mt-2 text-[10px] opacity-60">
          Retrieval infrastructure powered by Tavily.
        </div>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="mt-2 text-[10px] underline-offset-2 opacity-60 hover:underline"
        >
          Learning settings
        </button>
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>LabMind learning memory</DialogTitle>
            <DialogDescription>
              LabMind learns from prior reviewed plans stored locally in this browser.
            </DialogDescription>
          </DialogHeader>
          <ul className="space-y-1.5 text-sm">
            <li>Stored reviewed plans: <span className="font-medium">{stats.plans}</span></li>
            <li>Stored corrections: <span className="font-medium">{stats.corrections}</span></li>
            <li>Stored learned patterns: <span className="font-medium">{stats.patterns}</span></li>
          </ul>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                try {
                  const json = exportMemoryJson();
                  const blob = new Blob([json], { type: "application/json" });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = `labmind_memory_${new Date().toISOString().slice(0, 10)}.json`;
                  a.click();
                  URL.revokeObjectURL(url);
                  toast.success("Memory exported");
                } catch {
                  toast.error("Export failed");
                }
              }}
            >
              Export memory JSON
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                clearMemoryBank();
                toast.success("Memory cleared");
                setOpen(false);
              }}
            >
              Clear memory
            </Button>
            <Button size="sm" onClick={() => setOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </footer>
  );
}