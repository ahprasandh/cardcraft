/**
 * Build script — regenerates the static API tree under the webapp's
 * `public/api/` directory.
 *
 * Output paths (relative to the project root):
 *
 *   public/api/manifest.json
 *   public/api/catalog.json
 *   public/api/palettes.json
 *   public/api/templates/<id>.json   × 40
 *   public/api/index.html             — small landing page for /api/
 *
 * Vite serves `public/` at the root URL automatically, so:
 *   - `npm run dev` → curl http://localhost:3000/api/manifest.json
 *   - `vite build`  → the production bundle includes the same files
 *
 * Run by `npm run build:api`. Also runs automatically as a predev/prebuild
 * step so the API stays in sync with core/.
 */

import { readFileSync, writeFileSync, mkdirSync, rmSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

import {
  MANIFEST,
  TEMPLATES,
  PALETTES,
} from "../src/index.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CORE = join(__dirname, "..");                        // core/
const PROJECT_ROOT = join(CORE, "..");                     // bcarddesigner/
const SRC_TEMPLATES = join(CORE, "src", "templates");
const PUBLIC_API = join(PROJECT_ROOT, "public", "api");
const PUBLIC_API_TEMPLATES = join(PUBLIC_API, "templates");

// Try to clean so stale templates don't linger. Some environments block
// `rm` on workspace files (e.g., sandboxed containers); fall through and
// just overwrite-in-place if the wipe fails. Stale orphans are unlikely
// in normal use because templates rarely get removed.
if (existsSync(PUBLIC_API)) {
  try {
    rmSync(PUBLIC_API, { recursive: true, force: true });
  } catch (e) {
    console.warn(`(skipping wipe — ${(e as Error).code || (e as Error).message}; existing files will be overwritten in place)`);
  }
}
mkdirSync(PUBLIC_API_TEMPLATES, { recursive: true });

// ── Write manifest ───────────────────────────────────────────────────
writeFileSync(
  join(PUBLIC_API, "manifest.json"),
  JSON.stringify(MANIFEST, null, 2),
);

// ── Write catalog (template metadata + tags) ─────────────────────────
writeFileSync(
  join(PUBLIC_API, "catalog.json"),
  JSON.stringify({
    version: "1.0",
    count: TEMPLATES.length,
    templates: TEMPLATES,
  }, null, 2),
);

// ── Write palettes ───────────────────────────────────────────────────
writeFileSync(
  join(PUBLIC_API, "palettes.json"),
  JSON.stringify({
    version: "1.0",
    count: PALETTES.length,
    palettes: PALETTES,
  }, null, 2),
);

// ── Copy each template spec ──────────────────────────────────────────
for (const t of TEMPLATES) {
  const src = join(SRC_TEMPLATES, `${t.id}.json`);
  const dst = join(PUBLIC_API_TEMPLATES, `${t.id}.json`);
  const spec = JSON.parse(readFileSync(src, "utf-8"));
  writeFileSync(dst, JSON.stringify(spec, null, 2));
}

// ── Landing page (browseable from localhost:3000/api/) ───────────────
const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>CardCraft API</title>
<style>
  body { font-family: system-ui, -apple-system, sans-serif; max-width: 880px; margin: 32px auto; padding: 0 24px; color: #1f2937; background: #f9fafb; }
  h1 { margin: 0 0 4px; }
  .lede { color: #6b7280; margin-top: 0; font-size: 14px; }
  .endpoint { background: white; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px 20px; margin: 16px 0; }
  .endpoint h2 { margin: 0 0 6px; font-size: 16px; }
  .endpoint p { margin: 6px 0; color: #4b5563; font-size: 14px; }
  .endpoint a { color: #2563eb; text-decoration: none; font-family: ui-monospace, monospace; font-size: 13px; }
  .endpoint a:hover { text-decoration: underline; }
  pre { background: #f3f4f6; padding: 10px 14px; border-radius: 6px; overflow-x: auto; font-size: 12px; margin: 8px 0 0; }
  .meta { color: #9ca3af; font-size: 12px; margin-top: 8px; }
  .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 4px 16px; margin-top: 8px; }
  .grid a { font-size: 12px; }
  .top { display: flex; align-items: baseline; gap: 12px; }
  .top a { font-size: 14px; }
</style>
</head>
<body>
<div class="top">
  <h1>CardCraft API</h1>
  <a href="/">← back to webapp</a>
</div>
<p class="lede">Static JSON tree generated from <code>core/</code>. Same origin as the webapp.</p>

<div class="endpoint">
  <h2><a href="/api/manifest.json">/api/manifest.json</a></h2>
  <p>Agent contract — LLM prompt template, tag vocabulary, apply rules, resource paths.</p>
  <pre>curl http://localhost:3000/api/manifest.json</pre>
</div>

<div class="endpoint">
  <h2><a href="/api/catalog.json">/api/catalog.json</a></h2>
  <p>${TEMPLATES.length} templates with metadata and industry/style/mood/density tags.</p>
  <pre>curl http://localhost:3000/api/catalog.json | jq '.templates[0]'</pre>
</div>

<div class="endpoint">
  <h2><a href="/api/palettes.json">/api/palettes.json</a></h2>
  <p>${PALETTES.length} named color palettes with mood tags.</p>
  <pre>curl http://localhost:3000/api/palettes.json | jq '.palettes[].name'</pre>
</div>

<div class="endpoint">
  <h2>/api/templates/&lt;id&gt;.json</h2>
  <p>Per-template render spec — flat array of positioned elements.</p>
  <pre>curl http://localhost:3000/api/templates/minimal-clean.json</pre>
  <div class="meta">All ${TEMPLATES.length} templates:</div>
  <div class="grid">
    ${TEMPLATES.map((t) => `<a href="/api/templates/${t.id}.json">${t.id}</a>`).join("\n    ")}
  </div>
</div>

</body>
</html>
`;
writeFileSync(join(PUBLIC_API, "index.html"), html);

console.log(`✓ Built static API at public/api/`);
console.log(`  - manifest.json`);
console.log(`  - catalog.json (${TEMPLATES.length} templates)`);
console.log(`  - palettes.json (${PALETTES.length} palettes)`);
console.log(`  - templates/<id>.json × ${TEMPLATES.length}`);
console.log(`  - index.html`);
console.log(``);
console.log(`Once the webapp is running:`);
console.log(`  http://localhost:3000/api/`);
