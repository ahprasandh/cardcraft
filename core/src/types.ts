/**
 * Card spec types — flat-positional model.
 *
 * A CardSpec is a flat list of positioned elements on a card-sized canvas.
 * Each element carries its own (x, y) and type-specific properties.
 * No containers, no flex-style layout. Templates are predefined element
 * arrangements; users and LLMs customize by directly editing element
 * properties (move = change x/y; resize = change fontSize; hide = visible=false;
 * recolor = change color; add = append to elements).
 *
 * The browser's `overflow-hidden` on the card edge clips runaway content;
 * elements that overlap each other are the user's/agent's responsibility
 * to fix in edit mode.
 *
 * Three element types cover the existing 52 templates:
 *   - text:  bound to a CardInfo field or static
 *   - image: user-supplied logo or any URL
 *   - shape: rect / circle / line / polygon (used for dividers, sidebars,
 *            decorative blocks, accent bars)
 *
 * Patterns are a card-level array (not elements), since they fill backgrounds
 * or regions rather than acting as discrete things.
 */

import type { TypeToken } from "./typography";

// ─────────────────────────────────────────────────────────────────────
// Reference types — pointers into runtime data
// ─────────────────────────────────────────────────────────────────────

/**
 * Reference into the palette. Resolved to hex at render time.
 *
 * Standard slots: `palette.primary | secondary | accent | background |
 * backgroundAlt | text`.
 *
 * Derived slots (`palette.onAlt`, `palette.onPrimary`) auto-pick a
 * contrast-safe foreground based on the underlying fill's luminance.
 * Useful for text that sits on a colored region.
 *
 * A literal `#rrggbb` is allowed for fixed colors (rare).
 */
export type ColorRef =
  | `palette.${
      | "primary"
      | "secondary"
      | "accent"
      | "background"
      | "backgroundAlt"
      | "text"
      | "onAlt"
      | "onPrimary"
      | "onAccent"
    }`
  | `#${string}`;

/** Reference into cardInfo — the user's actual content. */
export type DataRef = `cardInfo.${
  | "name"
  | "title"
  | "company"
  | "email"
  | "phone"
  | "website"
  | "address"
  | "tagline"
  | "customLogoUrl"
}`;

/** Font family. `"design.font"` defers to the user's design.font choice. */
export type FontFamily = "sans" | "serif" | "mono" | "design.font";

// ─────────────────────────────────────────────────────────────────────
// Top-level card spec
// ─────────────────────────────────────────────────────────────────────

export interface CardSpec {
  id: string;
  name: string;
  description: string;
  card: { width: number; height: number };
  /** Card background. Solid color (palette ref or hex) or gradient. */
  background: ColorRef | GradientBackground;
  /** Optional pattern overlays drawn on top of the background, beneath elements. */
  patterns?: PatternOverlay[];
  /** Flat list of positioned elements, drawn in array order (later = on top). */
  elements: CardElement[];
}

export interface GradientBackground {
  type: "gradient";
  from: ColorRef;
  to: ColorRef;
  /** Angle in degrees. 0 = top→bottom, 90 = left→right. */
  angle: number;
}

export interface PatternOverlay {
  /** Pattern id from PATTERNS catalog. */
  patternId: string;
  opacity: number;
  color: ColorRef;
  /** Where on the card the pattern fills. */
  placement: "full" | "top" | "bottom" | "left" | "right" | "top-left" | "top-right" | "bottom-left" | "bottom-right";
}

// ─────────────────────────────────────────────────────────────────────
// Elements
// ─────────────────────────────────────────────────────────────────────

export type CardElement = TextElement | ImageElement | ShapeElement;

interface ElementBase {
  /** Stable id used for editing. Conventional ids: `name`, `title`, `company`,
   *  `email`, `phone`, `website`, `address`, `tagline`, `logo`, `divider`,
   *  `divider-top`, `sidebar`, `accent-bar`, etc. */
  id: string;
  /** Top-left corner, in px from the card's top-left. */
  x: number;
  y: number;
  /** Hide the element from rendering. Default: true (visible). */
  visible?: boolean;
  /** Optional opacity 0–1. Default: 1. */
  opacity?: number;
  /** Optional rotation in degrees, around the element's top-left. */
  rotation?: number;
  /** Stacking order. Default: array index. Higher z = drawn on top. */
  zIndex?: number;
}

/** A line of text bound to a CardInfo field, or static text. */
export interface TextElement extends ElementBase {
  type: "text";
  /** Where the content comes from. Mutually exclusive with `text` and `template`. */
  source?: DataRef;
  /** Static text content. Mutually exclusive with `source` and `template`. */
  text?: string;
  /** Interpolation template combining multiple cardInfo fields, using
   *  `{name}`, `{title}`, `{company}`, `{email}`, `{phone}`, `{website}`,
   *  `{address}`, `{tagline}` as placeholders. Used for combined-field
   *  displays like "Software Engineer · Acme Corp". Overrides `source`. */
  template?: string;
  /** Drop the element entirely if the resolved content is empty. */
  hideIfEmpty?: boolean;
  /** Font size — token (`"caption"`/`"body"`/`"heading"`/`"display"`) or px. */
  fontSize: number | TypeToken;
  fontWeight?: "light" | "normal" | "medium" | "semibold" | "bold";
  fontStyle?: "normal" | "italic";
  fontFamily?: FontFamily;
  letterSpacing?: number;
  textTransform?: "none" | "uppercase" | "lowercase";
  color: ColorRef;
  alignment?: "left" | "center" | "right";
  /** Optional max width in px. If set, text may wrap (when `wrap: true`)
   *  or be clipped/ellipsized at this width. */
  width?: number;
  /** When true and `width` is set, allows text to wrap. */
  wrap?: boolean;
  /** Optional decorative prefix/suffix (e.g. curly quotes around tagline). */
  prefix?: string;
  suffix?: string;
  /** Splits whitespace-separated source on lines (for stacked names). */
  splitWordsToLines?: boolean;
  /** When true, displays only the first character of the resolved content.
   *  Used for monogram-style badge elements (circle-badge, glyph-mark). */
  firstChar?: boolean;
}

/** An image element — user-supplied logo or any URL. */
export interface ImageElement extends ElementBase {
  type: "image";
  /** A `cardInfo.*` ref or a fixed URL (data URL or remote). */
  source: DataRef | string;
  width: number;
  height: number;
  /** How the image scales within its bounding box. Default: `"contain"`. */
  fit?: "contain" | "cover" | "fill";
  /** Hide if source resolves to empty (e.g. user has no customLogoUrl). */
  hideIfEmpty?: boolean;
}

/** A geometric shape — used for dividers, sidebars, accent bars,
 *  decorative blocks, circle motifs, etc. */
export type ShapeElement =
  | RectShape
  | CircleShape
  | LineShape
  | PolygonShape
  | PathShape;

export interface RectShape extends ElementBase {
  type: "shape";
  shape: "rect";
  width: number;
  height: number;
  fill?: ColorRef;
  stroke?: ColorRef;
  strokeWidth?: number;
  /** Corner radius in px. Default: 0 (sharp corners). */
  cornerRadius?: number;
}

export interface CircleShape extends ElementBase {
  type: "shape";
  shape: "circle";
  /** Radius in px. The (x, y) is the top-left of the bounding box. */
  radius: number;
  fill?: ColorRef;
  stroke?: ColorRef;
  strokeWidth?: number;
}

export interface LineShape extends ElementBase {
  type: "shape";
  shape: "line";
  /** End point relative to the card (not relative to x/y). */
  x2: number;
  y2: number;
  stroke: ColorRef;
  strokeWidth: number;
}

export interface PolygonShape extends ElementBase {
  type: "shape";
  shape: "polygon";
  /** Points relative to (x, y). */
  points: { x: number; y: number }[];
  fill?: ColorRef;
  stroke?: ColorRef;
  strokeWidth?: number;
}

/** Arbitrary SVG path. Coordinates in `d` are relative to (x, y) via a translate. */
export interface PathShape extends ElementBase {
  type: "shape";
  shape: "path";
  /** SVG path data (the `d` attribute), with coordinates relative to (x, y). */
  d: string;
  fill?: ColorRef;
  stroke?: ColorRef;
  strokeWidth?: number;
}
