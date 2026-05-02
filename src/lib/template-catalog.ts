/**
 * Template catalog — 1000 pre-built CardDesign variants.
 * 40 layouts × 25 presets (5 palettes × 5 styles) = 1000 variants.
 * Each tagged for fast filtering by industry, visual style, mood, density.
 */

import type { CardDesign, TemplateId } from "./types";

// ── Tag types ─────────────────────────────────────────────────────────

export type IndustryTag =
  | "tech" | "finance" | "legal" | "healthcare" | "education"
  | "food-dining" | "creative-agency" | "real-estate" | "retail"
  | "beauty-wellness" | "consulting" | "nonprofit" | "entertainment"
  | "photography" | "construction";

export type StyleTag = "minimal" | "classic" | "bold" | "elegant" | "modern";
export type MoodTag = "light" | "dark" | "warm" | "cool";
export type DensityTag = "airy" | "balanced" | "compact";

export interface CatalogTags {
  industry: IndustryTag[];
  style: StyleTag[];
  mood: MoodTag[];
  density: DensityTag[];
}

export interface CatalogEntry {
  variant: CardDesign;
  tags: CatalogTags;
}

// ── Palettes ──────────────────────────────────────────────────────────

interface Palette {
  id: string;
  mood: MoodTag;
  colors: CardDesign["colors"];
}

const PALETTES: Palette[] = [
  {
    id: "corporate-blue",
    mood: "cool",
    colors: { primary: "#1e3a5f", secondary: "#4a6fa5", accent: "#2563eb", background: "#ffffff", backgroundAlt: "#1e3a5f", text: "#4b5563" },
  },
  {
    id: "warm-earth",
    mood: "warm",
    colors: { primary: "#5c3d2e", secondary: "#8b6914", accent: "#b45309", background: "#fefbf3", backgroundAlt: "#5c3d2e", text: "#6b5b4e" },
  },
  {
    id: "dark-premium",
    mood: "dark",
    colors: { primary: "#f5f5f5", secondary: "#d4a843", accent: "#d4a843", background: "#1a1a2e", backgroundAlt: "#0f0f1a", text: "#a0a0b0" },
  },
  {
    id: "cool-mint",
    mood: "cool",
    colors: { primary: "#134e4a", secondary: "#5eead4", accent: "#14b8a6", background: "#f0fdfa", backgroundAlt: "#134e4a", text: "#4b5563" },
  },
  {
    id: "vibrant-pop",
    mood: "light",
    colors: { primary: "#1e1e2e", secondary: "#6366f1", accent: "#8b5cf6", background: "#ffffff", backgroundAlt: "#1e1e2e", text: "#6b7280" },
  },
];

// ── Style combos ──────────────────────────────────────────────────────

interface StyleCombo {
  id: string;
  styleTags: StyleTag[];
  hasPattern: boolean;
  hasBorder: boolean;
  hasGradient: boolean;
}

const STYLE_COMBOS: StyleCombo[] = [
  { id: "clean",     styleTags: ["minimal", "modern"],    hasPattern: false, hasBorder: false, hasGradient: false },
  { id: "patterned", styleTags: ["modern", "classic"],    hasPattern: true,  hasBorder: false, hasGradient: false },
  { id: "bordered",  styleTags: ["classic", "elegant"],   hasPattern: false, hasBorder: true,  hasGradient: false },
  { id: "bold",      styleTags: ["bold"],                 hasPattern: true,  hasBorder: true,  hasGradient: false },
  { id: "textured",  styleTags: ["elegant", "bold"],      hasPattern: true,  hasBorder: false, hasGradient: true },
];

// ── Layout metadata (industry + density tags per layout) ──────────────

interface LayoutMeta {
  id: TemplateId;
  industry: IndustryTag[];
  density: DensityTag;
  font: CardDesign["font"];
  textAlign: CardDesign["textAlign"];
  safeLogoPositions: CardDesign["logo"]["placement"][];
}

const LAYOUTS: LayoutMeta[] = [
  // ── Carryover (26) ─────────────────────────────────────────────────
  { id: "minimal-clean",      industry: ["tech", "consulting", "creative-agency"],         density: "airy",     font: "sans",  textAlign: "left",   safeLogoPositions: ["top-right", "bottom-right"] },
  { id: "split-sidebar",      industry: ["creative-agency", "real-estate", "construction"], density: "balanced", font: "sans",  textAlign: "left",   safeLogoPositions: ["top-right", "bottom-right"] },
  { id: "centered-classic",   industry: ["legal", "finance", "consulting"],                density: "balanced", font: "serif", textAlign: "center", safeLogoPositions: ["top-left", "top-right", "bottom-left", "bottom-right"] },
  { id: "modern-left",        industry: ["tech", "consulting", "creative-agency"],         density: "balanced", font: "sans",  textAlign: "left",   safeLogoPositions: ["top-right", "bottom-right"] },
  { id: "elegant-serif",      industry: ["legal", "beauty-wellness", "real-estate"],       density: "airy",     font: "serif", textAlign: "center", safeLogoPositions: ["top-left", "top-right", "bottom-left", "bottom-right"] },
  { id: "stacked-bold",       industry: ["entertainment", "creative-agency", "consulting"], density: "balanced", font: "sans",  textAlign: "left",   safeLogoPositions: ["top-right", "bottom-right"] },
  { id: "japanese-minimal",   industry: ["photography", "creative-agency", "beauty-wellness"], density: "airy", font: "sans", textAlign: "right",  safeLogoPositions: ["top-left", "top-center", "bottom-left"] },
  { id: "top-accent",         industry: ["healthcare", "education", "nonprofit"],          density: "balanced", font: "sans",  textAlign: "left",   safeLogoPositions: ["top-right", "bottom-right"] },
  { id: "right-sidebar",      industry: ["creative-agency", "retail", "beauty-wellness"],  density: "balanced", font: "sans",  textAlign: "left",   safeLogoPositions: ["top-left", "bottom-left"] },
  { id: "vertical-split",     industry: ["consulting", "construction", "real-estate"],     density: "balanced", font: "sans",  textAlign: "left",   safeLogoPositions: ["top-right", "bottom-right"] },
  { id: "two-tone-split",     industry: ["tech", "creative-agency", "entertainment"],      density: "balanced", font: "sans",  textAlign: "left",   safeLogoPositions: ["top-right", "bottom-right"] },
  { id: "magazine-editorial", industry: ["creative-agency", "photography", "entertainment"], density: "airy",   font: "serif", textAlign: "left",   safeLogoPositions: ["top-left", "top-right"] },
  { id: "offset-minimal",     industry: ["creative-agency", "photography", "real-estate"], density: "airy",     font: "sans",  textAlign: "left",   safeLogoPositions: ["top-left", "bottom-right"] },
  { id: "asymmetric-blocks",  industry: ["creative-agency", "retail", "tech"],             density: "balanced", font: "sans",  textAlign: "left",   safeLogoPositions: ["bottom-right"] },
  { id: "corner-frame",       industry: ["photography", "beauty-wellness", "creative-agency"], density: "airy", font: "serif", textAlign: "center", safeLogoPositions: ["top-right", "bottom-right"] },
  { id: "retro-vintage",      industry: ["food-dining", "retail", "entertainment"],        density: "balanced", font: "serif", textAlign: "center", safeLogoPositions: ["top-left", "top-right", "bottom-left", "bottom-right"] },
  { id: "three-column",       industry: ["consulting", "finance", "healthcare"],           density: "compact",  font: "sans",  textAlign: "left",   safeLogoPositions: ["top-center", "bottom-center"] },
  { id: "edge-info",          industry: ["photography", "creative-agency", "entertainment"], density: "airy",   font: "sans",  textAlign: "left",   safeLogoPositions: ["center", "top-center"] },
  { id: "dark-gradient",      industry: ["tech", "entertainment", "photography"],          density: "balanced", font: "sans",  textAlign: "left",   safeLogoPositions: ["top-right"] },
  { id: "diagonal-accent",    industry: ["entertainment", "retail", "food-dining"],        density: "balanced", font: "sans",  textAlign: "left",   safeLogoPositions: ["bottom-right", "bottom-left"] },
  { id: "diagonal-split",     industry: ["creative-agency", "tech", "entertainment"],      density: "balanced", font: "sans",  textAlign: "left",   safeLogoPositions: ["bottom-left"] },
  { id: "mono-tech",          industry: ["tech", "construction", "consulting"],            density: "compact",  font: "mono",  textAlign: "left",   safeLogoPositions: ["top-right", "bottom-right"] },
  { id: "vertical-text",      industry: ["creative-agency", "photography", "real-estate"], density: "balanced", font: "sans",  textAlign: "left",   safeLogoPositions: ["top-right", "bottom-right"] },
  { id: "brutalist",          industry: ["entertainment", "creative-agency", "tech"],      density: "compact",  font: "sans",  textAlign: "left",   safeLogoPositions: ["top-right", "bottom-right"] },
  { id: "floating-name",      industry: ["entertainment", "creative-agency", "photography"], density: "airy",   font: "sans",  textAlign: "left",   safeLogoPositions: ["top-left", "top-right"] },
  { id: "wave-divide",        industry: ["beauty-wellness", "food-dining", "nonprofit"],   density: "balanced", font: "sans",  textAlign: "left",   safeLogoPositions: ["bottom-right", "bottom-left"] },

  // ── New (26) ────────────────────────────────────────────────────────
  { id: "editorial-type",     industry: ["creative-agency", "photography", "tech"],         density: "airy",     font: "sans",  textAlign: "left",   safeLogoPositions: ["top-right", "bottom-right"] },
  { id: "bold-accent",        industry: ["entertainment", "creative-agency", "tech"],       density: "balanced", font: "sans",  textAlign: "left",   safeLogoPositions: ["top-right"] },
  { id: "swiss-grid",         industry: ["consulting", "finance", "legal", "tech"],         density: "balanced", font: "sans",  textAlign: "left",   safeLogoPositions: ["top-right", "bottom-right"] },
  { id: "glyph-mark",         industry: ["creative-agency", "consulting", "construction", "legal", "finance"],  density: "balanced", font: "sans",  textAlign: "left",   safeLogoPositions: ["top-right", "bottom-right"] },
  { id: "brutalist-grid",     industry: ["creative-agency", "entertainment"],               density: "compact",  font: "sans",  textAlign: "left",   safeLogoPositions: ["top-right", "bottom-right"] },
  { id: "soft-surface",       industry: ["beauty-wellness", "photography", "retail", "food-dining"], density: "airy", font: "sans", textAlign: "left", safeLogoPositions: ["top-right", "bottom-right"] },
  { id: "diagonal-modern",    industry: ["creative-agency", "entertainment", "tech"],       density: "balanced", font: "sans",  textAlign: "left",   safeLogoPositions: ["bottom-right", "top-right"] },
  { id: "ribbon-minimal",     industry: ["beauty-wellness", "photography", "legal", "food-dining", "real-estate", "nonprofit"], density: "airy", font: "serif", textAlign: "center", safeLogoPositions: ["top-right", "bottom-right"] },
  { id: "zen-asymmetric",     industry: ["beauty-wellness", "photography", "creative-agency"], density: "airy", font: "sans",  textAlign: "right",  safeLogoPositions: ["top-left", "top-center"] },
  { id: "mono-terminal",      industry: ["tech"],                                            density: "balanced", font: "mono",  textAlign: "left",   safeLogoPositions: ["top-right", "bottom-right"] },
  { id: "wide-band",          industry: ["finance", "consulting", "construction", "healthcare", "legal"], density: "balanced", font: "sans", textAlign: "left", safeLogoPositions: ["top-right", "bottom-right"] },
  { id: "two-column-clean",   industry: ["consulting", "legal", "finance"],                 density: "balanced", font: "sans",  textAlign: "left",   safeLogoPositions: ["top-right", "bottom-right"] },
  { id: "oversized-initial",  industry: ["creative-agency", "entertainment", "retail"],    density: "airy",     font: "sans",  textAlign: "left",   safeLogoPositions: ["bottom-right", "top-right"] },
  { id: "top-heavy",          industry: ["creative-agency", "photography", "entertainment", "beauty-wellness"], density: "airy", font: "sans", textAlign: "left", safeLogoPositions: ["top-right", "bottom-right"] },
  { id: "l-frame",            industry: ["construction", "consulting", "tech"],             density: "balanced", font: "sans",  textAlign: "left",   safeLogoPositions: ["bottom-right", "bottom-left"] },
  { id: "inset-elegant",      industry: ["legal", "real-estate", "beauty-wellness"],        density: "balanced", font: "serif", textAlign: "center", safeLogoPositions: ["top-right", "bottom-right"] },
  { id: "horizontal-stack",   industry: ["tech", "consulting", "finance", "healthcare"],     density: "compact",  font: "sans",  textAlign: "left",   safeLogoPositions: ["top-right", "bottom-right"] },
  { id: "circle-badge",       industry: ["legal", "consulting", "finance"],                 density: "balanced", font: "serif", textAlign: "center", safeLogoPositions: ["bottom-left", "bottom-right"] },
  { id: "right-accent-bar",   industry: ["tech", "consulting", "healthcare"],               density: "balanced", font: "sans",  textAlign: "left",   safeLogoPositions: ["top-left", "bottom-left"] },
  { id: "stacked-display",    industry: ["entertainment", "creative-agency", "retail"],    density: "balanced", font: "sans",  textAlign: "left",   safeLogoPositions: ["top-right", "bottom-right"] },
  { id: "orbit",              industry: ["tech", "creative-agency", "entertainment", "retail"], density: "balanced", font: "sans",  textAlign: "left",   safeLogoPositions: ["bottom-left", "bottom-right"] },
  { id: "twin-circles",       industry: ["creative-agency", "beauty-wellness", "education"],density: "airy",     font: "sans",  textAlign: "left",   safeLogoPositions: ["top-left", "bottom-right"] },
  { id: "corner-block",       industry: ["construction", "creative-agency", "tech"],        density: "balanced", font: "sans",  textAlign: "left",   safeLogoPositions: ["top-left", "top-right"] },
  { id: "half-moon",          industry: ["beauty-wellness", "photography", "food-dining", "real-estate"], density: "airy", font: "sans", textAlign: "left", safeLogoPositions: ["top-right", "bottom-right"] },
  { id: "stacked-bars",       industry: ["entertainment", "tech", "creative-agency"],       density: "balanced", font: "sans",  textAlign: "left",   safeLogoPositions: ["top-right", "bottom-right"] },
  { id: "diamond-accent",     industry: ["creative-agency", "entertainment", "retail", "photography"], density: "balanced", font: "sans", textAlign: "left", safeLogoPositions: ["top-left", "bottom-left"] },
];

// ── Pattern pool per style combo ──────────────────────────────────────

const PATTERN_POOL = [
  "dots", "diagonal-lines", "waves", "hexagons", "chevrons",
  "circles", "diamond-grid", "crosshatch", "zigzag", "plus-grid",
  "triangles", "topography", "horizontal-lines", "scattered-dots",
];

const LOGO_POOL_BY_INDUSTRY: Record<string, string[]> = {
  "tech":             ["code-brackets", "hexagon", "square-letter", "gear"],
  "finance":          ["shield", "arrow-up", "circle-letter", "diamond"],
  "legal":            ["shield", "book", "circle-letter", "crown"],
  "healthcare":       ["heart-pulse", "plus-grid", "circle-letter", "leaf"],
  "education":        ["book", "lighthouse", "globe", "circle-letter"],
  "food-dining":      ["flame", "star", "circle-letter", "crown"],
  "creative-agency":  ["abstract-wave", "circle-letter", "rounded-letter", "star"],
  "real-estate":      ["mountains", "lighthouse", "shield", "circle-letter"],
  "retail":           ["star", "diamond", "circle-letter", "crown"],
  "beauty-wellness":  ["leaf", "abstract-wave", "circle-letter", "diamond"],
  "consulting":       ["arrow-up", "lighthouse", "circle-letter", "globe"],
  "nonprofit":        ["globe", "heart-pulse", "leaf", "circle-letter"],
  "entertainment":    ["star", "flame", "abstract-wave", "circle-letter"],
  "photography":      ["circle-letter", "abstract-wave", "mountains", "star"],
  "construction":     ["gear", "mountains", "shield", "hexagon"],
};

// ── Deterministic seeded random ───────────────────────────────────────

function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

// ── Generate catalog ──────────────────────────────────────────────────

function generateCatalog(): CatalogEntry[] {
  const catalog: CatalogEntry[] = [];
  const rand = seededRandom(42);

  for (let li = 0; li < LAYOUTS.length; li++) {
    const layout = LAYOUTS[li];

    for (let pi = 0; pi < PALETTES.length; pi++) {
      const palette = PALETTES[pi];

      for (let si = 0; si < STYLE_COMBOS.length; si++) {
        const style = STYLE_COMBOS[si];
        const idx = catalog.length;

        // Pick pattern
        const patternId = style.hasPattern
          ? PATTERN_POOL[Math.floor(rand() * PATTERN_POOL.length)]
          : "none";
        const patternOpacity = style.hasPattern ? (0.08 + rand() * 0.12) : 0;

        // Pick logo based on primary industry
        const primaryIndustry = layout.industry[0];
        const logoPool = LOGO_POOL_BY_INDUSTRY[primaryIndustry] || ["circle-letter"];
        const logoId = logoPool[Math.floor(rand() * logoPool.length)];
        const logoPlacement = layout.safeLogoPositions[Math.floor(rand() * layout.safeLogoPositions.length)];

        // Border
        const borderWidth = style.hasBorder ? (1 + Math.floor(rand() * 3)) : 0;

        // Build variant
        const variant: CardDesign = {
          id: `cat-${idx}`,
          templateId: layout.id,
          name: `${layout.id}—${palette.id}—${style.id}`,
          reasoning: "",
          font: layout.font,
          textAlign: layout.textAlign,
          spacing: layout.density === "compact" ? "compact" : layout.density === "airy" ? "spacious" : "normal",
          borderRadius: "medium",
          colors: { ...palette.colors },
          pattern: {
            id: patternId,
            opacity: Math.round(patternOpacity * 100) / 100,
            color: palette.colors.accent,
            placement: "full",
          },
          backgroundEffect: {
            type: style.hasGradient ? "gradient" : "none",
            color: palette.colors.accent,
            opacity: style.hasGradient ? 0.04 : 0,
            angle: style.hasGradient ? (90 + Math.floor(rand() * 180)) : 135,
          },
          logo: {
            id: logoId as import("./logos").LogoId,
            placement: logoPlacement,
            size: "medium",
          },
          border: {
            sides: style.hasBorder ? "all" : "none",
            width: borderWidth,
            color: palette.colors.accent,
          },
        };

        // Compute tags
        const moodTag: MoodTag = palette.mood;
        // Extra moods: dark palette on dark-requiring layouts
        const moods: MoodTag[] = [moodTag];
        if (palette.id === "dark-premium") moods.push("dark");
        if (palette.id === "warm-earth") moods.push("warm");

        const tags: CatalogTags = {
          industry: [...layout.industry],
          style: [...style.styleTags],
          mood: [...new Set(moods)],
          density: [layout.density],
        };

        catalog.push({ variant, tags });
      }
    }
  }

  return catalog;
}

// ── Static catalog (generated once at import time) ────────────────────

export const TEMPLATE_CATALOG: CatalogEntry[] = generateCatalog();

// ── Search / filter helpers ───────────────────────────────────────────

export interface TagQuery {
  industry?: IndustryTag[];
  style?: StyleTag[];
  mood?: MoodTag[];
  density?: DensityTag[];
}

/** Score a catalog entry against a tag query. Higher = better match. */
export function scoreCatalogEntry(entry: CatalogEntry, query: TagQuery): number {
  let score = 0;
  if (query.industry) {
    for (const t of query.industry) {
      if (entry.tags.industry.includes(t)) score += 3; // industry match is most important
    }
  }
  if (query.style) {
    for (const t of query.style) {
      if (entry.tags.style.includes(t)) score += 2;
    }
  }
  if (query.mood) {
    for (const t of query.mood) {
      if (entry.tags.mood.includes(t)) score += 2;
    }
  }
  if (query.density) {
    for (const t of query.density) {
      if (entry.tags.density.includes(t)) score += 1;
    }
  }
  return score;
}

/** Filter catalog by tags, return top N with layout variety. */
export function filterCatalog(query: TagQuery, count: number = 4): CardDesign[] {
  // Score all entries
  const scored = TEMPLATE_CATALOG.map((entry) => ({
    entry,
    score: scoreCatalogEntry(entry, query),
  }));

  // Sort by score descending
  scored.sort((a, b) => b.score - a.score);

  // Pick top entries ensuring layout variety
  const picked: CardDesign[] = [];
  const usedLayouts = new Set<string>();

  for (const { entry, score } of scored) {
    if (picked.length >= count) break;
    if (score <= 0) break;
    // Ensure layout variety: don't repeat same templateId
    if (usedLayouts.has(entry.variant.templateId)) continue;
    usedLayouts.add(entry.variant.templateId);
    picked.push({ ...entry.variant, id: `cat-pick-${Date.now()}-${picked.length}` });
  }

  return picked;
}
