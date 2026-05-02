/**
 * Palette catalog — 14 named color themes (9 carryover + 5 modern additions).
 * Each palette has six slots that match the `Palette` runtime type:
 *   primary, secondary, accent, background, backgroundAlt, text.
 *
 * The agent's LLM picks one of these by tag/mood, or generates its own.
 * The webapp's design picker shows them as preset options.
 */

import type { Palette } from "./renderer";

export interface NamedPalette {
  id: string;
  name: string;
  /** Visual mood tags — used for filtering by tone. */
  mood: ("light" | "dark" | "warm" | "cool")[];
  colors: Palette;
}

export const PALETTES: NamedPalette[] = [
  // ── Carryover (9) ──────────────────────────────────────────────────
  { id: "navy-gold",       name: "Navy Gold",          mood: ["dark", "warm"],  colors: { primary: "#1a365d", secondary: "#d4a843", accent: "#d4a843", background: "#ffffff", backgroundAlt: "#1a365d", text: "#4a5568" } },
  { id: "forest-green",    name: "Forest Green",       mood: ["cool", "warm"],  colors: { primary: "#1b4332", secondary: "#a5d6a7", accent: "#2d6a4f", background: "#ffffff", backgroundAlt: "#1b4332", text: "#4b5563" } },
  { id: "midnight-teal",   name: "Midnight Teal",      mood: ["dark", "cool"],  colors: { primary: "#ffffff", secondary: "#5eead4", accent: "#14b8a6", background: "#0f172a", backgroundAlt: "#134e4a", text: "#94a3b8" } },
  { id: "burgundy-cream",  name: "Burgundy Cream",     mood: ["warm", "light"], colors: { primary: "#7f1d1d", secondary: "#a16207", accent: "#991b1b", background: "#fefce8", backgroundAlt: "#7f1d1d", text: "#57534e" } },
  { id: "pure-mono",       name: "Pure Mono",          mood: ["light"],         colors: { primary: "#111827", secondary: "#4b5563", accent: "#111827", background: "#ffffff", backgroundAlt: "#f3f4f6", text: "#6b7280" } },
  { id: "coral-warm",      name: "Coral Warm",         mood: ["warm", "light"], colors: { primary: "#1c1917", secondary: "#f97316", accent: "#ea580c", background: "#fff7ed", backgroundAlt: "#ea580c", text: "#78716c" } },
  { id: "earth-tone",      name: "Earth Tone",         mood: ["warm", "light"], colors: { primary: "#292524", secondary: "#a16207", accent: "#b45309", background: "#faf5ef", backgroundAlt: "#44403c", text: "#78716c" } },
  { id: "ocean-deep",      name: "Ocean Deep",         mood: ["dark", "cool"],  colors: { primary: "#ffffff", secondary: "#38bdf8", accent: "#0ea5e9", background: "#0c4a6e", backgroundAlt: "#075985", text: "#bae6fd" } },
  { id: "arctic-clean",    name: "Arctic Clean",       mood: ["cool", "light"], colors: { primary: "#0f172a", secondary: "#0284c7", accent: "#0ea5e9", background: "#f0f9ff", backgroundAlt: "#e0f2fe", text: "#475569" } },

  // ── New (5) ─────────────────────────────────────────────────────────
  { id: "true-bw",         name: "True Black & White", mood: ["light"],         colors: { primary: "#000000", secondary: "#555555", accent: "#000000", background: "#ffffff", backgroundAlt: "#000000", text: "#333333" } },
  { id: "warm-neutral",    name: "Warm Neutral",       mood: ["warm", "light"], colors: { primary: "#3d3028", secondary: "#8a7560", accent: "#c4a882", background: "#f5f0ea", backgroundAlt: "#e8dfd4", text: "#6b5e50" } },
  { id: "neon-mint",       name: "Neon Mint",          mood: ["dark"],          colors: { primary: "#ffffff", secondary: "#86efac", accent: "#4ade80", background: "#09090b", backgroundAlt: "#18181b", text: "#a1a1aa" } },
  { id: "indigo-ink",      name: "Indigo Ink",         mood: ["dark", "cool"],  colors: { primary: "#ffffff", secondary: "#a5b4fc", accent: "#818cf8", background: "#1e1b4b", backgroundAlt: "#312e81", text: "#c7d2fe" } },
  { id: "terracotta",      name: "Terracotta",         mood: ["warm"],          colors: { primary: "#2c1810", secondary: "#c2785c", accent: "#d4845f", background: "#fdf6f0", backgroundAlt: "#c2785c", text: "#6b4f3e" } },
];

/** Look up a palette by id. Returns undefined if not found. */
export function getPalette(id: string): NamedPalette | undefined {
  return PALETTES.find((p) => p.id === id);
}
