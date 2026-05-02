/**
 * Smoke test for the @cardcraft/core public API.
 *
 * Exercises every exported piece in a single short flow that mirrors what
 * an agent would do:
 *   1. Read the manifest
 *   2. Pretend an LLM returned tags + palettes
 *   3. Use the registry's scoring + ranking to pick top templates
 *   4. Load the chosen spec
 *   5. Render via renderSpec
 *
 * Run: `npx tsx core/scripts/smoke.ts` from the project root.
 */

import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

import {
  MANIFEST,
  TAG_VOCABULARY,
  PALETTES,
  getPalette,
  TEMPLATES,
  rankTemplates,
  TYPE_SCALE,
  renderSpec,
  type CardInfo,
  type CardSpec,
  type Palette,
  type IndustryTag,
  type StyleTag,
  type MoodTag,
  type DensityTag,
} from "../src/index.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const TEMPLATES_DIR = join(__dirname, "..", "src", "templates");

console.log("─── Manifest ─────────────────────────────────────────────");
console.log(`version: ${MANIFEST.version}`);
console.log(`prompt template length: ${MANIFEST.promptTemplate.length} chars`);
console.log(`apply rules length: ${MANIFEST.applyRules.length} chars`);
console.log(`resources:`, MANIFEST.resources);

console.log("\n─── Tag vocabulary ──────────────────────────────────────");
console.log(`industry tags: ${TAG_VOCABULARY.industry.length}`);
console.log(`style tags: ${TAG_VOCABULARY.style.length}`);
console.log(`mood tags: ${TAG_VOCABULARY.mood.length}`);
console.log(`density tags: ${TAG_VOCABULARY.density.length}`);

console.log("\n─── Palettes ────────────────────────────────────────────");
console.log(`palettes registered: ${PALETTES.length}`);
const arctic = getPalette("arctic-clean");
if (!arctic) throw new Error("arctic-clean palette missing");
console.log(`arctic-clean:`, arctic.colors);

console.log("\n─── Templates registry ──────────────────────────────────");
console.log(`templates registered: ${TEMPLATES.length}`);

// Pretend an LLM returned these tags for "a Brooklyn bakery"
const llmTags = {
  industry: ["food-dining", "retail"] as IndustryTag[],
  style: ["classic"] as StyleTag[],
  mood: ["light", "warm"] as MoodTag[],
  density: ["balanced"] as DensityTag[],
};
console.log(`mock LLM tags:`, llmTags);

const top = rankTemplates(llmTags, 5);
console.log(`top 5 templates for tags:`);
for (const t of top) console.log(`  ${t.id} — "${t.name}"`);

console.log("\n─── Typography scale ────────────────────────────────────");
console.log(`tokens:`, TYPE_SCALE);

console.log("\n─── End-to-end render ───────────────────────────────────");
// Pick the top template, render it with arctic-clean palette and sample data
const chosen = top[0];
const specPath = join(TEMPLATES_DIR, `${chosen.id}.json`);
const spec: CardSpec = JSON.parse(readFileSync(specPath, "utf-8"));

const sampleInfo: CardInfo = {
  name: "Maria Costa",
  title: "Head Baker",
  company: "Brooklyn Sourdough",
  email: "maria@bsourdough.com",
  phone: "(555) 222-9988",
  website: "bsourdough.com",
  address: "",
  tagline: "Fresh every morning",
};

const svg = renderSpec(spec, arctic.colors as Palette, sampleInfo);
console.log(`rendered ${chosen.id} as SVG: ${svg.length} bytes`);
console.log(`first 120 chars: ${svg.slice(0, 120)}...`);

console.log("\n✓ All public-API entry points work.");
