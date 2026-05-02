# Skill: Generate a Business Card

> This file describes a **skill** for AI assistants. Read it to gain the ability to generate a business card design and hand the user a URL where they can view, customize, and download it.
>
> Discover this file at `<webapp_origin>/skill.md`. Treat it as the authoritative contract.
>
> **Audience: AI assistants (Claude, GPT, Copilot, etc.) and any automated client.** Humans should use the wizard at the site root.

## What this skill does

Given a person's contact info, a business description, and a design hint, produce **N rendered business card variants** so the user can pick the one they like. Cards are visual; users choose by comparison, not by description.

Default N is **8** — matching what the LLM produces (8 palettes paired with the top 8 ranked templates). The skill never produces a single forced choice. If the user explicitly asks for fewer ("just give me a couple of quick options"), you may produce 2–4. If they ask for more or for "all options," 8 is the maximum.

**How you deliver the variants — always show TWO outputs together:**

1. **The best pick, as a file.** Build the single-card `/#/render?config=<base64>` URL for your top-ranked candidate. Render that page and screenshot it (browser automation / computer-use / headless rendering / code execution). Attach the PNG to the chat as a downloadable file so the user has a finished, copy-pasteable card immediately.
2. **The full gallery, for alternatives.** Build the `/#/gallery?config=<base64>` URL with all 8 candidates. If you have an inbuilt browser tool, open the URL there so the user can scroll the alternatives. If not, paste the URL as a clickable link in the reply. Either way, the user can explore the other 7 options if the best pick isn't quite right.

This dual output covers both intents: the user wants something *now* (the screenshot) and the option to *choose differently* (the gallery). If your environment genuinely cannot render images, fall back to just the gallery link with a short summary of the picks — but that should be a last resort.

**Inputs** (from your user, with one you must infer if missing):
- `cardInfo` — name, title, company, email, phone, plus optional website, address, tagline, **and an optional logo URL** (`customLogoUrl` — see "Logos" below).
- `businessDescription` — a sentence or two about the business ("Italian bakery in Brooklyn, traditional sourdough"). **Required.**
- `designHint` — a 2–4 word style descriptor ("minimal and modern", "classic elegant", "bold and warm"). **Required — if the user didn't provide one, you must infer it (see below).**

## Logos

Logos are user-supplied. The skill does *not* generate logos and does *not* offer a predefined logo catalog.

**Always ask the user about a logo** before executing the skill — something short like *"Do you have a logo? Paste a URL or skip if you don't."* Accept either:
- An HTTPS URL that returns an image (e.g. `https://acme.com/logo.png`)
- A `data:` URL (e.g. `data:image/png;base64,iVBORw0KGgo...`) — useful when the user uploads/attaches an image to the chat and your environment can convert it

If the user provides a logo, include it in the cardInfo as `customLogoUrl`. If they don't, omit the field — the card renders without a logo, and that's fine.

The render route automatically displays the logo in the top-left corner when `customLogoUrl` is present. The user can move/resize it later in the wizard if they want.

For **precise control** — different logo position per candidate, custom rotation/opacity, etc. — pass a fully-specified `logoElement` at the config's top level (or per-candidate in a gallery). See the "Unified element shapes" schemas below. The simple `customLogoUrl` path covers ~90% of cases; reach for `logoElement` only when you need pixel control.

If the user has only a description of a logo (e.g. "I don't have one yet, but I want a coffee bean icon"), tell them you can't generate logos but you can leave a placeholder spot and they can add one in the wizard's editor later.

**Output (always do both):**
1. **Best pick as a PNG file.** Render `/#/render?config=<base64>` for your top-ranked candidate and screenshot it. Attach the PNG to the user's chat so they get a finished card they can use right away.
2. **Gallery for alternatives.** Build the `/#/gallery?config=<base64>` URL. Open it in an inbuilt browser if you have one; otherwise paste the link in the reply with a one-line summary of the picks ("8 options total, top picks: …").

## The mandatory `designHint`

`designHint` shapes the LLM's tag and palette selection. Without it, results are bland and uncentered. **Never call the LLM step with an empty `designHint`.**

If the user didn't provide one explicitly:

1. **Infer from context.** Use what you know about the user — their conversation, their stated tastes, the business they're describing, their previous design choices, their industry. Choose 2–4 words that capture a plausible aesthetic direction.
2. **Confirm only if unsure.** If you have very little context, ask the user a short clarifying question first ("Should this lean minimal and modern, or classic and elegant?"). Otherwise just pick.
3. **Examples of good hints:** `minimal and clean`, `classic elegant`, `bold modern`, `warm traditional`, `dark and tech-forward`, `feminine and soft`, `editorial`, `geometric and brutalist`.
4. **Examples of bad hints:** empty string, "good design", "make it nice", "professional" (too vague).

The hint is filled into the prompt's `designExpectationsClause`, becoming `". Style preference: <hint>"`.

## Endpoints (same origin as this document)

| Method & path | Returns |
|---|---|
| `GET /api/manifest.json` | Prompt template, tag vocabulary, apply rules |
| `GET /api/catalog.json` | All 52 templates with metadata + tags |
| `GET /api/palettes.json` | 14 named palettes |
| `GET /api/templates/<id>.json` | One template's render spec |
| `GET /#/gallery?config=<base64>` | **N candidate cards in a grid** — primary route for skill output |
| `GET /#/render?config=<base64>` | One specific card — for individual focus / re-rendering |

## How to execute the skill — the algorithm

```
1.  Validate inputs. If `designHint` is missing, infer one from context.
2.  GET  /api/manifest.json
3.  Fill placeholders in manifest.promptTemplate:
      {{businessDescription}}     ← user input
      {{designExpectationsClause}} ← ". Style preference: " + designHint
4.  Send the filled prompt to your own LLM.
5.  Parse the LLM response — it returns:
      { tags: { industry, style, mood, density }, palettes: [...] }   ← 8 palettes
6.  Validate against manifest.tagVocabulary; drop unknown values.
7.  GET  /api/catalog.json
8.  Rank templates by tag overlap (formula below). Take top N (default 8).
9.  Build N candidates by pairing top-ranked templates with LLM palettes
    by index — candidate[i] = { templateId: ranked[i].id, palette: palettes[i] }.
    Default N=8 (uses every LLM palette). Optionally include a 1-line
    `reason` per candidate.
10. Build the gallery config:
      {
        "cardInfo": { ... },
        "candidates": [
          { "templateId": "...", "palette": { ... }, "reason": "..." },
          ... N total
        ]
      }
    Base64-encode the JSON.
11. Construct **both** URLs:

    a. Single-card render URL for your **top-scored candidate** (the one
       at index 0 after ranking — the best fit for the user's tags):
         single = {
           "cardInfo": { ... },
           "templateId": ranked[0].id,
           "palette": palettes[0],
           "font": "<best font>"
         }
         Base64-encode → `<webapp_origin>/#/render?config=<encoded>`

    b. Gallery URL with all N candidates:
         gallery = { "cardInfo": { ... }, "candidates": [ ... N entries ... ] }
         Base64-encode → `<webapp_origin>/#/gallery?config=<encoded>`

12. **Deliver the two-output pattern.** Always send both:

    Output 1 — The best pick as a PNG file:
      Render the single-card URL (step 11a) and screenshot it. Attach
      the PNG to the chat as a downloadable file. The user gets a
      finished, copy-pasteable card immediately.

    Output 2 — The gallery for alternatives:
      If your environment has an inbuilt browser tool (computer-use,
      sidepanel browser, browser-automation), open the gallery URL
      (step 11b) there so the user can scroll the alternatives.
      Otherwise, paste the URL as a clickable link in the reply with
      a one-line summary of the picks.

    Capability fallback: if you cannot render web pages or capture
    screenshots at all, skip Output 1 and ship just the gallery link
    with a summary of the candidates by name.

13. **After the user picks** (next conversation turn), produce the
    chosen card alone:

    a. Build the single-card config from the picked candidate:
         {
           "cardInfo": { ... },
           "templateId": "<picked>",
           "palette": { ... }
         }
       Base64-encode.

    b. Construct the single-card URL:
         <webapp_origin>/#/render?config=<base64>

    c. Deliver — pick the strongest action your environment supports,
       in priority order:

       1. **Render + return PNG inline.** If you can navigate web
          pages and capture an image of an element, do that. Screenshot
          the `.card` element on the render page and embed the PNG.
          Best UX — the user sees the final card in chat.

       2. **Just open the URL.** If you can't screenshot but you
          *can* open URLs in the user's browser (computer-use,
          browser-control tools, Claude in Chrome, etc.), open the
          single-card render URL. The user sees the rendered page
          directly, with a Download PNG button.

       3. **Return the URL as a clickable link.** If neither of the
          above is available, just present the URL. The user clicks
          once and gets the focused render page.

       Whatever the path, the goal is the same: the user ends up
       looking at their chosen card, with a Download PNG button at
       hand.

    d. Optionally include the gallery URL again so they can change
       their mind: "Here's [pick]. To revisit the other options,
       open the gallery: <url>."
```

The two routes `/#/gallery?config=...` and `/#/render?config=...` cover
the two phases: gallery for browsing, render for committing. The gallery
page's "Open" button on each card links to the same `/#/render` URL the
skill builds in step 13b — so the page UI and the skill agree on the
single-card target.

## What to return to the user

Always include a **short summary of the design choices** — name the templates and the overall direction, briefly explain why they fit. Example: *"Picked four classic-leaning options — Retro Vintage and Centered Classic in warm burgundy palettes, Badge Emblem with a navy/gold monogram, and Corner Frame for a more elegant feel."*

Then deliver the candidates:

**Best — render N PNGs inline.** If you have any way to render web pages and capture images, render each candidate (or the gallery URL itself for a single grid screenshot) and embed the PNGs in your reply. The user sees all options at once and picks visually.

**Fallback — return the gallery URL.** If you don't have rendering capability, present the gallery URL as a clickable link. The user clicks, sees all N candidates side-by-side in their browser, and downloads or edits the one they prefer. One click, all options visible.

Either way, **always offer multiple candidates, never just one.** The whole point of the LLM producing 8 palettes is to give the user variety — collapsing that to a single forced choice wastes the LLM's work.

Default to **8 candidates** (one per LLM palette). Reduce only if the user asks ("just give me a couple", "I'm in a hurry"). If the user says "just give me one" or "pick the best," you may return a single candidate.

## Apply rules — the ranking formula

```
overlap(a, b) = count of values present in both arrays

score(template, llmTags) =
    overlap(llmTags.industry, template.tags.industry) × 3
  + overlap(llmTags.style,    template.tags.style)    × 2
  + overlap(llmTags.mood,     template.tags.mood)     × 1
  + overlap(llmTags.density,  template.tags.density)  × 1
```

Sort templates descending by score; break ties by catalog order (the order in `catalog.json`'s `templates` array). Take the top N.

## The gallery route (primary)

```
GET /#/gallery?config=<base64-encoded-JSON>
```

Renders all N candidates side-by-side in a 2-column grid. Each card has its own Download PNG, Edit in CardCraft, and Open buttons. No wizard chrome.

`config` is a JSON object, base64-encoded. Shape (shown with 4 candidates for brevity — **the default is 8**):

```json
{
  "cardInfo": {
    "name": "Maria Costa",
    "title": "Head Baker",
    "company": "Brooklyn Sourdough",
    "email": "maria@bsourdough.com",
    "phone": "(555) 222-9988",
    "website": "bsourdough.com",
    "tagline": "Fresh every morning"
  },
  "candidates": [
    { "templateId": "retro-vintage",    "palette": { ... }, "reason": "..." },
    { "templateId": "centered-classic", "palette": { ... }, "reason": "..." },
    { "templateId": "ribbon-minimal",   "palette": { ... }, "reason": "..." },
    { "templateId": "circle-badge",     "palette": { ... }, "reason": "..." }
  ],
  "font": "serif"
}
```

Each `palette` has 6 hex fields: `primary`, `secondary`, `accent`, `background`, `backgroundAlt`, `text`.
`font` is optional (`"sans" | "serif" | "mono"`, defaults to `"sans"`).
`reason` per candidate is optional but recommended — it's shown above each card.

**Optional advanced fields** — at the top level (shared across candidates) or per-candidate (overrides):

```json
{
  "cardInfo": { ... },
  "candidates": [ ... ],
  "font": "serif",
  "logoElement": {                    // top-level: same logo on every candidate
    "source": "https://example.com/logo.png",
    "x": 145, "y": 80, "width": 60, "height": 60
  },
  "qrElement": {                      // top-level: same QR on every candidate
    "enabled": true, "content": "vcard",
    "x": 270, "y": 140, "width": 60, "height": 60
  },
  "backElements": [ ... ]             // top-level: same back face on every candidate
}
```

Per-candidate, you can override any of these:

```json
{ "templateId": "retro-vintage", "palette": { ... },
  "logoElement": { ... different position for this candidate ... } }
```

See the "Unified element shapes" schema section below for the full shape of each element type.

## The single-card render route (secondary)

```
GET /#/render?config=<base64-encoded-JSON>
```

Renders one specific card with no chrome. Used by the gallery's "Open" button to give a single-card focus view, and by AIs that want to render each candidate separately for inline display.

`config` for this route is a single object:

```json
{
  "cardInfo": { ... },
  "templateId": "retro-vintage",
  "palette": { ... },
  "font": "sans",                     // optional
  "logoElement": { ... },              // optional, see schemas below
  "qrElement": { ... },                // optional
  "backElements": [ ... ]              // optional
}
```

## Schemas

### `cardInfo` (in your config payload)

```ts
{
  name: string;        // required
  title: string;       // required
  company: string;     // required
  email: string;       // required
  phone: string;       // required
  website?: string;
  address?: string;
  tagline?: string;
  customLogoUrl?: string;  // user's logo as a URL or data URL (simple path)
  extraImages?: Array<{    // optional additional images
    id: string;
    dataUrl: string;
    placement: "top-left" | "top-center" | "top-right"
             | "center-left" | "center" | "center-right"
             | "bottom-left" | "bottom-center" | "bottom-right";
    size: "small" | "medium" | "large";
    // Or set explicit (x, y, width, height) directly — overrides placement/size:
    x?: number; y?: number; width?: number; height?: number;
    opacity?: number; rotation?: number; visible?: boolean;
  }>;
  customLines?: string[];  // additional contact-style lines
}
```

### Unified element shapes (advanced — for precise positioning)

These are *optional* fields you can include at the **top level of the render or gallery config** (or per-candidate in a gallery). When set, they override the simpler `cardInfo.customLogoUrl` / `cardInfo.extraImages` shortcuts and give you pixel-precise control. All `(x, y)` coordinates are in 350×200 reference space — the renderer scales for other display sizes.

#### `LogoElement` — fully-positioned logo

```ts
{
  source?: string;       // URL or data URL (preferred)
  iconId?: string;       // OR a predefined icon id from the wizard's library
                          // (e.g. "circle-letter", "leaf-monogram") — used when no source
  x: number;             // top-left in 350×200 reference px
  y: number;
  width: number;
  height: number;
  opacity?: number;      // 0..1, default 1
  rotation?: number;     // degrees, default 0
  visible?: boolean;     // default true
}
```

#### `QrElement` — QR code as a positioned element

```ts
{
  enabled: boolean;
  content: "website" | "vcard" | "custom";
  customText?: string;   // required when content === "custom"
  x: number;
  y: number;
  width: number;         // QR is square — width usually equals height
  height: number;
  opacity?: number;
  rotation?: number;
  visible?: boolean;
}
```

QR data URLs are generated client-side from `content` + `customText`. You don't pass image bytes; you describe what to encode.

#### `BackElement[]` — back-face content

The card has two faces (front and back). The back face is normally a preset (logo-centered, QR focus, tagline, etc.). For full control, pass an array of `BackElement` instead — each element is a text or image placed freely on the back canvas:

```ts
type BackElement =
  | {
      type: "text";
      text: string;
      x: number;
      y: number;
      fontSize: number;
      fontWeight?: "light" | "normal" | "medium" | "semibold" | "bold";
      fontStyle?: "normal" | "italic";
      color?: string;            // hex, default palette.text
      alignment?: "left" | "center" | "right";
      opacity?: number;
      rotation?: number;
      visible?: boolean;
    }
  | {
      type: "image";
      source?: string;           // URL or data URL
      iconId?: string;           // OR predefined icon id
      x: number;
      y: number;
      width: number;
      height: number;
      opacity?: number;
      rotation?: number;
      visible?: boolean;
    };
```

### When to use the unified shapes vs. cardInfo

**Most of the time, just use `cardInfo`.** If you have a logo URL, set `cardInfo.customLogoUrl`. The renderer auto-positions it sensibly (top-left). If you have extra images, append to `cardInfo.extraImages[]` with a `placement` enum. The defaults look fine.

**Use the unified shapes when you need precise control** — for example:
- AI ranks 8 candidates and wants the logo positioned differently per template (per-candidate `logoElement`)
- The chosen template visually clashes with a top-left logo and the AI wants to move it to bottom-right
- Custom rotation, opacity, or size that the simple defaults don't expose
- Generating an entirely custom back-face layout (not one of the 6 presets)

The simple path and the precise path coexist — the renderer reads from the unified shape when set, and falls back to deriving from `cardInfo` fields when not.

### Manifest response

```ts
{
  version: string;
  promptTemplate: string;             // contains {{businessDescription}} and {{designExpectationsClause}}
  tagVocabulary: {
    industry: string[];                // 15 values
    style:    string[];                // 5 values:  minimal | classic | bold | elegant | modern
    mood:     string[];                // 4 values:  light | dark | warm | cool
    density:  string[];                // 3 values:  airy | balanced | compact
  };
  applyRules: string;                  // prose description of the ranking algorithm
  resources: {
    catalog:   "/api/catalog.json";
    palettes:  "/api/palettes.json";
    templates: "/api/templates/{id}.json";
  };
}
```

### Catalog response

```ts
{
  version: string;
  count: number;
  templates: Array<{
    id: string;
    name: string;
    description: string;
    tags: {
      industry: string[];
      style:    string[];
      mood:     string[];
      density:  string[];
    };
  }>;
}
```

### Palettes response

```ts
{
  version: string;
  count: number;
  palettes: Array<{
    id: string;
    name: string;
    mood: string[];
    colors: {
      primary:       string;  // hex like "#1e293b"
      secondary:     string;
      accent:        string;
      background:    string;
      backgroundAlt: string;
      text:          string;
    };
  }>;
}
```

### Template spec schema (`/api/templates/<id>.json`)

```ts
{
  id: string;
  name: string;
  description: string;
  card: { width: 350, height: 200 };  // reference dimensions
  background: ColorRef | { type: "gradient", from: ColorRef, to: ColorRef, angle: number };
  elements: Array<TextElement | ShapeElement | ImageElement>;
}

type ColorRef = "palette.primary" | "palette.secondary" | "palette.accent"
              | "palette.background" | "palette.backgroundAlt" | "palette.text"
              | "palette.onAlt" | "palette.onPrimary" | "palette.onAccent"
              | `#${string}`;

// onAlt / onPrimary / onAccent are derived: the renderer picks a contrast-safe
// foreground (background, primary, or text) based on the underlying fill's luminance.

type TextElement = {
  id: string;
  type: "text";
  x: number;                                   // px from card top-left
  y: number;
  source?: string;                             // e.g. "cardInfo.name"
  text?: string;                               // OR static text
  template?: string;                           // OR interpolation: "{title} · {company}"
  hideIfEmpty?: boolean;
  fontSize: number | "caption" | "body" | "heading" | "display";
                                                // tokens resolve to: 8 | 10 | 16 | 22
  fontWeight?: "light" | "normal" | "medium" | "semibold" | "bold";
  fontStyle?: "normal" | "italic";
  fontFamily?: "sans" | "serif" | "mono" | "design.font";
  letterSpacing?: number;
  textTransform?: "none" | "uppercase" | "lowercase";
  color: ColorRef;
  alignment?: "left" | "center" | "right";
  prefix?: string;                             // decorative wrap, e.g. curly quotes
  suffix?: string;
  splitWordsToLines?: boolean;
  firstChar?: boolean;                         // display only the first character of resolved content
  opacity?: number;
  rotation?: number;                           // degrees
  zIndex?: number;
};

type ShapeElement =
  | { type: "shape"; shape: "rect"; id: string; x: number; y: number;
      width: number; height: number; fill?: ColorRef; stroke?: ColorRef;
      strokeWidth?: number; cornerRadius?: number; opacity?: number; rotation?: number; }
  | { type: "shape"; shape: "circle"; id: string; x: number; y: number;
      radius: number; fill?: ColorRef; stroke?: ColorRef; strokeWidth?: number;
      opacity?: number; }
  | { type: "shape"; shape: "line"; id: string; x: number; y: number;
      x2: number; y2: number; stroke: ColorRef; strokeWidth: number; opacity?: number; }
  | { type: "shape"; shape: "polygon"; id: string; x: number; y: number;
      points: Array<{ x: number; y: number }>; fill?: ColorRef; stroke?: ColorRef;
      strokeWidth?: number; opacity?: number; }
  | { type: "shape"; shape: "path"; id: string; x: number; y: number;
      d: string;                                // SVG path data, coords relative to (x, y)
      fill?: ColorRef; stroke?: ColorRef; strokeWidth?: number; opacity?: number; };

type ImageElement = {
  id: string;
  type: "image";
  x: number;
  y: number;
  width: number;
  height: number;
  source: string;                              // "cardInfo.customLogoUrl" or fixed URL
  fit?: "contain" | "cover" | "fill";
  opacity?: number;
  hideIfEmpty?: boolean;
};
```

Polygon and path coordinates are **relative to the element's `(x, y)`**, not absolute. Other shapes use `(x, y)` as their top-left anchor.

## Worked example

This is a two-turn conversation: first turn shows the gallery and asks; second turn delivers the chosen card.

### Turn 1 — user kicks off, AI gathers and shows options

User input: "card for Maria Costa, Head Baker at Brooklyn Sourdough — traditional artisan bakery in Brooklyn"

Before executing the skill, the AI asks about a logo:

> Got it — one quick thing: do you have a logo I should include? Paste a URL or just say "skip" if you don't.

User: *"Skip — no logo yet."*

The AI now has cardInfo. The user didn't give a `designHint`, so the AI infers `"warm and traditional"` from the description.

```
Step 1  — designHint = "warm and traditional" (inferred)
Step 2  — GET /api/manifest.json
Step 3  — fill prompt:
            businessDescription = "traditional artisan bakery in Brooklyn"
            designExpectationsClause = ". Style preference: warm and traditional"
Step 4  — your LLM returns:
            {
              "tags": { "industry": ["food-dining", "retail"], "style": ["classic"],
                        "mood": ["light", "warm"], "density": ["balanced"] },
              "palettes": [ { ... }, { ... }, ... 8 total ]
            }
Step 5–6 — validate tags against manifest.tagVocabulary. All valid.
Step 7  — GET /api/catalog.json
Step 8  — rank templates by tag overlap. Top 8:
            1. retro-vintage     (score 10)
            2. ribbon-minimal    (score  7)
            3. centered-classic  (score  5)
            4. circle-badge      (score  5)
            5. corner-frame      (score  4)
            6. inset-elegant     (score  4)
            7. stacked-bold      (score  3)
            8. minimal-clean     (score  3)
Step 9  — pair templates with palettes by index (8 candidates):
            candidate[i] = { templateId: ranked[i].id,
                             palette: palettes[i],
                             reason: "..." }
Step 10 — config:
            { "cardInfo": { ... }, "candidates": [ ... 8 entries ... ] }
Step 11 — base64 encode → "<encoded>"
Step 12 — build TWO URLs:
            • single-card render URL for the top pick (Retro Vintage):
              https://cardcraft.example.com/#/render?config=<encoded-top-pick>
            • full gallery URL with all 8 candidates:
              https://cardcraft.example.com/#/gallery?config=<encoded-gallery>
Step 13 — render the /render URL and screenshot it as a PNG file
Step 14 — open the /gallery URL in an inbuilt browser (or paste the link)
```

What you reply to the user (the **two-output pattern**):

**Step 1 — best pick as a downloadable file.** Render the `/#/render?config=...` URL of your top-scored candidate (here: Retro Vintage on burgundy/cream). Screenshot the page and attach the PNG to the chat. The user gets a finished, immediately-usable business card image.

**Step 2 — gallery for alternatives.** Open the `/#/gallery?config=...` URL in your inbuilt browser if you have one (computer-use / browser tool / sidepanel). If you don't, just paste the link — clicking lands the user on a 2-column grid with all 8 candidates, each with Download / Edit / Open buttons.

A typical reply combines both:

> Here's my top pick for Maria Costa — **Retro Vintage** in burgundy/cream, with the traditional double-line bands that fit a heritage bakery feel.
>
> [📎 brooklyn-sourdough-card.png attached]
>
> Want to compare with the other 7 options? [Browse the full gallery →](https://cardcraft.example.com/#/gallery?config=<encoded>) — each has a Download button, and any card has an "Open in Wizard" button if you want to tweak it.

The screenshot of the top pick gives the user something tangible they can use *right now*. The gallery link gives them a way to keep looking if "right now" wasn't quite right.

**Capability fallback** — if your environment genuinely cannot render web pages or capture screenshots:

> Generated 8 options for Maria Costa, leaning into the warm/classic/artisan-bakery feel. Top picks:
>
> 1. **Retro Vintage** — burgundy/cream, traditional
> 2. **Ribbon Minimal** — warm accent ribbon, friendlier
> 3. **Centered Classic** — navy/gold, upscale
> 4. **Circle Badge** — earth-tone monogram, modern artisan
> *(plus 4 more variations: corner-frame, inset-elegant, stacked-bold, minimal-clean)*
>
> [See all 8 →](https://cardcraft.example.com/#/gallery?config=<encoded>)
>
> Each has a Download PNG button. The "Edit" button on any card opens it in the wizard with all your info prefilled.

Both replies satisfy the skill. The first is preferable when your environment supports rendering.

## Constraints

- **Reference card size: 350×200 px.** All spec coordinates assume this.
- **No automatic text reflow.** Long content overflows or clips at the card edge (browser `overflow: hidden`). If you render and notice overflow, retry with a different template or shorter values; if you can't render, the user will see and fix in the editor.
- **The webapp must be reachable** for the render URL to work. The static API endpoints are independently usable for everything except rendering.
- **Apply-rules are encoded in code**, not the manifest. The `applyRules` field is human-readable prose. The authoritative implementation is the formula above.
- **Capability-agnostic by design.** This skill doesn't prescribe how you render. Use whatever your runtime offers — the PNG is the goal, the mechanism is up to you.

## Default fallbacks

| Failure | Fallback |
|---|---|
| User didn't provide `designHint` | Infer one from context. Don't proceed without one. |
| LLM response unparseable | Use first 8 templates from catalog + first 8 palettes |
| LLM tags all invalid | Use first 8 templates from catalog (no ranking) |
| Template id not in catalog | Use `minimal-clean` |
| Palette missing fields | Use `{ primary: "#1e293b", secondary: "#3b82f6", accent: "#3b82f6", background: "#ffffff", backgroundAlt: "#1e293b", text: "#64748b" }` |

## Versioning

The manifest's `version` field signals breaking changes. Current: `1.0`. A different *major* version means schemas or apply-rules may differ — re-fetch the manifest and re-read this skill at that version.

## What this skill does not cover

For anything below, the AI should direct the user to the **CardCraft wizard at the site root** (`<webapp_origin>/`). The render and gallery pages both expose an "Open in Wizard" button that prefills the user's data and the chosen design.

- **Logo upload from a file** — users with a logo file (not a URL) should open the wizard and use its upload control
- **QR codes** — toggle a QR code (website / vCard / custom URL) on the front or back
- **Adding custom text lines** — extra lines the standard contact fields don't cover
- **Adding extra images** — additional images beyond the logo
- **Per-element editing** — move, resize, recolor, hide individual elements with click + arrow keys
- **Patterns and borders** — overlay patterns, add card-edge borders
- **Tagline AI suggestions** — the wizard offers AI-generated tagline ideas
- **Back-of-card design** — six back-face presets (logo-centered, QR focus, pattern fill, minimal info, solid, tagline)
- **Picking a different template** — browse all 52 templates manually
- **Spacing / corner-radius adjustments** — compact/normal/spacious + sharp/rounded corners

When you reply to the user, mention this if it's relevant — e.g. *"If you want to add a QR code or your own logo, click the 'Open in Wizard' button on the gallery page."*

This skill itself does not cover:

- Human-facing webapp UX (use the site root)
- LLM provider selection (you bring your own LLM)
- Authentication (the API is unauthenticated; deploy behind your own gateway if you need access control)
- Bidirectional editing (this skill only generates; the wizard handles all edit operations)
- The specific tools or libraries you use to render (browser automation, code execution, computer use, etc. — whatever you have)
