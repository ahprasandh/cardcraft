<div align="center">

# 💼 CardCraft

### Design stunning business cards in seconds — no design skills required.

[![Built with React](https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react&logoColor=white)](https://react.dev)
[![Vite](https://img.shields.io/badge/Vite-6-646CFF?style=flat-square&logo=vite&logoColor=white)](https://vite.dev)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-v4-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white)](https://tailwindcss.com)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org)

</div>

---

## ✨ What is CardCraft?

CardCraft is a fully client-side business card designer that uses AI-powered recommendations to help you find the perfect card design from a catalog of **1,000 pre-built variants**. No backend required — everything runs in your browser.

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│   📝 Your Info  →  🎨 Pick Design  →  ✏️ Customize  →  🖨️ Print │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## 🚀 Features

| Feature | Description |
|---------|-------------|
| **🤖 AI-Powered Recommendations** | Ollama LLM analyzes your business info and suggests the best-matching card designs via tags + colors |
| **📐 40 Template Layouts** | From minimal-clean to bold geometric — each professionally crafted |
| **🎨 1,000 Design Variants** | 40 layouts × 5 palettes × 5 styles = massive variety without decision fatigue |
| **🖼️ 14 SVG Patterns** | Dots, lines, waves, hexagons, and more — adjustable opacity & placement |
| **🏷️ 19 Logo Icons** | Built-in SVG logos for quick prototyping, or upload your own |
| **↔️ Front & Back Design** | 6 back-face presets (logo-centered, QR-focus, pattern-fill, minimal, solid, tagline) |
| **📱 QR Codes** | Auto-generated QR codes — website, vCard, or custom content |
| **🔤 Per-Element Control** | Click any element to move, resize, and recolor independently |
| **👁️ Field Visibility** | Show/hide any field including logo with one click |
| **✍️ Custom Text Lines** | Add arbitrary text (license numbers, social handles, etc.) |
| **📥 Export** | Download as high-res PNG or print-ready PDF (front + back) |
| **🖨️ Printer Finder** | Locate nearby print shops via location-based search |
| **💾 Zero Backend** | 100% static — deploy anywhere (Netlify, Vercel, S3, etc.) |

## 🏗️ Architecture

```
src/
├── pages/Home.tsx              # Main wizard page
├── components/
│   ├── BusinessCard.tsx        # Renders all 47 template layouts
│   ├── BusinessCardBack.tsx    # Back-face renderer (6 presets)
│   └── steps/
│       ├── CardInfoStep.tsx    # Step 1: Enter your details
│       ├── DesignPickerStep.tsx # Step 2: AI recommends designs
│       ├── RefinementStep.tsx  # Step 3: Customize with tabbed panel
│       ├── FindPrintersStep.tsx # Step 4: Locate printers
│       ├── OrderStep.tsx       # Step 5: Order details
│       └── ConfirmationStep.tsx # Step 6: Summary
└── lib/
    ├── types.ts                # All TypeScript interfaces
    ├── template-catalog.ts     # 1,000-variant catalog generator
    ├── designs.ts              # 40 template metadata
    ├── patterns.ts             # 14 SVG background patterns
    ├── logos.tsx               # 19 SVG logo components
    ├── ollama-client.ts        # Browser-side LLM calls
    └── store.ts                # Zustand wizard state
```

## 🛠️ Getting Started

```bash
# Clone
git clone https://github.com/your-username/bcarddesigner.git
cd bcarddesigner

# Install
npm install

# Run dev server (port 3000)
npm run dev

# Build for production
npm run build    # → dist/
```

### AI Recommendations (Optional)

CardCraft works without AI — it falls back to tag-based filtering. To enable LLM-powered recommendations:

1. Install [Ollama](https://ollama.com)
2. Pull the model: `ollama pull qwen3.6:35b`
3. Run Ollama on a machine accessible from your browser
4. Update the URL in `src/lib/ollama-client.ts`

## 🎯 How It Works

```
┌──────────────┐     ┌───────────────┐     ┌──────────────────┐
│  User enters │     │ Ollama picks  │     │ Catalog filters  │
│  business    │────▶│ tags + colors │────▶│ 1000 variants    │
│  info        │     │ (or fallback) │     │ → top matches    │
└──────────────┘     └───────────────┘     └──────────────────┘
                                                    │
                     ┌───────────────┐              ▼
                     │  User tweaks  │     ┌──────────────────┐
                     │  colors, font │◀────│ Preview designs  │
                     │  position, QR │     │ (interactive)    │
                     └───────┬───────┘     └──────────────────┘
                             │
                             ▼
                     ┌───────────────┐
                     │ Export PNG/PDF│
                     │ Find printer  │
                     └───────────────┘
```

## 📦 Tech Stack

- **React 19** — UI framework with hooks
- **Vite 6** — Lightning-fast build tool
- **TypeScript 5** — Full type safety
- **Tailwind CSS v4** — Utility-first styling via `@tailwindcss/vite`
- **Zustand** — Lightweight state management
- **dom-to-image** — Card-to-PNG export (loaded via CDN)
- **qrcode** — Browser-side QR generation
- **Ollama** — Local LLM for design recommendations

## 📄 License

MIT

---

<div align="center">
  <sub>Built with ☕ and way too many Tailwind classes.</sub>
</div>
