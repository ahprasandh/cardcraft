/**
 * Gallery route — `#/gallery?config=<base64>`.
 *
 * Shows N card candidates side-by-side in a grid. Used when an AI assistant
 * wants to give the user multiple design options to choose from rather than
 * a single forced choice.
 *
 * Each card has its own Download PNG, Edit in CardCraft, and Open
 * (in the single-card render route) actions.
 */

import { useEffect, useRef, useState } from "react";
import BusinessCard from "@/components/BusinessCard";
import Logo from "@/components/Logo";
import { Download, ExternalLink, Pencil, Wand2, ArrowRight, Image, QrCode, Type, Palette as PaletteIcon } from "lucide-react";
import type { CardDesign, CardInfo, LogoElement, QrElement, BackElement } from "@/lib/types";
import { useWizardStore } from "@/lib/store";

declare global {
  interface Window {
    domtoimage: {
      toPng: (node: HTMLElement, opts?: Record<string, unknown>) => Promise<string>;
    };
  }
}

interface Palette {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  backgroundAlt: string;
  text: string;
}

interface Candidate {
  templateId: string;
  palette: Palette;
  reason?: string;
  /** Optional per-candidate overrides. If absent, the gallery's top-level
   *  values (or legacy fields) apply. */
  logoElement?: LogoElement;
  qrElement?: QrElement;
  backElements?: BackElement[];
}

interface GalleryConfig {
  cardInfo: CardInfo;
  candidates: Candidate[];
  font?: "sans" | "serif" | "mono";
  /** Optional: shared across all candidates. Per-candidate values override. */
  logoElement?: LogoElement;
  qrElement?: QrElement;
  backElements?: BackElement[];
}

function parseConfig(): { config: GalleryConfig | null; error: string | null } {
  try {
    const hash = window.location.hash;
    const queryStart = hash.indexOf("?");
    if (queryStart === -1) return { config: null, error: "Missing ?config= parameter" };
    const params = new URLSearchParams(hash.slice(queryStart + 1));
    const raw = params.get("config");
    if (!raw) return { config: null, error: "Missing ?config= parameter" };
    const json = atob(raw);
    const parsed = JSON.parse(json);
    if (!parsed.cardInfo || !Array.isArray(parsed.candidates) || parsed.candidates.length === 0) {
      return { config: null, error: "Config missing required fields (cardInfo, candidates[])" };
    }
    return { config: parsed as GalleryConfig, error: null };
  } catch (e) {
    return { config: null, error: `Failed to parse config: ${(e as Error).message}` };
  }
}

function buildDesign(
  c: Candidate,
  font: "sans" | "serif" | "mono" = "sans",
  hasCustomLogo: boolean = false,
  galleryLogo?: LogoElement,
  galleryQr?: QrElement,
  galleryBack?: BackElement[],
): CardDesign {
  return {
    id: `gallery-${c.templateId}`,
    templateId: c.templateId,
    name: c.templateId,
    reasoning: c.reason || "",
    colors: c.palette,
    font,
    textAlign: "left",
    spacing: "normal",
    borderRadius: "medium",
    pattern: { id: "none", opacity: 0, color: c.palette.accent, placement: "full" },
    backgroundEffect: { type: "none", color: c.palette.accent, opacity: 0, angle: 0 },
    logo: {
      id: hasCustomLogo ? "circle-letter" : "none",
      placement: "top-left",
      size: "medium",
    },
    // Per-candidate override > gallery-level value > legacy path.
    logoElement: c.logoElement ?? galleryLogo,
    qrElement: c.qrElement ?? galleryQr,
    backElements: c.backElements ?? galleryBack,
    border: { sides: "none", width: 0, color: c.palette.accent },
  } as unknown as CardDesign;
}

export default function Gallery() {
  const [{ config, error }, setState] = useState(() => parseConfig());
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [downloadingIdx, setDownloadingIdx] = useState<number | null>(null);
  const setCardInfo = useWizardStore((s) => s.setCardInfo);
  const setSelectedDesign = useWizardStore((s) => s.setSelectedDesign);
  const setDesigns = useWizardStore((s) => s.setDesigns);
  const setStep = useWizardStore((s) => s.setStep);

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
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Invalid gallery link</h1>
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
              #/gallery?config=&lt;base64-encoded-JSON&gt;
            </code>
            <p className="mt-3">
              See <a href="/skill.md" className="text-[#0e0f0c] hover:underline">/skill.md</a> for the full contract.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ── Download PNG ────────────────────────────────────────────────────
  const downloadPng = async (idx: number) => {
    const node = cardRefs.current[idx];
    if (!node || !window.domtoimage) return;
    setDownloadingIdx(idx);
    try {
      const dataUrl = await window.domtoimage.toPng(node, {
        bgcolor: "transparent",
        quality: 1.0,
      });
      const link = document.createElement("a");
      const baseName = (config.cardInfo.name || "card")
        .replace(/\s+/g, "-")
        .toLowerCase();
      link.download = `${baseName}-${config.candidates[idx].templateId}.png`;
      link.href = dataUrl;
      link.click();
    } catch (e) {
      console.error("PNG download failed:", e);
      alert("Failed to generate PNG.");
    } finally {
      setDownloadingIdx(null);
    }
  };

  // ── Edit selected candidate in wizard ───────────────────────────────
  const editInCardCraft = (idx: number) => {
    const candidate = config.candidates[idx];
    const design = buildDesign(candidate, config.font, !!config.cardInfo.customLogoUrl, config.logoElement, config.qrElement, config.backElements);
    // Populate cardInfo with all expected fields filled.
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
    // Seed designs[] with all gallery candidates so refinement can let the
    // user switch between them later if desired.
    const allDesigns = config.candidates.map((c) =>
      buildDesign(c, config.font, !!config.cardInfo.customLogoUrl, config.logoElement, config.qrElement, config.backElements),
    );
    setDesigns(allDesigns);
    setSelectedDesign(design);
    setStep("refine");
    window.location.hash = "#/";
  };

  // ── Open single-card view in new tab ────────────────────────────────
  const openInRender = (idx: number) => {
    const candidate = config.candidates[idx];
    const renderConfig = {
      cardInfo: config.cardInfo,
      templateId: candidate.templateId,
      palette: candidate.palette,
      font: config.font,
    };
    const encoded = btoa(JSON.stringify(renderConfig));
    window.open(`#/render?config=${encoded}`, "_blank");
  };

  // ── Render ──────────────────────────────────────────────────────────
  return (
    <div className="h-screen flex flex-col overflow-hidden bg-white">
      <header className="shrink-0 border-b border-[#0e0f0c]/12 bg-white">
        <div className="max-w-5xl mx-auto px-4 py-2.5 flex items-center justify-between">
          <a href="#/" className="flex items-center">
            <Logo variant="light" size={28} />
          </a>
          <span className="text-xs text-[#454745]">
            Gallery · <code className="bg-[#0e0f0c]/8 px-1.5 py-0.5 rounded">#/gallery</code>
          </span>
        </div>
      </header>

      <main className="flex-1 min-h-0 overflow-y-auto px-6 py-10">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-[#0e0f0c] mb-1">
              {config.candidates.length} card variants
            </h1>
            <p className="text-sm text-[#454745]">
              for {config.cardInfo.name || "you"} · click any card to download or edit
            </p>
          </div>

          {/* Prominent wizard CTA — encourages users to try the full editor */}
          <div className="mb-8 rounded-xl border border-[#0e0f0c]/12 bg-[#f4f5f2] p-5">
            <div className="flex items-start gap-4 flex-wrap justify-between">
              <div className="flex items-start gap-3 flex-1 min-w-0">
                <div className="shrink-0 w-10 h-10 rounded-lg bg-[#0e0f0c] flex items-center justify-center">
                  <Wand2 size={20} className="text-[#9fe870]" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#0e0f0c]">
                    Want more control? Open in the wizard
                  </h3>
                  <p className="text-xs text-[#454745] mt-0.5 max-w-2xl">
                    The wizard lets you do things this gallery can't:
                  </p>
                  <ul className="mt-2 grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-1 text-xs text-[#0e0f0c] max-w-2xl">
                    <li className="flex items-center gap-1.5"><Image size={13} className="text-[#454745]" /> Upload your logo</li>
                    <li className="flex items-center gap-1.5"><QrCode size={13} className="text-[#454745]" /> Add a QR code</li>
                    <li className="flex items-center gap-1.5"><Type size={13} className="text-[#454745]" /> Add custom text lines</li>
                    <li className="flex items-center gap-1.5"><PaletteIcon size={13} className="text-[#454745]" /> Tweak colors & patterns</li>
                    <li className="flex items-center gap-1.5"><Pencil size={13} className="text-[#454745]" /> Edit any element directly</li>
                    <li className="flex items-center gap-1.5"><Wand2 size={13} className="text-[#454745]" /> Design the back of the card</li>
                  </ul>
                </div>
              </div>
              <a
                href="#/"
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#9fe870] text-[#163300] hover:bg-[#cdffad] hover:scale-[1.02] active:scale-[0.98] text-sm rounded-full transition-all font-semibold whitespace-nowrap"
              >
                Open the Wizard
                <ArrowRight size={16} />
              </a>
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            {config.candidates.map((c, idx) => {
              const design = buildDesign(c, config.font, !!config.cardInfo.customLogoUrl, config.logoElement, config.qrElement, config.backElements);
              return (
                <div
                  key={idx}
                  className="bg-white rounded-xl border border-[#0e0f0c]/12 p-5 hover:border-[#0e0f0c]/24 transition-colors"
                >
                  <div className="text-xs text-[#454745] mb-3 font-medium">
                    <span className="text-[#0e0f0c]">{c.templateId}</span>
                    {c.reason && <span className="text-[#868685] italic"> · {c.reason}</span>}
                  </div>
                  <div
                    ref={(el) => {
                      cardRefs.current[idx] = el;
                    }}
                    className="card mb-4 mx-auto"
                    style={{ width: 350, maxWidth: "100%" }}
                  >
                    <BusinessCard design={design} info={config.cardInfo} size="medium" />
                  </div>
                  <div className="flex gap-2 justify-center flex-wrap">
                    <button
                      onClick={() => downloadPng(idx)}
                      disabled={downloadingIdx === idx}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#9fe870] text-[#163300] text-xs rounded-full hover:bg-[#cdffad] disabled:opacity-60 transition-colors font-semibold"
                    >
                      <Download size={14} />
                      {downloadingIdx === idx ? "Generating…" : "PNG"}
                    </button>
                    <button
                      onClick={() => editInCardCraft(idx)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#0e0f0c]/8 text-[#0e0f0c] hover:bg-[#0e0f0c]/12 text-xs rounded-full transition-colors font-semibold"
                    >
                      <Pencil size={14} />
                      Edit
                    </button>
                    <button
                      onClick={() => openInRender(idx)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#0e0f0c]/8 text-[#0e0f0c] hover:bg-[#0e0f0c]/12 text-xs rounded-full transition-colors font-semibold"
                    >
                      <ExternalLink size={14} />
                      Open
                    </button>
                  </div>
                  <div className="mt-3 flex items-center justify-center gap-1 text-xs text-[#868685]">
                    {(["primary", "secondary", "accent", "background", "backgroundAlt", "text"] as const).map((slot) => (
                      <span
                        key={slot}
                        className="inline-block w-2.5 h-2.5 rounded-sm border border-[#0e0f0c]/12"
                        style={{ backgroundColor: c.palette[slot] }}
                        title={`${slot}: ${c.palette[slot]}`}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </main>

      <footer className="shrink-0 border-t border-[#0e0f0c]/12 bg-white py-3">
        <div className="max-w-5xl mx-auto px-4 text-center text-xs text-[#454745]">
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
