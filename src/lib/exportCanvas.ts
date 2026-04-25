/**
 * Pass 8 — Part E
 * Helpers to safely capture DOM nodes with html2canvas, which cannot parse
 * the CSS `oklch()` color function used throughout our design tokens.
 *
 * Strategy (belt + suspenders):
 *   1. Add the `.export-safe` class to the target element (and self-clean
 *      afterwards). That class redefines every oklch token as a hex value.
 *   2. Walk every descendant and lock in its currently-computed color
 *      properties as inline styles. Browsers resolve oklch() to rgb() in
 *      getComputedStyle, so writing the resolved value back as an inline
 *      style guarantees html2canvas only ever sees rgb().
 *   3. As a final safety net, the `onclone` hook strips any remaining
 *      oklch() occurrences from the cloned document's stylesheets.
 */
import html2canvas from "html2canvas";

const COLOR_PROPS = [
  "color",
  "backgroundColor",
  "borderColor",
  "borderTopColor",
  "borderRightColor",
  "borderBottomColor",
  "borderLeftColor",
  "outlineColor",
  "fill",
  "stroke",
] as const;

function normalizeColorsForCanvas(root: HTMLElement): () => void {
  const touched: Array<{ el: HTMLElement; prop: string; prev: string }> = [];
  const all = [root, ...Array.from(root.querySelectorAll<HTMLElement>("*"))];
  for (const el of all) {
    const computed = window.getComputedStyle(el);
    for (const prop of COLOR_PROPS) {
      const value = computed[prop as keyof CSSStyleDeclaration] as string | undefined;
      if (typeof value === "string" && value.includes("oklch")) {
        // Browser already resolved the oklch() to rgb() in computed style.
        // Lock that resolved value in as an inline override.
        const prev = (el.style as unknown as Record<string, string>)[prop] ?? "";
        (el.style as unknown as Record<string, string>)[prop] = value;
        touched.push({ el, prop, prev });
      }
    }
  }
  return () => {
    for (const { el, prop, prev } of touched) {
      (el.style as unknown as Record<string, string>)[prop] = prev;
    }
  };
}

function stripOklchInClone(clonedDoc: Document) {
  try {
    const sheets = Array.from(clonedDoc.styleSheets);
    for (const sheet of sheets) {
      let rules: CSSRuleList | null = null;
      try {
        rules = sheet.cssRules;
      } catch {
        continue; // cross-origin
      }
      if (!rules) continue;
      for (const rule of Array.from(rules)) {
        const styleRule = rule as CSSStyleRule;
        if (!styleRule.style) continue;
        const cssText = styleRule.style.cssText;
        if (cssText && cssText.includes("oklch")) {
          styleRule.style.cssText = cssText.replace(
            /oklch\([^)]+\)/g,
            "transparent",
          );
        }
      }
    }
  } catch {
    // best-effort
  }
}

export async function captureElement(
  el: HTMLElement,
  options: Parameters<typeof html2canvas>[1] = {},
): Promise<HTMLCanvasElement> {
  el.classList.add("export-safe");
  const restore = normalizeColorsForCanvas(el);
  try {
    return await html2canvas(el, {
      scale: 2,
      backgroundColor: "#ffffff",
      useCORS: true,
      allowTaint: true,
      logging: false,
      onclone: (clonedDoc) => stripOklchInClone(clonedDoc),
      ...options,
    });
  } finally {
    restore();
    el.classList.remove("export-safe");
  }
}