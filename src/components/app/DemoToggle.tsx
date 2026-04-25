import { useEffect, useState } from "react";
import { Switch } from "@/components/ui/switch";
import { Sparkles } from "lucide-react";

const KEY = "ai-scientist-demo-mode";

export function getDemoMode(): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(KEY) === "1";
}

export function setDemoMode(v: boolean) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, v ? "1" : "0");
  window.dispatchEvent(new CustomEvent("demo-mode-change", { detail: v }));
}

export function useDemoMode(): [boolean, (v: boolean) => void] {
  const [on, setOn] = useState(false);
  useEffect(() => {
    setOn(getDemoMode());
    const handler = (e: Event) => {
      const ce = e as CustomEvent<boolean>;
      setOn(!!ce.detail);
    };
    window.addEventListener("demo-mode-change", handler);
    return () => window.removeEventListener("demo-mode-change", handler);
  }, []);
  return [
    on,
    (v: boolean) => {
      setDemoMode(v);
      setOn(v);
    },
  ];
}

export function DemoToggle() {
  const [on, setOn] = useDemoMode();
  return (
    <label className="flex cursor-pointer items-center gap-2 text-xs text-muted-foreground select-none">
      <Sparkles className="h-3.5 w-3.5" />
      <span className="hidden sm:inline">Demo</span>
      <Switch checked={on} onCheckedChange={setOn} aria-label="Toggle demo mode" />
    </label>
  );
}