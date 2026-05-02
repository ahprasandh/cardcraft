/**
 * Templates registry — metadata + tags for all templates.
 *
 * The actual spec JSON for each template lives in `core/src/templates/<id>.json`.
 * This file declares which templates exist and how they're classified, so:
 *   - the agent can score templates against LLM-picked tags (apply rules)
 *   - the webapp can render a catalog page
 *   - external integrators can browse what's available
 *
 * Tagging is intentionally one-set-per-template. Mood variation comes from
 * the palette layered on top, not from the spec itself.
 */

import type { IndustryTag, StyleTag, MoodTag, DensityTag } from "./manifest";

export interface TemplateMetadata {
  id: string;
  name: string;
  description: string;
  tags: {
    industry: IndustryTag[];
    style: StyleTag[];
    mood: MoodTag[];
    density: DensityTag[];
  };
}

export const TEMPLATES: TemplateMetadata[] = [
  // ── Carryover (26) ─────────────────────────────────────────────────
  { id: "minimal-clean",      name: "Minimal Clean",      description: "Spacious left-aligned vertical layout with a thin accent divider.",                                tags: { industry: ["tech", "consulting"], style: ["minimal", "modern"], mood: ["light"], density: ["airy"] } },
  { id: "split-sidebar",      name: "Split Sidebar",      description: "Colored sidebar on the left holding the name, white area on the right.",                           tags: { industry: ["creative-agency", "real-estate"], style: ["modern", "bold"], mood: ["dark", "light"], density: ["balanced"] } },
  { id: "centered-classic",   name: "Centered Classic",   description: "Everything centered around thin dividers — symmetrical and timeless.",                            tags: { industry: ["legal", "finance", "real-estate"], style: ["classic", "elegant"], mood: ["light"], density: ["balanced"] } },
  { id: "modern-left",        name: "Modern Left",        description: "Thin colored accent bar on the left edge with a left-aligned content stack.",                     tags: { industry: ["tech", "consulting"], style: ["modern", "minimal"], mood: ["light"], density: ["balanced"] } },
  { id: "elegant-serif",      name: "Elegant Serif",      description: "Refined serif typography with ornamental dividers above and below.",                              tags: { industry: ["legal", "real-estate", "beauty-wellness"], style: ["elegant", "classic"], mood: ["light"], density: ["airy"] } },
  { id: "stacked-bold",       name: "Stacked Bold",       description: "Oversized bold name as the hero element.",                                                        tags: { industry: ["entertainment", "creative-agency"], style: ["bold"], mood: ["light"], density: ["balanced"] } },
  { id: "japanese-minimal",   name: "Japanese Minimal",   description: "Extreme whitespace with all content right-aligned in the bottom-right.",                          tags: { industry: ["beauty-wellness", "creative-agency", "photography"], style: ["minimal"], mood: ["light"], density: ["airy"] } },
  { id: "top-accent",         name: "Top Accent Bar",     description: "Thin colored bar at the top of a clean white card.",                                              tags: { industry: ["healthcare", "education", "tech"], style: ["minimal", "modern"], mood: ["light"], density: ["balanced"] } },
  { id: "right-sidebar",      name: "Right Sidebar",      description: "Mirror of split-sidebar — colored sidebar on the right.",                                         tags: { industry: ["creative-agency", "retail"], style: ["modern", "bold"], mood: ["dark"], density: ["balanced"] } },
  { id: "vertical-split",     name: "Vertical Split",     description: "50/50 split — colored left half with the name, white right half.",                                tags: { industry: ["construction", "real-estate"], style: ["bold", "modern"], mood: ["dark"], density: ["balanced"] } },
  { id: "two-tone-split",     name: "Two-Tone Split",     description: "Top section in one color, bottom in another — geometric.",                                        tags: { industry: ["entertainment", "creative-agency"], style: ["bold", "modern"], mood: ["dark"], density: ["balanced"] } },
  { id: "magazine-editorial", name: "Magazine Editorial", description: "Oversized name as the hero, supporting details cascading below.",                                  tags: { industry: ["entertainment", "creative-agency"], style: ["bold", "elegant"], mood: ["light"], density: ["airy"] } },
  { id: "offset-minimal",     name: "Offset Minimal",     description: "Asymmetric — company top-right, name bottom-left.",                                                tags: { industry: ["creative-agency", "real-estate"], style: ["minimal", "modern"], mood: ["light"], density: ["airy"] } },
  { id: "asymmetric-blocks",  name: "Asymmetric Blocks",  description: "Solid color block in the top-left corner.",                                                       tags: { industry: ["creative-agency", "construction"], style: ["bold", "modern"], mood: ["light"], density: ["balanced"] } },
  { id: "corner-frame",       name: "Corner Frame",       description: "Decorative L-shaped brackets in each corner framing centered content.",                            tags: { industry: ["photography", "beauty-wellness"], style: ["elegant", "classic"], mood: ["light"], density: ["balanced"] } },
  { id: "retro-vintage",      name: "Retro Vintage",      description: "Decorative double-line bands at the top and bottom.",                                              tags: { industry: ["food-dining", "retail"], style: ["classic"], mood: ["light"], density: ["balanced"] } },
  { id: "three-column",       name: "Three Column",       description: "Card split into three equal columns.",                                                            tags: { industry: ["consulting", "finance"], style: ["modern"], mood: ["light"], density: ["balanced"] } },
  { id: "edge-info",          name: "Edge Info",          description: "Information clings to the four edges of the card with empty middle.",                              tags: { industry: ["photography", "creative-agency"], style: ["minimal", "modern"], mood: ["light"], density: ["airy"] } },
  { id: "dark-gradient",      name: "Dark Gradient",      description: "Diagonal gradient background with content anchored at the bottom.",                                tags: { industry: ["tech", "entertainment"], style: ["modern", "bold"], mood: ["dark"], density: ["balanced"] } },
  { id: "diagonal-accent",    name: "Diagonal Accent",    description: "A rotated accent diamond peeks into the top-right corner.",                                        tags: { industry: ["entertainment", "creative-agency"], style: ["bold", "modern"], mood: ["light"], density: ["balanced"] } },
  { id: "diagonal-split",     name: "Diagonal Split",     description: "A diagonal triangular region holds the name; the bottom holds contacts.",                          tags: { industry: ["creative-agency", "tech"], style: ["bold", "modern"], mood: ["dark"], density: ["balanced"] } },
  { id: "mono-tech",          name: "Mono Tech",          description: "Monospace typography with code-comment styling.",                                                  tags: { industry: ["tech"], style: ["modern", "minimal"], mood: ["light", "dark"], density: ["balanced"] } },
  { id: "vertical-text",      name: "Vertical Text",      description: "Thin colored strip on the left holds the name rotated vertically.",                               tags: { industry: ["creative-agency", "photography"], style: ["modern", "elegant"], mood: ["light"], density: ["airy"] } },
  { id: "brutalist",          name: "Brutalist",          description: "Heavy color blocks, oversized type and high-contrast.",                                            tags: { industry: ["entertainment", "creative-agency"], style: ["bold"], mood: ["dark"], density: ["balanced"] } },
  { id: "floating-name",      name: "Floating Name",      description: "Giant faded watermark name behind the actual content.",                                            tags: { industry: ["entertainment", "creative-agency", "photography"], style: ["bold", "modern"], mood: ["light"], density: ["airy"] } },
  { id: "wave-divide",        name: "Wave Divide",        description: "A wavy curved divide separates the dark top half from the light bottom.",                          tags: { industry: ["beauty-wellness", "healthcare"], style: ["modern", "elegant"], mood: ["light"], density: ["balanced"] } },

  // ── New (26) ────────────────────────────────────────────────────────
  { id: "editorial-type",    name: "Editorial Type",    description: "Type-as-design. Large lowercase name, details frame the edges.",              tags: { industry: ["creative-agency", "photography", "tech"], style: ["minimal", "modern"], mood: ["light"], density: ["airy"] } },
  { id: "bold-accent",       name: "Bold Accent",       description: "Dark background with oversized name and a single saturated accent.",          tags: { industry: ["entertainment", "creative-agency", "tech"], style: ["bold", "modern"], mood: ["dark"], density: ["balanced"] } },
  { id: "swiss-grid",        name: "Swiss Grid",        description: "Modernist grid with labeled fields in three columns.",                        tags: { industry: ["consulting", "finance", "legal", "tech"], style: ["modern", "classic"], mood: ["light"], density: ["balanced"] } },
  { id: "glyph-mark",        name: "Glyph Mark",        description: "Bold color block with a large company initial. Great without a logo.",        tags: { industry: ["creative-agency", "consulting", "construction", "legal", "finance"], style: ["bold", "modern"], mood: ["dark", "light"], density: ["balanced"] } },
  { id: "brutalist-grid",    name: "Brutalist Grid",    description: "Hard rules divide the card into four named zones.",                           tags: { industry: ["creative-agency", "entertainment"], style: ["bold"], mood: ["light"], density: ["compact"] } },
  { id: "soft-surface",      name: "Soft Surface",      description: "Single tinted surface with oversized name. Hard to ruin.",                    tags: { industry: ["beauty-wellness", "photography", "retail", "food-dining"], style: ["minimal", "modern"], mood: ["light", "dark"], density: ["airy"] } },
  { id: "diagonal-modern",   name: "Diagonal Modern",   description: "A bold diagonal divide splits the card into two contrasting zones.",          tags: { industry: ["creative-agency", "entertainment", "tech"], style: ["bold", "modern"], mood: ["dark"], density: ["balanced"] } },
  { id: "ribbon-minimal",    name: "Ribbon Minimal",    description: "Thin accent ribbon with centered content above and below.",                   tags: { industry: ["beauty-wellness", "photography", "legal", "food-dining", "real-estate", "nonprofit"], style: ["elegant", "minimal"], mood: ["light"], density: ["airy"] } },
  { id: "zen-asymmetric",    name: "Zen Asymmetric",    description: "Extreme whitespace with all content anchored to the bottom-right.",           tags: { industry: ["beauty-wellness", "photography", "creative-agency"], style: ["minimal"], mood: ["light"], density: ["airy"] } },
  { id: "mono-terminal",     name: "Mono Terminal",     description: "Monospace type with a terminal prompt aesthetic.",                             tags: { industry: ["tech"], style: ["modern", "minimal"], mood: ["dark"], density: ["balanced"] } },
  { id: "wide-band",         name: "Wide Band",         description: "A bold accent band across the center holds the name.",                        tags: { industry: ["finance", "consulting", "construction", "healthcare", "legal"], style: ["bold", "modern"], mood: ["light"], density: ["balanced"] } },
  { id: "two-column-clean",  name: "Two Column Clean",  description: "Left column for identity, right column for contact.",                         tags: { industry: ["consulting", "legal", "finance"], style: ["modern", "classic"], mood: ["light"], density: ["balanced"] } },
  { id: "oversized-initial", name: "Oversized Initial", description: "A massive faded letter fills the background.",                                tags: { industry: ["creative-agency", "entertainment", "retail"], style: ["bold", "modern"], mood: ["light"], density: ["airy"] } },
  { id: "top-heavy",         name: "Top Heavy",         description: "Oversized name dominates the top two-thirds.",                                tags: { industry: ["creative-agency", "photography", "entertainment", "beauty-wellness"], style: ["bold", "minimal"], mood: ["light"], density: ["airy"] } },
  { id: "l-frame",           name: "L-Frame",           description: "An accent-colored L-shape frames the top-left corner.",                       tags: { industry: ["construction", "consulting", "tech"], style: ["modern"], mood: ["light"], density: ["balanced"] } },
  { id: "inset-elegant",     name: "Inset Elegant",     description: "A thin border inset creates a card-within-a-card.",                           tags: { industry: ["legal", "real-estate", "beauty-wellness"], style: ["elegant", "classic"], mood: ["light", "dark"], density: ["balanced"] } },
  { id: "horizontal-stack",  name: "Horizontal Stack",  description: "Tight horizontal rows separated by full-width rules.",                        tags: { industry: ["tech", "consulting", "finance", "healthcare"], style: ["modern", "minimal"], mood: ["light"], density: ["compact"] } },
  { id: "circle-badge",      name: "Circle Badge",      description: "A bold circle badge with the company initial.",                               tags: { industry: ["legal", "consulting", "finance"], style: ["classic", "elegant"], mood: ["light"], density: ["balanced"] } },
  { id: "right-accent-bar",  name: "Right Accent Bar",  description: "Content left-aligned with a bold accent bar hugging the right edge.",         tags: { industry: ["tech", "consulting", "healthcare"], style: ["modern", "minimal"], mood: ["light"], density: ["balanced"] } },
  { id: "stacked-display",   name: "Stacked Display",   description: "Full-width display name spanning the card. Maximum impact.",                  tags: { industry: ["entertainment", "creative-agency", "retail"], style: ["bold"], mood: ["dark"], density: ["balanced"] } },
  { id: "orbit",             name: "Orbit",             description: "A large accent circle bleeds off the top-right corner.",                      tags: { industry: ["tech", "creative-agency", "entertainment", "retail"], style: ["bold", "modern"], mood: ["dark"], density: ["balanced"] } },
  { id: "twin-circles",      name: "Twin Circles",      description: "Two overlapping accent circles create a venn-diagram motif.",                 tags: { industry: ["creative-agency", "beauty-wellness", "education"], style: ["modern"], mood: ["light"], density: ["airy"] } },
  { id: "corner-block",      name: "Corner Block",      description: "A bold accent square anchors the bottom-right.",                              tags: { industry: ["construction", "creative-agency", "tech"], style: ["bold", "modern"], mood: ["light"], density: ["balanced"] } },
  { id: "half-moon",         name: "Half Moon",         description: "A large semicircle bleeds off the left edge.",                                tags: { industry: ["beauty-wellness", "photography", "food-dining", "real-estate"], style: ["modern", "elegant"], mood: ["light"], density: ["airy"] } },
  { id: "stacked-bars",      name: "Stacked Bars",      description: "Three accent bars of decreasing width. Dynamic and energetic.",               tags: { industry: ["entertainment", "tech", "creative-agency"], style: ["bold", "modern"], mood: ["light"], density: ["balanced"] } },
  { id: "diamond-accent",    name: "Diamond Accent",    description: "Nested rotated diamonds anchor the right side.",                              tags: { industry: ["creative-agency", "entertainment", "retail", "photography"], style: ["bold", "modern"], mood: ["light"], density: ["balanced"] } },
];

/** Look up a template's metadata by id. Returns undefined if not found. */
export function getTemplateMetadata(id: string): TemplateMetadata | undefined {
  return TEMPLATES.find((t) => t.id === id);
}

/**
 * Score a template against LLM-picked tags. Used by the apply rules.
 * Higher score = better fit. See APPLY_RULES in manifest.ts for weights.
 */
export function scoreTemplate(
  template: TemplateMetadata,
  query: {
    industry?: IndustryTag[];
    style?: StyleTag[];
    mood?: MoodTag[];
    density?: DensityTag[];
  },
): number {
  const overlap = <T>(a: T[] | undefined, b: T[] | undefined) =>
    !a || !b ? 0 : a.filter((x) => b.includes(x)).length;

  return (
    overlap(query.industry, template.tags.industry) * 3 +
    overlap(query.style,    template.tags.style)    * 2 +
    overlap(query.mood,     template.tags.mood)     * 1 +
    overlap(query.density,  template.tags.density)  * 1
  );
}

/** Sort templates by tag overlap score (desc), tiebreak by id order. */
export function rankTemplates(
  query: Parameters<typeof scoreTemplate>[1],
  limit = 8,
): TemplateMetadata[] {
  const scored = TEMPLATES.map((t, i) => ({ t, score: scoreTemplate(t, query), i }));
  scored.sort((a, b) => (b.score - a.score) || (a.i - b.i));
  return scored.slice(0, limit).map((s) => s.t);
}
