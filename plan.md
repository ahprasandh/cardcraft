# App4 Plan — 1000 Template Variants

## Overview
Replace LLM-heavy design generation with pre-built catalog of 1000 tagged variants.
LLM only picks tags (~3-5s) → JS filters catalog → instant results.

---

## Step 1: 40 Base Layouts

### Keep 18 from existing 25

| # | ID | Structure |
|---|-----|-----------|
| 1 | `minimal-clean` | Simple vertical column, centered |
| 2 | `bold-header` | Colored header band + white body |
| 3 | `split-sidebar` | 35% colored left sidebar + right content |
| 4 | `centered-classic` | All centered, thin dividers |
| 5 | `modern-left` | Thin left accent bar + right content |
| 6 | `elegant-serif` | Centered serif + ornamental dividers |
| 7 | `dark-gradient` | Dark gradient bg, horizontal contact wrap |
| 8 | `top-accent` | Thin accent line top + 2-col contacts |
| 9 | `corner-frame` | 4 decorative corner brackets |
| 10 | `stacked-bold` | Oversized bold name as hero |
| 11 | `two-tone-split` | Horizontal 60/40 color split |
| 12 | `mono-tech` | Monospace, code-comment styling |
| 13 | `offset-minimal` | Asymmetric — top-right + bottom-left |
| 14 | `diagonal-accent` | Diagonal stripe corner |
| 15 | `bottom-heavy` | Company top, everything else bottom |
| 16 | `floating-name` | Large watermark name background |
| 17 | `compact-modern` | 2-column contact grid, dense |
| 18 | `asymmetric-blocks` | Color block corner + white main |

### Drop 7 (twins merged into above)
- `card-border` → `centered-classic` + border
- `logo-centered` → `centered-classic` + logo variant
- `wide-header` → `bold-header` + style
- `sidebar-dark` → `split-sidebar` + dark
- `luxury-frame` → `elegant-serif` + border
- `playful-angle` → `diagonal-accent` + position
- `horizontal-rule` → `minimal-clean` + divider

### Add 22 new layouts

| # | ID | Structure | Status |
|---|-----|-----------|--------|
| 19 | `right-sidebar` | Mirror of split-sidebar, colored right | [x] |
| 20 | `bottom-bar` | Colored bar at bottom with contacts | [x] |
| 21 | `sandwich-bands` | Colored top + bottom bands, white middle | [x] |
| 22 | `vertical-split` | 50/50 left-right split | [x] |
| 23 | `diagonal-split` | Diagonal line divides 2 color zones | [x] |
| 24 | `circle-motif` | Large circle decoration | [x] |
| 25 | `badge-emblem` | Centered badge, info wraps around | [x] |
| 26 | `magazine-editorial` | Large name, editorial whitespace | [x] |
| 27 | `japanese-minimal` | Extreme whitespace, tiny text corner | [x] |
| 28 | `retro-vintage` | Ornamental borders, old-style centered | [x] |
| 29 | `brutalist` | Harsh blocks, oversized type | [x] |
| 30 | `card-inset` | Inner card with margin look | [x] |
| 31 | `vertical-text` | Name rotated vertically on left edge | [x] |
| 32 | `three-column` | 3 equal columns | [x] |
| 33 | `stepped-blocks` | Staggered color blocks | [x] |
| 34 | `neon-dark` | Full dark, neon accent lines | [x] |
| 35 | `full-bleed` | Full-color bg, no white space | [x] |
| 36 | `ribbon-banner` | Decorative ribbon across middle | [x] |
| 37 | `edge-info` | Info along card edges, center empty | [x] |
| 38 | `dot-grid` | Structured grid placement | [x] |
| 39 | `overlap-cards` | Stacked card illusion | [x] |
| 40 | `wave-divide` | Wavy line divides 2 zones | [x] |

---

## Step 2: 1000-Variant Catalog

### Presets: 25 per layout (5 palettes × 5 styles)

**Palettes:**
1. `corporate-blue` — navy/slate/white
2. `warm-earth` — brown/amber/cream
3. `dark-premium` — charcoal/gold/black
4. `cool-mint` — teal/sage/white
5. `vibrant-pop` — bright accent on white

**Styles:**
1. `clean` — no pattern, no border
2. `patterned` — subtle pattern, no border
3. `bordered` — no pattern, accent border
4. `bold` — pattern + border
5. `textured` — pattern + gradient bg effect

### Tag Schema

**Industry (15):**
tech, finance, legal, healthcare, education, food-dining, creative-agency, real-estate, retail, beauty-wellness, consulting, nonprofit, entertainment, photography, construction

**Visual Style (5):**
minimal, classic, bold, elegant, modern

**Mood (4):**
light, dark, warm, cool

**Density (3):**
airy, balanced, compact

---

## Step 3: App4 Tag-Based Flow

1. LLM Query 1 (~3-5s): business desc → `{ industry, style, mood, density }`
2. JS filter (instant): score 1000 variants by tag overlap → top 20
3. Pick 4 with layout variety → show immediately
4. Optional LLM Query 2 (~5s): fine-tune colors to user prefs

---

## Step 4: Wire Up

- Add `recommendDesignsApp4()` to `ollama-client.ts`
- Make it the default Generate button in `CardInfoStep.tsx`

---

## Files to modify
- `src/lib/types.ts` — expand TemplateId union
- `src/lib/designs.ts` — update TEMPLATES array
- `src/components/BusinessCard.tsx` — add 22 new layout cases
- `src/lib/template-catalog.ts` — NEW: 1000-variant catalog
- `src/lib/ollama-client.ts` — add App4 recommend function
- `src/components/steps/CardInfoStep.tsx` — wire App4 button

---

## Upcoming Features

### 1. QR Code & Additional Images
- Add QR code as a toggleable card element (encode website URL or vCard data)
- Allow users to add custom images/graphics to the card beyond just a logo
- QR position follows same placement system as logo (safe positions per template)
- User can toggle QR on/off, choose size (small/medium), pick content type (URL, vCard, custom text)

### 2. Back-of-Card Design
- Flip card to show a second face
- Back face options: logo-centered, QR code, minimal info, full pattern, custom image
- Design picker shows both faces side-by-side or with a flip preview
- Export downloads both front and back as separate PNGs (or combined PDF)
- Store as `CardDesign.backFace?: BackFaceDesign` in types

### 3. Keyboard Shortcuts (Edit Mode)
- Arrow keys → move selected element (position offset)
- `+` / `-` → increase/decrease font size
- `Delete` / `Backspace` → hide selected element
- `Escape` → deselect element / exit edit mode
- `Tab` → cycle through elements
- Only active when edit mode is on and card area is focused
