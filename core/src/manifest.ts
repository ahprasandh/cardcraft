/**
 * The agent contract.
 *
 * Publishes the LLM prompt template, the tag vocabulary, the apply rules,
 * and pointers to the catalog/template/palette resources. Anything an
 * external agent needs to drive the rendering system without depending
 * on the React webapp.
 */

export type IndustryTag =
  | "tech" | "finance" | "legal" | "healthcare" | "education"
  | "food-dining" | "creative-agency" | "real-estate" | "retail"
  | "beauty-wellness" | "consulting" | "nonprofit" | "entertainment"
  | "photography" | "construction";

export type StyleTag = "minimal" | "classic" | "bold" | "elegant" | "modern";
export type MoodTag = "light" | "dark" | "warm" | "cool";
export type DensityTag = "airy" | "balanced" | "compact";

export interface TagVocabulary {
  industry: IndustryTag[];
  style: StyleTag[];
  mood: MoodTag[];
  density: DensityTag[];
}

export const TAG_VOCABULARY: TagVocabulary = {
  industry: [
    "tech", "finance", "legal", "healthcare", "education",
    "food-dining", "creative-agency", "real-estate", "retail",
    "beauty-wellness", "consulting", "nonprofit", "entertainment",
    "photography", "construction",
  ],
  style: ["minimal", "classic", "bold", "elegant", "modern"],
  mood: ["light", "dark", "warm", "cool"],
  density: ["airy", "balanced", "compact"],
};

/**
 * The LLM prompt template. Placeholders `{{businessDescription}}` and
 * `{{designExpectations}}` are filled by the caller. The LLM is expected to
 * return a single JSON object matching `TagOutput`.
 */
export const PROMPT_TEMPLATE = `Classify this business for card design: "{{businessDescription}}"{{designExpectationsClause}}

1. Pick the best-matching tags:
- industry (1-3): tech, finance, legal, healthcare, education, food-dining, creative-agency, real-estate, retail, beauty-wellness, consulting, nonprofit, entertainment, photography, construction
- style (1-2): minimal, classic, bold, elegant, modern
- mood (1-2): light, dark, warm, cool
- density (1): airy, balanced, compact

2. Create 8 color palettes that match the business and style preference. Each palette has 6 hex colors:
- primary: main heading color
- secondary: subheading/detail color
- accent: highlights, borders, icons
- background: card background
- backgroundAlt: contrasting section background
- text: body text color

Rules: vary the 8 palettes (don't repeat), ensure text readable on background, honor any color preferences.

Return JSON only:
{"tags":{"industry":["..."],"style":["..."],"mood":["..."],"density":["..."]},"palettes":[{"primary":"#hex","secondary":"#hex","accent":"#hex","background":"#hex","backgroundAlt":"#hex","text":"#hex"},...7 more]}`;

/** Shape of a successful LLM response. Agents should validate against the
 *  vocabulary in TAG_VOCABULARY and clamp/drop invalid values. */
export interface TagOutput {
  tags: {
    industry: IndustryTag[];
    style: StyleTag[];
    mood: MoodTag[];
    density: DensityTag[];
  };
  palettes: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    backgroundAlt: string;
    text: string;
  }[];
}

/**
 * The apply rules — how to turn an LLM `TagOutput` plus a catalog of
 * `CardSpec`s into a list of rendered card candidates.
 *
 * Documented in prose so any agent author can implement it. (We don't
 * encode this as machine-executable rules — it's simple enough that
 * implementing it in code is more honest than building a rules engine.)
 */
export const APPLY_RULES = `
Given the LLM output:

1. Validate tags against TAG_VOCABULARY. Drop any unknown values.
2. Score each spec in the catalog by tag overlap. Catalog entries are
   pre-tagged in templates-registry.ts; the score is the sum of:
     - matching industry tags (weight 3)
     - matching style tags (weight 2)
     - matching mood tags (weight 1)
     - matching density tags (weight 1)
3. Take the top 8 specs by score, breaking ties by templateId order.
4. For each picked spec, overlay one of the LLM's 8 palettes (in order).
5. Render each (spec, palette) pair to produce 8 candidate cards.

For single-card flows (e.g. "make me one card"), the agent should pick
the highest-scoring spec + first palette.
`;

export interface Manifest {
  version: string;
  promptTemplate: string;
  tagVocabulary: TagVocabulary;
  applyRules: string;
  resources: {
    catalog: string;     // path/URL to catalog
    palettes: string;    // path/URL to palettes
    templates: string;   // path/URL pattern, e.g. "/api/templates/{id}.json"
  };
}

export const MANIFEST: Manifest = {
  version: "1.0",
  promptTemplate: PROMPT_TEMPLATE,
  tagVocabulary: TAG_VOCABULARY,
  applyRules: APPLY_RULES,
  resources: {
    catalog: "/api/catalog.json",
    palettes: "/api/palettes.json",
    templates: "/api/templates/{id}.json",
  },
};
