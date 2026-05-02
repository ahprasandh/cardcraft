import type { CardDesign, TemplateId, ColorTheme, PatternPlacement, LogoPlacement } from "./types";
import { PATTERNS, type PatternId } from "./patterns";
import { LOGOS, type LogoId } from "./logos";
import { PALETTES } from "@core/palettes";

// ---- Template metadata (used for LLM prompt & template catalog) ----

export interface TemplateMeta {
  id: TemplateId;
  name: string;
  description: string;
  bestFor: string;
  logoPosition: string;
}

export const TEMPLATES: TemplateMeta[] = [
  // ── Carryover (26) ─────────────────────────────────────────────────
  { id: "minimal-clean",      name: "Minimal Clean",      description: "Spacious left-aligned layout with thin accent line. Ultra-clean whitespace.",   bestFor: "tech, consulting, startups",                  logoPosition: "top-right" },
  { id: "split-sidebar",      name: "Split Sidebar",      description: "Colored sidebar on left with name, white area on right with details.",          bestFor: "creative agencies, design, architecture",     logoPosition: "top-right" },
  { id: "centered-classic",   name: "Centered Classic",   description: "Everything centered, thin divider lines, symmetrical and timeless.",            bestFor: "law, finance, real estate, insurance",        logoPosition: "top-center" },
  { id: "modern-left",        name: "Modern Left",        description: "Left-aligned with colored accent bar on left edge, modern sans-serif.",         bestFor: "tech, SaaS, product companies",               logoPosition: "top-right" },
  { id: "elegant-serif",      name: "Elegant Serif",      description: "Refined serif typography, light background, subtle gold/dark accents.",         bestFor: "luxury, fashion, hospitality, jewelry",       logoPosition: "top-center" },
  { id: "stacked-bold",       name: "Stacked Bold",       description: "Name in large bold type, stacked vertically with company below.",               bestFor: "personal brands, freelancers, coaches",       logoPosition: "bottom-right" },
  { id: "japanese-minimal",   name: "Japanese Minimal",   description: "Extreme whitespace, tiny text in bottom-right corner.",                         bestFor: "architecture, zen, minimalist brands",        logoPosition: "bottom-right" },
  { id: "top-accent",         name: "Top Accent Bar",     description: "Thick colored bar at top, clean white body, two-column contact info.",          bestFor: "corporate, healthcare, education",            logoPosition: "top-right" },
  { id: "right-sidebar",      name: "Right Sidebar",      description: "Colored right sidebar with name, left area with details.",                      bestFor: "creative, marketing, design",                 logoPosition: "top-left" },
  { id: "vertical-split",     name: "Vertical Split",     description: "50/50 left-right split, name on left, contacts on right.",                      bestFor: "architecture, engineering, consulting",       logoPosition: "top-right" },
  { id: "two-tone-split",     name: "Two-Tone Split",     description: "Horizontal 60/40 split with contrasting colors, modern geometric feel.",        bestFor: "startups, marketing, media",                  logoPosition: "top-right" },
  { id: "magazine-editorial", name: "Magazine Editorial", description: "Large name, small details, generous editorial whitespace.",                     bestFor: "editors, journalists, publishers, writers",   logoPosition: "top-right" },
  { id: "offset-minimal",     name: "Offset Minimal",     description: "Name positioned at bottom-left, details top-right. Asymmetric white space.",    bestFor: "architects, designers, minimalist brands",    logoPosition: "top-right" },
  { id: "asymmetric-blocks",  name: "Asymmetric Blocks",  description: "Color block in corner with white main area, bold and geometric.",               bestFor: "design studios, advertising, branding",       logoPosition: "bottom-right" },
  { id: "corner-frame",       name: "Corner Frame",       description: "Decorative corner accents framing the card, elegant and distinctive.",          bestFor: "photography, art, premium services",          logoPosition: "top-right" },
  { id: "retro-vintage",      name: "Retro Vintage",      description: "Ornamental top/bottom borders, centered old-style typography.",                 bestFor: "restaurants, bakeries, craft, antiques",      logoPosition: "top-center" },
  { id: "three-column",       name: "Three Column",       description: "Card split into 3 equal columns for structured layout.",                        bestFor: "consulting, corporate, multi-service",        logoPosition: "top-center" },
  { id: "edge-info",          name: "Edge Info",          description: "Info placed along card edges, center left empty.",                              bestFor: "photography, art, gallery, creative",         logoPosition: "center" },
  { id: "dark-gradient",      name: "Dark Gradient",      description: "Dark background with subtle gradient, light text, modern and sleek.",           bestFor: "tech, gaming, music, nightlife",              logoPosition: "top-right" },
  { id: "diagonal-accent",    name: "Diagonal Accent",    description: "Diagonal colored stripe across corner, dynamic and energetic.",                 bestFor: "sports, fitness, events, entertainment",      logoPosition: "bottom-right" },
  { id: "diagonal-split",     name: "Diagonal Split",     description: "Diagonal line divides card into two contrasting color zones.",                  bestFor: "design studios, creative agencies, tech",     logoPosition: "bottom-left" },
  { id: "mono-tech",          name: "Mono Tech",          description: "Monospace font, dark background, code-inspired minimal layout.",                bestFor: "developers, engineers, IT, cybersecurity",    logoPosition: "top-right" },
  { id: "vertical-text",      name: "Vertical Text",      description: "Name rendered vertically along left edge, modern and unique.",                  bestFor: "design, architecture, art, fashion",          logoPosition: "top-right" },
  { id: "brutalist",          name: "Brutalist",          description: "Harsh geometric blocks, oversized type, high contrast.",                        bestFor: "art, music, fashion, avant-garde",            logoPosition: "top-right" },
  { id: "floating-name",      name: "Floating Name",      description: "Name in large light text as background watermark, details overlaid.",           bestFor: "personal brands, influencers, artists",       logoPosition: "top-right" },
  { id: "wave-divide",        name: "Wave Divide",        description: "Wavy line divides card into two contrasting zones.",                            bestFor: "wellness, spa, ocean, nature, travel",        logoPosition: "bottom-right" },

  // ── New (26) ────────────────────────────────────────────────────────
  { id: "editorial-type",    name: "Editorial Type",    description: "Type-as-design. Large lowercase name; details frame the edges.",              bestFor: "creative agencies, photography, tech",       logoPosition: "top-right" },
  { id: "bold-accent",       name: "Bold Accent",       description: "Dark background with oversized name and a single saturated accent.",          bestFor: "entertainment, creative, tech",               logoPosition: "top-right" },
  { id: "swiss-grid",        name: "Swiss Grid",        description: "Modernist grid with labeled fields in three columns.",                        bestFor: "consulting, finance, legal, tech",            logoPosition: "top-right" },
  { id: "glyph-mark",        name: "Glyph Mark",        description: "Bold color block with a large company initial. Great without a logo.",        bestFor: "creative, consulting, construction",          logoPosition: "top-right" },
  { id: "brutalist-grid",    name: "Brutalist Grid",    description: "Hard rules divide the card into four named zones.",                           bestFor: "creative, entertainment",                     logoPosition: "top-right" },
  { id: "soft-surface",      name: "Soft Surface",      description: "Single tinted surface with oversized name. Hard to ruin.",                    bestFor: "beauty, photography, retail",                 logoPosition: "top-right" },
  { id: "diagonal-modern",   name: "Diagonal Modern",   description: "A bold diagonal divide splits the card into two contrasting zones.",          bestFor: "creative, entertainment, tech",               logoPosition: "bottom-right" },
  { id: "ribbon-minimal",    name: "Ribbon Minimal",    description: "Thin accent ribbon with centered content above and below.",                   bestFor: "beauty, photography, legal",                  logoPosition: "top-right" },
  { id: "zen-asymmetric",    name: "Zen Asymmetric",    description: "Extreme whitespace with all content anchored to the bottom-right.",           bestFor: "beauty, photography, creative",               logoPosition: "top-left" },
  { id: "mono-terminal",     name: "Mono Terminal",     description: "Monospace type with a terminal prompt aesthetic.",                            bestFor: "developers, engineers, technical",            logoPosition: "top-right" },
  { id: "wide-band",         name: "Wide Band",         description: "A bold accent band across the center holds the name.",                        bestFor: "finance, consulting, construction",           logoPosition: "top-right" },
  { id: "two-column-clean",  name: "Two Column Clean",  description: "Left column for identity, right column for contact.",                         bestFor: "consulting, legal, finance",                  logoPosition: "top-right" },
  { id: "oversized-initial", name: "Oversized Initial", description: "A massive faded letter fills the background.",                                bestFor: "creative, entertainment",                     logoPosition: "bottom-right" },
  { id: "top-heavy",         name: "Top Heavy",         description: "Oversized name dominates the top two-thirds.",                                bestFor: "creative, photography",                       logoPosition: "top-right" },
  { id: "l-frame",           name: "L-Frame",           description: "An accent-colored L-shape frames the top-left corner.",                       bestFor: "construction, consulting, tech",              logoPosition: "bottom-right" },
  { id: "inset-elegant",     name: "Inset Elegant",     description: "A thin border inset creates a card-within-a-card.",                           bestFor: "legal, real estate, beauty",                  logoPosition: "top-right" },
  { id: "horizontal-stack",  name: "Horizontal Stack",  description: "Tight horizontal rows separated by full-width rules.",                        bestFor: "tech, consulting",                            logoPosition: "top-right" },
  { id: "circle-badge",      name: "Circle Badge",      description: "A bold circle badge with the company initial.",                               bestFor: "legal, consulting, finance",                  logoPosition: "bottom-right" },
  { id: "right-accent-bar",  name: "Right Accent Bar",  description: "Content left-aligned with a bold accent bar hugging the right edge.",         bestFor: "tech, consulting, healthcare",                logoPosition: "top-left" },
  { id: "stacked-display",   name: "Stacked Display",   description: "Full-width display name spanning the card. Maximum impact.",                  bestFor: "entertainment, creative",                     logoPosition: "top-right" },
  { id: "orbit",             name: "Orbit",             description: "A large accent circle bleeds off the top-right corner.",                      bestFor: "tech, creative, entertainment",               logoPosition: "bottom-left" },
  { id: "twin-circles",      name: "Twin Circles",      description: "Two overlapping accent circles create a venn-diagram motif.",                 bestFor: "creative, beauty",                            logoPosition: "top-left" },
  { id: "corner-block",      name: "Corner Block",      description: "A bold accent square anchors the bottom-right.",                              bestFor: "construction, creative",                      logoPosition: "top-left" },
  { id: "half-moon",         name: "Half Moon",         description: "A large semicircle bleeds off the left edge.",                                bestFor: "beauty, photography",                         logoPosition: "top-right" },
  { id: "stacked-bars",      name: "Stacked Bars",      description: "Three accent bars of decreasing width. Dynamic and energetic.",               bestFor: "entertainment, tech, creative",               logoPosition: "top-right" },
  { id: "diamond-accent",    name: "Diamond Accent",    description: "Nested rotated diamonds anchor the right side.",                              bestFor: "creative, entertainment",                     logoPosition: "top-left" },
];

// ---- Predefined color themes for fallback ----

export const COLOR_THEMES: { name: string; colors: ColorTheme }[] = [
  // ── Carryover (9) ──────────────────────────────────────────────────
  { name: "Navy Gold",          colors: { primary: "#1a365d", secondary: "#d4a843", accent: "#d4a843", background: "#ffffff", backgroundAlt: "#1a365d", text: "#4a5568" } },
  { name: "Forest Green",       colors: { primary: "#1b4332", secondary: "#a5d6a7", accent: "#2d6a4f", background: "#ffffff", backgroundAlt: "#1b4332", text: "#4b5563" } },
  { name: "Midnight Teal",      colors: { primary: "#ffffff", secondary: "#5eead4", accent: "#14b8a6", background: "#0f172a", backgroundAlt: "#134e4a", text: "#94a3b8" } },
  { name: "Burgundy Cream",     colors: { primary: "#7f1d1d", secondary: "#a16207", accent: "#991b1b", background: "#fefce8", backgroundAlt: "#7f1d1d", text: "#57534e" } },
  { name: "Pure Mono",          colors: { primary: "#111827", secondary: "#4b5563", accent: "#111827", background: "#ffffff", backgroundAlt: "#f3f4f6", text: "#6b7280" } },
  { name: "Coral Warm",         colors: { primary: "#1c1917", secondary: "#f97316", accent: "#ea580c", background: "#fff7ed", backgroundAlt: "#ea580c", text: "#78716c" } },
  { name: "Earth Tone",         colors: { primary: "#292524", secondary: "#a16207", accent: "#b45309", background: "#faf5ef", backgroundAlt: "#44403c", text: "#78716c" } },
  { name: "Ocean Deep",         colors: { primary: "#ffffff", secondary: "#38bdf8", accent: "#0ea5e9", background: "#0c4a6e", backgroundAlt: "#075985", text: "#bae6fd" } },
  { name: "Arctic Clean",       colors: { primary: "#0f172a", secondary: "#0284c7", accent: "#0ea5e9", background: "#f0f9ff", backgroundAlt: "#e0f2fe", text: "#475569" } },

  // ── New (5) ─────────────────────────────────────────────────────────
  { name: "True Black & White", colors: { primary: "#000000", secondary: "#555555", accent: "#000000", background: "#ffffff", backgroundAlt: "#000000", text: "#333333" } },
  { name: "Warm Neutral",       colors: { primary: "#3d3028", secondary: "#8a7560", accent: "#c4a882", background: "#f5f0ea", backgroundAlt: "#e8dfd4", text: "#6b5e50" } },
  { name: "Neon Mint",          colors: { primary: "#ffffff", secondary: "#86efac", accent: "#4ade80", background: "#09090b", backgroundAlt: "#18181b", text: "#a1a1aa" } },
  { name: "Indigo Ink",         colors: { primary: "#ffffff", secondary: "#a5b4fc", accent: "#818cf8", background: "#1e1b4b", backgroundAlt: "#312e81", text: "#c7d2fe" } },
  { name: "Terracotta",         colors: { primary: "#2c1810", secondary: "#c2785c", accent: "#d4845f", background: "#fdf6f0", backgroundAlt: "#c2785c", text: "#6b4f3e" } },
];

function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

const PATTERN_IDS: PatternId[] = PATTERNS.map(p => p.id);
const LOGO_IDS: LogoId[] = LOGOS.map(l => l.id);

export function generateFallbackDesigns(count: number = 8): CardDesign[] {
  const shuffledTemplates = shuffleArray(TEMPLATES);
  const shuffledThemes = shuffleArray(COLOR_THEMES);
  const shuffledPatterns = shuffleArray(PATTERN_IDS.filter(p => p !== "none"));
  const shuffledLogos = shuffleArray(LOGO_IDS.filter(l => l !== "none"));
  const fonts: CardDesign["font"][] = ["sans", "serif", "mono"];
  const placements: PatternPlacement[] = ["full", "top", "bottom", "right", "left", "diagonal-tl", "diagonal-br", "top-right"];
  const logoPlacements: LogoPlacement[] = ["top-left", "top-right", "top-center", "bottom-right", "bottom-left", "center", "bottom-center"];

  return shuffledTemplates.slice(0, count).map((template, i) => {
    const theme = shuffledThemes[i % shuffledThemes.length];
    const hasPattern = i % 2 === 0;
    return {
      id: `fallback-${Date.now()}-${i}`,
      templateId: template.id,
      name: `${template.name} · ${theme.name}`,
      reasoning: template.description,
      colors: theme.colors,
      font: fonts[i % 3],
      textAlign: "left" as const,
      spacing: "normal" as const,
      borderRadius: "medium" as const,
      pattern: {
        id: hasPattern ? shuffledPatterns[i % shuffledPatterns.length] : "none",
        opacity: 0.10 + Math.random() * 0.12,
        color: theme.colors.accent,
        placement: placements[i % placements.length],
      },
      backgroundEffect: i % 3 === 0
        ? { type: "gradient" as const, color: theme.colors.accent, opacity: 0.04, angle: 135 }
        : { type: "none" as const, color: theme.colors.accent, opacity: 0, angle: 0 },
      logo: {
        id: shuffledLogos[i % shuffledLogos.length],
        placement: logoPlacements[i % logoPlacements.length],
        size: "medium" as const,
      },
      border: i % 4 === 0
        ? { sides: "top" as const, width: 3, color: theme.colors.accent }
        : { sides: "none" as const, width: 0, color: theme.colors.accent },
    };
  });
}

export function getTemplateMeta(id: TemplateId): TemplateMeta | undefined {
  return TEMPLATES.find((t) => t.id === id);
}

// ---- Generate color variations of a given design ----

/**
 * Cycle through curated named palettes (rather than hue-shifting the
 * current one). Always-intentional results — no off-tone surprises.
 */
export function generateColorVariations(base: CardDesign, count: number = 8): CardDesign[] {
  const template = TEMPLATES.find((t) => t.id === base.templateId);
  const templateName = template?.name || base.templateId;

  // Skip palettes whose background matches the current card so the
  // user always sees a real change.
  const currentBg = base.colors.background.toLowerCase();
  const pool = PALETTES
    .filter((p) => p.colors.background.toLowerCase() !== currentBg)
    .slice()
    .sort(() => Math.random() - 0.5)
    .slice(0, count);

  return pool.map((palette, i) => ({
    id: `var-${Date.now()}-${i}`,
    templateId: base.templateId,
    name: `${templateName} · ${palette.name}`,
    reasoning: palette.name,
    font: base.font,
    textAlign: base.textAlign || "left",
    spacing: base.spacing || "normal",
    borderRadius: base.borderRadius || "medium",
    pattern: base.pattern
      ? { ...base.pattern, color: palette.colors.accent }
      : { id: "none", opacity: 0, color: palette.colors.accent, placement: "full" as const },
    backgroundEffect:
      base.backgroundEffect || { type: "none" as const, color: palette.colors.accent, opacity: 0, angle: 0 },
    logo: base.logo || { id: "circle-letter", placement: "top-left" as const, size: "medium" as const },
    border: base.border
      ? { ...base.border, color: palette.colors.accent }
      : { sides: "none" as const, width: 0, color: palette.colors.accent },
    colors: { ...palette.colors },
  }));
}
