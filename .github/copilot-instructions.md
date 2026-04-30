# Copilot Instructions for bcarddesigner

## Workflow Rules

- **Discuss before implementing.** For any non-trivial change (new features, UI restructuring, refactors), present a clear plan first and wait for explicit user approval before writing code.
- **No silent large changes.** Never rewrite components, add new files, or change the wizard flow without confirming the approach.
- **Small fixes are OK.** Bug fixes, build errors, and type errors can be fixed immediately without discussion.

## Project Context

- **Stack:** Vite, React 19, TypeScript, Tailwind CSS v4, Zustand, Ollama LLM
- **Build:** `npm run dev` (port 3000), `npm run build` → `dist/`, fully static output
- **LLM:** Ollama called directly from browser at hardcoded URL in `src/lib/ollama-client.ts`, model `qwen3.6:35b`. Always handle LLM failures with fallbacks.
- **Architecture:** Tag-based card recommendation. 1000 pre-built catalog variants (40 layouts × 5 palettes × 5 styles). LLM picks tags + colors, catalog provides matching designs.
- **Wizard flow:** info → designs → refine → printers → order → confirmation
- **Key files:**
  - `src/lib/types.ts` — all TypeScript types
  - `src/lib/template-catalog.ts` — 1000-variant catalog with tag filtering
  - `src/lib/designs.ts` — 40 template metadata, fallback generators
  - `src/lib/patterns.ts` — 14 SVG background patterns
  - `src/lib/logos.tsx` — 19 SVG logo/icon components
  - `src/lib/ollama-client.ts` — browser-side LLM calls (recommendDesignsApp4)
  - `src/components/BusinessCard.tsx` — renders all 47 template layouts
  - `src/components/steps/` — one component per wizard step
  - `src/lib/store.ts` — Zustand wizard state
  - `src/pages/Predefined.tsx` — design system catalog browser with logo position editor
