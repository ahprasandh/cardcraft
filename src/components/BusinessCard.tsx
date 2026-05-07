
import { useState, useEffect } from "react";
import QRCode from "qrcode";
import type { CardDesign, CardInfo, PatternPlacement, LogoPlacement, ElementStyle, LogoElement, QrElement, ExtraImage } from "@/lib/types";
import { getPatternSVG, type PatternId } from "@/lib/patterns";
import { LogoIcon } from "@/lib/logos";
import SpecRenderer from "@/components/SpecRenderer";
import CustomFontInjector from "@/components/CustomFontInjector";
import { getTemplateSpec } from "@/lib/template-specs";

/** Element IDs that can be selected in edit mode */
export type EditableElementId = "name" | "title" | "company" | "tagline" | "contacts" | "email" | "phone" | "website" | "address" | "logo" | "qr";

interface BusinessCardProps {
  design: CardDesign;
  info: CardInfo;
  size?: "small" | "medium" | "large";
  onClick?: () => void;
  selected?: boolean;
  editMode?: boolean;
  selectedElement?: EditableElementId | null;
  onSelectElement?: (id: EditableElementId) => void;
  specOverride?: unknown;
  ref?: React.Ref<HTMLDivElement>;
}

const fontMap = { sans: "font-sans", serif: "font-serif", mono: "font-mono" };

// ── Luminance & contrast helpers ──────────────────────────────────────
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
  const toLinear = (v: number) => v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
}

function contrastRatio(fg: string, bg: string): number {
  const l1 = luminance(fg);
  const l2 = luminance(bg);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

/** If text has poor contrast against bg, return a readable alternative. */
function ensureContrast(textColor: string, bgColor: string, altColor: string): string {
  if (contrastRatio(textColor, bgColor) >= 4.5) return textColor;
  if (contrastRatio(altColor, bgColor) >= 4.5) return altColor;
  return luminance(bgColor) > 0.4 ? "#111827" : "#f9fafb";
}

/**
 * Derive the unified `LogoElement` shape from the legacy logo fields.
 *
 * Reads from `design.logoElement` if explicitly set (preferred — Task #14
 * will migrate the wizard to write here directly). Otherwise falls back to
 * computing it from `design.logo` + `cardInfo.customLogoUrl` for backward
 * compatibility with existing designs.
 *
 * Returns `null` when no logo should render.
 */
function normalizeLogo(design: CardDesign, info: CardInfo): LogoElement | null {
  if (design.logoElement !== undefined) return design.logoElement;

  const hasUrl = !!info.customLogoUrl;
  const hasIcon = design.logo.id !== "none";
  if (!hasUrl && !hasIcon) return null;

  // Map legacy size enum → base px (medium-card reference, 350×200)
  const sizeMap = { small: 22, medium: 28, large: 36 };
  const baseSize = sizeMap[design.logo.size];
  // Source-based logos get a wider box (3× height) so landscape logos fit
  // without distortion. Icons stay square.
  const w = hasUrl ? baseSize * 3 : baseSize;
  const h = baseSize;

  // Map legacy placement enum → (x, y) in reference card coordinates
  const cardW = 350, cardH = 200, margin = 12;
  let x: number, y: number;
  switch (design.logo.placement) {
    case "top-left":      x = margin;             y = margin; break;
    case "top-center":    x = (cardW - w) / 2;    y = margin; break;
    case "top-right":     x = cardW - w - margin; y = margin; break;
    case "center-left":   x = margin;             y = (cardH - h) / 2; break;
    case "center":        x = (cardW - w) / 2;    y = (cardH - h) / 2; break;
    case "center-right":  x = cardW - w - margin; y = (cardH - h) / 2; break;
    case "bottom-left":   x = margin;             y = cardH - h - margin; break;
    case "bottom-center": x = (cardW - w) / 2;    y = cardH - h - margin; break;
    case "bottom-right":  x = cardW - w - margin; y = cardH - h - margin; break;
    default:              x = margin;             y = margin;
  }

  return {
    source: hasUrl ? info.customLogoUrl : undefined,
    iconId: !hasUrl && hasIcon ? design.logo.id : undefined,
    x, y, width: w, height: h,
    visible: true,
  };
}

/**
 * Derive the unified `QrElement` shape from the legacy QR spec (Task #11).
 *
 * Reads from `design.qrElement` if explicitly set, otherwise derives from
 * `design.qr`. Returns null when QR is disabled or absent.
 */
function normalizeQr(design: CardDesign, _cardSize: "small" | "medium" | "large"): QrElement | null {
  if (design.qrElement !== undefined) return design.qrElement;
  if (!design.qr?.enabled) return null;

  // Map legacy size enum (small/medium) × card size to px
  const qrPxMap = {
    small:  { small: 24, medium: 32, large: 40 },
    medium: { small: 36, medium: 48, large: 60 },
  };
  // Use medium-card reference (we'll rescale at render time)
  const ref = qrPxMap[design.qr.size]["medium"];

  // Map legacy placement enum → (x, y)
  const cardW = 350, cardH = 200, margin = 12;
  const w = ref, h = ref;
  let x: number, y: number;
  switch (design.qr.placement) {
    case "top-left":      x = margin;             y = margin; break;
    case "top-center":    x = (cardW - w) / 2;    y = margin; break;
    case "top-right":     x = cardW - w - margin; y = margin; break;
    case "center-left":   x = margin;             y = (cardH - h) / 2; break;
    case "center":        x = (cardW - w) / 2;    y = (cardH - h) / 2; break;
    case "center-right":  x = cardW - w - margin; y = (cardH - h) / 2; break;
    case "bottom-left":   x = margin;             y = cardH - h - margin; break;
    case "bottom-center": x = (cardW - w) / 2;    y = cardH - h - margin; break;
    case "bottom-right":  x = cardW - w - margin; y = cardH - h - margin; break;
    default:              x = cardW - w - margin; y = cardH - h - margin; // bottom-right default
  }

  return {
    enabled: true,
    content: design.qr.content,
    customText: design.qr.customText,
    x, y, width: w, height: h,
    visible: true,
  };
}

/**
 * Derive a unified `(x, y, width, height)` shape for an extra image (Task #12).
 *
 * Uses the new fields if set (free positioning); otherwise falls back to the
 * legacy `placement` + `size` enum mapping.
 */
function normalizeExtraImage(img: ExtraImage, _cardSize: "small" | "medium" | "large"): { x: number; y: number; width: number; height: number; visible: boolean; opacity: number; rotation: number } {
  // Legacy size → px (medium-card reference)
  const sizeMap = {
    small:  { small: 20, medium: 26, large: 36 },
    medium: { small: 30, medium: 38, large: 52 },
    large:  { small: 40, medium: 52, large: 72 },
  };
  const ref = sizeMap[img.size]["medium"];

  // If new x/y/width/height are explicitly set, use them.
  const w = img.width ?? ref;
  const h = img.height ?? ref;

  let x = img.x;
  let y = img.y;
  if (x === undefined || y === undefined) {
    // Derive from legacy placement enum
    const cardW = 350, cardH = 200, margin = 12;
    switch (img.placement) {
      case "top-left":      x = margin;             y = margin; break;
      case "top-center":    x = (cardW - w) / 2;    y = margin; break;
      case "top-right":     x = cardW - w - margin; y = margin; break;
      case "center-left":   x = margin;             y = (cardH - h) / 2; break;
      case "center":        x = (cardW - w) / 2;    y = (cardH - h) / 2; break;
      case "center-right":  x = cardW - w - margin; y = (cardH - h) / 2; break;
      case "bottom-left":   x = margin;             y = cardH - h - margin; break;
      case "bottom-center": x = (cardW - w) / 2;    y = cardH - h - margin; break;
      case "bottom-right":  x = cardW - w - margin; y = cardH - h - margin; break;
      default:              x = margin;             y = margin;
    }
  }

  return {
    x, y, width: w, height: h,
    visible: img.visible !== false,
    opacity: img.opacity ?? 1,
    rotation: img.rotation ?? 0,
  };
}

// ── Normalize old designs to new spec (fills defaults) ────────────────
function norm(design: CardDesign): CardDesign {
  return {
    ...design,
    textAlign: design.textAlign || "left",
    spacing: design.spacing || "normal",
    borderRadius: design.borderRadius || "medium",
    pattern: design.pattern || {
      id: design.patternId || "none",
      opacity: 0.15,
      color: design.colors.accent,
      placement: "full" as PatternPlacement,
    },
    backgroundEffect: design.backgroundEffect || { type: "none" as const, color: design.colors.accent, opacity: 0.04, angle: 135 },
    logo: design.logo || {
      id: design.logoId || "circle-letter",
      placement: "top-left" as LogoPlacement,
      size: "medium" as const,
    },
    border: design.border || { sides: "none" as const, width: 0, color: design.colors.accent },
  };
}

// ── Pattern placement → CSS positioning ───────────────────────────────
function patternStyle(placement: PatternPlacement): React.CSSProperties {
  switch (placement) {
    case "top":           return { top: 0, left: 0, right: 0, height: "50%" };
    case "bottom":        return { bottom: 0, left: 0, right: 0, height: "50%" };
    case "left":          return { top: 0, bottom: 0, left: 0, width: "50%" };
    case "right":         return { top: 0, bottom: 0, right: 0, width: "50%" };
    case "top-left":      return { top: 0, left: 0, width: "50%", height: "50%" };
    case "top-right":     return { top: 0, right: 0, width: "50%", height: "50%" };
    case "bottom-left":   return { bottom: 0, left: 0, width: "50%", height: "50%" };
    case "bottom-right":  return { bottom: 0, right: 0, width: "50%", height: "50%" };
    case "diagonal-tl":   return { top: 0, left: 0, right: 0, bottom: 0, clipPath: "polygon(0 0, 100% 0, 0 100%)" };
    case "diagonal-br":   return { top: 0, left: 0, right: 0, bottom: 0, clipPath: "polygon(100% 0, 100% 100%, 0 100%)" };
    default:              return { top: 0, left: 0, right: 0, bottom: 0 };
  }
}

export default function BusinessCard({ design: rawDesign, info, size = "medium", onClick, selected = false, editMode = false, selectedElement = null, onSelectElement, specOverride, ref }: BusinessCardProps) {
  const design = norm(rawDesign);
  const { templateId, font } = design;
  const f = fontMap[font];

  // ── Contrast-safe colors ────────────────────────────────────────────
  const raw = design.colors;
  const c = {
    ...raw,
    primary: ensureContrast(raw.primary, raw.background, raw.secondary),
    secondary: ensureContrast(raw.secondary, raw.background, raw.primary),
    text: ensureContrast(raw.text, raw.background, raw.primary),
  };
  const companyLetter = (info.company || info.name || "C").charAt(0);

  // ── Resolved specs ──────────────────────────────────────────────────
  const pat = design.pattern;
  const bg = design.backgroundEffect;
  const bdr = design.border;
  const qr = design.qr;
  const eo = design.elementOverrides ?? {};
  const hidden = new Set(design.hiddenFields ?? []);

  const patternBg = pat.id !== "none"
    ? getPatternSVG(pat.id as PatternId, pat.color, pat.opacity)
    : null;

  // ── QR code data URL ────────────────────────────────────────────────
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!qr?.enabled) { setQrDataUrl(null); return; }
    let content = "";
    if (qr.content === "website") {
      content = info.website ? (info.website.startsWith("http") ? info.website : `https://${info.website}`) : "https://example.com";
    } else if (qr.content === "vcard") {
      content = `BEGIN:VCARD\nVERSION:3.0\nFN:${info.name}\nORG:${info.company}\nTITLE:${info.title}\nTEL:${info.phone}\nEMAIL:${info.email}\nURL:${info.website}\nEND:VCARD`;
    } else {
      content = qr.customText || "https://example.com";
    }
    QRCode.toDataURL(content, { width: 200, margin: 1, color: { dark: "#000000", light: "#ffffff" } })
      .then(setQrDataUrl)
      .catch(() => setQrDataUrl(null));
  }, [qr?.enabled, qr?.content, qr?.customText, info.website, info.name, info.company, info.title, info.phone, info.email]);

  // ── Size tokens ─────────────────────────────────────────────────────
  const szDims = {
    small:  { w: 280, h: 160 },
    medium: { w: 350, h: 200 },
    large:  { w: 490, h: 280 },
  }[size];

  // Reference card size for the spec is 350×200; scale from that to actual.
  const scale = szDims.w / 350;

  const borderRadiusMap = { none: "rounded-none", small: "rounded", medium: "rounded-lg", large: "rounded-2xl" };
  const br = borderRadiusMap[design.borderRadius];

  // ── Card border style ───────────────────────────────────────────────
  const borderStyleObj: React.CSSProperties = {};
  if (bdr.sides !== "none" && bdr.width > 0) {
    const bColor = bdr.color || c.accent;
    if (bdr.sides === "all") {
      borderStyleObj.border = `${bdr.width}px solid ${bColor}`;
    } else {
      const side = bdr.sides.charAt(0).toUpperCase() + bdr.sides.slice(1);
      (borderStyleObj as Record<string, string>)[`border${side}`] = `${bdr.width}px solid ${bColor}`;
    }
  }

  const wrap = `${f} ${br} overflow-hidden relative cursor-pointer transition-all duration-200 shadow-lg hover:shadow-xl ${selected ? "ring-2 ring-[#9fe870] ring-offset-1" : "hover:scale-[1.02]"}`;
  const wrapStyle: React.CSSProperties = { width: szDims.w, height: szDims.h };

  // ── Spec lookup (replaces the per-template switch) ───────────────────
  // Falls back to minimal-clean if the templateId is one of the legacy ids
  // (card-border, logo-centered, etc.) that don't have specs of their own.
  const spec = (specOverride as ReturnType<typeof getTemplateSpec>) || getTemplateSpec(templateId) || getTemplateSpec("minimal-clean");

  // Design modifiers passed to the spec renderer.
  // Hide the spec's logo image element — the overlay renders it with edge-aware positioning.
  const specHasLogoEl = spec?.elements.some((e: { id: string; type: string }) => e.id === "logo" && e.type === "image");
  const specDesign = {
    font,
    fontSizes: design.fontSizes,
    elementOverrides: eo,
    hiddenFields: specHasLogoEl
      ? [...(design.hiddenFields ?? []), "logo"]
      : design.hiddenFields,
  };

  return (
    <div ref={ref} className={wrap} onClick={onClick} style={{ ...wrapStyle, ...borderStyleObj }}>
      {/* Register any user-uploaded fonts on this design via @font-face. */}
      <CustomFontInjector fonts={design.customFonts} />
      {/* Background-effect overlay (gradient/solid) — independent of spec.background */}
      {bg.type !== "none" && (
        <div className="absolute inset-0 pointer-events-none" style={{
          background: bg.type === "gradient"
            ? `linear-gradient(${bg.angle}deg, ${bg.color}${Math.round(bg.opacity * 255).toString(16).padStart(2, "0")} 0%, transparent 100%)`
            : bg.color,
          opacity: bg.type === "solid" ? bg.opacity : undefined,
          zIndex: 1,
        }} />
      )}

      {/* Spec-driven body — replaces the 800-line per-template switch */}
      {spec && (
        <SpecRenderer
          spec={spec}
          palette={c}
          cardInfo={info}
          design={specDesign}
          scale={scale}
          editMode={editMode}
          selectedElement={selectedElement}
          onSelectElement={onSelectElement as ((id: string) => void) | undefined}
        />
      )}

      {/* Pattern overlay */}
      {patternBg && (
        <div
          className="absolute pointer-events-none"
          style={{
            ...patternStyle(pat.placement),
            backgroundImage: patternBg,
            backgroundRepeat: "repeat",
            position: "absolute",
            zIndex: 15,
          }}
        />
      )}

      {/* Logo overlay — renders both source and icon logos with edge-aware positioning */}
      {(() => {
        const le = normalizeLogo(design, info);
        if (!le || le.visible === false || hidden.has("logo")) return null;

        const specLogoEl = spec?.elements.find((e: { id: string; type: string }) => e.id === "logo" && e.type === "image");

        const scale = szDims.w / 350;
        const logoOv: ElementStyle = eo["logo"] ?? {};

        const sizeOverride = logoOv.fontSize;
        const baseH = sizeOverride ?? (specLogoEl ? specLogoEl.height : le.height);
        const isSource = !!le.source;
        const elemW = isSource ? baseH * 3 : baseH;
        const elemH = baseH;

        // Calculate position from edge: 10px gap from border/edge
        const gap = 10;
        const bw = (bdr.sides !== "none" && bdr.width > 0) ? bdr.width : 0;
        let x: number, y: number;

        if (specLogoEl) {
          // Determine corner from spec position
          const isRight = specLogoEl.x >= 175;
          const isBottom = specLogoEl.y >= 100;
          x = isRight ? (350 - bw - gap - elemW) : (bw + gap);
          y = isBottom ? (200 - bw - gap - elemH) : (bw + gap);
        } else {
          x = le.x;
          y = le.y;
        }

        x += (logoOv.offsetX ?? 0);
        y += (logoOv.offsetY ?? 0);

        const logoBaseStyle: React.CSSProperties = {
          position: "absolute",
          left: x * scale,
          top: y * scale,
          width: elemW * scale,
          height: elemH * scale,
          zIndex: 20,
          opacity: (le.opacity ?? 1) * (logoOv.opacity ?? 1),
          transform: le.rotation ? `rotate(${le.rotation}deg)` : undefined,
          transformOrigin: "center",
        };
        const logoEditStyle: React.CSSProperties = editMode ? {
          cursor: "pointer",
          ...(selectedElement === "logo" && { outline: "2px dashed #6366f1", outlineOffset: "2px", borderRadius: "3px" }),
        } : {};

        return (
          <div
            style={{ ...logoBaseStyle, ...logoEditStyle }}
            onClick={editMode ? (e: React.MouseEvent) => { e.stopPropagation(); onSelectElement?.("logo"); } : undefined}
            data-eid={editMode ? "logo" : undefined}
          >
            {le.source ? (
              <div
                role="img"
                aria-label="Logo"
                style={{
                  width: "100%",
                  height: "100%",
                  backgroundImage: `url(${le.source})`,
                  backgroundSize: "contain",
                  backgroundPosition: "center",
                  backgroundRepeat: "no-repeat",
                }}
              />
            ) : le.iconId && le.iconId !== "none" ? (
              <LogoIcon
                logoId={le.iconId}
                letter={companyLetter}
                size={elemH * scale}
                color={c.accent}
                bgColor={c.accent + "22"}
              />
            ) : null}
          </div>
        );
      })()}

      {/* QR code — rendered from the unified QrElement shape (Task #11).
          Selectable in edit mode like the logo (clickable + outline). */}
      {qrDataUrl && (() => {
        const qe = normalizeQr(design, size);
        if (!qe || qe.visible === false || qe.enabled === false) return null;
        const scale = szDims.w / 350;
        const qrEditStyle: React.CSSProperties = editMode ? {
          cursor: "pointer",
          ...(selectedElement === "qr" && { outline: "2px dashed #6366f1", outlineOffset: "2px", borderRadius: "5px" }),
        } : {};
        return (
          <div
            style={{
              position: "absolute",
              left: qe.x * scale,
              top: qe.y * scale,
              width: qe.width * scale,
              height: qe.height * scale,
              opacity: qe.opacity ?? 1,
              transform: qe.rotation ? `rotate(${qe.rotation}deg)` : undefined,
              transformOrigin: "center",
              zIndex: 25,
              ...qrEditStyle,
            }}
            onClick={editMode ? (e: React.MouseEvent) => { e.stopPropagation(); onSelectElement?.("qr"); } : undefined}
            data-eid={editMode ? "qr" : undefined}
          >
            <img
              src={qrDataUrl}
              alt="QR"
              style={{
                width: "100%",
                height: "100%",
                borderRadius: 3,
              }}
            />
          </div>
        );
      })()}

      {/* Extra images — rendered with unified (x, y, width, height) (Task #12) */}
      {info.extraImages?.map((img) => {
        const ie = normalizeExtraImage(img, size);
        if (!ie.visible) return null;
        const scale = szDims.w / 350;
        return (
          <div
            key={img.id}
            style={{
              position: "absolute",
              left: ie.x * scale,
              top: ie.y * scale,
              width: ie.width * scale,
              height: ie.height * scale,
              opacity: ie.opacity,
              transform: ie.rotation ? `rotate(${ie.rotation}deg)` : undefined,
              transformOrigin: "center",
              zIndex: 22,
            }}
          >
            <img
              src={img.dataUrl}
              alt=""
              style={{
                width: "100%",
                height: "100%",
                objectFit: "contain",
                borderRadius: 3,
              }}
            />
          </div>
        );
      })}
    </div>
  );
}
