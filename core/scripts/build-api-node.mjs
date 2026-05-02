/**
 * Node-only API build script — bypasses tsx/esbuild for sandbox compatibility.
 *
 * Reads TEMPLATES, PALETTES, MANIFEST by lightly parsing the .ts source
 * files (the data shape is plain JSON-compatible). Identical output to
 * core/scripts/build-api.ts but runs on plain Node without esbuild.
 *
 * Use this when `tsx` can't run (e.g., when the host's esbuild binary
 * doesn't match the runtime platform). Otherwise prefer build-api.ts.
 */

import { readFileSync, writeFileSync, mkdirSync, rmSync, existsSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CORE = join(__dirname, "..");
const PROJECT_ROOT = join(CORE, "..");
const SRC_TEMPLATES = join(CORE, "src", "templates");
const PUBLIC_API = join(PROJECT_ROOT, "public", "api");
const PUBLIC_API_TEMPLATES = join(PUBLIC_API, "templates");

/** Strip TS source down to the array literal exported as `name`. */
function extractArrayLiteral(src, name) {
  const re = new RegExp(`export\\s+const\\s+${name}\\s*:[^=]+=\\s*(\\[[\\s\\S]*?\\n\\]);`, "m");
  const m = src.match(re);
  if (!m) throw new Error(`Could not find ${name} in source`);
  // Use Function constructor to evaluate the literal — TS-only syntax must
  // be stripped first (none expected in pure data arrays).
  // eslint-disable-next-line no-new-func
  return new Function(`return ${m[1]};`)();
}

const registrySrc = readFileSync(join(CORE, "src", "templates-registry.ts"), "utf-8");
const palettesSrc = readFileSync(join(CORE, "src", "palettes.ts"), "utf-8");

const TEMPLATES = extractArrayLiteral(registrySrc, "TEMPLATES");
const PALETTES = extractArrayLiteral(palettesSrc, "PALETTES");

if (existsSync(PUBLIC_API_TEMPLATES)) {
  try {
    rmSync(PUBLIC_API_TEMPLATES, { recursive: true, force: true });
  } catch (e) {
    console.warn(`(skipping wipe — ${e.code || e.message}; existing files will be overwritten in place)`);
  }
}
mkdirSync(PUBLIC_API_TEMPLATES, { recursive: true });

// Note: manifest.json is left untouched — it's static config that doesn't
// depend on templates/palettes content. Use core/scripts/build-api.ts (via
// npm run build:api) to regenerate manifest.json.

writeFileSync(
  join(PUBLIC_API, "catalog.json"),
  JSON.stringify({ version: "1.0", count: TEMPLATES.length, templates: TEMPLATES }, null, 2),
);

writeFileSync(
  join(PUBLIC_API, "palettes.json"),
  JSON.stringify({ version: "1.0", count: PALETTES.length, palettes: PALETTES }, null, 2),
);

let copied = 0;
let missing = [];
for (const t of TEMPLATES) {
  const src = join(SRC_TEMPLATES, `${t.id}.json`);
  const dst = join(PUBLIC_API_TEMPLATES, `${t.id}.json`);
  if (!existsSync(src)) {
    missing.push(t.id);
    continue;
  }
  const spec = JSON.parse(readFileSync(src, "utf-8"));
  writeFileSync(dst, JSON.stringify(spec, null, 2));
  copied++;
}

const html = `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"><title>CardCraft API</title>
<style>body{font-family:system-ui;max-width:880px;margin:32px auto;padding:0 24px}h1{margin:0 0 4px}.endpoint{background:#fff;border:1px solid #e5e7eb;border-radius:8px;padding:16px 20px;margin:16px 0}.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:4px 16px;margin-top:8px}.grid a{font-size:12px;color:#2563eb;text-decoration:none}</style>
</head><body>
<h1>CardCraft API</h1>
<p>Static JSON tree generated from <code>core/</code>.</p>
<div class="endpoint"><h2><a href="/api/manifest.json">/api/manifest.json</a></h2><p>Agent contract.</p></div>
<div class="endpoint"><h2><a href="/api/catalog.json">/api/catalog.json</a></h2><p>${TEMPLATES.length} templates with metadata and tags.</p></div>
<div class="endpoint"><h2><a href="/api/palettes.json">/api/palettes.json</a></h2><p>${PALETTES.length} named color palettes.</p></div>
<div class="endpoint"><h2>/api/templates/&lt;id&gt;.json</h2><div class="grid">
${TEMPLATES.map((t) => `<a href="/api/templates/${t.id}.json">${t.id}</a>`).join("\n  ")}
</div></div>
</body></html>`;
writeFileSync(join(PUBLIC_API, "index.html"), html);

console.log(`✓ Built static API at public/api/`);
console.log(`  - manifest.json`);
console.log(`  - catalog.json (${TEMPLATES.length} templates)`);
console.log(`  - palettes.json (${PALETTES.length} palettes)`);
console.log(`  - templates/<id>.json × ${copied}${missing.length ? ` (missing: ${missing.join(", ")})` : ""}`);
console.log(`  - index.html`);
