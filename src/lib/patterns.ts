// ---- Background Pattern Repository ----
// SVG patterns that tile across card backgrounds. LLM picks the best one.

export type PatternId =
  | "none"
  | "dots"
  | "diagonal-lines"
  | "horizontal-lines"
  | "crosshatch"
  | "waves"
  | "circles"
  | "hexagons"
  | "chevrons"
  | "diamond-grid"
  | "scattered-dots"
  | "zigzag"
  | "plus-grid"
  | "triangles"
  | "topography";

export interface PatternMeta {
  id: PatternId;
  name: string;
  description: string;
  bestFor: string;
}

export const PATTERNS: PatternMeta[] = [
  { id: "none", name: "No Pattern", description: "Clean solid background with no pattern overlay.", bestFor: "minimal, clean, modern designs" },
  { id: "dots", name: "Dot Grid", description: "Subtle evenly-spaced dot grid across the background.", bestFor: "tech, startups, modern corporate" },
  { id: "diagonal-lines", name: "Diagonal Lines", description: "Thin diagonal lines at 45 degrees creating a striped texture.", bestFor: "finance, consulting, professional services" },
  { id: "horizontal-lines", name: "Horizontal Lines", description: "Fine horizontal lines for a lined-paper texture.", bestFor: "editors, writers, education, notebooks" },
  { id: "crosshatch", name: "Crosshatch", description: "Crossing diagonal lines forming a diamond mesh pattern.", bestFor: "engineering, architecture, construction" },
  { id: "waves", name: "Waves", description: "Gentle repeating wave curves for a fluid, organic feel.", bestFor: "wellness, spa, water-related, creative" },
  { id: "circles", name: "Concentric Circles", description: "Subtle overlapping circle outlines for a modern look.", bestFor: "design studios, photography, art" },
  { id: "hexagons", name: "Hexagon Grid", description: "Tiled hexagonal shapes creating a honeycomb pattern.", bestFor: "tech, biotech, chemistry, innovation" },
  { id: "chevrons", name: "Chevrons", description: "Repeating V-shaped chevron rows for a dynamic, directional feel.", bestFor: "sports, fitness, military, delivery" },
  { id: "diamond-grid", name: "Diamond Grid", description: "Small rotated squares forming a diamond trellis pattern.", bestFor: "luxury, fashion, jewelry, upscale retail" },
  { id: "scattered-dots", name: "Scattered Dots", description: "Random-looking dots of varying sizes for a playful speckle.", bestFor: "kids, pets, food, casual, creative brands" },
  { id: "zigzag", name: "Zigzag", description: "Sharp zigzag lines running horizontally for an energetic feel.", bestFor: "events, entertainment, music, nightlife" },
  { id: "plus-grid", name: "Plus Grid", description: "Small plus/cross signs arranged in a grid for a medical/tech look.", bestFor: "healthcare, medical, pharmacy, science" },
  { id: "triangles", name: "Triangle Mosaic", description: "Small repeating triangles forming a geometric mosaic.", bestFor: "gaming, esports, youth brands, agencies" },
  { id: "topography", name: "Topography", description: "Organic contour lines like a topographic map, subtle and unique.", bestFor: "outdoor, travel, geography, environmental" },
];

/**
 * Returns an inline SVG data URI for the given pattern.
 * The color is the stroke/fill of the pattern elements.
 * Opacity controls how subtle the pattern is (0.05-0.15 recommended).
 */
export function getPatternSVG(patternId: PatternId, color: string, opacity: number = 0.08): string | null {
  if (patternId === "none") return null;

  // Use raw color in SVG. We base64-encode the resulting SVG (rather
  // than encodeURIComponent it) so the data URL is composed entirely of
  // [A-Za-z0-9+/=] characters. That's important because dom-to-image
  // clones the card into a foreignObject inside another SVG, and a
  // URL-encoded inner SVG (with %3C/%3E/%22) can break when the browser
  // tries to render the outer SVG as an Image. Base64 sidesteps the
  // whole nested-encoding problem — same trick the user-uploaded logo
  // uses (data:image/png;base64,...) which is why logos always export.
  const c = color;

  const patterns: Record<string, string> = {
    dots: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20"><circle cx="10" cy="10" r="1.5" fill="${c}" opacity="${opacity}"/></svg>`,

    "diagonal-lines": `<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"><line x1="0" y1="10" x2="10" y2="0" stroke="${c}" stroke-width="0.8" opacity="${opacity}"/></svg>`,

    "horizontal-lines": `<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"><line x1="0" y1="5" x2="10" y2="5" stroke="${c}" stroke-width="0.6" opacity="${opacity}"/></svg>`,

    crosshatch: `<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"><line x1="0" y1="10" x2="10" y2="0" stroke="${c}" stroke-width="0.6" opacity="${opacity}"/><line x1="0" y1="0" x2="10" y2="10" stroke="${c}" stroke-width="0.6" opacity="${opacity}"/></svg>`,

    waves: `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="20"><path d="M0 10 Q10 0 20 10 Q30 20 40 10" fill="none" stroke="${c}" stroke-width="0.8" opacity="${opacity}"/></svg>`,

    circles: `<svg xmlns="http://www.w3.org/2000/svg" width="30" height="30"><circle cx="15" cy="15" r="10" fill="none" stroke="${c}" stroke-width="0.6" opacity="${opacity}"/></svg>`,

    hexagons: `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="49"><path d="M14 0 L28 8.5 L28 25.5 L14 34 L0 25.5 L0 8.5 Z" fill="none" stroke="${c}" stroke-width="0.6" opacity="${opacity}"/><path d="M14 15 L28 23.5 L28 40.5 L14 49 L0 40.5 L0 23.5 Z" fill="none" stroke="${c}" stroke-width="0.6" opacity="${opacity}" transform="translate(14,17)"/></svg>`,

    chevrons: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="16"><polyline points="0,12 10,4 20,12" fill="none" stroke="${c}" stroke-width="0.8" opacity="${opacity}"/></svg>`,

    "diamond-grid": `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16"><rect x="4" y="4" width="8" height="8" transform="rotate(45 8 8)" fill="none" stroke="${c}" stroke-width="0.6" opacity="${opacity}"/></svg>`,

    "scattered-dots": `<svg xmlns="http://www.w3.org/2000/svg" width="30" height="30"><circle cx="5" cy="8" r="1" fill="${c}" opacity="${opacity}"/><circle cx="18" cy="3" r="1.5" fill="${c}" opacity="${opacity}"/><circle cx="25" cy="18" r="1" fill="${c}" opacity="${opacity}"/><circle cx="10" cy="22" r="1.8" fill="${c}" opacity="${opacity}"/><circle cx="28" cy="28" r="1.2" fill="${c}" opacity="${opacity}"/></svg>`,

    zigzag: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="12"><polyline points="0,6 5,2 10,6 15,2 20,6" fill="none" stroke="${c}" stroke-width="0.8" opacity="${opacity}"/></svg>`,

    "plus-grid": `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20"><line x1="10" y1="6" x2="10" y2="14" stroke="${c}" stroke-width="0.8" opacity="${opacity}"/><line x1="6" y1="10" x2="14" y2="10" stroke="${c}" stroke-width="0.8" opacity="${opacity}"/></svg>`,

    triangles: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="18"><polygon points="10,2 18,16 2,16" fill="none" stroke="${c}" stroke-width="0.6" opacity="${opacity}"/></svg>`,

    topography: `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40"><path d="M5 20 Q15 10 25 20 Q35 30 40 20" fill="none" stroke="${c}" stroke-width="0.5" opacity="${opacity}"/><path d="M0 30 Q10 20 20 30 Q30 40 40 30" fill="none" stroke="${c}" stroke-width="0.5" opacity="${opacity}"/><path d="M0 10 Q10 0 20 10 Q30 20 40 10" fill="none" stroke="${c}" stroke-width="0.5" opacity="${opacity}"/></svg>`,
  };

  const svg = patterns[patternId];
  if (!svg) return null;

  // btoa needs Latin-1; our SVG strings are pure ASCII so it's safe.
  // Wrap in unescape(encodeURIComponent(...)) defensively to handle any
  // future non-ASCII characters (rare but possible if a color string
  // ever contains a special char).
  const safe = typeof unescape === "function"
    ? unescape(encodeURIComponent(svg))
    : svg;
  return `url("data:image/svg+xml;base64,${btoa(safe)}")`;
}
