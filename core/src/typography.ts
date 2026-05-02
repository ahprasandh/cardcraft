/**
 * Typography scale — named font sizes used across all templates.
 *
 * Specs reference scale tokens (`"caption" | "body" | "heading" | "display"`)
 * instead of hardcoded numbers. Renderers resolve the token to a px value at
 * render time. Tweaking the scale here updates every template at once.
 *
 * The four tokens map roughly to the existing webapp's typography intent:
 *   caption — fine print, contact lines, tagline
 *   body    — titles, secondary headings
 *   heading — names (the primary hierarchy element)
 *   display — oversized names (e.g. stacked-bold, magazine-editorial)
 *
 * Specs may also use a literal number for one-off sizes when no token fits.
 */

export type TypeToken = "caption" | "body" | "heading" | "display";

export const TYPE_SCALE: Record<TypeToken, number> = {
  caption: 8,
  body: 10,
  heading: 16,
  display: 22,
};

/** Resolve a fontSize value (token or number) to a px number. */
export function resolveFontSize(value: number | TypeToken): number {
  if (typeof value === "number") return value;
  return TYPE_SCALE[value];
}
