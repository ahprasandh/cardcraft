import { useState, useEffect } from "react";
import QRCode from "qrcode";
import type { CardDesign, CardInfo, BackElement } from "@/lib/types";
import { getPatternSVG, type PatternId } from "@/lib/patterns";
import { LogoIcon } from "@/lib/logos";
import CustomFontInjector from "@/components/CustomFontInjector";

interface Props {
  design: CardDesign;
  info: CardInfo;
  size?: "small" | "medium" | "large";
  ref?: React.Ref<HTMLDivElement>;
  /** When true, back elements become clickable and show a selection outline. */
  editMode?: boolean;
  /** Index of the currently selected back element (text/image) — controlled by parent. */
  selectedBackIndex?: number | null;
  /** Notifies parent when the user clicks a back element to select it. */
  onSelectBackElement?: (index: number) => void;
}

const fontMap: Record<string, string> = {
  sans: "font-sans",
  serif: "font-serif",
  mono: "font-mono",
};

export default function BusinessCardBack({ design, info, size = "medium", ref, editMode = false, selectedBackIndex = null, onSelectBackElement }: Props) {
  const back = design.backFace;

  const szDims = {
    small: { w: 280, h: 160 },
    medium: { w: 350, h: 200 },
    large: { w: 490, h: 280 },
  }[size];

  // Hooks must always run (no conditional returns before hooks). The QR
  // data-URL is computed unconditionally — preset rendering decides
  // whether to show it; legacy show* flags are no longer gating this.
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  useEffect(() => {
    let content = "";
    const qr = design.qr;
    if (qr?.content === "vcard") {
      content = `BEGIN:VCARD\nVERSION:3.0\nFN:${info.name}\nORG:${info.company}\nTITLE:${info.title}\nTEL:${info.phone}\nEMAIL:${info.email}\nURL:${info.website}\nEND:VCARD`;
    } else if (qr?.content === "custom" && qr.customText) {
      content = qr.customText;
    } else {
      content = info.website ? (info.website.startsWith("http") ? info.website : `https://${info.website}`) : "https://example.com";
    }
    QRCode.toDataURL(content, { width: 256, margin: 1, color: { dark: "#000000", light: "#ffffff" } })
      .then(setQrDataUrl)
      .catch(() => setQrDataUrl(null));
  }, [design.qr, info]);

  if (!back) {
    return (
      <div
        ref={ref}
        className="overflow-hidden relative shadow-lg rounded-lg flex items-center justify-center bg-gray-100"
        style={{ width: szDims.w, height: szDims.h }}
      >
        <p className="text-sm text-gray-400">Enable back face in the Back Face tab</p>
      </div>
    );
  }

  const c = design.colors;
  const bgColor = back.background || c.background;
  const f = fontMap[design.font];

  const sz = {
    small: { name: "text-sm", title: "text-[9px]", detail: "text-[7px]", logo: 32 },
    medium: { name: "text-base", title: "text-[10px]", detail: "text-[8px]", logo: 44 },
    large: { name: "text-2xl", title: "text-sm", detail: "text-xs", logo: 64 },
  }[size];

  const borderRadiusMap = { none: "rounded-none", small: "rounded", medium: "rounded-lg", large: "rounded-2xl" };
  const br = borderRadiusMap[design.borderRadius];

  // Pattern
  const patId = back.patternId === "inherit" ? design.pattern.id : back.patternId;
  const patternBg = patId && patId !== "none"
    ? getPatternSVG(patId as PatternId, design.pattern.color, design.pattern.opacity)
    : null;

  // Border
  const bdr = design.border;
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

  const companyLetter = (info.company || info.name || "C").charAt(0);
  const qrSize = size === "large" ? 100 : size === "medium" ? 72 : 52;
  const logoSize = sz.logo;

  /**
   * Render the brand mark for any preset. Picks the best available source:
   *   1. cardInfo.customLogoUrl  (user-uploaded image)
   *   2. design.logo.id          (catalog mark, e.g. "circle", "square")
   *   3. companyLetter           (single-letter fallback so the preset
   *      always renders something instead of an empty hero block)
   */
  const renderBrandMark = (px: number, color = c.accent) => {
    if (info.customLogoUrl) {
      return (
        <div
          role="img"
          aria-label="Logo"
          style={{
            width: px,
            height: px,
            backgroundImage: `url(${info.customLogoUrl})`,
            backgroundSize: "contain",
            backgroundPosition: "center",
            backgroundRepeat: "no-repeat",
          }}
        />
      );
    }
    if (design.logo.id !== "none") {
      return <LogoIcon logoId={design.logo.id} letter={companyLetter} size={px} color={color} />;
    }
    // Letter mark fallback — never let "Logo" preset render an empty card.
    return (
      <div
        style={{
          width: px,
          height: px,
          borderRadius: "50%",
          backgroundColor: color + "22",
          color,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontWeight: 700,
          fontSize: px * 0.55,
        }}
      >
        {companyLetter}
      </div>
    );
  };

  const renderPreset = () => {
    switch (back.preset) {
      case "logo-centered":
        return (
          <div className="w-full h-full flex flex-col items-center justify-center gap-2">
            {renderBrandMark(logoSize * 1.5)}
            {info.company && (
              <div className={`${sz.title} font-semibold`} style={{ color: c.primary }}>{info.company}</div>
            )}
            {info.website && (
              <div className={`${sz.detail}`} style={{ color: c.text }}>{info.website}</div>
            )}
          </div>
        );

      case "qr-focus":
        return (
          <div className="w-full h-full flex flex-col items-center justify-center gap-2">
            {qrDataUrl && (
              <img src={qrDataUrl} alt="QR" style={{ width: qrSize, height: qrSize, borderRadius: 4 }} />
            )}
            {info.company && (
              <div className={`${sz.detail} font-medium mt-1`} style={{ color: c.primary }}>{info.company}</div>
            )}
            {info.website && (
              <div className={`${sz.detail}`} style={{ color: c.text }}>{info.website}</div>
            )}
          </div>
        );

      case "pattern-fill":
        return (
          <div className="w-full h-full flex items-center justify-center">
            <div className="absolute top-3 right-3">
              {renderBrandMark(logoSize * 0.8)}
            </div>
            {info.company && (
              <div className={`${sz.name} font-bold text-center`} style={{ color: c.primary, opacity: 0.8 }}>{info.company}</div>
            )}
          </div>
        );

      case "minimal-info":
        return (
          <div className="w-full h-full flex flex-col items-center justify-center gap-1">
            {info.company && (
              <div className={`${sz.title} font-semibold`} style={{ color: c.primary }}>{info.company}</div>
            )}
            {info.website && (
              <div className={`${sz.detail}`} style={{ color: c.text }}>{info.website}</div>
            )}
          </div>
        );

      case "solid":
        return (
          <div className="w-full h-full flex items-center justify-center">
            {renderBrandMark(logoSize * 0.6, c.accent + "88")}
          </div>
        );

      case "tagline":
        return (
          <div className="w-full h-full flex flex-col items-center justify-center gap-2 px-6">
            {info.tagline && (
              <div className={`${sz.name} font-bold text-center italic`} style={{ color: c.primary }}>
                "{info.tagline}"
              </div>
            )}
            {info.company && (
              <div className={`${sz.detail} font-medium`} style={{ color: c.secondary }}>{info.company}</div>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  // Unified back-element rendering (Task #13). When `design.backElements` is
  // set, render those directly with absolute (x, y, width, height). Otherwise
  // fall back to the legacy preset renderer.
  const scale = szDims.w / 350;
  const renderBackElements = (elements: BackElement[]) => (
    <>
      {elements.map((el, i) => {
        if (el.visible === false) return null;
        const isSelected = editMode && selectedBackIndex === i;
        const baseStyle: React.CSSProperties = {
          position: "absolute",
          left: el.x * scale,
          top: el.y * scale,
          opacity: el.opacity ?? 1,
          transform: el.rotation ? `rotate(${el.rotation}deg)` : undefined,
          transformOrigin: "center",
          cursor: editMode ? "pointer" : undefined,
          ...(isSelected && {
            outline: "2px dashed #6366f1",
            outlineOffset: "2px",
            borderRadius: "3px",
          }),
        };
        const onClick = editMode && onSelectBackElement
          ? (e: React.MouseEvent) => { e.stopPropagation(); onSelectBackElement(i); }
          : undefined;
        if (el.type === "text") {
          // Built-in family token → use the existing tailwind font-* class.
          // Anything else is treated as a real CSS family name (e.g. an
          // uploaded custom font). When custom, we leave the className as
          // the card-wide font (so it cascades cleanly) and override via
          // inline style.fontFamily.
          const isBuiltin = el.fontFamily ? Object.prototype.hasOwnProperty.call(fontMap, el.fontFamily) : false;
          const elFontClass = el.fontFamily && isBuiltin ? fontMap[el.fontFamily] : f;
          const inlineFamily = el.fontFamily && !isBuiltin ? `"${el.fontFamily}", system-ui, sans-serif` : undefined;
          return (
            <div
              key={i}
              role={editMode ? "button" : undefined}
              tabIndex={editMode ? 0 : undefined}
              aria-label={editMode ? `Back text ${i + 1}` : undefined}
              onClick={onClick}
              className={elFontClass}
              style={{
                ...baseStyle,
                fontFamily: inlineFamily,
                fontSize: el.fontSize * scale,
                fontWeight: el.fontWeight ?? "normal",
                fontStyle: el.fontStyle ?? "normal",
                color: el.color ?? c.text,
                textAlign: el.alignment ?? "left",
                textTransform: el.textTransform,
                // nowrap by default; user can opt in to wrap. When
                // wrapping, give the text a sensible max width relative
                // to the card so it actually breaks instead of trailing
                // off the right edge.
                whiteSpace: el.wrap ? "normal" : "nowrap",
                maxWidth: el.wrap ? (szDims.w - el.x * scale - 8) : undefined,
              }}
            >
              {el.text}
            </div>
          );
        }
        if (el.type === "image") {
          return (
            <div
              key={i}
              role={editMode ? "button" : undefined}
              tabIndex={editMode ? 0 : undefined}
              aria-label={editMode ? `Back image ${i + 1}` : undefined}
              onClick={onClick}
              style={{
                ...baseStyle,
                width: el.width * scale,
                height: el.height * scale,
              }}
            >
              {el.source ? (
                <div
                  role="img"
                  aria-label="Back face image"
                  style={{
                    width: "100%",
                    height: "100%",
                    backgroundImage: `url(${el.source})`,
                    backgroundSize: "contain",
                    backgroundPosition: "center",
                    backgroundRepeat: "no-repeat",
                    pointerEvents: "none",
                  }}
                />
              ) : el.iconId && el.iconId !== "none" ? (
                <LogoIcon logoId={el.iconId} letter={companyLetter} size={el.height * scale} color={c.accent} bgColor={c.accent + "22"} />
              ) : null}
            </div>
          );
        }
        return null;
      })}
    </>
  );

  return (
    <div
      ref={ref}
      className={`${f} ${br} overflow-hidden relative shadow-lg`}
      style={{ width: szDims.w, height: szDims.h, backgroundColor: bgColor, ...borderStyleObj }}
    >
      {/* Custom-font @font-face declarations (deduped via single <style id>). */}
      <CustomFontInjector fonts={design.customFonts} />
      {/* Pattern overlay */}
      {patternBg && (
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: patternBg,
            backgroundRepeat: "repeat",
            zIndex: 1,
          }}
        />
      )}

      {/* Content — preset is the base layer; custom back elements (text /
          image added by the user) overlay on top so they coexist instead of
          one swapping the other out. */}
      <div className="relative z-10 w-full h-full">
        {renderPreset()}
        {design.backElements && design.backElements.length > 0 && (
          <div className="absolute inset-0">
            {renderBackElements(design.backElements)}
          </div>
        )}
      </div>
    </div>
  );
}
