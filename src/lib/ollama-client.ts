/**
 * Client-side Ollama wrapper — calls Ollama directly from the browser.
 *
 * Two recommendation paths live here:
 *
 *   `recommendDesignsApp4` — single LLM call → tags + 8 palettes. This is
 *   the canonical shape `/api/manifest.json` documents for external agents
 *   and `skill.md` consumers. Kept intact even though the webapp doesn't
 *   currently use it: the contract has to stay stable for downstream
 *   integrations.
 *
 *   `recommendDesignsApp2` — progressive 3-wave call with conversation
 *   memory. Wave 1 returns tags + 1 palette (1 card), wave 2 returns 2
 *   palettes (2 cards), wave 3 returns 5 palettes (5 cards). All three
 *   waves share one chat session so the LLM keeps context. This is what
 *   the webapp's wizard uses for both initial generation and AI Redesign.
 */

import { generateFallbackDesigns } from "@/lib/designs";
import { PATTERNS } from "@/lib/patterns";
import type { CardDesign } from "@/lib/types";
import {
  filterCatalog,
  type TagQuery,
  type IndustryTag,
  type StyleTag,
  type MoodTag,
  type DensityTag,
} from "@/lib/template-catalog";

// ── Config ──────────────────────────────────────────────────────────────
const OLLAMA_BASE_URL = "https://gadgets-push.zohocorporation.com/llm";
const OLLAMA_MODEL = "qwen3.6:35b";

// Pattern ids the LLM is allowed to pick (excludes "none" — that's a
// separate option mentioned in the prompts).
const VALID_PATTERNS: string[] = PATTERNS.map((p) => p.id);
const PATTERN_ID_LIST = PATTERNS.filter((p) => p.id !== "none")
  .map((p) => `"${p.id}"`)
  .join(", ");

// Tag vocabularies — the LLM picks from these, we validate against them.
const VALID_INDUSTRY_TAGS: IndustryTag[] = [
  "tech", "finance", "legal", "healthcare", "education",
  "food-dining", "creative-agency", "real-estate", "retail",
  "beauty-wellness", "consulting", "nonprofit", "entertainment",
  "photography", "construction",
];
const VALID_STYLE_TAGS: StyleTag[] = ["minimal", "classic", "bold", "elegant", "modern"];
const VALID_MOOD_TAGS: MoodTag[] = ["light", "dark", "warm", "cool"];
const VALID_DENSITY_TAGS: DensityTag[] = ["airy", "balanced", "compact"];

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

// ── Raw Ollama calls ────────────────────────────────────────────────────

/** Single-prompt fetch (App4). */
export async function queryOllama(
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

type ChatMessage = { role: "user" | "assistant"; content: string };

/** Multi-turn chat fetch (App2). Caller passes the full message history. */
async function queryOllamaChat(
  messages: ChatMessage[],
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
        messages,
        stream: false,
        think: false,
        options: {
          temperature: opts?.temperature ?? 0.6,
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

// ── Shared parsers / coercers ───────────────────────────────────────────

function filterValidTags<T extends string>(raw: unknown, valid: T[]): T[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((t): t is T => typeof t === "string" && valid.includes(t as T));
}

/** Parse a JSON object out of a possibly-noisy LLM response. */
function extractJsonObject(raw: string): Record<string, unknown> | null {
  const m = raw.match(/\{[\s\S]*\}/);
  if (!m) return null;
  try { return JSON.parse(m[0]) as Record<string, unknown>; } catch { return null; }
}

function coercePalette(p: Record<string, unknown> | undefined): CardDesign["colors"] {
  const o = p ?? {};
  return {
    primary: String(o.primary || "#1a365d"),
    secondary: String(o.secondary || "#4a5568"),
    accent: String(o.accent || "#3b82f6"),
    background: String(o.background || "#ffffff"),
    backgroundAlt: String(o.backgroundAlt || "#1e293b"),
    text: String(o.text || "#6b7280"),
  };
}

interface PatternChoice {
  id: string;
  opacity: number;
}

/**
 * Pattern overlay parsed from a palette JSON. The LLM returns
 * `{ "pattern": { "id": "<patternId>", "opacity": <0.05-0.25> } }`
 * embedded inside each palette object. Validates id against the available
 * pool; falls back to "none" if missing/invalid.
 */
function coercePattern(raw: unknown): PatternChoice {
  if (!raw || typeof raw !== "object") return { id: "none", opacity: 0 };
  const o = raw as Record<string, unknown>;
  const idRaw = String(o.id ?? "none");
  const id = VALID_PATTERNS.includes(idRaw) ? idRaw : "none";
  const opacity = clamp(Number(o.opacity) || 0.12, 0, 0.4);
  return { id, opacity: id === "none" ? 0 : opacity };
}

/** Apply a palette + optional pattern to a CardDesign. */
function applyPalette(
  d: CardDesign,
  palette: CardDesign["colors"],
  pattern?: PatternChoice,
): CardDesign {
  const next: CardDesign = {
    ...d,
    colors: palette,
    pattern: { ...d.pattern, color: palette.accent },
    border: { ...d.border, color: palette.accent },
  };
  if (pattern) {
    next.pattern = {
      id: pattern.id,
      opacity: pattern.opacity,
      color: palette.accent,
      placement: d.pattern.placement ?? "full",
    };
  }
  return next;
}

// ═══════════════════════════════════════════════════════════════════════
//  RECOMMEND (APP4)  — LLM picks tags + 8 palettes in one call
//
//  Kept for the documented `/api/manifest.json` contract that external
//  AI agents and `skill.md` consumers integrate against. The webapp's
//  wizard uses App2 instead, but App4's prompt shape is the canonical
//  one published in the static skill.
// ═══════════════════════════════════════════════════════════════════════

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

    const parsed = extractJsonObject(response);
    if (!parsed) {
      console.log("[ollama-client] App4: no JSON, fallback");
      return { designs: generateFallbackDesigns(8), source: "fallback" };
    }

    const rawTags = (parsed.tags || parsed) as Record<string, unknown>;
    const query: TagQuery = {
      industry: filterValidTags(rawTags.industry, VALID_INDUSTRY_TAGS) as IndustryTag[],
      style: filterValidTags(rawTags.style, VALID_STYLE_TAGS) as StyleTag[],
      mood: filterValidTags(rawTags.mood, VALID_MOOD_TAGS) as MoodTag[],
      density: filterValidTags(rawTags.density, VALID_DENSITY_TAGS) as DensityTag[],
    };
    console.log("[ollama-client] App4 tags:", JSON.stringify(query));

    const rawPalettes = Array.isArray(parsed.palettes) ? parsed.palettes : [];
    const palettes: CardDesign["colors"][] = rawPalettes
      .slice(0, 8)
      .map((p: Record<string, unknown>) => coercePalette(p));
    console.log("[ollama-client] App4 palettes:", palettes.length);

    const totalTags =
      (query.industry?.length || 0) + (query.style?.length || 0)
      + (query.mood?.length || 0) + (query.density?.length || 0);
    if (totalTags === 0) {
      console.log("[ollama-client] App4: zero valid tags, fallback");
      return { designs: generateFallbackDesigns(8), source: "fallback" };
    }

    const designs = filterCatalog(query, 8);
    if (designs.length < 2) {
      console.log("[ollama-client] App4: too few matches, fallback");
      return { designs: generateFallbackDesigns(8), source: "fallback" };
    }

    for (let i = 0; i < designs.length; i++) {
      if (i < palettes.length) {
        designs[i] = applyPalette(designs[i], palettes[i]);
      }
    }

    console.log(`[ollama-client] App4 OK — ${designs.length} designs (catalog layout + LLM colors)`);
    return { designs, source: "llm" };
  } catch (error) {
    console.error("[ollama-client] App4 error:", error);
    return { designs: generateFallbackDesigns(8), source: "fallback" };
  }
}

// ═══════════════════════════════════════════════════════════════════════
//  RECOMMEND (APP2)  — progressive 3-wave call with conversation memory
//
//  The webapp wants a "fast feel" — the user shouldn't wait 3 seconds
//  staring at 8 skeletons. This flow splits one API call into three turns
//  in a single chat session:
//
//    Wave 1 — pick tags + 1 palette          → render 1 card immediately
//    Wave 2 — 2 more palettes (in same chat) → render 2 more cards
//    Wave 3 — 5 more palettes (still in same chat) → render the final 5
//
//  Total: 8 cards. Because all three turns share the same `messages`
//  array, the LLM remembers the business context and the palettes it
//  has already produced — so wave 2 can deliberately *contrast* with
//  wave 1, and wave 3 can sweep across remaining moods/contrasts
//  without us re-explaining the brief each time.
//
//  The catalog ranking happens *once* (after wave 1) using the LLM's
//  industry/style/mood/density tags. Subsequent waves only contribute
//  new palettes and slot them onto pre-ranked templates.
// ═══════════════════════════════════════════════════════════════════════

export interface App2Callbacks {
  /** Called once per wave with the cards that just finished rendering. */
  onWave: (newDesigns: CardDesign[], waveIndex: 0 | 1 | 2, isLast: boolean) => void;
  /** Called if any wave fails — caller should fall back to App4 or fallback. */
  onError?: (waveIndex: number, err: Error) => void;
}

export async function recommendDesignsApp2(
  businessDescription: string,
  designExpectations: string,
  callbacks: App2Callbacks,
): Promise<void> {
  const desc = businessDescription || "a professional business";
  const styleHint = designExpectations ? ` Style preference: ${designExpectations}` : "";
  const messages: ChatMessage[] = [];

  // ── Wave 1: tags + 1 palette + 1 pattern choice ──────────────────────
  const wave1Prompt = `Classify this business for card design: "${desc}"${styleHint}

1. Pick the best-matching tags:
- industry (1-3): ${VALID_INDUSTRY_TAGS.join(", ")}
- style (1-2): ${VALID_STYLE_TAGS.join(", ")}
- mood (1-2): ${VALID_MOOD_TAGS.join(", ")}
- density (1): ${VALID_DENSITY_TAGS.join(", ")}

2. Create 1 strong palette that matches the business and any color preference. 6 hex colors:
- primary, secondary, accent, background, backgroundAlt, text

3. Pair the palette with a background pattern. Pick a pattern id from:
${PATTERN_ID_LIST}, or "none" for a clean unpatterned background.
Set opacity 0.05–0.20 (subtle for minimal businesses, stronger for bold/creative).

Rules: text readable on background, honor any color preferences. Skip patterns ("none") for finance/legal/medical or any business that wants a clean look.

Return JSON only:
{"tags":{"industry":["..."],"style":["..."],"mood":["..."],"density":["..."]},"palettes":[{"primary":"#hex","secondary":"#hex","accent":"#hex","background":"#hex","backgroundAlt":"#hex","text":"#hex","pattern":{"id":"<patternId or none>","opacity":0.12}}]}`;

  messages.push({ role: "user", content: wave1Prompt });

  let allDesigns: CardDesign[] = [];

  try {
    const r1 = await queryOllamaChat(messages, { maxTokens: 512, temperature: 0.5 });
    messages.push({ role: "assistant", content: r1 });
    const parsed1 = extractJsonObject(r1);
    if (!parsed1) throw new Error("Wave 1 returned no JSON");

    // Tags
    const rawTags = (parsed1.tags || parsed1) as Record<string, unknown>;
    const query: TagQuery = {
      industry: filterValidTags(rawTags.industry, VALID_INDUSTRY_TAGS) as IndustryTag[],
      style: filterValidTags(rawTags.style, VALID_STYLE_TAGS) as StyleTag[],
      mood: filterValidTags(rawTags.mood, VALID_MOOD_TAGS) as MoodTag[],
      density: filterValidTags(rawTags.density, VALID_DENSITY_TAGS) as DensityTag[],
    };
    const totalTags = (query.industry?.length ?? 0) + (query.style?.length ?? 0)
      + (query.mood?.length ?? 0) + (query.density?.length ?? 0);
    if (totalTags === 0) throw new Error("Wave 1 returned no valid tags");

    // Rank 8 templates locally (we'll need 1+2+5)
    allDesigns = filterCatalog(query, 8);
    if (allDesigns.length < 1) throw new Error("Catalog returned too few matches");

    // First palette + pattern
    const palettes1 = Array.isArray(parsed1.palettes) ? parsed1.palettes : [];
    const p1obj = palettes1[0] as Record<string, unknown> | undefined;
    const palette1 = coercePalette(p1obj);
    const pattern1 = coercePattern(p1obj?.pattern);

    // Render 1 card: top template wearing palette 1 + chosen pattern
    const wave1Designs = allDesigns.slice(0, 1).map((d) => applyPalette(d, palette1, pattern1));
    callbacks.onWave(wave1Designs, 0, false);
  } catch (e) {
    callbacks.onError?.(0, e as Error);
    return;
  }

  // ── Wave 2: 2 more palettes + paired patterns (continue conversation) ──
  try {
    messages.push({
      role: "user",
      content: `Now create 2 more palettes for the same business. Vary them — different hue, contrast, or mood — but still coherent with the brand and the first palette.

Each palette must include a paired background pattern (id from: ${PATTERN_ID_LIST}, or "none") with opacity 0.05–0.20.

Return JSON only:
{"palettes":[{"primary":"#hex","secondary":"#hex","accent":"#hex","background":"#hex","backgroundAlt":"#hex","text":"#hex","pattern":{"id":"<patternId or none>","opacity":0.12}},{"primary":"#hex","secondary":"#hex","accent":"#hex","background":"#hex","backgroundAlt":"#hex","text":"#hex","pattern":{"id":"<patternId or none>","opacity":0.12}}]}`,
    });
    const r2 = await queryOllamaChat(messages, { maxTokens: 512, temperature: 0.7 });
    messages.push({ role: "assistant", content: r2 });
    const parsed2 = extractJsonObject(r2);
    const palettes2 = Array.isArray(parsed2?.palettes) ? parsed2!.palettes : [];
    if (palettes2.length < 2) throw new Error("Wave 2 returned fewer than 2 palettes");

    const wave2Designs = allDesigns.slice(1, 3).map((d, i) => {
      const obj = palettes2[i] as Record<string, unknown> | undefined;
      return applyPalette(d, coercePalette(obj), coercePattern(obj?.pattern));
    });
    callbacks.onWave(wave2Designs, 1, false);
  } catch (e) {
    callbacks.onError?.(1, e as Error);
    return;
  }

  // ── Wave 3: 5 more palettes + paired patterns ────────────────────────
  try {
    messages.push({
      role: "user",
      content: `Now generate 5 more palettes. Sweep widely — cover light AND dark, warm AND cool, simple AND complex. Each must still feel professional and readable.

Each palette must include a paired background pattern (id from: ${PATTERN_ID_LIST}, or "none") with opacity 0.05–0.20. Mix it up — some patterned, some clean.

Return JSON only:
{"palettes":[{...with pattern...},{...},{...},{...},{...}]}`,
    });
    const r3 = await queryOllamaChat(messages, { maxTokens: 1280, temperature: 0.8 });
    messages.push({ role: "assistant", content: r3 });
    const parsed3 = extractJsonObject(r3);
    const palettes3 = Array.isArray(parsed3?.palettes) ? parsed3!.palettes : [];
    if (palettes3.length < 1) throw new Error("Wave 3 returned no palettes");

    const wave3Designs = allDesigns.slice(3, 8).map((d, i) => {
      const obj = (palettes3[i] ?? palettes3[palettes3.length - 1]) as Record<string, unknown> | undefined;
      return applyPalette(d, coercePalette(obj), coercePattern(obj?.pattern));
    });
    callbacks.onWave(wave3Designs, 2, true);
  } catch (e) {
    callbacks.onError?.(2, e as Error);
    return;
  }
}
