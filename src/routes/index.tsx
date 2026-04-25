import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, FlaskConical, Microscope, FileText } from "lucide-react";
import { AppHeader } from "@/components/app/Stepper";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "AI Scientist — From hypothesis to runnable experiment plan" },
      {
        name: "description",
        content:
          "Turn a bioscience hypothesis into a literature-grounded, lab-ready experiment plan with materials, budget, timeline, and validation.",
      },
      { property: "og:title", content: "AI Scientist" },
      {
        property: "og:description",
        content: "From hypothesis to runnable experiment plan.",
      },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen">
      <AppHeader />
      <main className="mx-auto flex max-w-4xl flex-col items-center px-6 pt-24 pb-16 text-center">
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border bg-card px-3 py-1 text-xs text-muted-foreground">
          <span className="h-1.5 w-1.5 rounded-full bg-primary" />
          For bench scientists
        </div>
        <h1 className="text-balance text-5xl font-semibold tracking-tight sm:text-6xl">
          AI Scientist
        </h1>
        <p className="mt-5 max-w-xl text-balance text-lg text-muted-foreground">
          From hypothesis to runnable experiment plan.
        </p>
        <div className="mt-10">
          <Button asChild size="lg" className="h-12 px-6">
            <Link to="/input">
              Start new experiment plan <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>

        <div className="mt-20 grid w-full gap-4 sm:grid-cols-3">
          {[
            {
              icon: Microscope,
              title: "Literature QC",
              body: "Tavily + Semantic Scholar check whether your idea is novel.",
            },
            {
              icon: FlaskConical,
              title: "Materials & budget",
              body: "Real supplier catalog hits, line-item costs in EUR.",
            },
            {
              icon: FileText,
              title: "Reviewable plan",
              body: "Rate, flag, and regenerate with your expert corrections.",
            },
          ].map((c) => (
            <div
              key={c.title}
              className="rounded-xl border bg-card p-5 text-left"
            >
              <c.icon className="mb-3 h-5 w-5 text-primary" />
              <div className="font-medium">{c.title}</div>
              <p className="mt-1 text-sm text-muted-foreground">{c.body}</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
