/**
 * Pass 9 — Part A
 * Helpers to capture DOM nodes via html2canvas-pro, which natively
 * supports CSS `oklch()`, `oklab()`, `lch()` and `lab()` color
 * functions. No pre-processing of styles is required.
 */
import html2canvas from "html2canvas-pro";

export async function captureElement(
  el: HTMLElement,
  options: Parameters<typeof html2canvas>[1] = {},
): Promise<HTMLCanvasElement> {
  return await html2canvas(el, {
    scale: 2,
    backgroundColor: "#ffffff",
    useCORS: true,
    allowTaint: true,
    logging: false,
    ...options,
  });
}