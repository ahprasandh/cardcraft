/**
 * Preview SVG renderer (experimental).
 *
 * Walks a flat `CardSpec` and emits an SVG string. Useful for visual review
 * during spec authoring and for generating static thumbnails. Production
 * rendering is the webapp's React renderer (browser does layout, fonts,
 * overflow); this exists only as a preview tool.
 *
 * Pure function, no React, no DOM, no browser. Each element is placed at
 * its declared (x, y); no layout math.
 */

import type {
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
  ColorRef,
  DataRef,
  FontFamily,
  GradientBackground,
} from "./types";
import { resolveFontSize } from "./typography";

// ─────────────────────────────────────────────────────────────────────
// Public types — runtime data the renderer consumes
// ─────────────────────────────────────────────────────────────────────

export interface CardInfo {
  name: string;
  title: string;
  company: string;
  email: string;
  phone: string;
  website: string;
  address: string;
  tagline: string;
  customLogoUrl?: string;
  customLines?: string[];
}

export interface Palette {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  backgroundAlt: string;
  text: string;
}

export interface DesignModifiers {
  font?: "sans" | "serif" | "mono";
  fontSizes?: { name?: number; title?: number; detail?: number };
  borderRadius?: "none" | "small" | "medium" | "large";
  /** Per-element overrides. Each element's id maps to a partial element
   *  property bag. Used by edit mode to nudge x/y, color, fontSize. */
  elementOverrides?: Record<
    string,
    {
      offsetX?: number;
      offsetY?: number;
      color?: string;
      fontSize?: number;
    }
  >;
  hiddenFields?: string[];
}

export interface RenderOptions {
  size?: { width: number; height: number };
}

// ─────────────────────────────────────────────────────────────────────
// Color helpers (luminance + WCAG contrast)
// ─────────────────────────────────────────────────────────────────────

function normalizeHex(hex: string): string {
  let h = hex.replace("#", "");
  if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
  if (h.length !== 6) return "000000";
  return h;
}

function luminance(hex: string): number {
  const h = normalizeHex(hex);
  const r = parseInt(h.substring(0, 2), 16) / 255;
  const g = parseInt(h.substring(2, 4), 16) / 255;
  const b = parseInt(h.substring(4, 6), 16) / 255;
  const toLinear = (v: number) =>
    v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
}

function contrastRatio(fg: string, bg: string): number {
  const l1 = luminance(fg);
  const l2 = luminance(bg);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

function pickReadable(bg: string, candidates: string[]): string {
  for (const c of candidates) if (contrastRatio(c, bg) >= 4.5) return c;
  return luminance(bg) > 0.4 ? "#111827" : "#f9fafb";
}

// ─────────────────────────────────────────────────────────────────────
// Reference resolution
// ─────────────────────────────────────────────────────────────────────

function resolveColor(ref: ColorRef, palette: Palette): string {
  if (ref.startsWith("#")) return ref;
  const slot = ref.slice("palette.".length);
  switch (slot) {
    case "primary": return palette.primary;
    case "secondary": return palette.secondary;
    case "accent": return palette.accent;
    case "background": return palette.background;
    case "backgroundAlt": return palette.backgroundAlt;
    case "text": return palette.text;
    case "onAlt":
      return pickReadable(palette.backgroundAlt, [
        palette.background, palette.primary, palette.text,
      ]);
    case "onPrimary":
      return pickReadable(palette.primary, [
        palette.background, palette.backgroundAlt, palette.text,
      ]);
    case "onAccent":
      return pickReadable(palette.accent, [
        palette.background, palette.primary, palette.text,
      ]);
    default: return palette.text;
  }
}

function resolveData(ref: DataRef, info: CardInfo): string {
  const field = ref.slice("cardInfo.".length) as keyof CardInfo;
  const v = info[field];
  return typeof v === "string" ? v : "";
}

const FONT_STACK: Record<string, string> = {
  sans: "system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
  serif: "Georgia, 'Times New Roman', serif",
  mono: "ui-monospace, 'SF Mono', Menlo, Consolas, 'Courier New', monospace",
};

function resolveFontFamily(family: FontFamily | undefined, designFont?: string): string {
  if (!family || family === "design.font") return FONT_STACK[designFont || "sans"] || FONT_STACK.sans;
  return FONT_STACK[family] || FONT_STACK.sans;
}

const BASELINE_RATIO = 0.82;

function effectiveFontSize(el: TextElement, mods: DesignModifiers): number {
  const over = mods.elementOverrides?.[el.id]?.fontSize;
  if (over != null) return over;
  const base = resolveFontSize(el.fontSize);
  if (el.id === "name" && mods.fontSizes?.name != null) return mods.fontSizes.name;
  if (el.id === "title" && mods.fontSizes?.title != null) return mods.fontSizes.title;
  if (
    ["contacts", "tagline", "company", "address", "email", "phone", "website"].includes(el.id) &&
    mods.fontSizes?.detail != null
  ) return mods.fontSizes.detail;
  return base;
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function transformText(el: TextElement, raw: string): string {
  if (!raw) return raw;
  if (el.textTransform === "uppercase") return raw.toUpperCase();
  if (el.textTransform === "lowercase") return raw.toLowerCase();
  return raw;
}

function isHidden(el: CardElement, mods: DesignModifiers): boolean {
  if (el.visible === false) return true;
  if (mods.hiddenFields?.includes(el.id)) return true;
  return false;
}

// ─────────────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────────────

export function renderSpec(
  spec: CardSpec,
  palette: Palette,
  info: CardInfo,
  mods: DesignModifiers = {},
  opts: RenderOptions = {},
): string {
  const cw = spec.card.width;
  const ch = spec.card.height;
  const ow = opts.size?.width ?? cw;
  const oh = opts.size?.height ?? ch;
  const radius = ({ none: 0, small: 4, medium: 8, large: 16 })[mods.borderRadius || "medium"];

  const parts: string[] = [];
  parts.push(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${cw} ${ch}" width="${ow}" height="${oh}">`);

  // Background — gradient or solid
  parts.push(`<defs><clipPath id="card-clip"><rect x="0" y="0" width="${cw}" height="${ch}" rx="${radius}" ry="${radius}"/></clipPath>`);
  if (typeof spec.background === "object" && spec.background.type === "gradient") {
    const g = spec.background as GradientBackground;
    const angle = g.angle * (Math.PI / 180);
    const x2 = (Math.sin(angle) * 100).toFixed(2);
    const y2 = (-Math.cos(angle) * 100).toFixed(2);
    parts.push(`<linearGradient id="card-bg" x1="0" y1="0" x2="${x2}%" y2="${y2}%"><stop offset="0%" stop-color="${resolveColor(g.from, palette)}"/><stop offset="100%" stop-color="${resolveColor(g.to, palette)}"/></linearGradient>`);
  }
  parts.push(`</defs>`);

  parts.push(`<g clip-path="url(#card-clip)">`);
  if (typeof spec.background === "object" && spec.background.type === "gradient") {
    parts.push(`<rect x="0" y="0" width="${cw}" height="${ch}" fill="url(#card-bg)"/>`);
  } else {
    parts.push(`<rect x="0" y="0" width="${cw}" height="${ch}" fill="${resolveColor(spec.background as ColorRef, palette)}"/>`);
  }

  // Patterns omitted in preview renderer for now (rendered in webapp's React layer).

  // Elements: sort by zIndex (default = array index)
  const sortedElements = spec.elements
    .map((el, i) => ({ el, idx: i, z: el.zIndex ?? i }))
    .filter(({ el }) => !isHidden(el, mods))
    .sort((a, b) => a.z - b.z);

  for (const { el } of sortedElements) {
    const ox = mods.elementOverrides?.[el.id]?.offsetX || 0;
    const oy = mods.elementOverrides?.[el.id]?.offsetY || 0;
    parts.push(renderElement(el, ox, oy, palette, info, mods));
  }

  parts.push(`</g></svg>`);
  return parts.join("\n");
}

function renderElement(
  el: CardElement,
  offsetX: number,
  offsetY: number,
  palette: Palette,
  info: CardInfo,
  mods: DesignModifiers,
): string {
  const x = el.x + offsetX;
  const y = el.y + offsetY;
  const opacity = el.opacity ?? 1;
  const transform = el.rotation ? ` transform="rotate(${el.rotation} ${x} ${y})"` : "";

  if (el.type === "text") return renderText(el, x, y, opacity, transform, palette, info, mods);
  if (el.type === "image") return renderImage(el, x, y, opacity, transform, info);
  if (el.type === "shape") return renderShape(el as ShapeElement, x, y, opacity, transform, palette);
  return "";
}

function renderText(
  el: TextElement,
  x: number,
  y: number,
  opacity: number,
  transform: string,
  palette: Palette,
  info: CardInfo,
  mods: DesignModifiers,
): string {
  let raw = "";
  if (el.template != null) {
    raw = el.template.replace(/\{(\w+)\}/g, (_, key) => {
      const v = info[key as keyof CardInfo];
      return typeof v === "string" ? v : "";
    });
  } else if (el.text != null) {
    raw = el.text;
  } else if (el.source) {
    raw = resolveData(el.source, info);
  }

  if (el.hideIfEmpty && !raw.trim()) return "";

  // Display placeholders for never-empty fields (matches webapp behavior)
  const placeholders: Record<string, string> = {
    name: "Your Name",
    title: "Job Title",
    company: "Company",
    email: "email@example.com",
    phone: "(555) 123-4567",
  };
  let display = raw || placeholders[el.id] || "";
  if (el.firstChar && display) display = display[0];
  if (!display) return "";

  const fs = effectiveFontSize(el, mods);
  const family = resolveFontFamily(el.fontFamily, mods.font);
  const weight = el.fontWeight || "normal";
  const style = el.fontStyle || "normal";
  const overColor = mods.elementOverrides?.[el.id]?.color;
  const fill = overColor || resolveColor(el.color, palette);
  const ls = el.letterSpacing != null ? ` letter-spacing="${el.letterSpacing}"` : "";

  const anchor = el.alignment === "center" ? "middle" : el.alignment === "right" ? "end" : "start";
  const wrapped = (el.prefix || "") + transformText(el, display) + (el.suffix || "");

  const baseAttrs = `text-anchor="${anchor}" font-family="${family}" font-size="${fs}" font-weight="${weight}" font-style="${style}" fill="${fill}" opacity="${opacity}"${ls}${transform}`;

  if (el.splitWordsToLines) {
    const words = transformText(el, display).split(/\s+/).filter(Boolean);
    const out: string[] = [];
    for (let i = 0; i < words.length; i++) {
      const lineY = y + i * fs * 1.2 + fs * BASELINE_RATIO;
      out.push(`<text x="${x.toFixed(2)}" y="${lineY.toFixed(2)}" ${baseAttrs}>${escapeXml(words[i])}</text>`);
    }
    return out.join("\n");
  }

  const baselineY = y + fs * BASELINE_RATIO;
  return `<text x="${x.toFixed(2)}" y="${baselineY.toFixed(2)}" ${baseAttrs}>${escapeXml(wrapped)}</text>`;
}

function renderImage(
  el: ImageElement,
  x: number,
  y: number,
  opacity: number,
  transform: string,
  info: CardInfo,
): string {
  let url = "";
  if (typeof el.source === "string" && el.source.startsWith("cardInfo.")) {
    url = resolveData(el.source as DataRef, info);
  } else if (typeof el.source === "string") {
    url = el.source;
  }
  if (!url && el.hideIfEmpty) return "";
  if (!url) return "";
  const preserve = el.fit === "cover" ? "xMidYMid slice" : el.fit === "fill" ? "none" : "xMidYMid meet";
  return `<image x="${x.toFixed(2)}" y="${y.toFixed(2)}" width="${el.width}" height="${el.height}" href="${escapeXml(url)}" preserveAspectRatio="${preserve}" opacity="${opacity}"${transform}/>`;
}

function renderShape(
  el: ShapeElement,
  x: number,
  y: number,
  opacity: number,
  transform: string,
  palette: Palette,
): string {
  if (el.shape === "rect") {
    const r = el as RectShape;
    const fill = r.fill ? resolveColor(r.fill, palette) : "none";
    const stroke = r.stroke ? ` stroke="${resolveColor(r.stroke, palette)}" stroke-width="${r.strokeWidth ?? 1}"` : "";
    const rx = r.cornerRadius ? ` rx="${r.cornerRadius}" ry="${r.cornerRadius}"` : "";
    return `<rect x="${x.toFixed(2)}" y="${y.toFixed(2)}" width="${r.width}" height="${r.height}" fill="${fill}" opacity="${opacity}"${stroke}${rx}${transform}/>`;
  }
  if (el.shape === "circle") {
    const c = el as CircleShape;
    const cx = x + c.radius;
    const cy = y + c.radius;
    const fill = c.fill ? resolveColor(c.fill, palette) : "none";
    const stroke = c.stroke ? ` stroke="${resolveColor(c.stroke, palette)}" stroke-width="${c.strokeWidth ?? 1}"` : "";
    return `<circle cx="${cx.toFixed(2)}" cy="${cy.toFixed(2)}" r="${c.radius}" fill="${fill}" opacity="${opacity}"${stroke}${transform}/>`;
  }
  if (el.shape === "line") {
    const l = el as LineShape;
    return `<line x1="${x.toFixed(2)}" y1="${y.toFixed(2)}" x2="${l.x2.toFixed(2)}" y2="${l.y2.toFixed(2)}" stroke="${resolveColor(l.stroke, palette)}" stroke-width="${l.strokeWidth}" opacity="${opacity}"${transform}/>`;
  }
  if (el.shape === "polygon") {
    const p = el as PolygonShape;
    const points = p.points.map((pt) => `${(x + pt.x).toFixed(2)},${(y + pt.y).toFixed(2)}`).join(" ");
    const fill = p.fill ? resolveColor(p.fill, palette) : "none";
    const stroke = p.stroke ? ` stroke="${resolveColor(p.stroke, palette)}" stroke-width="${p.strokeWidth ?? 1}"` : "";
    return `<polygon points="${points}" fill="${fill}" opacity="${opacity}"${stroke}${transform}/>`;
  }
  if (el.shape === "path") {
    const p = el as PathShape;
    const fill = p.fill ? resolveColor(p.fill, palette) : "none";
    const stroke = p.stroke ? ` stroke="${resolveColor(p.stroke, palette)}" stroke-width="${p.strokeWidth ?? 1}"` : "";
    // Coordinates in `d` are relative to (x, y); apply via a translate within the same group.
    return `<g transform="translate(${x.toFixed(2)} ${y.toFixed(2)})${transform ? " " + transform.slice(11, -1) : ""}"><path d="${p.d}" fill="${fill}" opacity="${opacity}"${stroke}/></g>`;
  }
  return "";
}
