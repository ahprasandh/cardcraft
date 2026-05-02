/**
 * Render route — `#/render?config=<base64>`.
 *
 * Opens a clean rendered card in the user's browser, with no wizard chrome.
 * The URL's `config` param is base64-encoded JSON: `{ cardInfo, templateId,
 * palette, font? }`. Renders the card centered, with a Download PNG button
 * (client-side via dom-to-image) and an Edit-in-CardCraft button that
 * prefills the wizard.
 *
 * This is the destination AI assistants point users to when executing the
 * skill at `/skill.md`. They construct the URL; the user's browser does
 * the actual rendering.
 */

import { useEffect, useState, useRef } from "react";
import BusinessCard from "@/components/BusinessCard";
import Logo from "@/components/Logo";
import { Download, Pencil, ExternalLink, Wand2, Image, QrCode, Type, Palette as PaletteIcon } from "lucide-react";
import type { CardDesign, CardInfo, LogoElement, QrElement, BackElement, ElementStyle, BackFaceSpec, PatternSpec, BackgroundEffectSpec, BorderSpec, LogoSpec, QrSpec, CustomFont } from "@/lib/types";
import { useWizardStore } from "@/lib/store";

declare global {
  interface Window {
    domtoimage: {
      toPng: (node: HTMLElement, opts?: Record<string, unknown>) => Promise<string>;
    };
  }
}

/**
 * Faithful snapshot of a CardDesign + CardInfo. Mirrors the share-link
 * payload built in RefinementStep.handleShare. Most fields are optional so
 * minimal AI-generated configs (cardInfo + templateId + palette) still work.
 */
interface RenderConfig {
  cardInfo: CardInfo;
  templateId: string;
  palette: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    backgroundAlt: string;
    text: string;
  };
  font?: "sans" | "serif" | "mono";
  textAlign?: "left" | "center" | "right";
  spacing?: "compact" | "normal" | "spacious";
  borderRadius?: "none" | "small" | "medium" | "large";
  pattern?: PatternSpec;
  backgroundEffect?: BackgroundEffectSpec;
  logo?: LogoSpec;
  logoElement?: LogoElement;
  border?: BorderSpec;
  qr?: QrSpec;
  qrElement?: QrElement;
  backFace?: BackFaceSpec;
  backElements?: BackElement[];
  fontSizes?: { name?: number; title?: number; detail?: number };
  elementOverrides?: Record<string, ElementStyle>;
  /** Element IDs the sender hid from the card. Render must respect these. */
  hiddenFields?: string[];
  /** User-uploaded fonts referenced by elementOverrides[*].fontFamily. */
  customFonts?: CustomFont[];
}

function parseConfig(): { config: RenderConfig | null; error: string | null } {
  try {
    const hash = window.location.hash;
    const queryStart = hash.indexOf("?");
    if (queryStart === -1) return { config: null, error: "Missing ?config= parameter" };
    const params = new URLSearchParams(hash.slice(queryStart + 1));
    const raw = params.get("config");
    if (!raw) return { config: null, error: "Missing ?config= parameter" };
    const json = atob(raw);
    const parsed = JSON.parse(json);
    if (!parsed.cardInfo || !parsed.templateId || !parsed.palette) {
      return { config: null, error: "Config missing required fields (cardInfo, templateId, palette)" };
    }
    return { config: parsed as RenderConfig, error: null };
  } catch (e) {
    return { config: null, error: `Failed to parse config: ${(e as Error).message}` };
  }
}

export default function Render() {
  const [{ config, error }, setState] = useState(() => parseConfig());
  const cardRef = useRef<HTMLDivElement>(null);
  const [downloading, setDownloading] = useState(false);
  // dom-to-image is loaded as a regular script in index.html (public/domtoimg.js).
  // window.domtoimage is available synchronously by the time React mounts.
  const setCardInfo = useWizardStore((s) => s.setCardInfo);
  const setSelectedDesign = useWizardStore((s) => s.setSelectedDesign);
  const setDesigns = useWizardStore((s) => s.setDesigns);
  const setStep = useWizardStore((s) => s.setStep);

  // Re-parse on hash change (e.g. user updates the URL)
  useEffect(() => {
    const onHashChange = () => setState(parseConfig());
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  // ── Error state ──────────────────────────────────────────────────────
  if (error || !config) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
        <div className="max-w-md text-center px-8 py-10 bg-white rounded-xl shadow border border-gray-200">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Invalid render link</h1>
          <p className="text-gray-600 mb-6 text-sm">
            {error || "The URL is missing a config parameter."}
          </p>
          <a
            href="#/"
            className="inline-flex items-center gap-1.5 text-[#0e0f0c] hover:underline font-medium"
          >
            Go to CardCraft <ExternalLink size={14} />
          </a>
          <div className="mt-6 pt-6 border-t border-gray-100 text-xs text-gray-500 text-left">
            <p className="font-medium mb-1">Expected URL shape:</p>
            <code className="block bg-gray-50 p-2 rounded text-[11px] break-all">
              #/render?config=&lt;base64-encoded-JSON&gt;
            </code>
            <p className="mt-3">
              See <a href="/skill.md" className="text-[#0e0f0c] hover:underline">/skill.md</a> for the full contract.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ── Build a CardDesign from the config ──────────────────────────────
  // We honor every field the sender shipped; only fall back to defaults
  // for fields the config genuinely omitted (e.g. minimal AI configs that
  // only sent cardInfo + templateId + palette). This keeps share-link
  // snapshots lossless: hiddenFields, elementOverrides, pattern, border,
  // backFace, etc. all survive the round-trip.
  const design = {
    id: `render-${config.templateId}`,
    templateId: config.templateId,
    name: config.templateId,
    reasoning: "",
    colors: config.palette,
    font: config.font || "sans",
    textAlign: config.textAlign ?? "left",
    spacing: config.spacing ?? "normal",
    borderRadius: config.borderRadius ?? "medium",
    pattern: config.pattern ?? { id: "none", opacity: 0, color: config.palette.accent, placement: "full" },
    backgroundEffect: config.backgroundEffect ?? { type: "none", color: config.palette.accent, opacity: 0, angle: 0 },
    logo: config.logo ?? {
      id: config.cardInfo.customLogoUrl ? "circle-letter" : "none",
      placement: "top-left",
      size: "medium",
    },
    logoElement: config.logoElement,
    border: config.border ?? { sides: "none", width: 0, color: config.palette.accent },
    qr: config.qr,
    qrElement: config.qrElement,
    backFace: config.backFace,
    backElements: config.backElements,
    fontSizes: config.fontSizes,
    elementOverrides: config.elementOverrides,
    hiddenFields: config.hiddenFields,
    customFonts: config.customFonts,
  } as unknown as CardDesign;

  // ── Download PNG ────────────────────────────────────────────────────
  const downloadPng = async () => {
    if (!cardRef.current || !window.domtoimage) return;
    setDownloading(true);
    try {
      const dataUrl = await window.domtoimage.toPng(cardRef.current, {
        bgcolor: "transparent",
        quality: 1.0,
      });
      const link = document.createElement("a");
      const baseName = (config.cardInfo.name || "card").replace(/\s+/g, "-").toLowerCase();
      link.download = `${baseName}.png`;
      link.href = dataUrl;
      link.click();
    } catch (e) {
      console.error("PNG download failed:", e);
      alert("Failed to generate PNG. Check console for details.");
    } finally {
      setDownloading(false);
    }
  };

  // ── Edit in CardCraft ───────────────────────────────────────────────
  const editInCardCraft = () => {
    // Populate cardInfo with all expected fields filled (so the wizard's
    // optional features like customLines / extraImages have safe defaults).
    setCardInfo({
      name: config.cardInfo.name || "",
      title: config.cardInfo.title || "",
      company: config.cardInfo.company || "",
      email: config.cardInfo.email || "",
      phone: config.cardInfo.phone || "",
      website: config.cardInfo.website || "",
      address: config.cardInfo.address || "",
      tagline: config.cardInfo.tagline || "",
      businessDescription: "",
      designExpectations: "",
      customLogoUrl: config.cardInfo.customLogoUrl || "",
      customLines: config.cardInfo.customLines || [],
      extraImages: config.cardInfo.extraImages || [],
    });
    // Seed designs[] so the refinement's "switch design" tabs (if any) work.
    setDesigns([design]);
    setSelectedDesign(design);
    setStep("refine");
    window.location.hash = "#/";
  };

  // ── Render ──────────────────────────────────────────────────────────
  return (
    <div className="h-screen flex flex-col overflow-hidden bg-white">
      {/* Tiny header so consumers can navigate away */}
      <header className="shrink-0 border-b border-[#0e0f0c]/12 bg-white">
        <div className="max-w-4xl mx-auto px-4 py-2.5 flex items-center justify-between">
          <a href="#/" className="flex items-center">
            <Logo variant="light" size={28} />
          </a>
          <span className="text-xs text-[#454745]">
            Rendered from <code className="bg-[#0e0f0c]/8 px-1.5 py-0.5 rounded">#/render</code> · skill output
          </span>
        </div>
      </header>

      {/* Main content — overflow-y-auto on the outer; the inner wrapper
           is min-h-full so vertical centering works when content fits,
           and grows naturally when content overflows (so the header
           never clips the top of the page). */}
      <main className="flex-1 min-h-0 overflow-y-auto">
        <div className="min-h-full flex flex-col items-center justify-center px-6 py-12">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-[#0e0f0c] mb-2">Your business card</h1>
          <p className="text-sm text-[#454745]">
            Template: <span className="font-medium text-[#0e0f0c]">{config.templateId}</span>
          </p>
        </div>

        {/* The card — `.card` class is the documented selector */}
        <div ref={cardRef} className="card mb-10">
          <BusinessCard design={design} info={config.cardInfo} size="large" />
        </div>

        {/* Actions */}
        <div className="flex flex-wrap items-center justify-center gap-3">
          <button
            onClick={downloadPng}
            disabled={downloading}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#9fe870] text-[#163300] rounded-full hover:bg-[#cdffad] hover:scale-[1.02] active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed disabled:scale-100 transition-all font-semibold"
          >
            <Download size={18} />
            {downloading ? "Generating PNG…" : "Download PNG"}
          </button>
          <button
            onClick={editInCardCraft}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#0e0f0c]/8 text-[#0e0f0c] hover:bg-[#0e0f0c]/12 rounded-full transition-colors font-semibold"
          >
            <Pencil size={18} />
            Edit in CardCraft
          </button>
        </div>

        {/* Subtle palette readout — hidden behind a disclosure to keep the page calm */}
        <details className="mt-10">
          <summary className="text-xs text-[#868685] cursor-pointer hover:text-[#454745] select-none">
            Palette details
          </summary>
          <div className="flex items-center gap-2 text-xs text-[#454745] mt-2">
            {(["primary", "secondary", "accent", "background", "backgroundAlt", "text"] as const).map((slot) => (
              <span key={slot} className="inline-flex items-center gap-1.5">
                <span
                  className="inline-block w-3 h-3 rounded-sm border border-[#0e0f0c]/12"
                  style={{ backgroundColor: config.palette[slot] }}
                  title={slot}
                />
                <code className="text-[11px]">{config.palette[slot]}</code>
              </span>
            ))}
          </div>
        </details>

        {/* Wizard CTA — surfaces capabilities the render page doesn't expose */}
        <div className="mt-12 max-w-3xl w-full mx-auto rounded-xl border border-[#0e0f0c]/12 bg-[#f4f5f2] p-5">
          <div className="flex items-start gap-4 flex-wrap justify-between">
            <div className="flex items-start gap-3 flex-1 min-w-0">
              <div className="shrink-0 w-10 h-10 rounded-lg bg-[#0e0f0c] flex items-center justify-center">
                <Wand2 size={20} className="text-[#9fe870]" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-[#0e0f0c]">
                  Want more than a static render?
                </h3>
                <p className="text-xs text-[#454745] mt-0.5 max-w-xl">
                  Open this card in the CardCraft wizard to:
                </p>
                <ul className="mt-2 grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-1 text-xs text-[#0e0f0c] max-w-xl">
                  <li className="flex items-center gap-1.5"><Image size={13} className="text-[#454745]" /> Upload your logo</li>
                  <li className="flex items-center gap-1.5"><QrCode size={13} className="text-[#454745]" /> Add a QR code</li>
                  <li className="flex items-center gap-1.5"><Type size={13} className="text-[#454745]" /> Add custom text lines</li>
                  <li className="flex items-center gap-1.5"><PaletteIcon size={13} className="text-[#454745]" /> Tweak colors & patterns</li>
                  <li className="flex items-center gap-1.5"><Pencil size={13} className="text-[#454745]" /> Edit any element directly</li>
                  <li className="flex items-center gap-1.5"><Wand2 size={13} className="text-[#454745]" /> Design the back of the card</li>
                </ul>
              </div>
            </div>
            <button
              onClick={editInCardCraft}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#9fe870] text-[#163300] hover:bg-[#cdffad] hover:scale-[1.02] active:scale-[0.98] text-sm rounded-full transition-all font-semibold whitespace-nowrap"
            >
              Open in Wizard
              <Pencil size={16} />
            </button>
          </div>
        </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="shrink-0 border-t border-[#0e0f0c]/12 bg-white py-3">
        <div className="max-w-4xl mx-auto px-4 text-center text-xs text-[#454745]">
          <span className="text-[#868685]">AI assistant?</span>{" "}
          <a href="/skill.md" target="_blank" rel="noreferrer" className="font-medium hover:text-[#0e0f0c] transition-colors">
            /skill.md
          </a>{" "}
          <span className="text-[#868685]">tells you how to generate cards via the API.</span>
        </div>
      </footer>
    </div>
  );
}
