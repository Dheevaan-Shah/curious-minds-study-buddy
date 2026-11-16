/** Resolve a CSS colour variable (any format, e.g. oklch) to RGB using a 1×1 canvas. Browser only. */
export function readCssRgb(varName: string, el: Element = document.documentElement, fallback: [number, number, number] = [128, 128, 128]): [number, number, number] {
  const value = getComputedStyle(el).getPropertyValue(varName).trim();
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 1;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx || !value) return fallback;
  ctx.fillStyle = "#010203";
  ctx.fillStyle = value;
  if (ctx.fillStyle === "#010203") return fallback; // colour format not supported
  ctx.fillRect(0, 0, 1, 1);
  const d = ctx.getImageData(0, 0, 1, 1).data;
  return [d[0]!, d[1]!, d[2]!];
}

export function readCssHex(varName: string, el?: Element): string {
  return "#" + readCssRgb(varName, el).map((n) => n.toString(16).padStart(2, "0")).join("");
}
