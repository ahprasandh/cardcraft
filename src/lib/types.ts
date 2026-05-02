export interface CardInfo {
  name: string;
  title: string;
  company: string;
  email: string;
  phone: string;
  website: string;
  address: string;
  businessDescription: string;
  designExpectations: string;
  tagline: string;
  customLogoUrl: string;
  /** Extra images uploaded by user (data URLs). */
  extraImages?: ExtraImage[];
  /** User-defined extra text lines shown on card. */
  customLines?: string[];
}

export interface ExtraImage {
  id: string;
  dataUrl: string;
  placement: LogoPlacement;
  size: "small" | "medium" | "large";
  // Unified positioning fields (Task #12). When set, override the legacy
  // placement/size enum mapping. The renderer prefers these.
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  opacity?: number;
  rotation?: number;
  visible?: boolean;
}

// ---- Template-based Design System ----

export type TemplateId =
  // Carryover (26)
  | "minimal-clean"
  | "split-sidebar"
  | "centered-classic"
  | "modern-left"
  | "elegant-serif"
  | "stacked-bold"
  | "japanese-minimal"
  | "top-accent"
  | "right-sidebar"
  | "vertical-split"
  | "two-tone-split"
  | "magazine-editorial"
  | "offset-minimal"
  | "asymmetric-blocks"
  | "corner-frame"
  | "retro-vintage"
  | "three-column"
  | "edge-info"
  | "dark-gradient"
  | "diagonal-accent"
  | "diagonal-split"
  | "mono-tech"
  | "vertical-text"
  | "brutalist"
  | "floating-name"
  | "wave-divide"
  // New (26)
  | "editorial-type"
  | "bold-accent"
  | "swiss-grid"
  | "glyph-mark"
  | "brutalist-grid"
  | "soft-surface"
  | "diagonal-modern"
  | "ribbon-minimal"
  | "zen-asymmetric"
  | "mono-terminal"
  | "wide-band"
  | "two-column-clean"
  | "oversized-initial"
  | "top-heavy"
  | "l-frame"
  | "inset-elegant"
  | "horizontal-stack"
  | "circle-badge"
  | "right-accent-bar"
  | "stacked-display"
  | "orbit"
  | "twin-circles"
  | "corner-block"
  | "half-moon"
  | "stacked-bars"
  | "diamond-accent";

export interface ColorTheme {
  primary: string;     // name, logo text
  secondary: string;   // title, supporting text
  accent: string;      // accent bars, dividers, highlights
  background: string;  // main background
  backgroundAlt: string; // secondary bg (for splits, sidebars)
  text: string;        // contact details, body text
}

// ---- New LLM-controlled design properties ----

export type PatternPlacement =
  | "full" | "top" | "bottom" | "left" | "right"
  | "top-left" | "top-right" | "bottom-left" | "bottom-right"
  | "diagonal-tl" | "diagonal-br";

export interface PatternSpec {
  id: string;                    // PatternId or "none"
  opacity: number;               // 0.0–1.0
  color: string;                 // hex
  placement: PatternPlacement;
}

export interface BackgroundEffectSpec {
  type: "none" | "solid" | "gradient";
  color: string;                 // hex
  opacity: number;               // 0.0–1.0
  angle: number;                 // degrees (for gradient)
}

export type LogoPlacement =
  | "top-left" | "top-right" | "top-center"
  | "center-left" | "center" | "center-right"
  | "bottom-left" | "bottom-right" | "bottom-center";

export interface LogoSpec {
  /** LogoId from the webapp's icon library, or "none" to suppress. */
  id: import("./logos").LogoId;
  placement: LogoPlacement;
  size: "small" | "medium" | "large";
}

/**
 * Unified image-element shape for the logo.
 *
 * This is the canonical shape the renderer uses. Following the user's
 * "everything is a text or image element" model, the logo is just an image
 * element with free `(x, y)`, width, height, opacity, and either a `source`
 * URL (user-uploaded logo) or an `iconId` (predefined icon from the wizard's
 * icon library). When neither is set, the logo is omitted.
 *
 * For backward compatibility, this is currently *derived* by `normalizeLogo()`
 * from the legacy `LogoSpec` + `cardInfo.customLogoUrl`. The wizard UI still
 * writes to the legacy fields. Task #14 (unify RefinementStep) will migrate
 * the wizard to write directly to this shape.
 */
export interface LogoElement {
  /** Image source — URL or data URL. Takes precedence over `iconId`. */
  source?: string;
  /** Predefined icon id (from `src/lib/logos.tsx`). Used when no `source`. */
  iconId?: import("./logos").LogoId;
  /** Top-left corner in card coordinates (350×200 reference). */
  x: number;
  y: number;
  /** Display dimensions in px (medium card reference). */
  width: number;
  height: number;
  opacity?: number;
  rotation?: number;
  /** Default true. Set false to hide without removing. */
  visible?: boolean;
}

export interface BorderSpec {
  sides: "none" | "all" | "top" | "bottom" | "left" | "right";
  width: number;                 // px
  color: string;                 // hex
}

export interface QrSpec {
  enabled: boolean;
  content: "website" | "vcard" | "custom";
  customText?: string;
  placement: LogoPlacement;
  size: "small" | "medium";
}

/**
 * Unified QR-code image-element shape (Task #11).
 *
 * Same positioning/sizing semantics as `LogoElement`. The QR data URL is
 * generated client-side from `content` + `customText`, so this carries the
 * source-of-truth fields for what to encode plus the (x, y, w, h) for where
 * the QR sits on the card.
 */
export interface QrElement {
  enabled: boolean;
  content: "website" | "vcard" | "custom";
  customText?: string;
  /** Top-left in 350×200 reference coords. */
  x: number;
  y: number;
  /** Display dimensions in px (square; height usually equals width). */
  width: number;
  height: number;
  opacity?: number;
  rotation?: number;
  visible?: boolean;
}

/**
 * Unified generic image element (Task #12 — extra images).
 *
 * Same `(x, y, width, height)` shape as the logo and QR variants, just with
 * a plain image source and no QR/icon-specific bits. Used for any user-
 * uploaded extra image that's not the logo.
 */
export interface ImageElement {
  /** URL or data URL. */
  source: string;
  x: number;
  y: number;
  width: number;
  height: number;
  opacity?: number;
  rotation?: number;
  visible?: boolean;
}

/**
 * Unified text element for the back face (Task #13).
 *
 * Lighter than the front-face text elements because the back face is meant
 * for short, statement-y content (tagline, slogan, contact line). All
 * positioning/sizing fields match the image elements above.
 */
export interface BackTextElement {
  type: "text";
  text: string;
  x: number;
  y: number;
  fontSize: number;
  fontWeight?: "light" | "normal" | "medium" | "semibold" | "bold";
  fontStyle?: "normal" | "italic";
  color?: string;
  alignment?: "left" | "center" | "right";
  opacity?: number;
  rotation?: number;
  visible?: boolean;
  /** Per-element font: built-ins ("sans"|"serif"|"mono") OR a CSS family
   *  name registered via design.customFonts. Falls back to design.font. */
  fontFamily?: string;
  /** Per-element capitalization, applied via CSS text-transform. */
  textTransform?: "none" | "uppercase" | "lowercase" | "capitalize";
  /** Allow text to wrap onto multiple lines (default: single-line). */
  wrap?: boolean;
}

/** Back-face image element — same shape as the front. */
export interface BackImageElement {
  type: "image";
  source?: string;
  /** Optional iconId for predefined icons (mirrors LogoElement). */
  iconId?: import("./logos").LogoId;
  x: number;
  y: number;
  width: number;
  height: number;
  opacity?: number;
  rotation?: number;
  visible?: boolean;
}

/** Discriminated union of back-face element kinds. */
export type BackElement = BackTextElement | BackImageElement;

export type BackFacePreset = "logo-centered" | "qr-focus" | "pattern-fill" | "minimal-info" | "solid" | "tagline";

export interface BackFaceSpec {
  preset: BackFacePreset;
  background: string;        // hex (defaults to colors.backgroundAlt)
  showLogo: boolean;
  showQr: boolean;
  showCompany: boolean;
  showTagline: boolean;
  showWebsite: boolean;
  patternId: string;         // "inherit" | "none" | specific pattern id
}

export interface CardDesign {
  id: string;
  templateId: TemplateId;
  name: string;
  reasoning: string;

  colors: ColorTheme;
  font: "sans" | "serif" | "mono";
  textAlign: "left" | "center" | "right";
  spacing: "compact" | "normal" | "spacious";
  borderRadius: "none" | "small" | "medium" | "large";

  pattern: PatternSpec;
  backgroundEffect: BackgroundEffectSpec;
  logo: LogoSpec;
  /** Unified logo image-element. Derived from `logo` + `cardInfo.customLogoUrl`
   *  by `normalizeLogo()` if not explicitly set. The renderer reads from this
   *  field as the canonical source. (Task #10.) */
  logoElement?: LogoElement | null;
  border: BorderSpec;
  qr?: QrSpec;
  /** Unified QR image-element. Derived from `qr` by `normalizeQr()` if not
   *  explicitly set. The renderer reads from this field as the canonical
   *  source. (Task #11.) */
  qrElement?: QrElement | null;
  backFace?: BackFaceSpec;
  /** Unified back-face element list. When set, the back-face renderer reads
   *  from this array instead of the legacy preset. (Task #13.) */
  backElements?: BackElement[];

  /** Per-element font-size overrides in px. When set, these override the
   *  default sizes derived from the card display-size (small / medium / large). */
  fontSizes?: {
    name?: number;    // heading (person's name)
    title?: number;   // subheading (job title, company at title level)
    detail?: number;  // body (contacts, tagline, company at detail level)
  };

  /** Per-element style & position overrides (set via Edit Mode). */
  elementOverrides?: Record<string, ElementStyle>;

  /** Element IDs to hide from the card. */
  hiddenFields?: string[];

  /** User-uploaded font files (woff2/ttf/otf), embedded as base64 data URLs.
   *  Each entry registers a unique CSS family name; per-element fontFamily
   *  overrides (and the card-wide font, if extended later) can reference it
   *  by `family`. The font travels with the design via the share-link payload
   *  so the recipient renders identically. */
  customFonts?: CustomFont[];

  // Deprecated — kept for migration, prefer pattern.id / logo.id
  patternId?: string;
  logoId?: string;
}

/** A font the user uploaded into the design. */
export interface CustomFont {
  /** CSS font-family name, e.g. "MyBrandSans". Must be unique within the design. */
  family: string;
  /** Base64 `data:` URL containing the font binary (woff2/woff/ttf/otf). */
  dataUrl: string;
  /** MIME type — used for the @font-face `format()` hint. */
  mime?: "font/woff2" | "font/woff" | "font/ttf" | "font/otf" | string;
}

/** Overrides for a single card element (name, title, company, tagline, contacts). */
export interface ElementStyle {
  offsetX?: number;   // px horizontal offset from default position
  offsetY?: number;   // px vertical offset from default position
  color?: string;     // hex — overrides theme color
  fontSize?: number;  // px — overrides template default
  opacity?: number;   // 0.0–1.0 — overrides default 1.0
  /** Per-element font: built-ins ("sans"|"serif"|"mono") OR a CSS family
   *  name registered via design.customFonts (e.g. "MyBrandSans"). */
  fontFamily?: string;
  /** Per-element capitalization. "none" disables any spec-level transform
      (e.g. a template that hard-codes uppercase) and renders the original
      casing of the value typed in CardInfo. "capitalize" = Title Case. */
  textTransform?: "none" | "uppercase" | "lowercase" | "capitalize";
  /** Allow text to wrap onto multiple lines instead of expanding on one
      line. Default (undefined / false) keeps the single-line behavior so
      element positions stay predictable; set true for long company names
      or addresses you'd rather break. */
  wrap?: boolean;
}

// Alias for backward compat
export type DesignSpec = CardDesign;

export interface Printer {
  id: string;
  name: string;
  address: string;
  distance: string;
  rating: number;
  reviewCount: number;
  phone: string;
  priceRange: string;
  turnaround: string;
  specialties: string[];
}

export interface OrderDetails {
  quantity: number;
  paperStock: string;
  finish: string;
  printerId: string;
  estimatedPrice: string;
  estimatedDelivery: string;
}

export type WizardStep =
  | "info"
  | "designs"
  | "refine"
  | "printers"
  | "order"
  | "confirmation";
