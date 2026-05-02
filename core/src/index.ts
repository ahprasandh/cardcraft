/**
 * Public API for @cardcraft/core.
 *
 * Core publishes the spec format, the typography scale, the palette catalog,
 * the templates registry, and the manifest (LLM prompt + apply rules).
 * Consumers build their own renderer or use the experimental SVG preview
 * renderer included here.
 */

// ── Renderer (experimental SVG preview path) ─────────────────────────
export { renderSpec } from "./renderer";
export type {
  CardInfo,
  Palette,
  DesignModifiers,
  RenderOptions,
} from "./renderer";

// ── Spec types ───────────────────────────────────────────────────────
export type {
  CardSpec,
  CardElement,
  TextElement,
  ImageElement,
  ShapeElement,
  RectShape,
  CircleShape,
  LineShape,
  PolygonShape,
  PathShape,
  GradientBackground,
  PatternOverlay,
  ColorRef,
  DataRef,
  FontFamily,
} from "./types";

// ── Typography scale ─────────────────────────────────────────────────
export { TYPE_SCALE, resolveFontSize } from "./typography";
export type { TypeToken } from "./typography";

// ── Palettes ─────────────────────────────────────────────────────────
export { PALETTES, getPalette } from "./palettes";
export type { NamedPalette } from "./palettes";

// ── Templates registry ───────────────────────────────────────────────
export {
  TEMPLATES,
  getTemplateMetadata,
  scoreTemplate,
  rankTemplates,
} from "./templates-registry";
export type { TemplateMetadata } from "./templates-registry";

// ── Manifest (the agent contract) ────────────────────────────────────
export {
  MANIFEST,
  PROMPT_TEMPLATE,
  TAG_VOCABULARY,
  APPLY_RULES,
} from "./manifest";
export type {
  Manifest,
  IndustryTag,
  StyleTag,
  MoodTag,
  DensityTag,
  TagVocabulary,
  TagOutput,
} from "./manifest";
