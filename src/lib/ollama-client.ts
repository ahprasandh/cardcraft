/**
 * Client-side Ollama wrapper — calls Ollama directly from the browser.
 * Replaces the server-side /api/designs/recommend, /api/designs/refine, and /api/taglines routes.
 */

import { generateFallbackDesigns, generateColorVariations, TEMPLATES } from "@/lib/designs";
import { PATTERNS } from "@/lib/patterns";
import { LOGOS } from "@/lib/logos";
import type { CardDesign } from "@/lib/types";
import { filterCatalog, type TagQuery, type IndustryTag, type StyleTag, type MoodTag, type DensityTag } from "@/lib/template-catalog";

// ── Config ──────────────────────────────────────────────────────────────
const OLLAMA_BASE_URL = "http://hari-3035-macstudio.csez.zohocorpin.com:11434";
const OLLAMA_MODEL = "qwen3.6:35b";

// ── Valid value lists ───────────────────────────────────────────────────
const VALID_TEMPLATES: string[] = TEMPLATES.map((t) => t.id);
const VALID_PATTERNS: string[] = PATTERNS.map((p) => p.id);
const VALID_LOGOS: string[] = LOGOS.map((l) => l.id);
const VALID_FONTS = ["sans", "serif", "mono"];
const VALID_TEXT_ALIGN = ["left", "center", "right"];
const VALID_SPACING = ["compact", "normal", "spacious"];
const VALID_BORDER_RADIUS = ["none", "small", "medium", "large"];
const VALID_BORDER_SIDES = ["none", "all", "top", "bottom", "left", "right"];
const VALID_PATTERN_PLACEMENT = ["full", "top", "bottom", "left", "right", "top-left", "top-right", "bottom-left", "bottom-right", "diagonal-tl", "diagonal-br"];
const VALID_LOGO_PLACEMENT = ["top-left", "top-right", "top-center", "center-left", "center", "center-right", "bottom-left", "bottom-right", "bottom-center"];
const VALID_LOGO_SIZE = ["small", "medium", "large"];
const VALID_BG_EFFECT_TYPE = ["none", "solid", "gradient"];

const TEMPLATE_LIST = TEMPLATES.map(
  (t) => `  - "${t.id}": ${t.name} — ${t.description} (Best for: ${t.bestFor})`
).join("\n");

const PATTERN_LIST = PATTERNS.map(
  (p) => `  - "${p.id}": ${p.name} — ${p.description} (Best for: ${p.bestFor})`
).join("\n");

const LOGO_LIST = LOGOS.map(
  (l) => `  - "${l.id}": ${l.name} — ${l.description} (Best for: ${l.bestFor})`
).join("\n");

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

// ── Raw Ollama call ─────────────────────────────────────────────────────

async function queryOllama(
  prompt: string,
  opts?: { maxTokens?: number; temperature?: number },
): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 120_000);

  try {
    const res = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        messages: [{ role: "user", content: prompt }],
        stream: false,
        think: false,
        options: {
          temperature: opts?.temperature ?? 0.7,
          num_predict: opts?.maxTokens ?? 1024,
        },
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Ollama responded with ${res.status}: ${errText.slice(0, 200)}`);
    }

    const data = await res.json();
    return data?.message?.content || "";
  } finally {
    clearTimeout(timeout);
  }
}

// ═══════════════════════════════════════════════════════════════════════
//  RECOMMEND  — replaces /api/designs/recommend
// ═══════════════════════════════════════════════════════════════════════

interface DesignBrief {
  templateId: string;
  name: string;
  reasoning: string;
  colorMood: string;
  style: string;
  usePattern: boolean;
  useBorder: boolean;
  font: string;
  textAlign: string;
}

async function getCreativeDirection(
  businessDescription: string,
  designExpectations: string,
): Promise<DesignBrief[] | null> {
  const prompt = `You are an expert business card designer. A client needs 8 unique card designs.

## Client
- Business: ${businessDescription || "Not specified"}
- Design preferences: ${designExpectations || "No specific preferences"}

## Available Templates
${TEMPLATE_LIST}

Pick 8 designs. For each, return:
- "templateId": from templates above
- "name": creative design name
- "reasoning": ONE sentence why this fits the client (shown to client!)
- "colorMood": describe the palette (e.g. "warm earth tones", "dark navy corporate", "pastel creative")
- "style": "minimal" | "balanced" | "bold"
- "usePattern": true or false
- "useBorder": true or false
- "font": "sans" | "serif" | "mono"
- "textAlign": "left" | "center" | "right"

Rules:
- At least 2 minimal (usePattern=false, useBorder=false)
- At least 1 bold/creative
- Vary templates — don't repeat the same templateId
- Match the industry/business vibe

Respond ONLY with a JSON array of exactly 8 objects. No text before or after.
JSON array:`;

  const response = await queryOllama(prompt, { maxTokens: 1024 });
  console.log("[ollama-client] Step 1 raw:", response.slice(0, 300));
  const jsonMatch = response.match(/\[[\s\S]*\]/);
  if (!jsonMatch) return null;

  try {
    const raw = JSON.parse(jsonMatch[0]);
    if (!Array.isArray(raw) || raw.length < 3) return null;

    return raw.slice(0, 8).map((d: Record<string, unknown>) => ({
      templateId: VALID_TEMPLATES.includes(d.templateId as string)
        ? String(d.templateId)
        : VALID_TEMPLATES[Math.floor(Math.random() * VALID_TEMPLATES.length)],
      name: String(d.name || "Design"),
      reasoning: String(d.reasoning || "AI-recommended design"),
      colorMood: String(d.colorMood || "professional neutral"),
      style: ["minimal", "balanced", "bold"].includes(d.style as string) ? String(d.style) : "balanced",
      usePattern: Boolean(d.usePattern),
      useBorder: Boolean(d.useBorder),
      font: VALID_FONTS.includes(d.font as string) ? String(d.font) : "sans",
      textAlign: VALID_TEXT_ALIGN.includes(d.textAlign as string) ? String(d.textAlign) : "left",
    }));
  } catch {
    return null;
  }
}

async function getVisualSpecs(
  briefs: DesignBrief[],
): Promise<CardDesign[] | null> {
  const briefSummary = briefs.map((b, i) => ({
    index: i,
    templateId: b.templateId,
    colorMood: b.colorMood,
    style: b.style,
    usePattern: b.usePattern,
    useBorder: b.useBorder,
  }));

  const prompt = `You are a visual designer. Implement these ${briefs.length} business card concepts with exact color and visual specs.

## Design Briefs
${JSON.stringify(briefSummary, null, 2)}

## Available Patterns
${PATTERN_LIST}

## Available Logo Icons
${LOGO_LIST}

For EACH brief (same order), generate:
{
  "index": <matching brief index>,
  "colors": { "primary": "<hex>", "secondary": "<hex>", "accent": "<hex>", "background": "<hex>", "backgroundAlt": "<hex>", "text": "<hex>" },
  "spacing": "compact" | "normal" | "spacious",
  "borderRadius": "none" | "small" | "medium" | "large",
  "pattern": { "id": "<pattern id or 'none'>", "opacity": <0.10-0.25>, "color": "<hex>", "placement": "full|top|bottom|left|right|top-left|top-right|bottom-left|bottom-right|diagonal-tl|diagonal-br" },
  "backgroundEffect": { "type": "none|solid|gradient", "color": "<hex>", "opacity": <0.02-0.06>, "angle": <0-360> },
  "logo": { "id": "<logo id>", "placement": "top-left|top-right|top-center|center|bottom-left|bottom-right|bottom-center", "size": "small|medium|large" },
  "border": { "sides": "none|all|top|bottom|left|right", "width": <0-6>, "color": "<hex>" }
}

Rules:
- If usePattern=false → pattern.id = "none"
- If useBorder=false → border.sides = "none"
- Translate colorMood into actual hex colors
- "minimal" style → subtle patterns (opacity 0.10-0.15); "bold" → stronger patterns (0.18-0.25)
- Good text-to-background contrast
- Pick logo icons that match the business domain

JSON array of ${briefs.length} objects only:`;

  const response = await queryOllama(prompt, { maxTokens: 4096 });
  const jsonMatch = response.match(/\[[\s\S]*\]/);
  if (!jsonMatch) return null;

  try {
    const rawSpecs = JSON.parse(jsonMatch[0]);
    if (!Array.isArray(rawSpecs) || rawSpecs.length < 3) return null;

    return briefs.map((brief, i) => {
      const spec = rawSpecs.find(
        (s: Record<string, unknown>) => Number(s.index) === i,
      ) || rawSpecs[i] || {};

      const colors = (spec.colors || {}) as Record<string, unknown>;
      const pattern = (spec.pattern || {}) as Record<string, unknown>;
      const bgEffect = (spec.backgroundEffect || {}) as Record<string, unknown>;
      const logo = (spec.logo || {}) as Record<string, unknown>;
      const border = (spec.border || {}) as Record<string, unknown>;
      const accentColor = String(colors.accent || "#3b82f6");

      return {
        id: `llm-${Date.now()}-${i}`,
        templateId: brief.templateId as CardDesign["templateId"],
        name: brief.name,
        reasoning: brief.reasoning,
        font: brief.font as CardDesign["font"],
        textAlign: brief.textAlign as CardDesign["textAlign"],
        spacing: (VALID_SPACING.includes(spec.spacing as string) ? spec.spacing : "normal") as CardDesign["spacing"],
        borderRadius: (VALID_BORDER_RADIUS.includes(spec.borderRadius as string) ? spec.borderRadius : "medium") as CardDesign["borderRadius"],
        colors: {
          primary: String(colors.primary || "#1a365d"),
          secondary: String(colors.secondary || "#4a5568"),
          accent: accentColor,
          background: String(colors.background || "#ffffff"),
          backgroundAlt: String(colors.backgroundAlt || "#1e293b"),
          text: String(colors.text || "#6b7280"),
        },
        pattern: {
          id: (!brief.usePattern ? "none" :
            VALID_PATTERNS.includes(String(pattern.id)) ? String(pattern.id) : "none"),
          opacity: clamp(Number(pattern.opacity) || 0.15, 0, 1),
          color: String(pattern.color || accentColor),
          placement: (VALID_PATTERN_PLACEMENT.includes(String(pattern.placement)) ? String(pattern.placement) : "full") as CardDesign["pattern"]["placement"],
        },
        backgroundEffect: {
          type: (VALID_BG_EFFECT_TYPE.includes(String(bgEffect.type)) ? String(bgEffect.type) : "none") as CardDesign["backgroundEffect"]["type"],
          color: String(bgEffect.color || accentColor),
          opacity: clamp(Number(bgEffect.opacity) || 0.04, 0, 1),
          angle: clamp(Number(bgEffect.angle) || 135, 0, 360),
        },
        logo: {
          id: VALID_LOGOS.includes(String(logo.id)) ? String(logo.id) : "circle-letter",
          placement: (VALID_LOGO_PLACEMENT.includes(String(logo.placement)) ? String(logo.placement) : "top-left") as CardDesign["logo"]["placement"],
          size: (VALID_LOGO_SIZE.includes(String(logo.size)) ? String(logo.size) : "medium") as CardDesign["logo"]["size"],
        },
        border: {
          sides: (!brief.useBorder ? "none" :
            (VALID_BORDER_SIDES.includes(String(border.sides)) ? String(border.sides) : "none")) as CardDesign["border"]["sides"],
          width: clamp(Number(border.width) || 0, 0, 10),
          color: String(border.color || accentColor),
        },
      } satisfies CardDesign;
    });
  } catch {
    return null;
  }
}

export async function recommendDesigns(
  businessDescription: string,
  designExpectations: string,
): Promise<{ designs: CardDesign[]; source: "llm" | "fallback" }> {
  try {
    const briefs = await getCreativeDirection(businessDescription, designExpectations);
    if (!briefs) {
      console.log("[ollama-client] Recommend Step 1 failed, using fallback");
      return { designs: generateFallbackDesigns(8), source: "fallback" };
    }
    console.log(`[ollama-client] Recommend Step 1 OK — ${briefs.length} briefs`);

    const designs = await getVisualSpecs(briefs);
    if (!designs) {
      console.log("[ollama-client] Recommend Step 2 failed, using fallback");
      return { designs: generateFallbackDesigns(8), source: "fallback" };
    }
    console.log(`[ollama-client] Recommend Step 2 OK — ${designs.length} designs`);
    return { designs, source: "llm" };
  } catch (error) {
    console.error("[ollama-client] Recommend error:", error);
    return { designs: generateFallbackDesigns(8), source: "fallback" };
  }
}

// ═══════════════════════════════════════════════════════════════════════
//  RECOMMEND (SINGLE PROMPT)  — combined step 1 + step 2 in one call
// ═══════════════════════════════════════════════════════════════════════

export async function recommendDesignsSinglePrompt(
  businessDescription: string,
  designExpectations: string,
): Promise<{ designs: CardDesign[]; source: "llm" | "fallback" }> {
  // Short ID-only lists to minimize input tokens
  const templateIds = TEMPLATES.map((t) => `"${t.id}"`).join(", ");
  const patternIds = PATTERNS.map((p) => `"${p.id}"`).join(", ");
  const logoIds = LOGOS.map((l) => `"${l.id}"`).join(", ");

  try {
    const prompt = `You are an expert business card designer. Generate 4 unique card designs for this client.

Business: ${businessDescription || "Not specified"}
Preferences: ${designExpectations || "None"}

Templates: ${templateIds}
Patterns (or "none"): ${patternIds}
Logos: ${logoIds}

Return 4 JSON objects, each with:
{
  "templateId": "<template id>",
  "name": "<creative name>",
  "reasoning": "<one sentence>",
  "font": "sans"|"serif"|"mono",
  "textAlign": "left"|"center"|"right",
  "colors": { "primary":"<hex>", "secondary":"<hex>", "accent":"<hex>", "background":"<hex>", "backgroundAlt":"<hex>", "text":"<hex>" },
  "pattern": { "id":"<pattern id or none>", "opacity":<0.05-0.25>, "color":"<hex>", "placement":"full|top|bottom|left|right" },
  "logo": { "id":"<logo id>", "placement":"top-left|top-right|top-center|center|bottom-left|bottom-right|bottom-center", "size":"small|medium|large" },
  "border": { "sides":"none|all|top|bottom|left|right", "width":<0-4>, "color":"<hex>" }
}

Rules: vary templates, good text/background contrast, match business vibe.
JSON array of 4 only:`;

    const response = await queryOllama(prompt, { maxTokens: 2048, temperature: 0.7 });
    console.log("[ollama-client] Single-prompt raw:", response.slice(0, 300));
    const jsonMatch = response.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      console.log("[ollama-client] Single-prompt: no JSON found, using fallback");
      return { designs: generateFallbackDesigns(4), source: "fallback" };
    }

    const rawDesigns = JSON.parse(jsonMatch[0]);
    if (!Array.isArray(rawDesigns) || rawDesigns.length < 2) {
      console.log("[ollama-client] Single-prompt: too few designs, using fallback");
      return { designs: generateFallbackDesigns(4), source: "fallback" };
    }

    const designs: CardDesign[] = rawDesigns.slice(0, 4).map((d: Record<string, unknown>, i: number) => {
      const colors = (d.colors || {}) as Record<string, unknown>;
      const pattern = (d.pattern || {}) as Record<string, unknown>;
      const logo = (d.logo || {}) as Record<string, unknown>;
      const border = (d.border || {}) as Record<string, unknown>;
      const accentColor = String(colors.accent || "#3b82f6");

      return {
        id: `llm1-${Date.now()}-${i}`,
        templateId: (VALID_TEMPLATES.includes(d.templateId as string)
          ? String(d.templateId)
          : VALID_TEMPLATES[Math.floor(Math.random() * VALID_TEMPLATES.length)]) as CardDesign["templateId"],
        name: String(d.name || `Design ${i + 1}`),
        reasoning: String(d.reasoning || "AI-recommended design"),
        font: (VALID_FONTS.includes(d.font as string) ? String(d.font) : "sans") as CardDesign["font"],
        textAlign: (VALID_TEXT_ALIGN.includes(d.textAlign as string) ? String(d.textAlign) : "left") as CardDesign["textAlign"],
        spacing: "normal" as CardDesign["spacing"],
        borderRadius: "medium" as CardDesign["borderRadius"],
        colors: {
          primary: String(colors.primary || "#1a365d"),
          secondary: String(colors.secondary || "#4a5568"),
          accent: accentColor,
          background: String(colors.background || "#ffffff"),
          backgroundAlt: String(colors.backgroundAlt || "#1e293b"),
          text: String(colors.text || "#6b7280"),
        },
        pattern: {
          id: VALID_PATTERNS.includes(String(pattern.id)) ? String(pattern.id) : "none",
          opacity: clamp(Number(pattern.opacity) || 0.15, 0, 1),
          color: String(pattern.color || accentColor),
          placement: (VALID_PATTERN_PLACEMENT.includes(String(pattern.placement)) ? String(pattern.placement) : "full") as CardDesign["pattern"]["placement"],
        },
        backgroundEffect: {
          type: "none" as CardDesign["backgroundEffect"]["type"],
          color: accentColor,
          opacity: 0.04,
          angle: 135,
        },
        logo: {
          id: VALID_LOGOS.includes(String(logo.id)) ? String(logo.id) : "circle-letter",
          placement: (VALID_LOGO_PLACEMENT.includes(String(logo.placement)) ? String(logo.placement) : "top-left") as CardDesign["logo"]["placement"],
          size: (VALID_LOGO_SIZE.includes(String(logo.size)) ? String(logo.size) : "medium") as CardDesign["logo"]["size"],
        },
        border: {
          sides: (VALID_BORDER_SIDES.includes(String(border.sides)) ? String(border.sides) : "none") as CardDesign["border"]["sides"],
          width: clamp(Number(border.width) || 0, 0, 10),
          color: String(border.color || accentColor),
        },
      } satisfies CardDesign;
    });

    console.log(`[ollama-client] Single-prompt OK — ${designs.length} designs`);
    return { designs, source: "llm" };
  } catch (error) {
    console.error("[ollama-client] Single-prompt error:", error);
    return { designs: generateFallbackDesigns(4), source: "fallback" };
  }
}

// ═══════════════════════════════════════════════════════════════════════
//  RECOMMEND (LEAN)  — only templateId + colors from LLM, rest is defaults
// ═══════════════════════════════════════════════════════════════════════

export async function recommendDesignsLean(
  businessDescription: string,
  designExpectations: string,
): Promise<{ designs: CardDesign[]; source: "llm" | "fallback" }> {
  const templateIds = TEMPLATES.map((t) => t.id).join(", ");

  try {
    const prompt = `Pick 4 business card color palettes for: ${businessDescription || "a professional business"}${designExpectations ? `. Style: ${designExpectations}` : ""}

Templates: ${templateIds}

Return JSON array of 4 objects:
[{"templateId":"<id>","colors":{"primary":"<hex>","secondary":"<hex>","accent":"<hex>","background":"<hex>","backgroundAlt":"<hex>","text":"<hex>"}}]

Rules: vary templates, ensure text is readable on background.
JSON only:`;

    const response = await queryOllama(prompt, { maxTokens: 512, temperature: 0.7 });
    console.log("[ollama-client] Lean raw:", response.slice(0, 300));
    const jsonMatch = response.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      console.log("[ollama-client] Lean: no JSON, fallback");
      return { designs: generateFallbackDesigns(4), source: "fallback" };
    }

    const rawDesigns = JSON.parse(jsonMatch[0]);
    if (!Array.isArray(rawDesigns) || rawDesigns.length < 2) {
      return { designs: generateFallbackDesigns(4), source: "fallback" };
    }

    // Pick random patterns/logos to add variety
    const patternPool = VALID_PATTERNS.filter((p) => p !== "none");
    const logoPool = VALID_LOGOS;
    const placements: CardDesign["logo"]["placement"][] = ["top-left", "top-right", "top-center", "bottom-left"];
    const fonts: CardDesign["font"][] = ["sans", "serif", "sans", "mono"];

    const designs: CardDesign[] = rawDesigns.slice(0, 4).map((d: Record<string, unknown>, i: number) => {
      const colors = (d.colors || {}) as Record<string, unknown>;
      const accentColor = String(colors.accent || "#3b82f6");
      const usePattern = i % 2 === 0; // alternate: pattern on even, clean on odd

      return {
        id: `lean-${Date.now()}-${i}`,
        templateId: (VALID_TEMPLATES.includes(d.templateId as string)
          ? String(d.templateId)
          : VALID_TEMPLATES[Math.floor(Math.random() * VALID_TEMPLATES.length)]) as CardDesign["templateId"],
        name: `Design ${i + 1}`,
        reasoning: "AI-picked color palette",
        font: fonts[i] ?? "sans",
        textAlign: "left" as CardDesign["textAlign"],
        spacing: "normal" as CardDesign["spacing"],
        borderRadius: "medium" as CardDesign["borderRadius"],
        colors: {
          primary: String(colors.primary || "#1a365d"),
          secondary: String(colors.secondary || "#4a5568"),
          accent: accentColor,
          background: String(colors.background || "#ffffff"),
          backgroundAlt: String(colors.backgroundAlt || "#1e293b"),
          text: String(colors.text || "#6b7280"),
        },
        pattern: {
          id: usePattern ? patternPool[Math.floor(Math.random() * patternPool.length)] : "none",
          opacity: usePattern ? 0.12 : 0,
          color: accentColor,
          placement: "full" as CardDesign["pattern"]["placement"],
        },
        backgroundEffect: {
          type: "none" as CardDesign["backgroundEffect"]["type"],
          color: accentColor,
          opacity: 0.04,
          angle: 135,
        },
        logo: {
          id: logoPool[Math.floor(Math.random() * logoPool.length)],
          placement: placements[i] ?? "top-left",
          size: "medium" as CardDesign["logo"]["size"],
        },
        border: {
          sides: "none" as CardDesign["border"]["sides"],
          width: 0,
          color: accentColor,
        },
      } satisfies CardDesign;
    });

    console.log(`[ollama-client] Lean OK — ${designs.length} designs`);
    return { designs, source: "llm" };
  } catch (error) {
    console.error("[ollama-client] Lean error:", error);
    return { designs: generateFallbackDesigns(4), source: "fallback" };
  }
}

// ═══════════════════════════════════════════════════════════════════════
//  REFINE  — replaces /api/designs/refine
// ═══════════════════════════════════════════════════════════════════════

interface RefinePlan {
  interpretation: string;
  fieldsToChange: string[];
  direction: string;
}

async function interpretRequest(
  currentSpec: Record<string, unknown>,
  userPrompt: string,
): Promise<RefinePlan | null> {
  const prompt = `A client wants to modify their business card design.

## Current Design
${JSON.stringify(currentSpec, null, 2)}

## Client Request
"${userPrompt}"

Analyze what the client wants changed. Return:
{
  "interpretation": "what the client wants in one sentence",
  "fieldsToChange": ["list which top-level fields to modify, from: templateId, colors, font, textAlign, spacing, borderRadius, pattern, backgroundEffect, logo, border"],
  "direction": "describe the specific changes to make"
}

Examples:
- "add a wave pattern" → fieldsToChange: ["pattern"], direction: "set pattern to waves with subtle opacity"
- "make it darker" → fieldsToChange: ["colors"], direction: "darken background and adjust text for contrast"
- "more corporate feel" → fieldsToChange: ["font", "colors", "border"], direction: "switch to serif, navy/gray palette, add subtle border"
- "remove the pattern and add gradient" → fieldsToChange: ["pattern", "backgroundEffect"], direction: "remove pattern, add subtle gradient"
- "bigger logo in the center" → fieldsToChange: ["logo"], direction: "increase logo size, move to center placement"

JSON object only:`;

  const response = await queryOllama(prompt, { maxTokens: 256 });
  const jsonMatch = response.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return null;

  try {
    const raw = JSON.parse(jsonMatch[0]);
    return {
      interpretation: String(raw.interpretation || userPrompt),
      fieldsToChange: Array.isArray(raw.fieldsToChange) ? raw.fieldsToChange.map(String) : [],
      direction: String(raw.direction || userPrompt),
    };
  } catch {
    return null;
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseRefineDesign(d: Record<string, unknown>, i: number, base: any): CardDesign {
  const colors = (d.colors || {}) as Record<string, unknown>;
  const pattern = (d.pattern || {}) as Record<string, unknown>;
  const bgEffect = (d.backgroundEffect || {}) as Record<string, unknown>;
  const logo = (d.logo || {}) as Record<string, unknown>;
  const border = (d.border || {}) as Record<string, unknown>;

  const baseColors = base.colors || {};
  const basePat = base.pattern || {};
  const baseLogo = base.logo || {};
  const baseBorder = base.border || {};
  const baseBg = base.backgroundEffect || {};

  const templateId = VALID_TEMPLATES.includes(d.templateId as string)
    ? (d.templateId as CardDesign["templateId"])
    : base.templateId;

  const accentColor = String(colors.accent || baseColors.accent || "#3b82f6");

  return {
    id: `refine-${Date.now()}-${i}`,
    templateId,
    name: String(d.name || `Refined ${i + 1}`),
    reasoning: String(d.reasoning || "AI-refined variation"),
    font: (VALID_FONTS.includes(d.font as string) ? d.font : base.font || "sans") as CardDesign["font"],
    textAlign: (VALID_TEXT_ALIGN.includes(d.textAlign as string) ? d.textAlign : base.textAlign || "left") as CardDesign["textAlign"],
    spacing: (VALID_SPACING.includes(d.spacing as string) ? d.spacing : base.spacing || "normal") as CardDesign["spacing"],
    borderRadius: (VALID_BORDER_RADIUS.includes(d.borderRadius as string) ? d.borderRadius : base.borderRadius || "medium") as CardDesign["borderRadius"],
    colors: {
      primary: String(colors.primary || baseColors.primary || "#1a365d"),
      secondary: String(colors.secondary || baseColors.secondary || "#4a5568"),
      accent: accentColor,
      background: String(colors.background || baseColors.background || "#ffffff"),
      backgroundAlt: String(colors.backgroundAlt || baseColors.backgroundAlt || "#1e293b"),
      text: String(colors.text || baseColors.text || "#6b7280"),
    },
    pattern: {
      id: VALID_PATTERNS.includes(String(pattern.id)) ? String(pattern.id) : (basePat.id || "none"),
      opacity: clamp(Number(pattern.opacity) || basePat.opacity || 0.15, 0, 1),
      color: String(pattern.color || basePat.color || accentColor),
      placement: (VALID_PATTERN_PLACEMENT.includes(String(pattern.placement)) ? String(pattern.placement) : basePat.placement || "full") as CardDesign["pattern"]["placement"],
    },
    backgroundEffect: {
      type: (VALID_BG_EFFECT_TYPE.includes(String(bgEffect.type)) ? String(bgEffect.type) : baseBg.type || "none") as CardDesign["backgroundEffect"]["type"],
      color: String(bgEffect.color || baseBg.color || accentColor),
      opacity: clamp(Number(bgEffect.opacity) || baseBg.opacity || 0.04, 0, 1),
      angle: clamp(Number(bgEffect.angle) || baseBg.angle || 135, 0, 360),
    },
    logo: {
      id: VALID_LOGOS.includes(String(logo.id)) ? String(logo.id) : (baseLogo.id || "circle-letter"),
      placement: (VALID_LOGO_PLACEMENT.includes(String(logo.placement)) ? String(logo.placement) : baseLogo.placement || "top-left") as CardDesign["logo"]["placement"],
      size: (VALID_LOGO_SIZE.includes(String(logo.size)) ? String(logo.size) : baseLogo.size || "medium") as CardDesign["logo"]["size"],
    },
    border: {
      sides: (VALID_BORDER_SIDES.includes(String(border.sides)) ? String(border.sides) : baseBorder.sides || "none") as CardDesign["border"]["sides"],
      width: clamp(Number(border.width) || baseBorder.width || 0, 0, 10),
      color: String(border.color || baseBorder.color || accentColor),
    },
  };
}

async function applyChanges(
  currentSpec: Record<string, unknown>,
  plan: RefinePlan,
): Promise<Record<string, unknown>[] | null> {
  const prompt = `Modify this business card design. ONLY change the fields listed in "fieldsToChange". Copy everything else exactly from the current design.

## Current Design
${JSON.stringify(currentSpec, null, 2)}

## Change Plan
- What to change: ${plan.interpretation}
- Fields to modify: ${plan.fieldsToChange.join(", ")}
- Direction: ${plan.direction}

## Available Resources
Patterns: ${PATTERN_LIST}
Logo Icons: ${LOGO_LIST}

Return 4 variations (same JSON structure as Current Design, ALL fields included):
1. Conservative — smallest change that addresses the request
2. Balanced — moderate interpretation
3. Bold — stronger interpretation
4. Surprise — your creative take

Each must include: templateId, name, reasoning, colors, font, textAlign, spacing, borderRadius, pattern, backgroundEffect, logo, border.
Fields NOT in "fieldsToChange" must be copied exactly from Current Design.

JSON array of 4 objects only:`;

  const response = await queryOllama(prompt, { maxTokens: 4096 });
  const jsonMatch = response.match(/\[[\s\S]*\]/);
  if (!jsonMatch) return null;

  try {
    const raw = JSON.parse(jsonMatch[0]);
    if (!Array.isArray(raw) || raw.length < 2) return null;
    return raw.slice(0, 4);
  } catch {
    return null;
  }
}

export async function refineDesign(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  currentDesign: any,
  userPrompt: string,
): Promise<{ designs: CardDesign[]; source: "llm" | "fallback" }> {
  try {
    const currentSpec = {
      templateId: currentDesign.templateId,
      colors: currentDesign.colors,
      font: currentDesign.font,
      textAlign: currentDesign.textAlign || "left",
      spacing: currentDesign.spacing || "normal",
      borderRadius: currentDesign.borderRadius || "medium",
      pattern: currentDesign.pattern || { id: "none", opacity: 0.15, color: currentDesign.colors?.accent, placement: "full" },
      backgroundEffect: currentDesign.backgroundEffect || { type: "none", color: currentDesign.colors?.accent, opacity: 0, angle: 0 },
      logo: currentDesign.logo || { id: "circle-letter", placement: "top-left", size: "medium" },
      border: currentDesign.border || { sides: "none", width: 0, color: currentDesign.colors?.accent },
    };

    const plan = await interpretRequest(currentSpec, userPrompt || "Show me refined alternatives");
    if (!plan) {
      console.log("[ollama-client] Refine Step 1 failed, using fallback");
      return { designs: generateColorVariations(currentDesign, 4), source: "fallback" };
    }
    console.log(`[ollama-client] Refine Step 1 OK — change [${plan.fieldsToChange.join(", ")}]: ${plan.interpretation}`);

    const rawDesigns = await applyChanges(currentSpec, plan);
    if (!rawDesigns) {
      console.log("[ollama-client] Refine Step 2 failed, using fallback");
      return { designs: generateColorVariations(currentDesign, 4), source: "fallback" };
    }

    const designs = rawDesigns.map((d, i) => parseRefineDesign(d as Record<string, unknown>, i, currentDesign));
    console.log(`[ollama-client] Refine Step 2 OK — ${designs.length} variations`);
    return { designs, source: "llm" };
  } catch (error) {
    console.error("[ollama-client] Refine error:", error);
    return { designs: generateColorVariations(currentDesign, 4), source: "fallback" };
  }
}

// ═══════════════════════════════════════════════════════════════════════
//  RECOMMEND (APP4)  — LLM picks tags → instant catalog filter
// ═══════════════════════════════════════════════════════════════════════

const VALID_INDUSTRY_TAGS: IndustryTag[] = [
  "tech", "finance", "legal", "healthcare", "education",
  "food-dining", "creative-agency", "real-estate", "retail",
  "beauty-wellness", "consulting", "nonprofit", "entertainment",
  "photography", "construction",
];
const VALID_STYLE_TAGS: StyleTag[] = ["minimal", "classic", "bold", "elegant", "modern"];
const VALID_MOOD_TAGS: MoodTag[] = ["light", "dark", "warm", "cool"];
const VALID_DENSITY_TAGS: DensityTag[] = ["airy", "balanced", "compact"];

export async function recommendDesignsApp4(
  businessDescription: string,
  designExpectations: string,
): Promise<{ designs: CardDesign[]; source: "llm" | "fallback" }> {
  const desc = businessDescription || "a professional business";
  const styleHint = designExpectations ? ` Style preference: ${designExpectations}` : "";

  try {
    const prompt = `Classify this business for card design: "${desc}"${styleHint}

1. Pick the best-matching tags:
- industry (1-3): ${VALID_INDUSTRY_TAGS.join(", ")}
- style (1-2): ${VALID_STYLE_TAGS.join(", ")}
- mood (1-2): ${VALID_MOOD_TAGS.join(", ")}
- density (1): ${VALID_DENSITY_TAGS.join(", ")}

2. Create 8 color palettes that match the business and style preference. Each palette has 6 hex colors:
- primary: main heading color
- secondary: subheading/detail color
- accent: highlights, borders, icons
- background: card background
- backgroundAlt: contrasting section background
- text: body text color

Rules: vary the 8 palettes (don't repeat), ensure text readable on background, honor any color preferences in the style description.

Return JSON only:
{"tags":{"industry":["..."],"style":["..."],"mood":["..."],"density":["..."]},"palettes":[{"primary":"#hex","secondary":"#hex","accent":"#hex","background":"#hex","backgroundAlt":"#hex","text":"#hex"},...7 more]}`;

    const response = await queryOllama(prompt, { maxTokens: 1024, temperature: 0.5 });
    console.log("[ollama-client] App4 raw:", response.slice(0, 400));

    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.log("[ollama-client] App4: no JSON, fallback");
      return { designs: generateFallbackDesigns(8), source: "fallback" };
    }

    const raw = JSON.parse(jsonMatch[0]) as Record<string, unknown>;

    // Parse tags
    const rawTags = (raw.tags || raw) as Record<string, unknown>;
    const query: TagQuery = {
      industry: filterValidTags(rawTags.industry, VALID_INDUSTRY_TAGS) as IndustryTag[],
      style: filterValidTags(rawTags.style, VALID_STYLE_TAGS) as StyleTag[],
      mood: filterValidTags(rawTags.mood, VALID_MOOD_TAGS) as MoodTag[],
      density: filterValidTags(rawTags.density, VALID_DENSITY_TAGS) as DensityTag[],
    };
    console.log("[ollama-client] App4 tags:", JSON.stringify(query));

    // Parse palettes
    const rawPalettes = Array.isArray(raw.palettes) ? raw.palettes : [];
    const palettes: CardDesign["colors"][] = rawPalettes.slice(0, 8).map((p: Record<string, unknown>) => ({
      primary: String(p.primary || "#1a365d"),
      secondary: String(p.secondary || "#4a5568"),
      accent: String(p.accent || "#3b82f6"),
      background: String(p.background || "#ffffff"),
      backgroundAlt: String(p.backgroundAlt || "#1e293b"),
      text: String(p.text || "#6b7280"),
    }));
    console.log("[ollama-client] App4 palettes:", palettes.length);

    // If LLM returned no valid tags at all, fallback
    const totalTags = (query.industry?.length || 0) + (query.style?.length || 0) + (query.mood?.length || 0) + (query.density?.length || 0);
    if (totalTags === 0) {
      console.log("[ollama-client] App4: zero valid tags, fallback");
      return { designs: generateFallbackDesigns(8), source: "fallback" };
    }

    // Filter catalog by tags → pick 8 layouts
    const designs = filterCatalog(query, 8);
    if (designs.length < 2) {
      console.log("[ollama-client] App4: too few matches, fallback");
      return { designs: generateFallbackDesigns(8), source: "fallback" };
    }

    // Overlay LLM palettes onto catalog designs
    for (let i = 0; i < designs.length; i++) {
      if (i < palettes.length) {
        designs[i].colors = palettes[i];
        designs[i].pattern.color = palettes[i].accent;
        designs[i].border.color = palettes[i].accent;
      }
    }

    console.log(`[ollama-client] App4 OK — ${designs.length} designs (catalog layout + LLM colors)`);
    return { designs, source: "llm" };
  } catch (error) {
    console.error("[ollama-client] App4 error:", error);
    return { designs: generateFallbackDesigns(8), source: "fallback" };
  }
}

function filterValidTags<T extends string>(raw: unknown, valid: T[]): T[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((t): t is T => typeof t === "string" && valid.includes(t as T));
}
