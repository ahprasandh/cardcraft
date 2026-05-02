/**
 * Template spec loader.
 *
 * Vite's `import.meta.glob` eagerly imports every `.json` under
 * `core/src/templates/` so the webapp can look up a spec by id. Each
 * spec is the source of truth for "how is this template laid out."
 *
 * If you add a new template, drop the JSON in `core/src/templates/`
 * and add metadata to `core/src/templates-registry.ts` — this loader
 * picks it up automatically without any code changes here.
 */

import type { CardSpec } from "@core/types";

// Eagerly load every JSON in core/src/templates/.
const modules = import.meta.glob<{ default: CardSpec }>(
  "../../core/src/templates/*.json",
  { eager: true },
);

const SPECS: Record<string, CardSpec> = {};
for (const [path, mod] of Object.entries(modules)) {
  const filename = path.split("/").pop() || "";
  const id = filename.replace(/\.json$/, "");
  SPECS[id] = mod.default;
}

/** Look up a spec by its id (matches `templateId` on CardDesign). */
export function getTemplateSpec(id: string): CardSpec | undefined {
  return SPECS[id];
}

/** All spec ids the loader knows about. Useful for debugging or catalog UIs. */
export function listTemplateSpecIds(): string[] {
  return Object.keys(SPECS).sort();
}
