export function AppFooter() {
  return (
    <footer className="mt-16 border-t bg-background/60">
      <div className="mx-auto max-w-6xl px-6 py-6 text-center text-xs text-muted-foreground">
        <div>Built at Hack-Nation Global AI Hackathon 2026</div>
        <div className="mt-2 flex flex-wrap items-center justify-center gap-x-3 gap-y-1">
          <span>Powered by</span>
          {["Tavily", "Semantic Scholar", "PubMed", "protocols.io", "Addgene"].map((s) => (
            <span
              key={s}
              className="rounded-full border bg-card px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide"
            >
              {s}
            </span>
          ))}
        </div>
      </div>
    </footer>
  );
}