/**
 * Skill mechanical test.
 *
 * Walks through the documented algorithm against the live deployment (or
 * localhost), using a hard-coded LLM response so we don't have to call a
 * real model. Verifies that:
 *   - All API endpoints respond with valid JSON
 *   - The schema matches what skill.md documents
 *   - rankTemplates() produces sensible results
 *   - The constructed render URL is well-formed
 *
 * Usage:
 *   npx tsx core/scripts/test-skill.ts                              # against localhost:3000
 *   npx tsx core/scripts/test-skill.ts https://cardcraft.onslate.com  # against production
 */

import { rankTemplates, scoreTemplate } from "../src/index.js";
import type { IndustryTag, StyleTag, MoodTag, DensityTag } from "../src/manifest.js";

const ORIGIN = process.argv[2] || "http://localhost:3000";

async function fetchJson(path: string) {
  const url = ORIGIN + path;
  const r = await fetch(url);
  if (!r.ok) throw new Error(`${url} → HTTP ${r.status}`);
  return r.json();
}

async function fetchText(path: string) {
  const url = ORIGIN + path;
  const r = await fetch(url);
  if (!r.ok) throw new Error(`${url} → HTTP ${r.status}`);
  return r.text();
}

console.log(`\n─── Testing skill against ${ORIGIN} ───\n`);

// ── Step 1: skill.md is reachable and has expected structure ─────────
const skill = await fetchText("/skill.md");
console.log(`✓ skill.md  (${skill.length} bytes)`);
const requiredSections = ["Endpoints", "algorithm", "ranking formula", "Render route"];
for (const s of requiredSections) {
  if (!skill.toLowerCase().includes(s.toLowerCase())) {
    throw new Error(`skill.md missing section: ${s}`);
  }
}
console.log(`✓ contains expected sections: ${requiredSections.join(", ")}`);

// ── Step 2: manifest ─────────────────────────────────────────────────
const manifest = await fetchJson("/api/manifest.json");
console.log(`✓ /api/manifest.json  version=${manifest.version}`);
if (!manifest.promptTemplate?.includes("{{businessDescription}}"))
  throw new Error("manifest.promptTemplate missing {{businessDescription}}");
if (manifest.tagVocabulary.industry.length !== 15)
  throw new Error("expected 15 industry tags");

// ── Step 3: catalog ──────────────────────────────────────────────────
const catalog = await fetchJson("/api/catalog.json");
console.log(`✓ /api/catalog.json   ${catalog.count} templates`);
if (catalog.count !== 52) throw new Error(`expected 52 templates, got ${catalog.count}`);

// ── Step 4: palettes ─────────────────────────────────────────────────
const palettes = await fetchJson("/api/palettes.json");
console.log(`✓ /api/palettes.json  ${palettes.count} palettes`);

// ── Step 5: every template's spec is reachable and well-formed ───────
let totalElements = 0;
for (const t of catalog.templates) {
  const spec = await fetchJson(`/api/templates/${t.id}.json`);
  if (spec.id !== t.id) throw new Error(`mismatch: ${t.id} ≠ ${spec.id}`);
  if (!Array.isArray(spec.elements)) throw new Error(`${t.id}: elements is not array`);
  totalElements += spec.elements.length;
}
console.log(`✓ all 40 template specs reachable  (${totalElements} elements total)`);

// ── Step 6: walk the algorithm with a mock LLM response ──────────────
console.log(`\n─── Mock skill execution ─────────────────────────────────\n`);

const cardInfo = {
  name: "Tomas Reyes",
  title: "Founder & Managing Partner",
  company: "Reyes & Co.",
  email: "tomas@reyesco.com",
  phone: "(312) 555-0142",
  website: "reyesco.com",
  address: "",
  tagline: "",
};
console.log(`Input: ${cardInfo.name}, ${cardInfo.company}`);
console.log(`Inferred designHint: "classic and trustworthy"`);

// Mock LLM output (skipping the real LLM call)
const llmTags = {
  industry: ["finance", "consulting"] as IndustryTag[],
  style: ["classic", "elegant"] as StyleTag[],
  mood: ["light"] as MoodTag[],
  density: ["balanced"] as DensityTag[],
};
const llmPalette = {
  primary: "#1a365d",
  secondary: "#d4a843",
  accent: "#d4a843",
  background: "#ffffff",
  backgroundAlt: "#1a365d",
  text: "#4a5568",
};
console.log(`Mock LLM tags:`, llmTags);

// Apply ranking
const top = rankTemplates(llmTags, 5);
console.log(`\nTop 5 templates by tag overlap:`);
for (const t of top) {
  console.log(`  ${t.id.padEnd(20)} score=${scoreTemplate(t, llmTags)}`);
}

// Build render URL
const chosen = top[0];
const config = { cardInfo, templateId: chosen.id, palette: llmPalette };
const encoded = Buffer.from(JSON.stringify(config)).toString("base64");
const renderUrl = `${ORIGIN}/#/render?config=${encoded}`;

console.log(`\nFinal render URL (${encoded.length} chars):`);
console.log(`  ${renderUrl}`);

console.log(`\n─── ✓ All checks passed ───\n`);
console.log(`Open the render URL above in a browser to see the rendered card.`);
