/**
 * Generic spec-driven renderer for card templates.
 *
 * Walks a `CardSpec`'s flat `elements` array and emits absolutely-positioned
 * React DOM. No per-template branching — the single source of layout truth
 * is each element's `(x, y)` and properties. Replaces the 800-line switch
 * statement that BusinessCard.tsx used to carry.
 *
 * Layering (drawn back-to-front, like the spec):
 *   - background (gradient or solid)
 *   - elements in array order, with optional `zIndex`
 *
 * Element types:
 *   - text:  positioned <div> with inline typography styles
 *   - shape: rect → <div> with backgroundColor; others → inline <svg>
 *   - image: positioned <img> sourced from cardInfo.customLogoUrl or a URL
 *
 * Patterns, the floating logo, the QR code, and the back face are NOT
 * rendered here — they live in the BusinessCard wrapper around this.
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
  GradientBackground,
} from "@core/types";
import { resolveFontSize } from "@core/typography";
import type { CardInfo, ElementStyle } from "@/lib/types";

// ── Shared types ────────────────────────────────────────────────────

export interface SpecRendererPalette {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  backgroundAlt: string;
  text: string;
}

export interface SpecRendererDesign {
  font: "sans" | "serif" | "mono";
  fontSizes?: { name?: number; title?: number; detail?: number };
  elementOverrides?: Record<string, ElementStyle>;
  hiddenFields?: string[];
}

export interface SpecRendererProps {
  spec: CardSpec;
  palette: SpecRendererPalette;
  cardInfo: CardInfo;
  design: SpecRendererDesign;
  /** Card-display scale relative to the spec's reference dimensions.
   *  If the spec is 350×200 and the rendered card is 280×160, scale = 0.8. */
  scale: number;
  editMode?: boolean;
  selectedElement?: string | null;
  onSelectElement?: (id: string) => void;
}

// ── Color helpers (luminance + contrast picking) ────────────────────

function normalizeHex(hex: string): string {
  let h = hex.replace("#", "");
  if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
  return h.length === 6 ? h : "000000";
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

function resolveColor(ref: ColorRef, palette: SpecRendererPalette): string {
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
      return pickReadable(palette.backgroundAlt, [palette.background, palette.primary, palette.text]);
    case "onPrimary":
      return pickReadable(palette.primary, [palette.background, palette.backgroundAlt, palette.text]);
    case "onAccent":
      return pickReadable(palette.accent, [palette.background, palette.primary, palette.text]);
    default: return palette.text;
  }
}

function resolveData(ref: DataRef, info: CardInfo): string {
  const field = ref.slice("cardInfo.".length) as keyof CardInfo;
  const v = info[field];
  return typeof v === "string" ? v : "";
}

// ── Background ──────────────────────────────────────────────────────

function backgroundCss(bg: ColorRef | GradientBackground, palette: SpecRendererPalette): string {
  if (typeof bg === "object" && bg.type === "gradient") {
    const from = resolveColor(bg.from, palette);
    const to = resolveColor(bg.to, palette);
    return `linear-gradient(${bg.angle}deg, ${from} 0%, ${to} 100%)`;
  }
  return resolveColor(bg as ColorRef, palette);
}

// ── Font + content resolution ───────────────────────────────────────

const FONT_STACK = {
  sans: "system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
  serif: "Georgia, 'Times New Roman', serif",
  mono: "ui-monospace, 'SF Mono', Menlo, Consolas, 'Courier New', monospace",
} as const;

function resolveFontFamily(family: string | undefined, designFont: "sans" | "serif" | "mono"): string {
  if (!family || family === "design.font") return FONT_STACK[designFont];
  // Built-in family token → expand to its full system stack.
  if (family in FONT_STACK) return FONT_STACK[family as keyof typeof FONT_STACK];
  // Anything else is treated as a real CSS family name (e.g. an uploaded
  // custom font registered via design.customFonts). Quote it in case it
  // contains spaces, and append a system fallback so unloaded fonts don't
  // collapse to the browser default mid-render.
  return `"${family}", ${FONT_STACK[designFont]}`;
}

const PLACEHOLDERS: Record<string, string> = {
  name: "Your Name",
  title: "Job Title",
  company: "Company",
  email: "email@example.com",
  phone: "(555) 123-4567",
};

function resolveTextContent(el: TextElement, info: CardInfo): string {
  let raw = "";
  if (el.template != null) {
    raw = el.template.replace(/\{(\w+)\}/g, (_, k) => {
      const v = info[k as keyof CardInfo];
      return typeof v === "string" ? v : "";
    });
  } else if (el.text != null) {
    raw = el.text;
  } else if (el.source) {
    raw = resolveData(el.source, info);
  }
  if (!raw) raw = PLACEHOLDERS[el.id] || "";
  if (el.firstChar && raw) raw = raw[0];
  // Capitalization is applied via CSS in renderText() so the user can
  // override the template's choice without us mutating the source string.
  return raw;
}

function effectiveFontSize(el: TextElement, design: SpecRendererDesign): number {
  const overrideFs = design.elementOverrides?.[el.id]?.fontSize;
  if (overrideFs != null) return overrideFs;
  if (el.id === "name" && design.fontSizes?.name != null) return design.fontSizes.name;
  if (el.id === "title" && design.fontSizes?.title != null) return design.fontSizes.title;
  if (
    ["company", "tagline", "email", "phone", "website", "address"].includes(el.id) &&
    design.fontSizes?.detail != null
  ) {
    return design.fontSizes.detail;
  }
  return resolveFontSize(el.fontSize);
}

function isElementVisible(el: CardElement, info: CardInfo, design: SpecRendererDesign): boolean {
  if (el.visible === false) return false;
  if (design.hiddenFields?.includes(el.id)) return false;
  if (el.type === "text") {
    if (el.hideIfEmpty) {
      let raw = "";
      if (el.template) {
        raw = el.template.replace(/\{(\w+)\}/g, (_, k) => {
          const v = info[k as keyof CardInfo];
          return typeof v === "string" ? v : "";
        });
      } else if (el.source) {
        raw = resolveData(el.source, info);
      }
      if (!raw.trim()) return false;
    }
  }
  if (el.type === "image" && el.hideIfEmpty) {
    if (typeof el.source === "string" && el.source.startsWith("cardInfo.")) {
      const v = resolveData(el.source as DataRef, info);
      if (!v) return false;
    }
  }
  return true;
}

// ── Public component ────────────────────────────────────────────────

export default function SpecRenderer(props: SpecRendererProps) {
  const { spec, palette, cardInfo, design, scale, editMode, selectedElement, onSelectElement } = props;

  const visible = spec.elements
    .map((el, i) => ({ el, i, z: el.zIndex ?? i }))
    .filter(({ el }) => isElementVisible(el, cardInfo, design))
    .sort((a, b) => a.z - b.z);

  return (
    <div className="absolute inset-0" style={{ background: backgroundCss(spec.background, palette) }}>
      {visible.map(({ el }) =>
        renderElement(el, palette, cardInfo, design, scale, editMode, selectedElement, onSelectElement),
      )}
    </div>
  );
}

// ── Element dispatch ────────────────────────────────────────────────

function renderElement(
  el: CardElement,
  palette: SpecRendererPalette,
  info: CardInfo,
  design: SpecRendererDesign,
  scale: number,
  editMode?: boolean,
  selectedElement?: string | null,
  onSelectElement?: (id: string) => void,
) {
  const ov = design.elementOverrides?.[el.id];
  const ox = ov?.offsetX ?? 0;
  const oy = ov?.offsetY ?? 0;
  const x = (el.x + ox) * scale;
  const y = (el.y + oy) * scale;
  // Per-element opacity from spec, multiplied by override if set.
  const opacity = (el.opacity ?? 1) * (ov?.opacity ?? 1);
  const rotation = el.rotation ?? 0;

  const editProps = editMode
    ? {
        onClick: (e: React.MouseEvent) => {
          e.stopPropagation();
          onSelectElement?.(el.id);
        },
        "data-eid": el.id,
        cursor: "pointer",
        outline: selectedElement === el.id ? "2px dashed #6366f1" : undefined,
        outlineOffset: selectedElement === el.id ? "2px" : undefined,
        borderRadius: selectedElement === el.id ? "3px" : undefined,
      }
    : { cursor: "default" };

  if (el.type === "text") {
    return renderText(el, x, y, opacity, rotation, palette, info, design, scale, editProps);
  }
  if (el.type === "image") {
    return renderImage(el, x, y, opacity, rotation, info, scale, editProps);
  }
  if (el.type === "shape") {
    // Shapes (lines, rects, circles, polygons, paths) are decorative —
    // they aren't in the editable elements list, so they must NEVER
    // intercept clicks. Without this, a full-card decorative SVG would
    // swallow every click meant for text/logo/QR.
    return renderShape(el, x, y, opacity, rotation, palette, scale, { cursor: "default" });
  }
  return null;
}

// ── Text ────────────────────────────────────────────────────────────

interface EditDecorations {
  onClick?: React.MouseEventHandler;
  "data-eid"?: string;
  cursor: string;
  outline?: string;
  outlineOffset?: string;
  borderRadius?: string;
}

function renderText(
  el: TextElement,
  x: number,
  y: number,
  opacity: number,
  rotation: number,
  palette: SpecRendererPalette,
  info: CardInfo,
  design: SpecRendererDesign,
  scale: number,
  edit: EditDecorations,
) {
  const text = resolveTextContent(el, info);
  if (!text) return null;
  const fs = effectiveFontSize(el, design) * scale;
  // elementOverrides[id].fontFamily wins over the spec's default; spec
  // wins over the card-wide design.font (final fallback).
  const overFamily = design.elementOverrides?.[el.id]?.fontFamily;
  const family = resolveFontFamily(overFamily ?? el.fontFamily, design.font);
  const overColor = design.elementOverrides?.[el.id]?.color;
  const fill = overColor || resolveColor(el.color, palette);
  const ls = el.letterSpacing != null ? el.letterSpacing * scale : 0;
  // Capitalization: user override wins. "none" lets the user explicitly
  // strip a template-level uppercase. Without an override we honor the
  // spec's textTransform (e.g. monogram-card forces uppercase).
  const overCase = design.elementOverrides?.[el.id]?.textTransform;
  const cssCase: React.CSSProperties["textTransform"] =
    overCase != null
      ? (overCase as React.CSSProperties["textTransform"])
      : (el.textTransform as React.CSSProperties["textTransform"] | undefined);
  // Wrap toggle. Default = nowrap; user can opt in to wrapping.
  const wrap = design.elementOverrides?.[el.id]?.wrap === true;

  const wrapped = (el.prefix || "") + text + (el.suffix || "");
  const textAlign = el.alignment ?? "left";
  // For center/right alignment, anchor x at the alignment point and translate.
  const xTranslate = textAlign === "center" ? "-50%" : textAlign === "right" ? "-100%" : "0";

  const baseStyle: React.CSSProperties = {
    position: "absolute",
    left: x,
    top: y,
    fontFamily: family,
    fontSize: `${fs}px`,
    fontWeight: el.fontWeight ?? "normal",
    fontStyle: el.fontStyle ?? "normal",
    color: fill,
    opacity,
    letterSpacing: ls ? `${ls}px` : undefined,
    lineHeight: 1.2,
    whiteSpace: wrap ? "normal" : "nowrap",
    // When wrapping, give the text a sensible max width relative to the
    // card so it actually breaks instead of extending off-card.
    maxWidth: wrap ? `${(350 - (el.x ?? 0) - 12) * scale}px` : undefined,
    textTransform: cssCase,
    transform: `translate(${xTranslate}, 0)${rotation ? ` rotate(${rotation}deg)` : ""}`,
    transformOrigin: textAlign === "center" ? "center top" : textAlign === "right" ? "right top" : "left top",
    cursor: edit.cursor,
    outline: edit.outline,
    outlineOffset: edit.outlineOffset,
    borderRadius: edit.borderRadius,
  };

  if (el.splitWordsToLines) {
    const words = text.split(/\s+/).filter(Boolean);
    return (
      <div key={el.id} style={baseStyle} onClick={edit.onClick} data-eid={edit["data-eid"]}>
        {words.map((w, i) => (
          <div key={i}>{w}</div>
        ))}
      </div>
    );
  }

  return (
    <div key={el.id} style={baseStyle} onClick={edit.onClick} data-eid={edit["data-eid"]}>
      {wrapped}
    </div>
  );
}

// ── Image ───────────────────────────────────────────────────────────

function renderImage(
  el: ImageElement,
  x: number,
  y: number,
  opacity: number,
  rotation: number,
  info: CardInfo,
  scale: number,
  edit: EditDecorations,
) {
  let url = "";
  if (typeof el.source === "string" && el.source.startsWith("cardInfo.")) {
    url = resolveData(el.source as DataRef, info);
  } else if (typeof el.source === "string") {
    url = el.source;
  }
  if (!url) return null;
  const fit = el.fit === "cover" ? "cover" : el.fit === "fill" ? "fill" : "contain";

  const baseStyle: React.CSSProperties = {
    position: "absolute",
    left: x,
    top: y,
    width: el.width * scale,
    height: el.height * scale,
    objectFit: fit,
    opacity,
    transform: rotation ? `rotate(${rotation}deg)` : undefined,
    transformOrigin: "left top",
    cursor: edit.cursor,
    outline: edit.outline,
    outlineOffset: edit.outlineOffset,
    borderRadius: edit.borderRadius,
  };

  return (
    <img
      key={el.id}
      src={url}
      alt=""
      style={baseStyle}
      onClick={edit.onClick}
      data-eid={edit["data-eid"]}
    />
  );
}

// ── Shape ───────────────────────────────────────────────────────────

function renderShape(
  el: ShapeElement,
  x: number,
  y: number,
  opacity: number,
  rotation: number,
  palette: SpecRendererPalette,
  scale: number,
  edit: EditDecorations,
) {
  if (el.shape === "rect") return renderRect(el as RectShape, x, y, opacity, rotation, palette, scale, edit);
  if (el.shape === "circle") return renderCircle(el as CircleShape, x, y, opacity, rotation, palette, scale, edit);
  if (el.shape === "line") return renderLine(el as LineShape, x, y, opacity, rotation, palette, scale, edit);
  if (el.shape === "polygon") return renderPolygon(el as PolygonShape, x, y, opacity, rotation, palette, scale, edit);
  if (el.shape === "path") return renderPath(el as PathShape, x, y, opacity, rotation, palette, scale, edit);
  return null;
}

function renderRect(
  el: RectShape,
  x: number,
  y: number,
  opacity: number,
  rotation: number,
  palette: SpecRendererPalette,
  scale: number,
  _edit: EditDecorations,
) {
  return (
    <div
      key={el.id}
      style={{
        position: "absolute",
        left: x,
        top: y,
        width: el.width * scale,
        height: el.height * scale,
        backgroundColor: el.fill ? resolveColor(el.fill, palette) : "transparent",
        border: el.stroke ? `${(el.strokeWidth ?? 1) * scale}px solid ${resolveColor(el.stroke, palette)}` : undefined,
        borderRadius: el.cornerRadius ? `${el.cornerRadius * scale}px` : undefined,
        opacity,
        transform: rotation ? `rotate(${rotation}deg)` : undefined,
        transformOrigin: "left top",
        // Decorative — never intercept clicks meant for text/logo/QR.
        pointerEvents: "none",
      }}
    />
  );
}

function renderCircle(
  el: CircleShape,
  x: number,
  y: number,
  opacity: number,
  rotation: number,
  palette: SpecRendererPalette,
  scale: number,
  _edit: EditDecorations,
) {
  const d = el.radius * 2 * scale;
  return (
    <svg
      key={el.id}
      style={{
        position: "absolute",
        left: x,
        top: y,
        width: d,
        height: d,
        opacity,
        overflow: "visible",
        transform: rotation ? `rotate(${rotation}deg)` : undefined,
        transformOrigin: "left top",
        // Decorative — never intercept clicks meant for text/logo/QR.
        pointerEvents: "none",
      }}
    >
      <circle
        cx={el.radius * scale}
        cy={el.radius * scale}
        r={el.radius * scale}
        fill={el.fill ? resolveColor(el.fill, palette) : "none"}
        stroke={el.stroke ? resolveColor(el.stroke, palette) : undefined}
        strokeWidth={el.stroke ? (el.strokeWidth ?? 1) * scale : undefined}
      />
    </svg>
  );
}

function renderLine(
  el: LineShape,
  x: number,
  y: number,
  opacity: number,
  _rotation: number,
  palette: SpecRendererPalette,
  scale: number,
  _edit: EditDecorations,
) {
  const x2 = el.x2 * scale;
  const y2 = el.y2 * scale;
  return (
    <svg
      key={el.id}
      style={{
        position: "absolute",
        left: 0,
        top: 0,
        width: "100%",
        height: "100%",
        opacity,
        // Full-card decorative SVG — must never swallow clicks.
        pointerEvents: "none",
      }}
    >
      <line
        x1={x}
        y1={y}
        x2={x2}
        y2={y2}
        stroke={resolveColor(el.stroke, palette)}
        strokeWidth={el.strokeWidth * scale}
      />
    </svg>
  );
}

function renderPolygon(
  el: PolygonShape,
  x: number,
  y: number,
  opacity: number,
  rotation: number,
  palette: SpecRendererPalette,
  scale: number,
  _edit: EditDecorations,
) {
  const points = el.points.map((p) => `${(x + p.x * scale).toFixed(2)},${(y + p.y * scale).toFixed(2)}`).join(" ");
  return (
    <svg
      key={el.id}
      style={{
        position: "absolute",
        left: 0,
        top: 0,
        width: "100%",
        height: "100%",
        opacity,
        // Full-card decorative SVG — must never swallow clicks.
        pointerEvents: "none",
        overflow: "visible",
      }}
    >
      <polygon
        points={points}
        fill={el.fill ? resolveColor(el.fill, palette) : "none"}
        stroke={el.stroke ? resolveColor(el.stroke, palette) : undefined}
        strokeWidth={el.stroke ? (el.strokeWidth ?? 1) * scale : undefined}
        transform={rotation ? `rotate(${rotation} ${x} ${y})` : undefined}
      />
    </svg>
  );
}

function renderPath(
  el: PathShape,
  x: number,
  y: number,
  opacity: number,
  rotation: number,
  palette: SpecRendererPalette,
  scale: number,
  _edit: EditDecorations,
) {
  return (
    <svg
      key={el.id}
      style={{
        position: "absolute",
        left: 0,
        top: 0,
        width: "100%",
        height: "100%",
        opacity,
        // Full-card decorative SVG — must never swallow clicks.
        pointerEvents: "none",
        overflow: "visible",
      }}
    >
      <g transform={`translate(${x} ${y}) scale(${scale})${rotation ? ` rotate(${rotation})` : ""}`}>
        <path
          d={el.d}
          fill={el.fill ? resolveColor(el.fill, palette) : "none"}
          stroke={el.stroke ? resolveColor(el.stroke, palette) : undefined}
          strokeWidth={el.stroke ? (el.strokeWidth ?? 1) : undefined}
        />
      </g>
    </svg>
  );
}
