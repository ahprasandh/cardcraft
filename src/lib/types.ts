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
}

// ---- Template-based Design System ----

export type TemplateId =
  // Existing (18 kept)
  | "minimal-clean"
  | "bold-header"
  | "split-sidebar"
  | "centered-classic"
  | "modern-left"
  | "elegant-serif"
  | "dark-gradient"
  | "top-accent"
  | "corner-frame"
  | "stacked-bold"
  | "two-tone-split"
  | "mono-tech"
  | "offset-minimal"
  | "diagonal-accent"
  | "bottom-heavy"
  | "floating-name"
  | "compact-modern"
  | "asymmetric-blocks"
  // New (22)
  | "right-sidebar"
  | "bottom-bar"
  | "sandwich-bands"
  | "vertical-split"
  | "diagonal-split"
  | "circle-motif"
  | "badge-emblem"
  | "magazine-editorial"
  | "japanese-minimal"
  | "retro-vintage"
  | "brutalist"
  | "card-inset"
  | "vertical-text"
  | "three-column"
  | "stepped-blocks"
  | "neon-dark"
  | "full-bleed"
  | "ribbon-banner"
  | "edge-info"
  | "dot-grid"
  | "overlap-cards"
  | "wave-divide";

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
  id: string;                    // LogoId or "none"
  placement: LogoPlacement;
  size: "small" | "medium" | "large";
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
  border: BorderSpec;
  qr?: QrSpec;
  backFace?: BackFaceSpec;

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

  // Deprecated — kept for migration, prefer pattern.id / logo.id
  patternId?: string;
  logoId?: string;
}

/** Overrides for a single card element (name, title, company, tagline, contacts). */
export interface ElementStyle {
  offsetX?: number;   // px horizontal offset from default position
  offsetY?: number;   // px vertical offset from default position
  color?: string;     // hex — overrides theme color
  fontSize?: number;  // px — overrides template default
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
