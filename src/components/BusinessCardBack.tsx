import { useState, useEffect } from "react";
import QRCode from "qrcode";
import type { CardDesign, CardInfo } from "@/lib/types";
import { getPatternSVG, type PatternId } from "@/lib/patterns";
import { LogoIcon } from "@/lib/logos";

interface Props {
  design: CardDesign;
  info: CardInfo;
  size?: "small" | "medium" | "large";
  ref?: React.Ref<HTMLDivElement>;
}

const fontMap: Record<string, string> = {
  sans: "font-sans",
  serif: "font-serif",
  mono: "font-mono",
};

export default function BusinessCardBack({ design, info, size = "medium", ref }: Props) {
  const back = design.backFace;

  const szDims = {
    small: { w: 280, h: 160 },
    medium: { w: 350, h: 200 },
    large: { w: 490, h: 280 },
  }[size];

  // Hooks must always run (no conditional returns before hooks)
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!back?.showQr) { setQrDataUrl(null); return; }
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
  }, [back?.showQr, design.qr, info]);

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

  const renderPreset = () => {
    switch (back.preset) {
      case "logo-centered":
        return (
          <div className="w-full h-full flex flex-col items-center justify-center gap-2">
            {back.showLogo && design.logo.id !== "none" && (
              <LogoIcon logoId={design.logo.id} letter={companyLetter} size={logoSize * 1.5} color={c.accent} />
            )}
            {back.showCompany && (
              <div className={`${sz.title} font-semibold`} style={{ color: c.primary }}>{info.company}</div>
            )}
            {back.showWebsite && info.website && (
              <div className={`${sz.detail}`} style={{ color: c.text }}>{info.website}</div>
            )}
          </div>
        );

      case "qr-focus":
        return (
          <div className="w-full h-full flex flex-col items-center justify-center gap-2">
            {back.showQr && qrDataUrl && (
              <img src={qrDataUrl} alt="QR" style={{ width: qrSize, height: qrSize, borderRadius: 4 }} />
            )}
            {back.showCompany && (
              <div className={`${sz.detail} font-medium mt-1`} style={{ color: c.primary }}>{info.company}</div>
            )}
            {back.showWebsite && info.website && (
              <div className={`${sz.detail}`} style={{ color: c.text }}>{info.website}</div>
            )}
          </div>
        );

      case "pattern-fill":
        return (
          <div className="w-full h-full flex items-center justify-center">
            {back.showLogo && design.logo.id !== "none" && (
              <div className="absolute top-3 right-3">
                <LogoIcon logoId={design.logo.id} letter={companyLetter} size={logoSize * 0.8} color={c.accent} />
              </div>
            )}
            {back.showCompany && (
              <div className={`${sz.name} font-bold text-center`} style={{ color: c.primary, opacity: 0.8 }}>{info.company}</div>
            )}
          </div>
        );

      case "minimal-info":
        return (
          <div className="w-full h-full flex flex-col items-center justify-center gap-1">
            {back.showCompany && (
              <div className={`${sz.title} font-semibold`} style={{ color: c.primary }}>{info.company}</div>
            )}
            {back.showWebsite && info.website && (
              <div className={`${sz.detail}`} style={{ color: c.text }}>{info.website}</div>
            )}
          </div>
        );

      case "solid":
        return (
          <div className="w-full h-full flex items-center justify-center">
            {back.showLogo && design.logo.id !== "none" && (
              <LogoIcon logoId={design.logo.id} letter={companyLetter} size={logoSize * 0.6} color={c.accent + "44"} />
            )}
          </div>
        );

      case "tagline":
        return (
          <div className="w-full h-full flex flex-col items-center justify-center gap-2 px-6">
            {back.showTagline && info.tagline && (
              <div className={`${sz.name} font-bold text-center italic`} style={{ color: c.primary }}>
                "{info.tagline}"
              </div>
            )}
            {back.showCompany && (
              <div className={`${sz.detail} font-medium`} style={{ color: c.secondary }}>{info.company}</div>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div
      ref={ref}
      className={`${f} ${br} overflow-hidden relative shadow-lg`}
      style={{ width: szDims.w, height: szDims.h, backgroundColor: bgColor, ...borderStyleObj }}
    >
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

      {/* Content */}
      <div className="relative z-10 w-full h-full">
        {renderPreset()}
      </div>
    </div>
  );
}
