
import { useState, useEffect } from "react";
import QRCode from "qrcode";
import type { CardDesign, CardInfo, PatternPlacement, LogoPlacement, ElementStyle } from "@/lib/types";
import { getPatternSVG, type PatternId } from "@/lib/patterns";
import { LogoIcon, type LogoId } from "@/lib/logos";

/** Element IDs that can be selected in edit mode */
export type EditableElementId = "name" | "title" | "company" | "tagline" | "contacts" | "email" | "phone" | "website" | "address" | "logo";

interface BusinessCardProps {
  design: CardDesign;
  info: CardInfo;
  size?: "small" | "medium" | "large";
  onClick?: () => void;
  selected?: boolean;
  editMode?: boolean;
  selectedElement?: EditableElementId | null;
  onSelectElement?: (id: EditableElementId) => void;
  ref?: React.Ref<HTMLDivElement>;
}

const fontMap = { sans: "font-sans", serif: "font-serif", mono: "font-mono" };

// ── Luminance & contrast helpers ──────────────────────────────────────
function normalizeHex(hex: string): string {
  let h = hex.replace("#", "");
  if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
  if (h.length !== 6) return "000000"; // fallback for malformed
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
  // Fall back to white or black depending on bg luminance
  return luminance(bgColor) > 0.4 ? "#111827" : "#f9fafb";
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

// ── Logo component ────────────────────────────────────────────────────
function CardLogo({ logoSize, color, bgColor, logoId, letter, customLogoUrl }: {
  logoSize: number; color: string; bgColor?: string; logoId: string; letter: string; customLogoUrl?: string;
}) {
  if (customLogoUrl) {
    // For custom logos, allow wider containers so landscape logos aren't tiny.
    // Use logoSize as the height, width up to 3× for wide logos.
    const maxW = logoSize * 3;
    return (
      <div className="rounded shrink-0"
        role="img" aria-label="Logo"
        style={{
          width: maxW, height: logoSize, minHeight: logoSize,
          backgroundImage: `url(${customLogoUrl})`,
          backgroundSize: "contain",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
        }} />
    );
  }
  if (logoId && logoId !== "none") {
    return <LogoIcon logoId={logoId as LogoId} letter={letter} size={logoSize} color={color} bgColor={bgColor} />;
  }
  const fs = logoSize <= 22 ? "text-[7px]" : logoSize <= 28 ? "text-[8px]" : "text-[10px]";
  return (
    <div className={`rounded flex items-center justify-center ${fs} font-bold shrink-0`}
      style={{ width: logoSize, height: logoSize, minWidth: logoSize, minHeight: logoSize, backgroundColor: bgColor || color + "22", color, border: `1.5px solid ${color}44` }}>
      {letter}
    </div>
  );
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
    default:              return { top: 0, left: 0, right: 0, bottom: 0 }; // "full"
  }
}

// ── Logo placement → CSS positioning ──────────────────────────────────
function logoPosition(placement: LogoPlacement): React.CSSProperties {
  const base: React.CSSProperties = { position: "absolute", zIndex: 20 };
  switch (placement) {
    case "top-left":      return { ...base, top: 10, left: 12 };
    case "top-right":     return { ...base, top: 10, right: 12 };
    case "top-center":    return { ...base, top: 10, left: "50%", transform: "translateX(-50%)" };
    case "center-left":   return { ...base, top: "50%", left: 12, transform: "translateY(-50%)" };
    case "center":        return { ...base, top: "50%", left: "50%", transform: "translate(-50%, -50%)" };
    case "center-right":  return { ...base, top: "50%", right: 12, transform: "translateY(-50%)" };
    case "bottom-left":   return { ...base, bottom: 10, left: 12 };
    case "bottom-right":  return { ...base, bottom: 10, right: 12 };
    case "bottom-center": return { ...base, bottom: 10, left: "50%", transform: "translateX(-50%)" };
    default:              return { ...base, top: 10, left: 12 };
  }
}

export default function BusinessCard({ design: rawDesign, info, size = "medium", onClick, selected = false, editMode = false, selectedElement = null, onSelectElement, ref }: BusinessCardProps) {
  const design = norm(rawDesign);
  const { templateId, font } = design;
  const f = fontMap[font];

  // ── Element overrides helper ────────────────────────────────────────
  const eo = design.elementOverrides ?? {};
  /** Wrap a card element to make it editable. Returns extra style + props. */
  function elProps(id: EditableElementId, baseStyle: React.CSSProperties): { style: React.CSSProperties; onClick?: React.MouseEventHandler; "data-eid"?: string } {
    const ov: ElementStyle = eo[id] ?? {};
    const merged: React.CSSProperties = {
      ...baseStyle,
      ...(ov.fontSize != null && { fontSize: `${ov.fontSize}px` }),
      ...(ov.color && { color: ov.color }),
      transform: (ov.offsetX || ov.offsetY) ? `translate(${ov.offsetX ?? 0}px, ${ov.offsetY ?? 0}px)` : undefined,
      position: (ov.offsetX || ov.offsetY) ? "relative" : undefined,
    };
    if (!editMode) return { style: merged };
    return {
      style: {
        ...merged,
        cursor: "pointer",
        ...(selectedElement === id && { outline: "2px dashed #6366f1", outlineOffset: "2px", borderRadius: "3px" }),
      },
      onClick: (e: React.MouseEvent) => { e.stopPropagation(); onSelectElement?.(id); },
      "data-eid": id,
    };
  }

  // ── Contrast-safe colors ────────────────────────────────────────────
  // Override color roles so text is always readable on its background
  const raw = design.colors;
  const c = {
    ...raw,
    primary: ensureContrast(raw.primary, raw.background, raw.secondary),
    secondary: ensureContrast(raw.secondary, raw.background, raw.primary),
    text: ensureContrast(raw.text, raw.background, raw.primary),
  };
  // For templates that put text on backgroundAlt (sidebars/headers)
  const onAlt = ensureContrast(raw.background, raw.backgroundAlt, raw.primary);
  const accentOnAlt = ensureContrast(raw.accent, raw.backgroundAlt, raw.background);
  // For wide-header: text on accent background
  const onAccent = ensureContrast(raw.background, raw.accent, raw.primary);
  const companyLetter = (info.company || info.name || "C").charAt(0);

  // ── Resolved specs ──────────────────────────────────────────────────
  const pat = design.pattern;
  const bg = design.backgroundEffect;
  const logo = design.logo;
  const bdr = design.border;
  const qr = design.qr;

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
  const sz = {
    small:  { card: "", name: "text-sm", title: "text-[9px]", detail: "text-[7px]", pad: "p-4", gap: "gap-0.5" },
    medium: { card: "", name: "text-base", title: "text-[10px]", detail: "text-[8px]", pad: "p-5", gap: "gap-1" },
    large:  { card: "", name: "text-2xl", title: "text-sm", detail: "text-xs", pad: "p-7", gap: "gap-1.5" },
  }[size];

  // Spacing modifies inner padding
  const spacingPad = {
    compact:  { small: "p-3", medium: "p-4", large: "p-5" },
    normal:   { small: "p-4", medium: "p-5", large: "p-7" },
    spacious: { small: "p-5", medium: "p-6", large: "p-9" },
  }[design.spacing][size];
  // Override template padding with spacing-aware padding
  const szPad = spacingPad;

  // ── Font-size override styles (inline fontSize beats Tailwind class) ─
  const fs = design.fontSizes;
  const fso = {
    name:   fs?.name   != null ? { fontSize: `${fs.name}px` }   as React.CSSProperties : {} as React.CSSProperties,
    title:  fs?.title  != null ? { fontSize: `${fs.title}px` }  as React.CSSProperties : {} as React.CSSProperties,
    detail: fs?.detail != null ? { fontSize: `${fs.detail}px` } as React.CSSProperties : {} as React.CSSProperties,
  };

  const borderRadiusMap = { none: "rounded-none", small: "rounded", medium: "rounded-lg", large: "rounded-2xl" };
  const br = borderRadiusMap[design.borderRadius];

  // ── Hidden fields ────────────────────────────────────────────────────
  const hidden = new Set(design.hiddenFields ?? []);

  // ── Display values ──────────────────────────────────────────────────
  const displayName = hidden.has("name") ? "" : (info.name || "Your Name");
  const displayTitle = hidden.has("title") ? "" : (info.title || "Job Title");
  const displayCompany = hidden.has("company") ? "" : (info.company || "Company");
  const showTagline = !hidden.has("tagline");
  const contactItems: { text: string; eid: EditableElementId }[] = [
    !hidden.has("email") ? { text: info.email || "email@example.com", eid: "email" } : null,
    !hidden.has("phone") ? { text: info.phone || "(555) 123-4567", eid: "phone" } : null,
    !hidden.has("website") && info.website ? { text: info.website, eid: "website" } : null,
    !hidden.has("address") && info.address ? { text: info.address, eid: "address" } : null,
    ...(info.customLines || []).filter(Boolean).map((l) => ({ text: l, eid: "contacts" as EditableElementId })),
  ].filter((x): x is { text: string; eid: EditableElementId } => x !== null);

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

  // ── Logo size in px ─────────────────────────────────────────────────
  const logoSizeMap = {
    small:  { small: 18, medium: 22, large: 28 },
    medium: { small: 22, medium: 28, large: 36 },
    large:  { small: 32, medium: 42, large: 56 },
  };
  const logoPxBase = logoSizeMap[size][logo.size];
  const logoSizeOv = (design.elementOverrides?.["logo"] as ElementStyle | undefined)?.fontSize;
  const logoPx = logoSizeOv != null ? logoSizeOv : logoPxBase;

  const wrap = `${f} ${br} overflow-hidden relative cursor-pointer transition-all duration-200 shadow-lg hover:shadow-xl ${selected ? "ring-2 ring-indigo-500 ring-offset-1 shadow-indigo-200" : "hover:scale-[1.02]"}`;
  const wrapStyle: React.CSSProperties = { width: szDims.w, height: szDims.h };

  // ── Template rendering (text layout only — no logo) ─────────────────
  const renderTemplate = () => {
    switch (templateId) {

      case "minimal-clean":
        return (
          <div className={`w-full h-full ${szPad} flex flex-col justify-center`} style={{ backgroundColor: c.background }}>
            <div className={`${sz.detail} font-medium tracking-wider uppercase mb-1`} {...elProps("company", { ...fso.detail, color: c.text  })}>{displayCompany}</div>
            <div className={`${sz.name} font-semibold mt-1`} {...elProps("name", { ...fso.name, color: c.primary  })}>{displayName}</div>
            <div className={`${sz.title} mt-0.5`} {...elProps("title", { ...fso.title, color: c.secondary  })}>{displayTitle}</div>
            {showTagline && info.tagline && <div className={`${sz.detail} italic mt-0.5`} {...elProps("tagline", { ...fso.detail, color: c.text  })}>{info.tagline}</div>}
            <div className="w-8 h-[1px] my-2" style={{ backgroundColor: c.accent }} />
            <div className={`${sz.gap} flex flex-col`}>
              {contactItems.map((ci, i) => <div key={i} className={sz.detail} {...elProps(ci.eid, { ...fso.detail, color: c.text  })}>{ci.text}</div>)}
            </div>
          </div>
        );

      case "bold-header":
        return (
          <div className="w-full h-full flex flex-col" style={{ backgroundColor: c.background }}>
            <div className={`${szPad} pb-2`} style={{ backgroundColor: c.backgroundAlt }}>
              <div className={`${sz.name} font-bold tracking-wide`} {...elProps("name", { ...fso.name, color: onAlt  })}>{displayName}</div>
              <div className={`${sz.title} mt-0.5`} {...elProps("title", { ...fso.title, color: accentOnAlt  })}>{displayTitle}</div>
            </div>
            <div className={`flex-1 ${szPad} pt-2 flex flex-col justify-center`}>
              <div className={`${sz.title} font-semibold mb-1`} {...elProps("company", { ...fso.title, color: c.primary  })}>{displayCompany}</div>
              {showTagline && info.tagline && <div className={`${sz.detail} italic mb-1`} {...elProps("tagline", { ...fso.detail, color: c.text  })}>{info.tagline}</div>}
              <div className={`${sz.gap} flex flex-col`}>
                {contactItems.map((ci, i) => <div key={i} className={sz.detail} {...elProps(ci.eid, { ...fso.detail, color: c.text  })}>{ci.text}</div>)}
              </div>
            </div>
          </div>
        );

      case "split-sidebar":
        return (
          <div className="w-full h-full flex">
            <div className={`w-[35%] h-full flex flex-col items-center justify-center ${szPad}`} style={{ backgroundColor: c.backgroundAlt }}>
              <div className={`${sz.name} font-bold text-center leading-tight`} {...elProps("name", { ...fso.name, color: onAlt })}>
                {displayName.split(" ").map((w, i) => <div key={i}>{w}</div>)}
              </div>
              <div className={`${sz.detail} mt-1 text-center opacity-80`} {...elProps("title", { ...fso.detail, color: onAlt })}>{displayTitle}</div>
            </div>
            <div className={`flex-1 flex flex-col justify-center ${szPad}`} style={{ backgroundColor: c.background }}>
              <div className={`${sz.title} font-semibold mb-1`} {...elProps("company", { ...fso.title, color: c.primary  })}>{displayCompany}</div>
              {showTagline && info.tagline && <div className={`${sz.detail} italic mb-2`} {...elProps("tagline", { ...fso.detail, color: c.secondary  })}>{info.tagline}</div>}
              <div className="w-6 h-[1px] mb-2" style={{ backgroundColor: c.accent }} />
              <div className={`${sz.gap} flex flex-col`}>
                {contactItems.map((ci, i) => <div key={i} className={sz.detail} {...elProps(ci.eid, { ...fso.detail, color: c.text  })}>{ci.text}</div>)}
              </div>
            </div>
          </div>
        );

      case "centered-classic":
        return (
          <div className={`w-full h-full ${szPad} flex flex-col items-center justify-center text-center`} style={{ backgroundColor: c.background }}>
            <div className={`${sz.name} font-bold tracking-wide uppercase`} {...elProps("name", { ...fso.name, color: c.primary  })}>{displayName}</div>
            <div className={`${sz.title} mt-0.5 tracking-wider`} {...elProps("title", { ...fso.title, color: c.secondary  })}>{displayTitle}</div>
            <div className="w-10 h-[1px] my-2" style={{ backgroundColor: c.accent }} />
            <div className={`${sz.title} font-medium`} {...elProps("company", { ...fso.title, color: c.primary  })}>{displayCompany}</div>
            {showTagline && info.tagline && <div className={`${sz.detail} italic mt-0.5`} {...elProps("tagline", { ...fso.detail, color: c.text  })}>{info.tagline}</div>}
            <div className={`mt-2 ${sz.gap} flex flex-col items-center`}>
              {contactItems.map((ci, i) => <div key={i} className={sz.detail} {...elProps(ci.eid, { ...fso.detail, color: c.text  })}>{ci.text}</div>)}
            </div>
          </div>
        );

      case "modern-left":
        return (
          <div className="w-full h-full flex" style={{ backgroundColor: c.background }}>
            <div className="w-1 h-full" style={{ backgroundColor: c.accent }} />
            <div className={`flex-1 ${szPad} flex flex-col justify-center`}>
              <div className={`${sz.detail} font-medium tracking-wider uppercase`} {...elProps("company", { ...fso.detail, color: c.secondary  })}>{displayCompany}</div>
              <div className={`${sz.name} font-semibold mt-2`} {...elProps("name", { ...fso.name, color: c.primary  })}>{displayName}</div>
              <div className={`${sz.title} mt-0.5`} {...elProps("title", { ...fso.title, color: c.secondary  })}>{displayTitle}</div>
              {showTagline && info.tagline && <div className={`${sz.detail} italic mt-0.5`} {...elProps("tagline", { ...fso.detail, color: c.text  })}>{info.tagline}</div>}
              <div className={`mt-2 ${sz.gap} flex flex-col`}>
                {contactItems.map((ci, i) => <div key={i} className={sz.detail} {...elProps(ci.eid, { ...fso.detail, color: c.text  })}>{ci.text}</div>)}
              </div>
            </div>
          </div>
        );

      case "elegant-serif":
        return (
          <div className={`w-full h-full ${szPad} flex flex-col items-center justify-center text-center`} style={{ backgroundColor: c.background }}>
            <div className={`${sz.detail} tracking-[0.3em] uppercase`} {...elProps("company", { ...fso.detail, color: c.accent  })}>{displayCompany}</div>
            <div className="w-8 h-[1px] my-1.5" style={{ backgroundColor: c.accent, opacity: 0.5 }} />
            <div className={`${sz.name} font-light italic mt-2`} {...elProps("name", { ...fso.name, color: c.primary  })}>{displayName}</div>
            <div className={`${sz.detail} mt-0.5 tracking-wider`} {...elProps("title", { ...fso.detail, color: c.secondary })}>{displayTitle}</div>
            {showTagline && info.tagline && <div className={`${sz.detail} mt-1.5 italic opacity-70`} {...elProps("tagline", { ...fso.detail, color: c.text })}>&ldquo;{info.tagline}&rdquo;</div>}
            <div className="w-8 h-[1px] my-1.5" style={{ backgroundColor: c.accent, opacity: 0.5 }} />
            <div className={`${sz.gap} flex flex-col items-center`}>
              {contactItems.map((ci, i) => <div key={i} className={sz.detail} {...elProps(ci.eid, { ...fso.detail, color: c.text  })}>{ci.text}</div>)}
            </div>
          </div>
        );

      case "dark-gradient":
        return (
          <div className={`w-full h-full ${szPad} flex flex-col justify-end`} style={{ background: `linear-gradient(135deg, ${c.background} 0%, ${c.backgroundAlt} 100%)` }}>
            <div className={`${sz.detail} font-medium uppercase tracking-wider mb-auto pt-1`} {...elProps("company", { ...fso.detail, color: c.text  })}>{displayCompany}</div>
            <div className={`${sz.name} font-bold`} {...elProps("name", { ...fso.name, color: c.primary  })}>{displayName}</div>
            <div className={`${sz.title} mt-0.5`} {...elProps("title", { ...fso.title, color: c.secondary  })}>{displayTitle}</div>
            {showTagline && info.tagline && <div className={`${sz.detail} italic mt-1`} {...elProps("tagline", { ...fso.detail, color: c.text  })}>{info.tagline}</div>}
            <div className={`mt-2 flex flex-wrap gap-x-3 ${sz.gap}`}>
              {contactItems.map((ci, i) => <span key={i} className={sz.detail} {...elProps(ci.eid, { ...fso.detail, color: c.text  })}>{ci.text}</span>)}
            </div>
          </div>
        );

      case "top-accent":
        return (
          <div className="w-full h-full flex flex-col" style={{ backgroundColor: c.background }}>
            <div className="h-1.5" style={{ backgroundColor: c.accent }} />
            <div className={`flex-1 ${szPad} pt-3 flex flex-col`}>
              <div>
                <div className={`${sz.name} font-bold`} {...elProps("name", { ...fso.name, color: c.primary  })}>{displayName}</div>
                <div className={`${sz.title} mt-0.5`} {...elProps("title", { ...fso.title, color: c.secondary  })}>{displayTitle}</div>
                <div className={`${sz.detail} font-medium mt-0.5`} {...elProps("company", { ...fso.detail, color: c.text  })}>{displayCompany}</div>
                {showTagline && info.tagline && <div className={`${sz.detail} italic mt-0.5`} {...elProps("tagline", { ...fso.detail, color: c.text  })}>{info.tagline}</div>}
              </div>
              <div className="mt-auto flex justify-between">
                <div className={`${sz.gap} flex flex-col`}>
                  {contactItems.slice(0, 2).map((ci, i) => <div key={i} className={sz.detail} {...elProps(ci.eid, { ...fso.detail, color: c.text  })}>{ci.text}</div>)}
                </div>
                <div className={`${sz.gap} flex flex-col text-right`}>
                  {contactItems.slice(2).map((ci, i) => <div key={i} className={sz.detail} {...elProps(ci.eid, { ...fso.detail, color: c.text  })}>{ci.text}</div>)}
                </div>
              </div>
            </div>
          </div>
        );

      case "corner-frame":
        return (
          <div className={`w-full h-full ${szPad} flex flex-col justify-center`} style={{ backgroundColor: c.background }}>
            <div className="absolute top-2 left-2 w-4 h-4 border-t-2 border-l-2" style={{ borderColor: c.accent }} />
            <div className="absolute top-2 right-2 w-4 h-4 border-t-2 border-r-2" style={{ borderColor: c.accent }} />
            <div className="absolute bottom-2 left-2 w-4 h-4 border-b-2 border-l-2" style={{ borderColor: c.accent }} />
            <div className="absolute bottom-2 right-2 w-4 h-4 border-b-2 border-r-2" style={{ borderColor: c.accent }} />
            <div className={`${sz.detail} tracking-wider uppercase font-medium mb-2`} {...elProps("company", { ...fso.detail, color: c.secondary  })}>{displayCompany}</div>
            <div className={`${sz.name} font-semibold`} {...elProps("name", { ...fso.name, color: c.primary  })}>{displayName}</div>
            <div className={`${sz.title} mt-0.5`} {...elProps("title", { ...fso.title, color: c.secondary  })}>{displayTitle}</div>
            {showTagline && info.tagline && <div className={`${sz.detail} italic mt-0.5`} {...elProps("tagline", { ...fso.detail, color: c.text  })}>{info.tagline}</div>}
            <div className={`mt-2 ${sz.gap} flex flex-col`}>
              {contactItems.map((ci, i) => <div key={i} className={sz.detail} {...elProps(ci.eid, { ...fso.detail, color: c.text  })}>{ci.text}</div>)}
            </div>
          </div>
        );

      case "stacked-bold":
        return (
          <div className={`w-full h-full ${szPad} flex flex-col justify-center`} style={{ backgroundColor: c.background }}>
            <div className={`${size === "large" ? "text-2xl" : size === "medium" ? "text-xl" : "text-lg"} font-black uppercase tracking-tight leading-none`} {...elProps("name", { ...fso.name, color: c.accent })}>
              {displayName}
            </div>
            <div className={`${sz.title} mt-1 font-medium uppercase tracking-wider`} {...elProps("title", { ...fso.title, color: c.primary  })}>{displayTitle}</div>
            <div className={`${sz.detail} mt-0.5`} {...elProps("company", { ...fso.detail, color: c.text  })}>{displayCompany}</div>
            {showTagline && info.tagline && <div className={`${sz.detail} italic mt-0.5`} {...elProps("tagline", { ...fso.detail, color: c.accent, opacity: 0.7  })}>{info.tagline}</div>}
            <div className="w-full h-[2px] my-2" style={{ backgroundColor: c.accent, opacity: 0.3 }} />
            <div className={`${sz.gap} flex flex-col`}>
              {contactItems.map((ci, i) => <div key={i} className={sz.detail} {...elProps(ci.eid, { ...fso.detail, color: c.text  })}>{ci.text}</div>)}
            </div>
          </div>
        );

      case "two-tone-split":
        return (
          <div className="w-full h-full flex flex-col">
            <div className={`h-[45%] ${szPad} pb-2 flex items-end`} style={{ backgroundColor: c.backgroundAlt }}>
              <div>
                <div className={`${sz.name} font-bold`} {...elProps("name", { ...fso.name, color: onAlt  })}>{displayName}</div>
                <div className={`${sz.title} mt-0.5`} {...elProps("title", { ...fso.title, color: accentOnAlt  })}>{displayTitle} · {displayCompany}</div>
              </div>
            </div>
            <div className={`flex-1 ${szPad} pt-2 flex flex-col justify-center`} style={{ backgroundColor: c.background }}>
              {showTagline && info.tagline && <div className={`${sz.detail} italic mb-1.5`} {...elProps("tagline", { ...fso.detail, color: c.secondary  })}>{info.tagline}</div>}
              <div className={`flex flex-wrap gap-x-4 ${sz.gap}`}>
                {contactItems.map((ci, i) => <span key={i} className={sz.detail} {...elProps(ci.eid, { ...fso.detail, color: c.text  })}>{ci.text}</span>)}
              </div>
            </div>
          </div>
        );

      case "mono-tech":
        return (
          <div className={`w-full h-full ${szPad} flex flex-col justify-center font-mono`} style={{ backgroundColor: c.background }}>
            <div className={`${sz.detail} uppercase tracking-widest`} {...elProps("company", { ...fso.detail, color: c.text  })}>{displayCompany}</div>
            <div className={`${sz.name} font-bold mt-2`} {...elProps("name", { ...fso.name, color: c.primary  })}>{displayName}</div>
            <div className={`${sz.title} mt-0.5`} {...elProps("title", { ...fso.title, color: c.secondary })}>// {displayTitle}</div>
            {showTagline && info.tagline && <div className={`${sz.detail} mt-0.5 opacity-70`} {...elProps("tagline", { ...fso.detail, color: c.text })}>/* {info.tagline} */</div>}
            <div className="w-full h-[1px] my-2" style={{ backgroundColor: c.accent, opacity: 0.3 }} />
            <div className={`${sz.gap} flex flex-col`}>
              {contactItems.map((ci, i) => <div key={i} className={sz.detail} {...elProps(ci.eid, { ...fso.detail, color: c.text })}><span style={{ color: c.accent }}>›</span> {ci.text}</div>)}
            </div>
          </div>
        );

      case "offset-minimal":
        return (
          <div className={`w-full h-full ${szPad} flex flex-col justify-between`} style={{ backgroundColor: c.background }}>
            <div className="flex justify-end">
              <div className="text-right">
                <div className={`${sz.detail} tracking-wider uppercase font-medium`} {...elProps("company", { ...fso.detail, color: c.secondary  })}>{displayCompany}</div>
                <div className={`${sz.gap} flex flex-col items-end mt-1`}>
                  {contactItems.map((ci, i) => <div key={i} className={sz.detail} {...elProps(ci.eid, { ...fso.detail, color: c.text  })}>{ci.text}</div>)}
                </div>
              </div>
            </div>
            <div>
              <div className={`${sz.name} font-semibold`} {...elProps("name", { ...fso.name, color: c.primary  })}>{displayName}</div>
              <div className={`${sz.title} mt-0.5`} {...elProps("title", { ...fso.title, color: c.secondary  })}>{displayTitle}</div>
              {showTagline && info.tagline && <div className={`${sz.detail} italic mt-0.5`} {...elProps("tagline", { ...fso.detail, color: c.text  })}>{info.tagline}</div>}
            </div>
          </div>
        );

      case "diagonal-accent":
        return (
          <div className={`w-full h-full ${szPad} flex flex-col justify-center`} style={{ backgroundColor: c.background }}>
            <div className="absolute top-0 right-0 w-20 h-20 overflow-hidden">
              <div className="absolute -top-10 -right-10 w-28 h-28 rotate-45" style={{ backgroundColor: c.accent, opacity: 0.15 }} />
            </div>
            <div className={`${sz.detail} font-medium tracking-wider uppercase mb-2`} {...elProps("company", { ...fso.detail, color: c.secondary  })}>{displayCompany}</div>
            <div className={`${sz.name} font-bold relative z-10`} {...elProps("name", { ...fso.name, color: c.primary  })}>{displayName}</div>
            <div className={`${sz.title} mt-0.5 relative z-10`} {...elProps("title", { ...fso.title, color: c.secondary  })}>{displayTitle}</div>
            {showTagline && info.tagline && <div className={`${sz.detail} italic mt-0.5 relative z-10`} {...elProps("tagline", { ...fso.detail, color: c.text  })}>{info.tagline}</div>}
            <div className={`mt-2 ${sz.gap} flex flex-col relative z-10`}>
              {contactItems.map((ci, i) => <div key={i} className={sz.detail} {...elProps(ci.eid, { ...fso.detail, color: c.text  })}>{ci.text}</div>)}
            </div>
          </div>
        );

      case "card-border":
        return (
          <div className={`w-full h-full ${szPad} flex flex-col items-center justify-center text-center`} style={{ backgroundColor: c.background }}>
            <div className="absolute inset-2 rounded border" style={{ borderColor: c.accent + "66" }} />
            <div className={`${sz.name} font-semibold relative z-10`} {...elProps("name", { ...fso.name, color: c.primary  })}>{displayName}</div>
            <div className={`${sz.title} mt-0.5 relative z-10`} {...elProps("title", { ...fso.title, color: c.secondary  })}>{displayTitle}</div>
            <div className={`${sz.detail} font-medium mt-0.5 relative z-10`} {...elProps("company", { ...fso.detail, color: c.text  })}>{displayCompany}</div>
            {showTagline && info.tagline && <div className={`${sz.detail} italic mt-0.5 relative z-10`} {...elProps("tagline", { ...fso.detail, color: c.text  })}>{info.tagline}</div>}
            <div className="w-8 h-[1px] my-1.5 relative z-10" style={{ backgroundColor: c.accent }} />
            <div className={`${sz.gap} flex flex-col items-center relative z-10`}>
              {contactItems.map((ci, i) => <div key={i} className={sz.detail} {...elProps(ci.eid, { ...fso.detail, color: c.text  })}>{ci.text}</div>)}
            </div>
          </div>
        );

      case "bottom-heavy":
        return (
          <div className={`w-full h-full ${szPad} flex flex-col justify-between`} style={{ backgroundColor: c.background }}>
            <div className={`${sz.detail} tracking-wider uppercase font-medium`} {...elProps("company", { ...fso.detail, color: c.text  })}>{displayCompany}</div>
            <div>
              <div className={`${sz.name} font-bold`} {...elProps("name", { ...fso.name, color: c.primary  })}>{displayName}</div>
              <div className={`${sz.title} mt-0.5`} {...elProps("title", { ...fso.title, color: c.secondary  })}>{displayTitle}</div>
              {showTagline && info.tagline && <div className={`${sz.detail} italic mt-0.5`} {...elProps("tagline", { ...fso.detail, color: c.text  })}>{info.tagline}</div>}
              <div className="w-10 h-[1px] my-1.5" style={{ backgroundColor: c.accent }} />
              <div className={`${sz.gap} flex flex-col`}>
                {contactItems.map((ci, i) => <div key={i} className={sz.detail} {...elProps(ci.eid, { ...fso.detail, color: c.text  })}>{ci.text}</div>)}
              </div>
            </div>
          </div>
        );

      case "logo-centered":
        return (
          <div className={`w-full h-full ${szPad} flex flex-col items-center justify-center text-center`} style={{ backgroundColor: c.background }}>
            <div className={`${sz.detail} tracking-[0.2em] uppercase font-medium`} {...elProps("company", { ...fso.detail, color: c.secondary  })}>{displayCompany}</div>
            <div className={`${sz.name} font-semibold mt-1.5`} {...elProps("name", { ...fso.name, color: c.primary  })}>{displayName}</div>
            <div className={`${sz.title} mt-0.5`} {...elProps("title", { ...fso.title, color: c.secondary  })}>{displayTitle}</div>
            {showTagline && info.tagline && <div className={`${sz.detail} italic mt-0.5`} {...elProps("tagline", { ...fso.detail, color: c.text  })}>{info.tagline}</div>}
            <div className={`mt-2 flex flex-wrap gap-x-3 justify-center ${sz.gap}`}>
              {contactItems.map((ci, i) => <span key={i} className={sz.detail} {...elProps(ci.eid, { ...fso.detail, color: c.text  })}>{ci.text}</span>)}
            </div>
          </div>
        );

      case "horizontal-rule":
        return (
          <div className={`w-full h-full ${szPad} flex flex-col justify-center`} style={{ backgroundColor: c.background }}>
            <div>
              <div className={`${sz.name} font-semibold`} {...elProps("name", { ...fso.name, color: c.primary  })}>{displayName}</div>
              <div className={`${sz.title}`} {...elProps("title", { ...fso.title, color: c.secondary  })}>{displayTitle} · {displayCompany}</div>
            </div>
            {showTagline && info.tagline && <div className={`${sz.detail} italic mt-0.5`} {...elProps("tagline", { ...fso.detail, color: c.text  })}>{info.tagline}</div>}
            <div className="w-full h-[1px] my-2" style={{ backgroundColor: c.accent }} />
            <div className="flex justify-between">
              <div className={`${sz.gap} flex flex-col`}>
                {contactItems.slice(0, 2).map((ci, i) => <div key={i} className={sz.detail} {...elProps(ci.eid, { ...fso.detail, color: c.text  })}>{ci.text}</div>)}
              </div>
              <div className={`${sz.gap} flex flex-col text-right`}>
                {contactItems.slice(2).map((ci, i) => <div key={i} className={sz.detail} {...elProps(ci.eid, { ...fso.detail, color: c.text  })}>{ci.text}</div>)}
              </div>
            </div>
          </div>
        );

      case "sidebar-dark":
        return (
          <div className="w-full h-full flex">
            <div className="w-[18%] h-full" style={{ backgroundColor: c.backgroundAlt }} />
            <div className={`flex-1 ${szPad} flex flex-col justify-center`} style={{ backgroundColor: c.background }}>
              <div className={`${sz.name} font-semibold`} {...elProps("name", { ...fso.name, color: c.primary  })}>{displayName}</div>
              <div className={`${sz.title} mt-0.5`} {...elProps("title", { ...fso.title, color: c.secondary  })}>{displayTitle}</div>
              <div className={`${sz.detail} font-medium mt-0.5`} {...elProps("company", { ...fso.detail, color: c.text  })}>{displayCompany}</div>
              {showTagline && info.tagline && <div className={`${sz.detail} italic mt-0.5`} {...elProps("tagline", { ...fso.detail, color: c.text  })}>{info.tagline}</div>}
              <div className="w-6 h-[1px] my-1.5" style={{ backgroundColor: c.accent }} />
              <div className={`${sz.gap} flex flex-col`}>
                {contactItems.map((ci, i) => <div key={i} className={sz.detail} {...elProps(ci.eid, { ...fso.detail, color: c.text  })}>{ci.text}</div>)}
              </div>
            </div>
          </div>
        );

      case "asymmetric-blocks":
        return (
          <div className={`w-full h-full flex flex-col justify-center ${szPad}`} style={{ backgroundColor: c.background }}>
            <div className="absolute top-0 left-0 w-[40%] h-[40%]" style={{ backgroundColor: c.accent }} />
            <div className="relative z-10 ml-auto w-[55%]">
              <div className={`${sz.name} font-bold`} {...elProps("name", { ...fso.name, color: c.primary  })}>{displayName}</div>
              <div className={`${sz.title} mt-0.5`} {...elProps("title", { ...fso.title, color: c.secondary  })}>{displayTitle}</div>
              <div className={`${sz.detail} font-medium mt-0.5`} {...elProps("company", { ...fso.detail, color: c.text  })}>{displayCompany}</div>
              {showTagline && info.tagline && <div className={`${sz.detail} italic mt-0.5`} {...elProps("tagline", { ...fso.detail, color: c.text  })}>{info.tagline}</div>}
            </div>
            <div className="relative z-10 mt-auto">
              <div className={`flex flex-wrap gap-x-3 ${sz.gap}`}>
                {contactItems.map((ci, i) => <span key={i} className={sz.detail} {...elProps(ci.eid, { ...fso.detail, color: c.text  })}>{ci.text}</span>)}
              </div>
            </div>
          </div>
        );

      case "floating-name":
        return (
          <div className={`w-full h-full ${szPad} flex flex-col justify-end relative`} style={{ backgroundColor: c.background }}>
            <div className="absolute inset-0 flex items-center justify-center overflow-hidden pointer-events-none">
              <div className={`${size === "large" ? "text-6xl" : size === "medium" ? "text-4xl" : "text-3xl"} font-black uppercase opacity-[0.04]`} style={{ color: c.primary }}>
                {displayName}
              </div>
            </div>
            <div className="relative z-10">
              <div className={`${sz.name} font-bold`} {...elProps("name", { ...fso.name, color: c.primary  })}>{displayName}</div>
              <div className={`${sz.title} mt-0.5`} {...elProps("title", { ...fso.title, color: c.secondary  })}>{displayTitle} · {displayCompany}</div>
            </div>
            {showTagline && info.tagline && <div className={`${sz.detail} italic mt-0.5 relative z-10`} {...elProps("tagline", { ...fso.detail, color: c.text  })}>{info.tagline}</div>}
            <div className="w-8 h-[1px] my-1.5 relative z-10" style={{ backgroundColor: c.accent }} />
            <div className={`${sz.gap} flex flex-col relative z-10`}>
              {contactItems.map((ci, i) => <div key={i} className={sz.detail} {...elProps(ci.eid, { ...fso.detail, color: c.text  })}>{ci.text}</div>)}
            </div>
          </div>
        );

      case "compact-modern":
        return (
          <div className={`w-full h-full ${szPad} flex flex-col justify-center`} style={{ backgroundColor: c.background }}>
            <div>
              <div className={`${sz.name} font-semibold leading-tight`} {...elProps("name", { ...fso.name, color: c.primary  })}>{displayName}</div>
              <div className={`${sz.detail}`} {...elProps("title", { ...fso.detail, color: c.secondary })}>{displayTitle} · {displayCompany}</div>
            </div>
            <div className="h-[1px] my-1.5" style={{ backgroundColor: c.accent + "44" }} />
            <div className="grid grid-cols-2 gap-x-3 gap-y-0.5">
              {contactItems.map((ci, i) => <div key={i} className={sz.detail} {...elProps(ci.eid, { ...fso.detail, color: c.text  })}>{ci.text}</div>)}
            </div>
            {showTagline && info.tagline && <div className={`${sz.detail} italic mt-1.5`} {...elProps("tagline", { ...fso.detail, color: c.secondary  })}>{info.tagline}</div>}
          </div>
        );

      case "wide-header":
        return (
          <div className="w-full h-full flex flex-col" style={{ backgroundColor: c.background }}>
            <div className={`${szPad} pb-2`} style={{ backgroundColor: c.accent }}>
              <div className={`${sz.name} font-bold`} {...elProps("name", { ...fso.name, color: onAccent  })}>{displayName}</div>
            </div>
            <div className={`flex-1 ${szPad} pt-2 flex flex-col justify-center`}>
              <div className={`${sz.title} font-medium`} {...elProps("title", { ...fso.title, color: c.secondary  })}>{displayTitle} · {displayCompany}</div>
              {showTagline && info.tagline && <div className={`${sz.detail} italic mt-0.5`} {...elProps("tagline", { ...fso.detail, color: c.text  })}>{info.tagline}</div>}
              <div className={`mt-2 ${sz.gap} flex flex-col`}>
                {contactItems.map((ci, i) => <div key={i} className={sz.detail} {...elProps(ci.eid, { ...fso.detail, color: c.text  })}>{ci.text}</div>)}
              </div>
            </div>
          </div>
        );

      case "luxury-frame":
        return (
          <div className={`w-full h-full ${szPad} flex flex-col items-center justify-center text-center`} style={{ backgroundColor: c.background }}>
            <div className="absolute inset-2.5 rounded border" style={{ borderColor: c.accent + "44" }} />
            <div className="absolute inset-3.5 rounded border" style={{ borderColor: c.accent + "22" }} />
            <div className={`${sz.name} font-light tracking-wider relative z-10`} {...elProps("name", { ...fso.name, color: c.primary  })}>{displayName}</div>
            <div className={`${sz.detail} tracking-[0.2em] uppercase mt-0.5 relative z-10`} {...elProps("title", { ...fso.detail, color: c.secondary })}>{displayTitle}</div>
            <div className={`${sz.detail} font-medium mt-0.5 relative z-10`} {...elProps("company", { ...fso.detail, color: c.text  })}>{displayCompany}</div>
            {showTagline && info.tagline && <div className={`${sz.detail} italic mt-0.5 relative z-10`} {...elProps("tagline", { ...fso.detail, color: c.text  })}>{info.tagline}</div>}
            <div className="flex gap-1 my-1.5 relative z-10">
              {[0, 1, 2].map((i) => <div key={i} className="w-1 h-1 rounded-full" style={{ backgroundColor: c.accent }} />)}
            </div>
            <div className={`${sz.gap} flex flex-col items-center relative z-10`}>
              {contactItems.map((ci, i) => <div key={i} className={sz.detail} {...elProps(ci.eid, { ...fso.detail, color: c.text  })}>{ci.text}</div>)}
            </div>
          </div>
        );

      case "playful-angle":
        return (
          <div className={`w-full h-full ${szPad} flex flex-col justify-center relative`} style={{ backgroundColor: c.background }}>
            <div className="absolute bottom-0 right-0 w-[45%] h-[55%]" style={{ backgroundColor: c.accent, opacity: 0.08, clipPath: "polygon(100% 0%, 0% 100%, 100% 100%)" }} />
            <div className={`${sz.detail} font-bold uppercase tracking-wider mb-2`} {...elProps("company", { ...fso.detail, color: c.accent  })}>{displayCompany}</div>
            <div className={`${sz.name} font-bold relative z-10`} {...elProps("name", { ...fso.name, color: c.primary  })}>{displayName}</div>
            <div className={`${sz.title} mt-0.5 relative z-10`} {...elProps("title", { ...fso.title, color: c.secondary  })}>{displayTitle}</div>
            {showTagline && info.tagline && <div className={`${sz.detail} italic mt-0.5 relative z-10`} {...elProps("tagline", { ...fso.detail, color: c.text  })}>{info.tagline}</div>}
            <div className={`mt-auto ${sz.gap} flex flex-col relative z-10`}>
              {contactItems.map((ci, i) => <div key={i} className={sz.detail} {...elProps(ci.eid, { ...fso.detail, color: c.text  })}>{ci.text}</div>)}
            </div>
          </div>
        );

      // ═══════════════════════════════════════════════════════════════
      //  NEW 22 LAYOUTS
      // ═══════════════════════════════════════════════════════════════

      case "right-sidebar":
        return (
          <div className="w-full h-full flex" style={{ backgroundColor: c.background }}>
            <div className={`flex-1 flex flex-col justify-center ${szPad}`}>
              <div className={`${sz.title} font-semibold mb-1`} {...elProps("company", { ...fso.title, color: c.primary })}>{displayCompany}</div>
              {showTagline && info.tagline && <div className={`${sz.detail} italic mb-2`} {...elProps("tagline", { ...fso.detail, color: c.secondary })}>{info.tagline}</div>}
              <div className="w-6 h-[1px] mb-2" style={{ backgroundColor: c.accent }} />
              <div className={`${sz.gap} flex flex-col`}>
                {contactItems.map((ci, i) => <div key={i} className={sz.detail} {...elProps(ci.eid, { ...fso.detail, color: c.text })}>{ci.text}</div>)}
              </div>
            </div>
            <div className={`w-[35%] h-full flex flex-col items-center justify-center ${szPad}`} style={{ backgroundColor: c.backgroundAlt }}>
              <div className={`${sz.name} font-bold text-center leading-tight`} {...elProps("name", { ...fso.name, color: onAlt })}>
                {displayName.split(" ").map((w, i) => <div key={i}>{w}</div>)}
              </div>
              <div className={`${sz.detail} mt-1 text-center opacity-80`} {...elProps("title", { ...fso.detail, color: onAlt })}>{displayTitle}</div>
            </div>
          </div>
        );

      case "bottom-bar":
        return (
          <div className="w-full h-full flex flex-col" style={{ backgroundColor: c.background }}>
            <div className={`flex-1 ${szPad} flex flex-col justify-center`}>
              <div className={`${sz.name} font-bold`} {...elProps("name", { ...fso.name, color: c.primary })}>{displayName}</div>
              <div className={`${sz.title} mt-0.5`} {...elProps("title", { ...fso.title, color: c.secondary })}>{displayTitle}</div>
              <div className={`${sz.title} font-medium mt-1`} {...elProps("company", { ...fso.title, color: c.primary })}>{displayCompany}</div>
              {showTagline && info.tagline && <div className={`${sz.detail} italic mt-0.5`} {...elProps("tagline", { ...fso.detail, color: c.text })}>{info.tagline}</div>}
            </div>
            <div className={`${szPad} pt-2 pb-2`} style={{ backgroundColor: c.backgroundAlt }}>
              <div className={`${sz.gap} flex flex-wrap gap-x-3`}>
                {contactItems.map((ci, i) => <div key={i} className={sz.detail} {...elProps(ci.eid, { ...fso.detail, color: onAlt })}>{ci.text}</div>)}
              </div>
            </div>
          </div>
        );

      case "sandwich-bands":
        return (
          <div className="w-full h-full flex flex-col" style={{ backgroundColor: c.background }}>
            <div className="h-[15%]" style={{ backgroundColor: c.backgroundAlt }} />
            <div className={`flex-1 ${szPad} flex flex-col justify-center items-center text-center`}>
              <div className={`${sz.name} font-bold`} {...elProps("name", { ...fso.name, color: c.primary })}>{displayName}</div>
              <div className={`${sz.title} mt-0.5`} {...elProps("title", { ...fso.title, color: c.secondary })}>{displayTitle}</div>
              <div className={`${sz.title} font-medium mt-1`} {...elProps("company", { ...fso.title, color: c.primary })}>{displayCompany}</div>
              {showTagline && info.tagline && <div className={`${sz.detail} italic mt-1`} {...elProps("tagline", { ...fso.detail, color: c.text })}>{info.tagline}</div>}
              <div className={`mt-2 ${sz.gap} flex flex-col items-center`}>
                {contactItems.map((ci, i) => <div key={i} className={sz.detail} {...elProps(ci.eid, { ...fso.detail, color: c.text })}>{ci.text}</div>)}
              </div>
            </div>
            <div className="h-[15%]" style={{ backgroundColor: c.backgroundAlt }} />
          </div>
        );

      case "vertical-split":
        return (
          <div className="w-full h-full flex" style={{ backgroundColor: c.background }}>
            <div className={`w-1/2 h-full flex flex-col justify-center ${szPad}`} style={{ backgroundColor: c.backgroundAlt }}>
              <div className={`${sz.name} font-bold leading-tight`} {...elProps("name", { ...fso.name, color: onAlt })}>{displayName}</div>
              <div className={`${sz.title} mt-0.5`} {...elProps("title", { ...fso.title, color: accentOnAlt })}>{displayTitle}</div>
              <div className={`${sz.title} font-medium mt-1`} {...elProps("company", { ...fso.title, color: onAlt })}>{displayCompany}</div>
              {showTagline && info.tagline && <div className={`${sz.detail} italic mt-1 opacity-80`} {...elProps("tagline", { ...fso.detail, color: onAlt })}>{info.tagline}</div>}
            </div>
            <div className={`w-1/2 h-full flex flex-col justify-center ${szPad}`}>
              <div className={`${sz.gap} flex flex-col`}>
                {contactItems.map((ci, i) => <div key={i} className={sz.detail} {...elProps(ci.eid, { ...fso.detail, color: c.text })}>{ci.text}</div>)}
              </div>
            </div>
          </div>
        );

      case "diagonal-split":
        return (
          <div className="w-full h-full relative" style={{ backgroundColor: c.background }}>
            <div className="absolute inset-0" style={{ backgroundColor: c.backgroundAlt, clipPath: "polygon(0 0, 100% 0, 0 100%)" }} />
            <div className={`absolute inset-0 ${szPad} flex flex-col justify-between`}>
              <div>
                <div className={`${sz.name} font-bold`} {...elProps("name", { ...fso.name, color: onAlt })}>{displayName}</div>
                <div className={`${sz.title} mt-0.5`} {...elProps("title", { ...fso.title, color: accentOnAlt })}>{displayTitle}</div>
                <div className={`${sz.title} font-medium mt-0.5`} {...elProps("company", { ...fso.title, color: onAlt })}>{displayCompany}</div>
              </div>
              <div className="self-end text-right">
                {showTagline && info.tagline && <div className={`${sz.detail} italic mb-1`} {...elProps("tagline", { ...fso.detail, color: c.text })}>{info.tagline}</div>}
                <div className={`${sz.gap} flex flex-col items-end`}>
                  {contactItems.map((ci, i) => <div key={i} className={sz.detail} {...elProps(ci.eid, { ...fso.detail, color: c.text })}>{ci.text}</div>)}
                </div>
              </div>
            </div>
          </div>
        );

      case "circle-motif":
        return (
          <div className={`w-full h-full ${szPad} flex flex-col justify-center relative`} style={{ backgroundColor: c.background }}>
            <div className="absolute right-[-10%] top-1/2 -translate-y-1/2 w-[60%] aspect-square rounded-full" style={{ backgroundColor: c.accent, opacity: 0.06 }} />
            <div className="relative z-10">
              <div className={`${sz.name} font-bold`} {...elProps("name", { ...fso.name, color: c.primary })}>{displayName}</div>
              <div className={`${sz.title} mt-0.5`} {...elProps("title", { ...fso.title, color: c.secondary })}>{displayTitle}</div>
              <div className={`${sz.title} font-medium mt-1`} {...elProps("company", { ...fso.title, color: c.primary })}>{displayCompany}</div>
              {showTagline && info.tagline && <div className={`${sz.detail} italic mt-1`} {...elProps("tagline", { ...fso.detail, color: c.text })}>{info.tagline}</div>}
              <div className="w-8 h-[1px] my-2" style={{ backgroundColor: c.accent }} />
              <div className={`${sz.gap} flex flex-col`}>
                {contactItems.map((ci, i) => <div key={i} className={sz.detail} {...elProps(ci.eid, { ...fso.detail, color: c.text })}>{ci.text}</div>)}
              </div>
            </div>
          </div>
        );

      case "badge-emblem":
        return (
          <div className={`w-full h-full ${szPad} flex flex-col items-center justify-center text-center`} style={{ backgroundColor: c.background }}>
            <div className="w-12 h-12 rounded-full border-2 flex items-center justify-center mb-2" style={{ borderColor: c.accent, color: c.accent }}>
              <span className="text-xs font-bold">{companyLetter}</span>
            </div>
            <div className={`${sz.name} font-bold`} {...elProps("name", { ...fso.name, color: c.primary })}>{displayName}</div>
            <div className={`${sz.title} mt-0.5`} {...elProps("title", { ...fso.title, color: c.secondary })}>{displayTitle}</div>
            <div className={`${sz.detail} font-medium mt-0.5`} {...elProps("company", { ...fso.detail, color: c.primary })}>{displayCompany}</div>
            {showTagline && info.tagline && <div className={`${sz.detail} italic mt-1`} {...elProps("tagline", { ...fso.detail, color: c.text })}>{info.tagline}</div>}
            <div className={`mt-2 ${sz.gap} flex flex-col items-center`}>
              {contactItems.map((ci, i) => <div key={i} className={sz.detail} {...elProps(ci.eid, { ...fso.detail, color: c.text })}>{ci.text}</div>)}
            </div>
          </div>
        );

      case "magazine-editorial":
        return (
          <div className={`w-full h-full ${szPad} flex flex-col justify-end`} style={{ backgroundColor: c.background }}>
            <div className={`text-3xl font-black tracking-tight leading-none mb-1`} {...elProps("name", { ...fso.name, color: c.primary, fontSize: "inherit" })}>{displayName}</div>
            <div className={`${sz.title} uppercase tracking-widest`} {...elProps("title", { ...fso.title, color: c.accent })}>{displayTitle}</div>
            <div className="w-12 h-[2px] my-2" style={{ backgroundColor: c.accent }} />
            <div className={`${sz.detail} font-medium`} {...elProps("company", { ...fso.detail, color: c.secondary })}>{displayCompany}</div>
            {showTagline && info.tagline && <div className={`${sz.detail} italic mt-0.5`} {...elProps("tagline", { ...fso.detail, color: c.text })}>{info.tagline}</div>}
            <div className={`mt-1 ${sz.gap} flex flex-wrap gap-x-3`}>
              {contactItems.map((ci, i) => <div key={i} className={sz.detail} {...elProps(ci.eid, { ...fso.detail, color: c.text })}>{ci.text}</div>)}
            </div>
          </div>
        );

      case "japanese-minimal":
        return (
          <div className={`w-full h-full ${szPad} flex flex-col justify-end items-end text-right`} style={{ backgroundColor: c.background }}>
            <div className="mt-auto">
              <div className={`${sz.name} font-light tracking-wide`} {...elProps("name", { ...fso.name, color: c.primary })}>{displayName}</div>
              <div className={`${sz.detail} mt-1 tracking-wider uppercase`} {...elProps("title", { ...fso.detail, color: c.secondary })}>{displayTitle}</div>
              <div className={`${sz.detail} mt-0.5`} {...elProps("company", { ...fso.detail, color: c.text })}>{displayCompany}</div>
              {showTagline && info.tagline && <div className={`${sz.detail} italic mt-1`} {...elProps("tagline", { ...fso.detail, color: c.text })}>{info.tagline}</div>}
              <div className="w-6 h-[1px] my-2 ml-auto" style={{ backgroundColor: c.accent }} />
              <div className={`${sz.gap} flex flex-col items-end`}>
                {contactItems.map((ci, i) => <div key={i} className={sz.detail} {...elProps(ci.eid, { ...fso.detail, color: c.text })}>{ci.text}</div>)}
              </div>
            </div>
          </div>
        );

      case "retro-vintage":
        return (
          <div className={`w-full h-full ${szPad} flex flex-col items-center justify-center text-center`} style={{ backgroundColor: c.background }}>
            <div className="w-full border-t-2 border-b-2 py-1 mb-2" style={{ borderColor: c.accent }}>
              <div className="w-full border-t border-b py-0.5" style={{ borderColor: c.accent + "66" }}>
                <div className={`${sz.detail} uppercase tracking-[0.3em]`} {...elProps("company", { ...fso.detail, color: c.accent })}>{displayCompany}</div>
              </div>
            </div>
            <div className={`${sz.name} font-bold tracking-wide`} {...elProps("name", { ...fso.name, color: c.primary })}>{displayName}</div>
            <div className={`${sz.title} mt-0.5 italic`} {...elProps("title", { ...fso.title, color: c.secondary })}>{displayTitle}</div>
            {showTagline && info.tagline && <div className={`${sz.detail} italic mt-1`} {...elProps("tagline", { ...fso.detail, color: c.text })}>{info.tagline}</div>}
            <div className="w-full border-t-2 border-b-2 py-1 mt-2" style={{ borderColor: c.accent }}>
              <div className="w-full border-t border-b py-0.5" style={{ borderColor: c.accent + "66" }}>
                <div className={`${sz.gap} flex flex-wrap justify-center gap-x-3`}>
                  {contactItems.map((ci, i) => <div key={i} className={sz.detail} {...elProps(ci.eid, { ...fso.detail, color: c.text })}>{ci.text}</div>)}
                </div>
              </div>
            </div>
          </div>
        );

      case "brutalist":
        return (
          <div className="w-full h-full relative" style={{ backgroundColor: c.backgroundAlt }}>
            <div className="absolute top-0 left-0 w-[60%] h-[45%]" style={{ backgroundColor: c.accent }} />
            <div className={`absolute inset-0 ${szPad} flex flex-col justify-between`}>
              <div className={`text-3xl font-black uppercase leading-none`} {...elProps("name", { ...fso.name, color: onAlt, fontSize: "inherit" })}>{displayName}</div>
              <div>
                <div className={`${sz.title} font-bold uppercase tracking-widest`} {...elProps("title", { ...fso.title, color: accentOnAlt })}>{displayTitle}</div>
                <div className={`${sz.detail} font-medium mt-0.5`} {...elProps("company", { ...fso.detail, color: onAlt })}>{displayCompany}</div>
                {showTagline && info.tagline && <div className={`${sz.detail} italic mt-0.5`} {...elProps("tagline", { ...fso.detail, color: onAlt })}>{info.tagline}</div>}
                <div className={`mt-1 ${sz.gap} flex flex-col`}>
                  {contactItems.map((ci, i) => <div key={i} className={sz.detail} {...elProps(ci.eid, { ...fso.detail, color: onAlt })}>{ci.text}</div>)}
                </div>
              </div>
            </div>
          </div>
        );

      case "card-inset":
        return (
          <div className="w-full h-full p-3" style={{ backgroundColor: c.backgroundAlt }}>
            <div className={`w-full h-full ${szPad} flex flex-col justify-center rounded`} style={{ backgroundColor: c.background }}>
              <div className={`${sz.name} font-bold`} {...elProps("name", { ...fso.name, color: c.primary })}>{displayName}</div>
              <div className={`${sz.title} mt-0.5`} {...elProps("title", { ...fso.title, color: c.secondary })}>{displayTitle}</div>
              <div className={`${sz.title} font-medium mt-1`} {...elProps("company", { ...fso.title, color: c.primary })}>{displayCompany}</div>
              {showTagline && info.tagline && <div className={`${sz.detail} italic mt-0.5`} {...elProps("tagline", { ...fso.detail, color: c.text })}>{info.tagline}</div>}
              <div className="w-8 h-[1px] my-2" style={{ backgroundColor: c.accent }} />
              <div className={`${sz.gap} flex flex-col`}>
                {contactItems.map((ci, i) => <div key={i} className={sz.detail} {...elProps(ci.eid, { ...fso.detail, color: c.text })}>{ci.text}</div>)}
              </div>
            </div>
          </div>
        );

      case "vertical-text":
        return (
          <div className="w-full h-full flex" style={{ backgroundColor: c.background }}>
            <div className="w-[12%] h-full flex items-center justify-center" style={{ backgroundColor: c.backgroundAlt }}>
              <div className={`${sz.title} font-bold tracking-widest uppercase whitespace-nowrap`}
                {...elProps("name", { ...fso.title, color: onAlt, transform: "rotate(-90deg)" })}
                style={{ ...elProps("name", { ...fso.title, color: onAlt }).style, writingMode: "vertical-rl", transform: "rotate(180deg)" }}>
                {displayName}
              </div>
            </div>
            <div className={`flex-1 ${szPad} flex flex-col justify-center`}>
              <div className={`${sz.name} font-bold`} {...elProps("name", { ...fso.name, color: c.primary })}>{displayName}</div>
              <div className={`${sz.title} mt-0.5`} {...elProps("title", { ...fso.title, color: c.secondary })}>{displayTitle}</div>
              <div className={`${sz.title} font-medium mt-1`} {...elProps("company", { ...fso.title, color: c.primary })}>{displayCompany}</div>
              {showTagline && info.tagline && <div className={`${sz.detail} italic mt-1`} {...elProps("tagline", { ...fso.detail, color: c.text })}>{info.tagline}</div>}
              <div className="w-6 h-[1px] my-2" style={{ backgroundColor: c.accent }} />
              <div className={`${sz.gap} flex flex-col`}>
                {contactItems.map((ci, i) => <div key={i} className={sz.detail} {...elProps(ci.eid, { ...fso.detail, color: c.text })}>{ci.text}</div>)}
              </div>
            </div>
          </div>
        );

      case "three-column":
        return (
          <div className="w-full h-full flex" style={{ backgroundColor: c.background }}>
            <div className={`w-1/3 h-full flex flex-col justify-center ${szPad} border-r`} style={{ borderColor: c.accent + "33" }}>
              <div className={`${sz.name} font-bold leading-tight`} {...elProps("name", { ...fso.name, color: c.primary })}>{displayName}</div>
              <div className={`${sz.title} mt-0.5`} {...elProps("title", { ...fso.title, color: c.secondary })}>{displayTitle}</div>
            </div>
            <div className={`w-1/3 h-full flex flex-col justify-center items-center ${szPad} text-center border-r`} style={{ borderColor: c.accent + "33" }}>
              <div className={`${sz.title} font-semibold`} {...elProps("company", { ...fso.title, color: c.primary })}>{displayCompany}</div>
              {showTagline && info.tagline && <div className={`${sz.detail} italic mt-1`} {...elProps("tagline", { ...fso.detail, color: c.text })}>{info.tagline}</div>}
            </div>
            <div className={`w-1/3 h-full flex flex-col justify-center ${szPad}`}>
              <div className={`${sz.gap} flex flex-col`}>
                {contactItems.map((ci, i) => <div key={i} className={sz.detail} {...elProps(ci.eid, { ...fso.detail, color: c.text })}>{ci.text}</div>)}
              </div>
            </div>
          </div>
        );

      case "stepped-blocks":
        return (
          <div className="w-full h-full relative" style={{ backgroundColor: c.background }}>
            <div className="absolute top-0 left-0 w-[40%] h-[35%]" style={{ backgroundColor: c.backgroundAlt }} />
            <div className="absolute top-[35%] left-0 w-[25%] h-[30%]" style={{ backgroundColor: c.accent, opacity: 0.15 }} />
            <div className={`absolute inset-0 ${szPad} flex flex-col justify-center`}>
              <div className={`${sz.name} font-bold relative z-10`} {...elProps("name", { ...fso.name, color: c.primary })}>{displayName}</div>
              <div className={`${sz.title} mt-0.5 relative z-10`} {...elProps("title", { ...fso.title, color: c.secondary })}>{displayTitle}</div>
              <div className={`${sz.title} font-medium mt-1 relative z-10`} {...elProps("company", { ...fso.title, color: c.primary })}>{displayCompany}</div>
              {showTagline && info.tagline && <div className={`${sz.detail} italic mt-1 relative z-10`} {...elProps("tagline", { ...fso.detail, color: c.text })}>{info.tagline}</div>}
              <div className="w-8 h-[1px] my-2 relative z-10" style={{ backgroundColor: c.accent }} />
              <div className={`${sz.gap} flex flex-col relative z-10`}>
                {contactItems.map((ci, i) => <div key={i} className={sz.detail} {...elProps(ci.eid, { ...fso.detail, color: c.text })}>{ci.text}</div>)}
              </div>
            </div>
          </div>
        );

      case "neon-dark":
        return (
          <div className={`w-full h-full ${szPad} flex flex-col justify-center relative`} style={{ backgroundColor: c.backgroundAlt }}>
            <div className="absolute top-0 left-0 right-0 h-[2px]" style={{ backgroundColor: c.accent, boxShadow: `0 0 8px ${c.accent}` }} />
            <div className="absolute bottom-0 left-0 right-0 h-[2px]" style={{ backgroundColor: c.accent, boxShadow: `0 0 8px ${c.accent}` }} />
            <div className={`${sz.name} font-bold`} {...elProps("name", { ...fso.name, color: onAlt })}>{displayName}</div>
            <div className={`${sz.title} mt-0.5`} {...elProps("title", { ...fso.title, color: c.accent })}>{displayTitle}</div>
            <div className={`${sz.title} font-medium mt-1`} {...elProps("company", { ...fso.title, color: onAlt })}>{displayCompany}</div>
            {showTagline && info.tagline && <div className={`${sz.detail} italic mt-1`} {...elProps("tagline", { ...fso.detail, color: accentOnAlt })}>{info.tagline}</div>}
            <div className="w-8 h-[1px] my-2" style={{ backgroundColor: c.accent, boxShadow: `0 0 4px ${c.accent}` }} />
            <div className={`${sz.gap} flex flex-col`}>
              {contactItems.map((ci, i) => <div key={i} className={sz.detail} {...elProps(ci.eid, { ...fso.detail, color: onAlt })}>{ci.text}</div>)}
            </div>
          </div>
        );

      case "full-bleed":
        return (
          <div className={`w-full h-full ${szPad} flex flex-col justify-center`} style={{ backgroundColor: c.backgroundAlt }}>
            <div className={`${sz.name} font-bold`} {...elProps("name", { ...fso.name, color: onAlt })}>{displayName}</div>
            <div className={`${sz.title} mt-0.5`} {...elProps("title", { ...fso.title, color: accentOnAlt })}>{displayTitle}</div>
            <div className={`${sz.title} font-medium mt-1`} {...elProps("company", { ...fso.title, color: onAlt })}>{displayCompany}</div>
            {showTagline && info.tagline && <div className={`${sz.detail} italic mt-1`} {...elProps("tagline", { ...fso.detail, color: onAlt })}>{info.tagline}</div>}
            <div className="w-8 h-[1px] my-2" style={{ backgroundColor: c.accent }} />
            <div className={`${sz.gap} flex flex-col`}>
              {contactItems.map((ci, i) => <div key={i} className={sz.detail} {...elProps(ci.eid, { ...fso.detail, color: onAlt })}>{ci.text}</div>)}
            </div>
          </div>
        );

      case "ribbon-banner":
        return (
          <div className="w-full h-full flex flex-col" style={{ backgroundColor: c.background }}>
            <div className={`flex-1 ${szPad} pb-1 flex flex-col justify-end`}>
              <div className={`${sz.name} font-bold`} {...elProps("name", { ...fso.name, color: c.primary })}>{displayName}</div>
              <div className={`${sz.title} mt-0.5`} {...elProps("title", { ...fso.title, color: c.secondary })}>{displayTitle}</div>
            </div>
            <div className="px-0 py-1.5" style={{ backgroundColor: c.accent }}>
              <div className={`${sz.detail} text-center font-medium tracking-wider uppercase`}
                {...elProps("company", { ...fso.detail, color: onAccent })}>{displayCompany}</div>
              {showTagline && info.tagline && <div className={`${sz.detail} text-center italic`} {...elProps("tagline", { ...fso.detail, color: onAccent })}>{info.tagline}</div>}
            </div>
            <div className={`flex-1 ${szPad} pt-1 flex flex-col justify-start`}>
              <div className={`${sz.gap} flex flex-wrap gap-x-3`}>
                {contactItems.map((ci, i) => <div key={i} className={sz.detail} {...elProps(ci.eid, { ...fso.detail, color: c.text })}>{ci.text}</div>)}
              </div>
            </div>
          </div>
        );

      case "edge-info":
        return (
          <div className={`w-full h-full ${szPad} flex flex-col justify-between relative`} style={{ backgroundColor: c.background }}>
            <div className="flex justify-between items-start">
              <div className={`${sz.name} font-bold`} {...elProps("name", { ...fso.name, color: c.primary })}>{displayName}</div>
              <div className={`${sz.detail} text-right`} {...elProps("company", { ...fso.detail, color: c.secondary })}>{displayCompany}</div>
            </div>
            <div className="flex justify-between items-end">
              <div className={`${sz.gap} flex flex-col`}>
                {contactItems.slice(0, 2).map((ci, i) => <div key={i} className={sz.detail} {...elProps(ci.eid, { ...fso.detail, color: c.text })}>{ci.text}</div>)}
              </div>
              <div className={`${sz.gap} flex flex-col items-end`}>
                <div className={`${sz.title}`} {...elProps("title", { ...fso.title, color: c.secondary })}>{displayTitle}</div>
                {contactItems.slice(2).map((ci, i) => <div key={i} className={sz.detail} {...elProps(ci.eid, { ...fso.detail, color: c.text })}>{ci.text}</div>)}
                {showTagline && info.tagline && <div className={`${sz.detail} italic`} {...elProps("tagline", { ...fso.detail, color: c.text })}>{info.tagline}</div>}
              </div>
            </div>
          </div>
        );

      case "dot-grid":
        return (
          <div className={`w-full h-full ${szPad} flex flex-col justify-center`} style={{ backgroundColor: c.background }}>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1">
              <div>
                <div className={`${sz.name} font-bold`} {...elProps("name", { ...fso.name, color: c.primary })}>{displayName}</div>
                <div className={`${sz.title} mt-0.5`} {...elProps("title", { ...fso.title, color: c.secondary })}>{displayTitle}</div>
                <div className={`${sz.detail} font-medium mt-1`} {...elProps("company", { ...fso.detail, color: c.primary })}>{displayCompany}</div>
                {showTagline && info.tagline && <div className={`${sz.detail} italic mt-0.5`} {...elProps("tagline", { ...fso.detail, color: c.text })}>{info.tagline}</div>}
              </div>
              <div className="flex flex-col justify-center">
                <div className={`${sz.gap} flex flex-col`}>
                  {contactItems.map((ci, i) => (
                    <div key={i} className={`${sz.detail} flex items-center gap-1`} {...elProps(ci.eid, { ...fso.detail, color: c.text })}>
                      <span className="w-1 h-1 rounded-full shrink-0" style={{ backgroundColor: c.accent }} />
                      {ci.text}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        );

      case "overlap-cards":
        return (
          <div className="w-full h-full relative" style={{ backgroundColor: c.background }}>
            <div className="absolute top-2 left-2 right-4 bottom-4 rounded" style={{ backgroundColor: c.backgroundAlt, opacity: 0.12 }} />
            <div className={`absolute top-0 left-0 right-0 bottom-0 ${szPad} flex flex-col justify-center`} style={{ backgroundColor: c.background }}>
              <div className={`${sz.name} font-bold`} {...elProps("name", { ...fso.name, color: c.primary })}>{displayName}</div>
              <div className={`${sz.title} mt-0.5`} {...elProps("title", { ...fso.title, color: c.secondary })}>{displayTitle}</div>
              <div className={`${sz.title} font-medium mt-1`} {...elProps("company", { ...fso.title, color: c.primary })}>{displayCompany}</div>
              {showTagline && info.tagline && <div className={`${sz.detail} italic mt-1`} {...elProps("tagline", { ...fso.detail, color: c.text })}>{info.tagline}</div>}
              <div className="w-8 h-[1px] my-2" style={{ backgroundColor: c.accent }} />
              <div className={`${sz.gap} flex flex-col`}>
                {contactItems.map((ci, i) => <div key={i} className={sz.detail} {...elProps(ci.eid, { ...fso.detail, color: c.text })}>{ci.text}</div>)}
              </div>
            </div>
          </div>
        );

      case "wave-divide":
        return (
          <div className="w-full h-full flex flex-col relative" style={{ backgroundColor: c.background }}>
            <div className="absolute top-0 left-0 right-0 h-[45%]" style={{ backgroundColor: c.backgroundAlt }} />
            <svg className="absolute w-full" style={{ top: "40%" }} viewBox="0 0 400 30" preserveAspectRatio="none">
              <path d="M0,15 Q100,0 200,15 T400,15 L400,30 L0,30 Z" fill={c.background} />
            </svg>
            <div className={`relative z-10 flex-1 ${szPad} pb-1 flex flex-col justify-center`}>
              <div className={`${sz.name} font-bold`} {...elProps("name", { ...fso.name, color: onAlt })}>{displayName}</div>
              <div className={`${sz.title} mt-0.5`} {...elProps("title", { ...fso.title, color: accentOnAlt })}>{displayTitle}</div>
              <div className={`${sz.title} font-medium mt-0.5`} {...elProps("company", { ...fso.title, color: onAlt })}>{displayCompany}</div>
            </div>
            <div className={`relative z-10 ${szPad} pt-0 flex flex-col justify-end`}>
              {showTagline && info.tagline && <div className={`${sz.detail} italic mb-1`} {...elProps("tagline", { ...fso.detail, color: c.text })}>{info.tagline}</div>}
              <div className={`${sz.gap} flex flex-wrap gap-x-3`}>
                {contactItems.map((ci, i) => <div key={i} className={sz.detail} {...elProps(ci.eid, { ...fso.detail, color: c.text })}>{ci.text}</div>)}
              </div>
            </div>
          </div>
        );

      default:
        return (
          <div className={`w-full h-full ${szPad} flex flex-col justify-center`} style={{ backgroundColor: c.background }}>
            <div className={`${sz.name} font-semibold`} {...elProps("name", { ...fso.name, color: c.primary  })}>{displayName}</div>
            <div className={`${sz.title}`} {...elProps("title", { ...fso.title, color: c.secondary  })}>{displayTitle}</div>
            {showTagline && info.tagline && <div className={`${sz.detail} italic mt-0.5`} {...elProps("tagline", { ...fso.detail, color: c.text  })}>{info.tagline}</div>}
            <div className={`${sz.gap} flex flex-col mt-2`}>
              {contactItems.map((ci, i) => <div key={i} className={sz.detail} {...elProps(ci.eid, { ...fso.detail, color: c.text  })}>{ci.text}</div>)}
            </div>
          </div>
        );
    }
  };

  return (
    <div ref={ref} className={wrap} onClick={onClick} style={{ ...wrapStyle, ...borderStyleObj }}>
      {/* Background effect overlay */}
      {bg.type !== "none" && (
        <div className="absolute inset-0 pointer-events-none" style={{
          background: bg.type === "gradient"
            ? `linear-gradient(${bg.angle}deg, ${bg.color}${Math.round(bg.opacity * 255).toString(16).padStart(2, "0")} 0%, transparent 100%)`
            : bg.color,
          opacity: bg.type === "solid" ? bg.opacity : undefined,
          zIndex: 1,
        }} />
      )}

      {/* Template content */}
      {renderTemplate()}

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

      {/* Absolute-positioned logo */}
      {logo.id !== "none" && !hidden.has("logo") && (() => {
        const logoOv: ElementStyle = eo["logo"] ?? {};
        const logoBaseStyle: React.CSSProperties = {
          ...logoPosition(logo.placement),
          ...(logoOv.offsetX || logoOv.offsetY ? {
            transform: [
              logoPosition(logo.placement).transform,
              `translate(${logoOv.offsetX ?? 0}px, ${logoOv.offsetY ?? 0}px)`,
            ].filter(Boolean).join(" "),
          } : {}),
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
            <CardLogo
              logoSize={logoPx}
              color={c.accent}
              bgColor={c.accent + "22"}
              logoId={logo.id}
              letter={companyLetter}
              customLogoUrl={info.customLogoUrl}
            />
          </div>
        );
      })()}

      {/* QR code */}
      {qr?.enabled && qrDataUrl && (
        <div
          style={{
            ...logoPosition(qr.placement),
            zIndex: 25,
          }}
        >
          <img
            src={qrDataUrl}
            alt="QR"
            style={{
              width: qr.size === "small" ? (size === "large" ? 40 : size === "medium" ? 32 : 24) : (size === "large" ? 60 : size === "medium" ? 48 : 36),
              height: qr.size === "small" ? (size === "large" ? 40 : size === "medium" ? 32 : 24) : (size === "large" ? 60 : size === "medium" ? 48 : 36),
              borderRadius: 3,
            }}
          />
        </div>
      )}

      {/* Extra images */}
      {info.extraImages?.map((img) => {
        const imgSizeMap = {
          small: { small: 20, medium: 26, large: 36 },
          medium: { small: 30, medium: 38, large: 52 },
          large: { small: 40, medium: 52, large: 72 },
        };
        const imgPx = imgSizeMap[size][img.size];
        return (
          <div
            key={img.id}
            style={{
              ...logoPosition(img.placement),
              zIndex: 22,
            }}
          >
            <img
              src={img.dataUrl}
              alt=""
              style={{
                width: imgPx,
                height: imgPx,
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
