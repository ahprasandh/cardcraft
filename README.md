<div align="center">

<br />

<img src=".github/logo.svg" alt="CardCraft" width="520" />

<br />
<br />

**A business card studio that thinks for you.**
<br/>
Tell it who you are. It picks the design. You polish the details.

<br />

[![React 19](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=white&labelColor=20232a)](https://react.dev)
[![Vite 6](https://img.shields.io/badge/Vite-6-646CFF?style=for-the-badge&logo=vite&logoColor=white&labelColor=20232a)](https://vite.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=for-the-badge&logo=typescript&logoColor=white&labelColor=20232a)](https://www.typescriptlang.org)
[![Tailwind v4](https://img.shields.io/badge/Tailwind-4-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white&labelColor=20232a)](https://tailwindcss.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-9fe870?style=for-the-badge&labelColor=20232a)](#license)

<br />

`52 templates  ·  14 palettes  ·  14 patterns  ·  19 logos  ·  AI-powered`

<br />

</div>

---

## The pitch

Most card tools dump 10,000 templates on you and call it a day. CardCraft does the picking — you tell it your name, role, and what you do, and an Ollama-backed recommender returns a curated set of designs already tuned to your industry, mood, and density. Then you live-edit anything: every text element, logo, QR code, and back-face block is independently movable, recolorable, refontable, and case-controllable. Export a print-ready PNG or PDF when you're done. Everything runs in the browser. No backend. No accounts.

<br />

## Highlights

<table>
<tr>
<td width="50%" valign="top">

**🤖 AI design selection**
Ollama LLM (or fallback heuristics) picks designs from your business profile — industry, vibe, role tags, and color hints all factored in.

**🎨 Live edit toolbar**
Click any element on the card → unified toolbar with position pad, size, color, font, case, opacity, and wrap. Same controls for front and back.

**📝 Per-element typography**
Override the card-wide font family, capitalization (`Aa / AA / aa / Aa Bb`), and wrap mode for any single text element.

**🖼️ Bring your own font**
Upload `.woff2` / `.woff` / `.ttf` / `.otf` — embedded as `@font-face` and travels with the design through share links.

</td>
<td width="50%" valign="top">

**🔁 Front + back face**
6 back-face presets (logo, QR, pattern, minimal, solid, tagline) — overlay your own text/image elements on top.

**📷 vCard QR codes**
Three modes — Website, vCard (one-tap contact import), and Custom URL/text — with a live preview of the encoded payload.

**🔗 Faithful share links**
A base64-encoded snapshot of the entire design (palette, layout, overrides, custom fonts, hidden fields) — render-equal on the recipient's screen.

**📥 Print-ready export**
PNG and PDF, both faces, no CORS surprises. Same-origin font embedding keeps export lossless.

</td>
</tr>
</table>

<br />

## How it works

```
┌─────────────┐     ┌─────────────────┐     ┌──────────────────┐     ┌──────────────────┐
│  Tell it    │     │  Ollama picks   │     │  Catalog returns │     │  You polish in   │
│  who you    │ ──▶ │  industry tags  │ ──▶ │  matching cards  │ ──▶ │  the live editor │
│  are        │     │  + color theme  │     │  (top N variants)│     │                  │
└─────────────┘     └─────────────────┘     └──────────────────┘     └────────┬─────────┘
                                                                              │
                                                                              ▼
                                                                     ┌──────────────────┐
                                                                     │  Download PNG    │
                                                                     │  or PDF · Print  │
                                                                     └──────────────────┘
```

A 3-wave progressive flow keeps things responsive: the first card lands in ~2 seconds, two more shortly after, and the final five complete the lineup. AI redesigns, palette swaps, and template-only refreshes all reuse the same pipeline.

<br />

## Quick start

```bash
git clone https://github.com/your-username/bcarddesigner.git
cd bcarddesigner
npm install
npm run dev          # → http://localhost:3000
npm run build        # → dist/ — drop into Netlify, Vercel, S3, anywhere static
```

That's it. No env vars, no database, no auth.

<br />

### Optional: enable AI design selection

CardCraft works without AI — it falls back to tag-based filtering with similar quality. To enable LLM-powered recommendations:

```bash
brew install ollama          # or download from ollama.com
ollama serve                 # default at http://localhost:11434
ollama pull qwen2.5:14b      # any local model works; tune in src/lib/ollama-client.ts
```

The browser calls Ollama directly from the client. No server intermediary.

<br />

## AI agent integration

CardCraft is **agent-friendly**: the app ships a public skill manifest and two static endpoints so AI assistants (Claude, ChatGPT plugins, custom MCP clients) can produce a designed card without scraping or rendering anything themselves.

| Endpoint | What it does |
|---|---|
| **`/skill.md`** | Skill contract — input shape, output shape, and a worked example. |
| **`/api/manifest.json`** | Versioned catalog version + counts. |
| **`/api/catalog.json`** | Full template metadata: id, tags (industry, mood, density), palette compatibility. |
| **`/api/palettes.json`** | All 14 palettes with role mappings (`primary`, `accent`, `background`, …). |
| **`/#/render?config=<base64>`** | Renders a finished card from a base64-encoded JSON config — used by agents to show their pick. |
| **`/#/gallery`** | Browse every catalog entry. Useful for "show me alternatives." |

The agent picks a template + palette + cardInfo, base64-encodes the config, and the user opens a live `/render` URL — including any uploaded fonts and hidden fields the agent chose to set.

<br />

## Architecture

```
src/
├── pages/
│   ├── Home.tsx                  → 3-step wizard: info → designs → refine
│   ├── Render.tsx                → /#/render?config=…  (agent-facing renderer)
│   └── Gallery.tsx               → /#/gallery — browse the full catalog
├── components/
│   ├── BusinessCard.tsx          → spec-driven front renderer
│   ├── BusinessCardBack.tsx      → preset + element overlay
│   ├── SpecRenderer.tsx          → text / image / shape primitives
│   ├── CustomFontInjector.tsx    → @font-face for user-uploaded fonts
│   └── steps/
│       ├── CardInfoStep.tsx      → step 1 · live preview pinned to minimal-clean
│       ├── DesignPickerStep.tsx  → step 2 · 8 cards, progressive 1+2+5 fill
│       └── RefinementStep.tsx    → step 3 · selectable elements + floating toolbar
└── lib/
    ├── types.ts                  → CardDesign · ElementStyle · CustomFont · …
    ├── templates-registry.ts     → 52 templates with industry/mood/density tags
    ├── template-catalog.ts       → catalog generator + safe placement rules
    ├── palettes.ts               → 14 palettes (carry-over + new)
    ├── patterns.ts               → 14 SVG background patterns
    ├── logos.tsx                 → 19 vector logo marks
    ├── ollama-client.ts          → 3-wave progressive LLM flow
    └── store.ts                  → Zustand wizard state
```

Built around a flat-positional **CardSpec** model (350×200 reference, scaled at render time) plus a unified **ElementOverride** layer for per-element styling. SVG patterns inline as base64 so PNG export round-trips cleanly. Templates are JSON-driven for hot-swap-ability.

<br />

## Tech stack

- **React 19** — ref-as-prop, no `forwardRef` boilerplate
- **Vite 6** — fast dev server, optimized prod bundles
- **TypeScript 5** — strict mode, end-to-end types from spec to renderer
- **Tailwind CSS v4** — via `@tailwindcss/vite`, system-font stack only (no Google Fonts → CORS-clean export)
- **Zustand** — lean wizard state with functional setters
- **dom-to-image** — same-origin PNG/PDF capture
- **qrcode** — browser-side QR generation (vCard, URL, custom)
- **Ollama** — optional local LLM for design recommendations

<br />

## Roadmap

- [ ] Self-hosted curated font pack (drop-in `public/fonts/`)
- [ ] Template editor with live spec preview
- [ ] Multi-card batch export (one PDF, many recipients)
- [ ] Versioned share links with diff view

<br />

## Author

<table>
<tr>
<td width="120" align="center" valign="top">
<img src=".github/logo.svg" alt="" width="80" />
</td>
<td valign="top">

**Hari Prasandh A.**
Software engineer · designer-shaped developer · builds tools that try to think
ahead so the user doesn't have to.
<br/>
🌐 [github.com/ahprasandh](https://github.com/ahprasandh)
<br />
💼 [linkedin.com/in/ahprasandh](https://www.linkedin.com/in/ahprasandh/)

If CardCraft saved you a trip to a designer, a star on the repo or a kind
note keeps the lights on.

</td>
</tr>
</table>

<br />

### Contributing

Issues and PRs welcome. The codebase is small, opinionated, and well-commented —
read `src/lib/types.ts` and `src/components/SpecRenderer.tsx` first to get the
shape of things, then dive in.

<br />

## License

MIT — go nuts.

<br />

<div align="center">
  <sub>Crafted with care · Powered by Ollama · Runs entirely in your browser</sub>
</div>
