/**
 * Step 2 validation script.
 *
 * Renders the two reference templates with sample data and writes the SVGs
 * to `core/validation/`. Also writes an `index.html` that displays them
 * side-by-side at multiple sizes for review.
 *
 * Run: `npx tsx core/scripts/validate.ts` from the project root.
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { renderSpec, type CardInfo, type Palette, type DesignModifiers } from "../src/index.js";
import type { TemplateSpec } from "../src/types.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, "..", "..");
const TEMPLATES_DIR = join(REPO_ROOT, "core", "src", "templates");
const OUTPUT_DIR = join(REPO_ROOT, "core", "validation");

if (!existsSync(OUTPUT_DIR)) mkdirSync(OUTPUT_DIR, { recursive: true });

// ── Sample data (matches the kind of input a real user would supply) ──
const SAMPLE_INFO: CardInfo = {
  name: "Hari Prasandh",
  title: "Software Engineer",
  company: "Acme Corporation",
  email: "hari@acme.com",
  phone: "(555) 123-4567",
  website: "acme.com",
  address: "",
  tagline: "Building tomorrow",
  customLines: [],
};

const SAMPLE_PALETTE: Palette = {
  // Slate Blue — one of the predefined palettes in the existing webapp
  primary: "#1e293b",
  secondary: "#3b82f6",
  accent: "#3b82f6",
  background: "#f8fafc",
  backgroundAlt: "#1e293b",
  text: "#64748b",
};

const SAMPLE_MODS: DesignModifiers = {
  font: "sans",
  spacing: "normal",
  borderRadius: "medium",
};

// ── Render each spec ──────────────────────────────────────────────────
const TEMPLATES = [
  // Carryover (26)
  "minimal-clean",
  "split-sidebar",
  "centered-classic",
  "modern-left",
  "elegant-serif",
  "stacked-bold",
  "japanese-minimal",
  "top-accent",
  "right-sidebar",
  "vertical-split",
  "two-tone-split",
  "magazine-editorial",
  "offset-minimal",
  "asymmetric-blocks",
  "corner-frame",
  "retro-vintage",
  "three-column",
  "edge-info",
  "dark-gradient",
  "diagonal-accent",
  "diagonal-split",
  "mono-tech",
  "vertical-text",
  "brutalist",
  "floating-name",
  "wave-divide",
  // New (26)
  "editorial-type",
  "bold-accent",
  "swiss-grid",
  "glyph-mark",
  "brutalist-grid",
  "soft-surface",
  "diagonal-modern",
  "ribbon-minimal",
  "zen-asymmetric",
  "mono-terminal",
  "wide-band",
  "two-column-clean",
  "oversized-initial",
  "top-heavy",
  "l-frame",
  "inset-elegant",
  "horizontal-stack",
  "circle-badge",
  "right-accent-bar",
  "stacked-display",
  "orbit",
  "twin-circles",
  "corner-block",
  "half-moon",
  "stacked-bars",
  "diamond-accent",
];

interface RenderedTemplate {
  id: string;
  name: string;
  svg350: string;
  svg500: string; // larger size for closer inspection
}

const rendered: RenderedTemplate[] = [];

for (const id of TEMPLATES) {
  const specPath = join(TEMPLATES_DIR, `${id}.json`);
  const spec: TemplateSpec = JSON.parse(readFileSync(specPath, "utf-8"));
  const svg350 = renderSpec(spec, SAMPLE_PALETTE, SAMPLE_INFO, SAMPLE_MODS);
  const svg500 = renderSpec(spec, SAMPLE_PALETTE, SAMPLE_INFO, SAMPLE_MODS, {
    size: { width: 500, height: 286 },
  });

  writeFileSync(join(OUTPUT_DIR, `${id}.svg`), svg350);
  writeFileSync(join(OUTPUT_DIR, `${id}@500.svg`), svg500);
  rendered.push({ id, name: spec.name, svg350, svg500 });
  console.log(`✓ Rendered ${id}.svg (${svg350.length} bytes)`);
}

// ── HTML viewer ───────────────────────────────────────────────────────
const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Step 2 — Renderer parity check</title>
<style>
  body {
    font-family: system-ui, -apple-system, sans-serif;
    max-width: 1100px;
    margin: 24px auto;
    padding: 0 24px;
    color: #1f2937;
    background: #f9fafb;
  }
  h1 { margin: 0 0 8px; }
  .lede { color: #6b7280; margin-top: 0; }
  .template { background: white; border: 1px solid #e5e7eb; border-radius: 12px; padding: 24px; margin: 24px 0; }
  .template h2 { margin: 0 0 4px; font-size: 18px; }
  .template .meta { color: #6b7280; font-size: 13px; margin-bottom: 16px; }
  .row { display: flex; gap: 24px; flex-wrap: wrap; align-items: flex-start; margin-top: 12px; }
  .card-wrap { display: flex; flex-direction: column; align-items: flex-start; gap: 6px; }
  .card-wrap .label { font-size: 12px; color: #6b7280; }
  .card-wrap svg { display: block; box-shadow: 0 4px 12px rgba(0,0,0,0.08); border-radius: 8px; }
  .compare { background: #fef3c7; border: 1px solid #fbbf24; padding: 12px 16px; border-radius: 8px; font-size: 14px; margin-top: 16px; }
  .compare a { color: #b45309; font-weight: 600; }
  details { margin-top: 12px; }
  details pre { background: #f3f4f6; padding: 12px; border-radius: 6px; overflow-x: auto; font-size: 11px; max-height: 280px; }
  .sample { background: #eff6ff; border-radius: 8px; padding: 12px 16px; font-size: 13px; color: #1e40af; }
  .sample code { background: white; padding: 2px 6px; border-radius: 3px; font-size: 12px; }
</style>
</head>
<body>
<h1>Step 2 — Renderer parity check</h1>
<p class="lede">SVG output from the framework-free <code>renderSpec()</code> for the two reference templates. Compare visually against the existing React renders in the running webapp.</p>

<div class="sample">
  <strong>Sample data</strong> · name: <code>Hari Prasandh</code> · title: <code>Software Engineer</code> · company: <code>Acme Corporation</code> · email: <code>hari@acme.com</code> · phone: <code>(555) 123-4567</code> · website: <code>acme.com</code> · tagline: <code>Building tomorrow</code><br>
  <strong>Palette</strong> · Slate Blue (primary <code>#1e293b</code>, accent <code>#3b82f6</code>, bg <code>#f8fafc</code>, bgAlt <code>#1e293b</code>)
</div>

<div class="compare">
  <strong>How to compare:</strong> Run the existing webapp (<code>npm run dev</code> → <a href="http://localhost:3000">localhost:3000</a>), use the same sample data above, and pick a Slate-Blue-ish palette. Place the live React render next to the SVG below — they should be visually equivalent (positions, fonts, colors, dividers, contact lines).
</div>

${rendered.map((r) => `
<div class="template">
  <h2>${r.name}</h2>
  <div class="meta">id: <code>${r.id}</code> · 350×200 reference · 500×286 enlarged</div>
  <div class="row">
    <div class="card-wrap">
      <div class="label">350 × 200 (medium)</div>
      ${r.svg350}
    </div>
    <div class="card-wrap">
      <div class="label">500 × 286 (enlarged for inspection)</div>
      ${r.svg500}
    </div>
  </div>
  <details><summary>SVG markup</summary><pre>${escapeHtml(r.svg350)}</pre></details>
</div>
`).join("")}

</body>
</html>`;

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

writeFileSync(join(OUTPUT_DIR, "index.html"), html);
console.log(`✓ Wrote validation/index.html`);
console.log(`\nOpen: file://${join(OUTPUT_DIR, "index.html")}`);
