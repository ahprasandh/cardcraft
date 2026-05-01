import type { CardDesign, TemplateId, ColorTheme, PatternPlacement, LogoPlacement } from "./types";
import { PATTERNS, type PatternId } from "./patterns";
import { LOGOS, type LogoId } from "./logos";

// ---- Template metadata (used for LLM prompt & template catalog) ----

export interface TemplateMeta {
  id: TemplateId;
  name: string;
  description: string;
  bestFor: string;
  logoPosition: string;
}

export const TEMPLATES: TemplateMeta[] = [
  { id: "minimal-clean", name: "Minimal Clean", description: "Spacious left-aligned layout with thin accent line. Ultra-clean whitespace.", bestFor: "tech, consulting, startups", logoPosition: "top-left" },
  { id: "bold-header", name: "Bold Header", description: "Large bold name at top, strong color bar header, details below.", bestFor: "executives, founders, speakers", logoPosition: "top-right" },
  { id: "split-sidebar", name: "Split Sidebar", description: "Colored sidebar on left with name, white area on right with details.", bestFor: "creative agencies, design, architecture", logoPosition: "sidebar-top" },
  { id: "centered-classic", name: "Centered Classic", description: "Everything centered, thin divider lines, symmetrical and timeless.", bestFor: "law, finance, real estate, insurance", logoPosition: "top-center" },
  { id: "modern-left", name: "Modern Left", description: "Left-aligned with colored accent bar on left edge, modern sans-serif.", bestFor: "tech, SaaS, product companies", logoPosition: "top-left" },
  { id: "elegant-serif", name: "Elegant Serif", description: "Refined serif typography, light background, subtle gold/dark accents.", bestFor: "luxury, fashion, hospitality, jewelry", logoPosition: "top-center" },
  { id: "dark-gradient", name: "Dark Gradient", description: "Dark background with subtle gradient, light text, modern and sleek.", bestFor: "tech, gaming, music, nightlife", logoPosition: "top-left" },
  { id: "top-accent", name: "Top Accent Bar", description: "Thick colored bar at top, clean white body, two-column contact info.", bestFor: "corporate, healthcare, education", logoPosition: "top-right" },
  { id: "corner-frame", name: "Corner Frame", description: "Decorative corner accents framing the card, elegant and distinctive.", bestFor: "photography, art, premium services", logoPosition: "top-left" },
  { id: "stacked-bold", name: "Stacked Bold", description: "Name in large bold type, stacked vertically with company below.", bestFor: "personal brands, freelancers, coaches", logoPosition: "bottom-right" },
  { id: "two-tone-split", name: "Two-Tone Split", description: "Horizontal 60/40 split with contrasting colors, modern geometric feel.", bestFor: "startups, marketing, media", logoPosition: "top-section" },
  { id: "mono-tech", name: "Mono Tech", description: "Monospace font, dark background, code-inspired minimal layout.", bestFor: "developers, engineers, IT, cybersecurity", logoPosition: "top-left" },
  { id: "offset-minimal", name: "Offset Minimal", description: "Name positioned at bottom-left, details top-right. Asymmetric white space.", bestFor: "architects, designers, minimalist brands", logoPosition: "top-right" },
  { id: "diagonal-accent", name: "Diagonal Accent", description: "Diagonal colored stripe across corner, dynamic and energetic.", bestFor: "sports, fitness, events, entertainment", logoPosition: "top-left" },
  { id: "bottom-heavy", name: "Bottom Heavy", description: "Name and title at bottom, large white space above, modern editorial.", bestFor: "editors, writers, journalists, publishers", logoPosition: "top-left" },
  { id: "asymmetric-blocks", name: "Asymmetric Blocks", description: "Color block in corner with white main area, bold and geometric.", bestFor: "design studios, advertising, branding", logoPosition: "color-block" },
  { id: "floating-name", name: "Floating Name", description: "Name in large light text as background watermark, details overlaid.", bestFor: "personal brands, influencers, artists", logoPosition: "top-right" },
  { id: "compact-modern", name: "Compact Modern", description: "Tight compact layout, small text, maximizes info in minimal space.", bestFor: "medical, dental, multi-contact businesses", logoPosition: "top-left" },
  // ── New 22 layouts ──
  { id: "right-sidebar", name: "Right Sidebar", description: "Colored right sidebar with name, left area with details.", bestFor: "creative, marketing, design", logoPosition: "top-right" },
  { id: "bottom-bar", name: "Bottom Bar", description: "Clean white body, colored bar at bottom with contact info.", bestFor: "corporate, finance, consulting", logoPosition: "top-left" },
  { id: "sandwich-bands", name: "Sandwich Bands", description: "Colored bands top and bottom, white content middle.", bestFor: "education, government, healthcare", logoPosition: "top-center" },
  { id: "vertical-split", name: "Vertical Split", description: "50/50 left-right split, name on left, contacts on right.", bestFor: "architecture, engineering, consulting", logoPosition: "top-left" },
  { id: "diagonal-split", name: "Diagonal Split", description: "Diagonal line divides card into two contrasting color zones.", bestFor: "design studios, creative agencies, tech", logoPosition: "top-left" },
  { id: "circle-motif", name: "Circle Motif", description: "Large decorative circle element as background accent.", bestFor: "wellness, beauty, photography, art", logoPosition: "center" },
  { id: "badge-emblem", name: "Badge Emblem", description: "Centered badge area with info arranged around it.", bestFor: "security, legal, government, military", logoPosition: "center" },
  { id: "magazine-editorial", name: "Magazine Editorial", description: "Large name, small details, generous editorial whitespace.", bestFor: "editors, journalists, publishers, writers", logoPosition: "top-right" },
  { id: "japanese-minimal", name: "Japanese Minimal", description: "Extreme whitespace, tiny text in bottom-right corner.", bestFor: "architecture, zen, minimalist brands, galleries", logoPosition: "bottom-right" },
  { id: "retro-vintage", name: "Retro Vintage", description: "Ornamental top/bottom borders, centered old-style typography.", bestFor: "restaurants, bakeries, craft, antiques", logoPosition: "top-center" },
  { id: "brutalist", name: "Brutalist", description: "Harsh geometric blocks, oversized type, high contrast.", bestFor: "art, music, fashion, avant-garde", logoPosition: "top-left" },
  { id: "card-inset", name: "Card Inset", description: "Inner card with margin creating a card-in-card effect.", bestFor: "premium, luxury, boutique, high-end", logoPosition: "top-left" },
  { id: "vertical-text", name: "Vertical Text", description: "Name rendered vertically along left edge, modern and unique.", bestFor: "design, architecture, art, fashion", logoPosition: "top-right" },
  { id: "three-column", name: "Three Column", description: "Card split into 3 equal columns for structured layout.", bestFor: "consulting, corporate, multi-service", logoPosition: "top-left" },
  { id: "stepped-blocks", name: "Stepped Blocks", description: "Staggered color blocks creating layered geometric depth.", bestFor: "construction, engineering, tech startups", logoPosition: "top-left" },
  { id: "neon-dark", name: "Neon Dark", description: "Full dark background with neon accent lines and glows.", bestFor: "gaming, nightlife, DJ, music, tech", logoPosition: "top-left" },
  { id: "full-bleed", name: "Full Bleed", description: "Full-color background with no white space, bold statement.", bestFor: "brands, retail, food, sports", logoPosition: "top-right" },
  { id: "ribbon-banner", name: "Ribbon Banner", description: "Decorative ribbon/banner stripe across the middle.", bestFor: "events, catering, weddings, celebrations", logoPosition: "top-center" },
  { id: "edge-info", name: "Edge Info", description: "Info placed along card edges, center left empty.", bestFor: "photography, art, gallery, creative", logoPosition: "center" },
  { id: "dot-grid", name: "Dot Grid", description: "Content placed on structured invisible grid, orderly feel.", bestFor: "engineering, data, analytics, finance", logoPosition: "top-left" },
  { id: "overlap-cards", name: "Overlap Cards", description: "Stacked card illusion with offset elements creating depth.", bestFor: "design agencies, printing, creative", logoPosition: "top-right" },
  { id: "wave-divide", name: "Wave Divide", description: "Wavy line divides card into two contrasting zones.", bestFor: "wellness, spa, ocean, nature, travel", logoPosition: "top-left" },
];

// ---- Predefined color themes for fallback ----

const COLOR_THEMES: { name: string; colors: ColorTheme }[] = [
  { name: "Navy Gold", colors: { primary: "#1a365d", secondary: "#d4a843", accent: "#d4a843", background: "#ffffff", backgroundAlt: "#1a365d", text: "#4a5568" } },
  { name: "Slate Blue", colors: { primary: "#1e293b", secondary: "#3b82f6", accent: "#3b82f6", background: "#f8fafc", backgroundAlt: "#1e293b", text: "#64748b" } },
  { name: "Forest Green", colors: { primary: "#1b4332", secondary: "#a5d6a7", accent: "#2d6a4f", background: "#ffffff", backgroundAlt: "#1b4332", text: "#4b5563" } },
  { name: "Midnight Teal", colors: { primary: "#ffffff", secondary: "#5eead4", accent: "#14b8a6", background: "#0f172a", backgroundAlt: "#134e4a", text: "#94a3b8" } },
  { name: "Burgundy Cream", colors: { primary: "#7f1d1d", secondary: "#a16207", accent: "#991b1b", background: "#fefce8", backgroundAlt: "#7f1d1d", text: "#57534e" } },
  { name: "Pure Mono", colors: { primary: "#111827", secondary: "#4b5563", accent: "#111827", background: "#ffffff", backgroundAlt: "#f3f4f6", text: "#6b7280" } },
  { name: "Royal Purple", colors: { primary: "#ffffff", secondary: "#c4b5fd", accent: "#8b5cf6", background: "#2e1065", backgroundAlt: "#4c1d95", text: "#a5b4fc" } },
  { name: "Coral Warm", colors: { primary: "#1c1917", secondary: "#f97316", accent: "#ea580c", background: "#fff7ed", backgroundAlt: "#ea580c", text: "#78716c" } },
  { name: "Cool Charcoal", colors: { primary: "#f9fafb", secondary: "#9ca3af", accent: "#6366f1", background: "#1f2937", backgroundAlt: "#111827", text: "#d1d5db" } },
  { name: "Rose Elegant", colors: { primary: "#1c1917", secondary: "#be185d", accent: "#e11d48", background: "#fff1f2", backgroundAlt: "#be185d", text: "#71717a" } },
  { name: "Earth Tone", colors: { primary: "#292524", secondary: "#a16207", accent: "#b45309", background: "#faf5ef", backgroundAlt: "#44403c", text: "#78716c" } },
  { name: "Ocean Deep", colors: { primary: "#ffffff", secondary: "#38bdf8", accent: "#0ea5e9", background: "#0c4a6e", backgroundAlt: "#075985", text: "#bae6fd" } },
  { name: "Sage Minimal", colors: { primary: "#1a2e1a", secondary: "#6b8f6b", accent: "#4a7c4a", background: "#f0f5f0", backgroundAlt: "#d1e7d1", text: "#5c6b5c" } },
  { name: "Sunset Gradient", colors: { primary: "#ffffff", secondary: "#fbbf24", accent: "#f59e0b", background: "#7c2d12", backgroundAlt: "#c2410c", text: "#fed7aa" } },
  { name: "Arctic Clean", colors: { primary: "#0f172a", secondary: "#0284c7", accent: "#0ea5e9", background: "#f0f9ff", backgroundAlt: "#e0f2fe", text: "#475569" } },
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

function hslToHex(h: number, s: number, l: number): string {
  h = ((h % 360) + 360) % 360;
  s = Math.max(0, Math.min(100, s)) / 100;
  l = Math.max(0, Math.min(100, l)) / 100;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color).toString(16).padStart(2, "0");
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

function hexToHsl(hex: string): [number, number, number] {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l * 100];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = 0;
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
  else if (max === g) h = ((b - r) / d + 2) / 6;
  else h = ((r - g) / d + 4) / 6;
  return [h * 360, s * 100, l * 100];
}

function shiftColor(hex: string, hueShift: number, satShift: number, lightShift: number): string {
  if (!hex || hex.length < 7) return hex;
  const [h, s, l] = hexToHsl(hex);
  return hslToHex(h + hueShift, s + satShift, l + lightShift);
}

export function generateColorVariations(base: CardDesign, count: number = 8): CardDesign[] {
  const template = TEMPLATES.find((t) => t.id === base.templateId);
  const templateName = template?.name || base.templateId;

  const hueShifts = [30, -30, 60, -60, 120, 180, -90, 150];
  const paletteNames = ["Warm", "Cool", "Golden", "Ocean", "Complementary", "Inverted", "Berry", "Sunset"];
  const variations: CardDesign[] = [];

  for (let i = 0; i < count; i++) {
    const hShift = hueShifts[i % hueShifts.length];
    const sShift = (i % 3 === 0) ? -10 : (i % 3 === 1) ? 10 : 0;
    const lShift = (i % 4 === 0) ? 5 : (i % 4 === 2) ? -5 : 0;

    const newColors = {
      primary: shiftColor(base.colors.primary, hShift, sShift, lShift),
      secondary: shiftColor(base.colors.secondary, hShift, sShift, 0),
      accent: shiftColor(base.colors.accent, hShift, sShift + 5, 0),
      background: shiftColor(base.colors.background, hShift * 0.3, sShift * 0.5, lShift),
      backgroundAlt: shiftColor(base.colors.backgroundAlt, hShift, sShift, lShift),
      text: shiftColor(base.colors.text, hShift * 0.2, 0, 0),
    };

    variations.push({
      id: `var-${Date.now()}-${i}`,
      templateId: base.templateId,
      name: `${templateName} · ${paletteNames[i % paletteNames.length]}`,
      reasoning: paletteNames[i % paletteNames.length],
      font: base.font,
      textAlign: base.textAlign || "left",
      spacing: base.spacing || "normal",
      borderRadius: base.borderRadius || "medium",
      pattern: base.pattern ? {
        ...base.pattern,
        color: newColors.accent, // shift pattern color with new accent
      } : { id: "none", opacity: 0, color: newColors.accent, placement: "full" as const },
      backgroundEffect: base.backgroundEffect || { type: "none" as const, color: newColors.accent, opacity: 0, angle: 0 },
      logo: base.logo || { id: "circle-letter", placement: "top-left" as const, size: "medium" as const },
      border: base.border ? {
        ...base.border,
        color: newColors.accent,
      } : { sides: "none" as const, width: 0, color: newColors.accent },
      colors: newColors,
    });
  }

  return variations;
}
