
import { useState, useRef, useEffect } from "react";

declare global {
  interface Window { domtoimage: { toPng: (node: HTMLElement, opts?: Record<string, unknown>) => Promise<string> } }
}
import { useWizardStore } from "@/lib/store";
import BusinessCard from "@/components/BusinessCard";
import BusinessCardBack from "@/components/BusinessCardBack";
import { PATTERNS, getPatternSVG } from "@/lib/patterns";
import { getTemplateSpec } from "@/lib/template-specs";
import { resolveFontSize, type TypeToken } from "@core/typography";
import type { EditableElementId } from "@/components/BusinessCard";
import type {
  CardDesign,
  ElementStyle,
  PatternPlacement,
  LogoPlacement,
  ExtraImage,
  BackFacePreset,
  BackFaceSpec,
  BackElement,
  QrElement,
} from "@/lib/types";
import {
  ArrowLeft,
  ArrowUp,
  ArrowDown,
  ArrowRight as ArrowRightIcon,
  MapPin,
  User,
  Briefcase,
  Building2,
  Mail,
  Phone,
  Globe,
  Wand2,
  MessageSquareQuote,
  ImagePlus,
  X,
  Loader2,
  RotateCcw,
  Minus,
  Plus,
  Eye,
  EyeOff,
  Download,
  FileImage,
  FileText,
  QrCode,
  Image as ImageIcon,
  Trash2,
  FlipHorizontal2,
  ChevronDown,
  ChevronRight as ChevronRightIcon,
  Type,
  Layers,
  Settings2,
  Copy,
  Link2,
  Check,
  Printer,
  AlertTriangle,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

/* ── constants ─────────────────────────────────────────────────────── */
const MOVE_STEP = 2;
const PATTERN_PLACEMENTS: PatternPlacement[] = ["full", "top", "bottom", "left", "right", "top-left", "top-right", "bottom-left", "bottom-right", "diagonal-tl", "diagonal-br"];
const QR_PLACEMENTS: LogoPlacement[] = ["top-left", "top-right", "top-center", "center-left", "center", "center-right", "bottom-left", "bottom-right", "bottom-center"];

const BACK_PRESETS: { value: BackFacePreset; label: string; description: string }[] = [
  { value: "logo-centered", label: "Logo",    description: "Centered logo with company name below" },
  { value: "qr-focus",      label: "QR",      description: "Large centered QR code with company + website" },
  { value: "pattern-fill",  label: "Pattern", description: "Full-bleed pattern overlay with company name" },
  { value: "minimal-info",  label: "Minimal", description: "Just company + website, no decoration" },
  { value: "solid",         label: "Solid",   description: "Plain solid color, optional faded logo" },
  { value: "tagline",       label: "Tagline", description: "Feature your tagline as the hero element" },
];

function defaultBackFace(design: CardDesign): BackFaceSpec {
  return {
    preset: "logo-centered",
    background: design.colors.background,
    showLogo: true,
    showQr: true,
    showCompany: true,
    showTagline: true,
    showWebsite: true,
    patternId: "inherit",
  };
}

const ELEMENT_LABELS: Record<EditableElementId, string> = {
  name: "Name",
  title: "Title",
  company: "Company",
  tagline: "Tagline",
  contacts: "Custom Line",
  email: "Email",
  phone: "Phone",
  website: "Website",
  address: "Address",
  logo: "Logo",
  qr: "QR Code",
};

/* Text fields treated as element rows on the front face. */
type TextFieldKey = "name" | "title" | "company" | "tagline" | "email" | "phone" | "website" | "address";
const TEXT_FIELDS: { key: TextFieldKey; label: string; icon: LucideIcon; type: string; placeholder: string }[] = [
  { key: "name", label: "Name", icon: User, type: "text", placeholder: "Full Name" },
  { key: "title", label: "Title", icon: Briefcase, type: "text", placeholder: "Job Title" },
  { key: "company", label: "Company", icon: Building2, type: "text", placeholder: "Company" },
  { key: "tagline", label: "Tagline", icon: MessageSquareQuote, type: "text", placeholder: "Tagline" },
  { key: "email", label: "Email", icon: Mail, type: "email", placeholder: "Email" },
  { key: "phone", label: "Phone", icon: Phone, type: "tel", placeholder: "Phone" },
  { key: "website", label: "Website", icon: Globe, type: "text", placeholder: "Website" },
  { key: "address", label: "Address", icon: MapPin, type: "text", placeholder: "Address" },
];

/* ── helpers ───────────────────────────────────────────────────────── */
function usePatchDesign() {
  const { setSelectedDesign } = useWizardStore();
  // Functional setter so chained patch() calls in the same tick compose
  // correctly. The earlier closure-captured spread was a stale-state trap:
  // clicking "vCard" first patched qr.content, then immediately overwrote
  // it via the second qrElement patch which spread the OLD design.
  return (next: Partial<CardDesign>) => {
    setSelectedDesign((prev) => (prev ? { ...prev, ...next } : prev));
  };
}

/* ═══════════════════════════════════════════════════════════════════ */
export default function RefinementStep() {
  const { selectedDesign, setStep, cardInfo, setCardInfo } = useWizardStore();
  const patch = usePatchDesign();

  const cardRef = useRef<HTMLDivElement>(null);
  const backCardRef = useRef<HTMLDivElement>(null);

  /* ── UI state ─────────────────────────────────────────────────────── */
  const [showBack, setShowBack] = useState(false);
  const [sideView, setSideView] = useState<"front" | "back">("front");
  const [selectedEl, setSelectedEl] = useState<EditableElementId | null>(null);
  /** When the back face is in view, this holds the index of the selected back element. */
  const [selectedBackIdx, setSelectedBackIdx] = useState<number | null>(null);
  const [taglineSuggestions, setTaglineSuggestions] = useState<string[]>([]);
  const [isLoadingTaglines, setIsLoadingTaglines] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [showDownloadMenu, setShowDownloadMenu] = useState(false);
  const [cardStyleOpen, setCardStyleOpen] = useState(false);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);

  /**
   * Build a render-route URL that bakes the current design + cardInfo into
   * a base64 config blob. The recipient lands on `/#/render?config=…` and
   * sees an exact snapshot of what the sender designed.
   *
   * Two correctness rules:
   *   1. Ship the full design (palette, font, pattern, border, logo, QR,
   *      backFace, backElements, elementOverrides, hiddenFields, etc.) —
   *      not just a curated subset. Anything dropped is something the
   *      recipient will see differently.
   *   2. Strip the *values* of hidden fields out of cardInfo before
   *      encoding. Hiding the email shouldn't ship the email address in
   *      the URL — the recipient never needs that data.
   */
  const handleShare = async () => {
    if (!selectedDesign) return;
    try {
      const hidden = new Set(selectedDesign.hiddenFields ?? []);
      // Empty out any hidden field's value so it isn't embedded in the URL.
      const sharedInfo: typeof cardInfo = { ...cardInfo };
      const HIDEABLE_KEYS: (keyof typeof cardInfo)[] = [
        "name", "title", "company", "tagline",
        "email", "phone", "website", "address",
      ];
      for (const k of HIDEABLE_KEYS) {
        if (hidden.has(k)) (sharedInfo as unknown as Record<string, unknown>)[k] = "";
      }
      // Hidden custom lines: re-emit as empty strings so positions don't shift.
      // (We don't have per-line hidden state — the visToggle for custom lines
      // hides via element overrides — so we leave customLines as-is.)
      const config = {
        cardInfo: sharedInfo,
        templateId: selectedDesign.templateId,
        palette: selectedDesign.colors,
        font: selectedDesign.font,
        textAlign: selectedDesign.textAlign,
        spacing: selectedDesign.spacing,
        borderRadius: selectedDesign.borderRadius,
        pattern: selectedDesign.pattern,
        backgroundEffect: selectedDesign.backgroundEffect,
        logo: selectedDesign.logo,
        logoElement: selectedDesign.logoElement ?? undefined,
        border: selectedDesign.border,
        qr: selectedDesign.qr,
        qrElement: selectedDesign.qrElement ?? undefined,
        backFace: selectedDesign.backFace,
        backElements: selectedDesign.backElements ?? undefined,
        fontSizes: selectedDesign.fontSizes,
        elementOverrides: selectedDesign.elementOverrides,
        hiddenFields: selectedDesign.hiddenFields,
        customFonts: selectedDesign.customFonts,
      };
      const encoded = btoa(unescape(encodeURIComponent(JSON.stringify(config))));
      const origin = window.location.origin;
      const url = `${origin}/#/render?config=${encoded}`;
      await navigator.clipboard.writeText(url);
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 2000);
    } catch {
      alert("Could not copy — please try again.");
    }
  };

  /* Keep visual side ↔ panel side in sync. Also clear the opposite-side
     selection so keyboard arrows always nudge whatever the user is looking at. */
  useEffect(() => {
    if (sideView === "back" && !showBack) setShowBack(true);
    if (sideView === "front" && showBack) setShowBack(false);
    if (sideView === "front") setSelectedBackIdx(null);
    if (sideView === "back") setSelectedEl(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sideView]);

  useEffect(() => {
    if (showBack && sideView !== "back") setSideView("back");
    if (!showBack && sideView !== "front") setSideView("front");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showBack]);

  /* ── element override helpers (legacy text-field overrides) ──────── */
  const getElStyle = (id: EditableElementId): ElementStyle =>
    selectedDesign?.elementOverrides?.[id] ?? {};

  const setElStyle = (id: EditableElementId, partial: Partial<ElementStyle>) => {
    if (!selectedDesign) return;
    const current = selectedDesign.elementOverrides ?? {};
    patch({ elementOverrides: { ...current, [id]: { ...current[id], ...partial } } });
  };

  const resetElStyle = (id: EditableElementId) => {
    if (!selectedDesign) return;
    const current = { ...(selectedDesign.elementOverrides ?? {}) };
    delete current[id];
    patch({ elementOverrides: Object.keys(current).length ? current : undefined });
  };

  /**
   * Promote a possibly-derived QrElement into a concrete one we can write to.
   * Mirrors normalizeQr() in BusinessCard but lives at the wizard level.
   */
  const ensureQrElement = (): QrElement => {
    if (!selectedDesign) {
      return { enabled: true, content: "website", x: 0, y: 0, width: 32, height: 32, opacity: 1, visible: true };
    }
    if (selectedDesign.qrElement) return selectedDesign.qrElement;
    const qr = selectedDesign.qr ?? { enabled: true, content: "website" as const, placement: "bottom-right" as LogoPlacement, size: "small" as const };
    const w = qr.size === "medium" ? 48 : 32;
    const margin = 12;
    const cardW = 350, cardH = 200;
    let x = cardW - w - margin, y = cardH - w - margin;
    switch (qr.placement) {
      case "top-left":      x = margin;             y = margin; break;
      case "top-center":    x = (cardW - w) / 2;    y = margin; break;
      case "top-right":     x = cardW - w - margin; y = margin; break;
      case "center-left":   x = margin;             y = (cardH - w) / 2; break;
      case "center":        x = (cardW - w) / 2;    y = (cardH - w) / 2; break;
      case "center-right":  x = cardW - w - margin; y = (cardH - w) / 2; break;
      case "bottom-left":   x = margin;             y = cardH - w - margin; break;
      case "bottom-center": x = (cardW - w) / 2;    y = cardH - w - margin; break;
      case "bottom-right":  x = cardW - w - margin; y = cardH - w - margin; break;
    }
    return { enabled: true, content: qr.content, customText: qr.customText, x, y, width: w, height: w, opacity: 1, visible: true };
  };

  const moveEl = (dx: number, dy: number) => {
    if (!selectedEl) return;
    if (selectedEl === "qr") {
      // Free-move QR by writing to qrElement
      const qe = ensureQrElement();
      patch({ qrElement: { ...qe, x: qe.x + dx, y: qe.y + dy } });
      return;
    }
    const cur = getElStyle(selectedEl);
    setElStyle(selectedEl, {
      offsetX: (cur.offsetX ?? 0) + dx,
      offsetY: (cur.offsetY ?? 0) + dy,
    });
  };

  /** Nudge a back-face element's absolute (x, y). Mirrors moveEl for the back side. */
  const moveBackEl = (dx: number, dy: number) => {
    if (selectedBackIdx == null) return;
    const list = d.backElements ?? [];
    const el = list[selectedBackIdx];
    if (!el) return;
    updateBackElement(selectedBackIdx, { x: el.x + dx, y: el.y + dy });
  };

  const changeFontSize = (delta: number) => {
    if (!selectedEl) return;
    const cur = getElStyle(selectedEl);
    // Read the spec's actual fontSize for this element; fall back to a
    // body-text default if the spec doesn't have a matching element.
    const spec = getTemplateSpec(selectedDesign?.templateId ?? "");
    const specEl = spec?.elements.find((e) => e.id === selectedEl);
    const specSize = specEl && specEl.type === "text"
      ? (typeof specEl.fontSize === "number" ? specEl.fontSize : resolveFontSize(specEl.fontSize as TypeToken))
      : 12;
    const newSize = Math.max(6, Math.min(48, (cur.fontSize ?? specSize) + delta));
    setElStyle(selectedEl, { fontSize: newSize });
  };

  const changeLogoSize = (delta: number) => {
    const cur = getElStyle("logo");
    const base = 36;
    const newSize = Math.max(16, Math.min(72, (cur.fontSize ?? base) + delta));
    setElStyle("logo", { fontSize: newSize });
  };

  const changeQrSize = (delta: number) => {
    const qe = ensureQrElement();
    const next = Math.max(20, Math.min(120, qe.width + delta));
    patch({ qrElement: { ...qe, width: next, height: next } });
  };

  /* ── hidden fields helpers ──────────────────────────────────────── */
  const hiddenFields = new Set(selectedDesign?.hiddenFields ?? []);

  const toggleField = (field: string) => {
    if (!selectedDesign) return;
    const current = new Set(selectedDesign.hiddenFields ?? []);
    if (current.has(field)) current.delete(field);
    else current.add(field);
    patch({ hiddenFields: current.size > 0 ? Array.from(current) : undefined });
  };

  const isHidden = (field: string) => hiddenFields.has(field);

  /* ── Keyboard shortcuts ───────────────────────────────────────────── */
  const ELEMENTS: EditableElementId[] = ["name", "title", "company", "tagline", "contacts", "logo", "qr"];
  const editStateRef = useRef({ selectedEl, moveEl, changeFontSize, changeLogoSize, changeQrSize, toggleField, setSelectedEl, selectedBackIdx, moveBackEl, setSelectedBackIdx });
  editStateRef.current = { selectedEl, moveEl, changeFontSize, changeLogoSize, changeQrSize, toggleField, setSelectedEl, selectedBackIdx, moveBackEl, setSelectedBackIdx };

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const { selectedEl: sel, moveEl: move, changeFontSize: cfs, changeLogoSize: cls, changeQrSize: cqs, toggleField: tf, setSelectedEl: sSel, selectedBackIdx: bSel, moveBackEl: bMove, setSelectedBackIdx: bSSel } = editStateRef.current;
      const tag = (e.target as HTMLElement).tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;

      if (e.key === "Escape") {
        e.preventDefault();
        if (sel) sSel(null);
        if (bSel != null) bSSel(null);
        return;
      }
      if (e.key === "Tab" && sel) {
        e.preventDefault();
        const idx = ELEMENTS.indexOf(sel);
        const next = e.shiftKey
          ? ELEMENTS[(idx - 1 + ELEMENTS.length) % ELEMENTS.length]
          : ELEMENTS[(idx + 1) % ELEMENTS.length];
        sSel(next);
        return;
      }

      // Back-element nudge wins when a back element is selected. We don't
      // need font-size or delete shortcuts here — back-element editing
      // happens through the right-panel row.
      if (bSel != null) {
        const step = (e.metaKey || e.ctrlKey) ? 50 : e.shiftKey ? 10 : MOVE_STEP;
        switch (e.key) {
          case "ArrowUp":    e.preventDefault(); bMove(0, -step); return;
          case "ArrowDown":  e.preventDefault(); bMove(0, step); return;
          case "ArrowLeft":  e.preventDefault(); bMove(-step, 0); return;
          case "ArrowRight": e.preventDefault(); bMove(step, 0); return;
        }
      }

      if (!sel) return;
      const step = (e.metaKey || e.ctrlKey) ? 50 : e.shiftKey ? 10 : MOVE_STEP;
      switch (e.key) {
        case "ArrowUp":    e.preventDefault(); move(0, -step); break;
        case "ArrowDown":  e.preventDefault(); move(0, step); break;
        case "ArrowLeft":  e.preventDefault(); move(-step, 0); break;
        case "ArrowRight": e.preventDefault(); move(step, 0); break;
        case "+": case "=":
          e.preventDefault();
          if (sel === "logo") cls(2);
          else if (sel === "qr") cqs(4);
          else cfs(1);
          break;
        case "-": case "_":
          e.preventDefault();
          if (sel === "logo") cls(-2);
          else if (sel === "qr") cqs(-4);
          else cfs(-1);
          break;
        case "Delete": case "Backspace":
          if (sel !== "logo" && sel !== "qr") { e.preventDefault(); tf(sel); }
          break;
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ── content handlers ────────────────────────────────────────────── */
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { alert("Logo must be under 2 MB"); return; }
    const reader = new FileReader();
    reader.onload = () => setCardInfo({ customLogoUrl: reader.result as string });
    reader.readAsDataURL(file);
  };

  const handleSuggestTaglines = async () => {
    setIsLoadingTaglines(true);
    const defaults = ["Excellence in every detail", "Building what matters", "Innovation meets execution", "Your success, our mission", "Where ideas take shape"];
    try {
      const prompt = `Generate 5 short, punchy business card taglines for this person.

- Name: ${cardInfo.name || "Professional"}
- Job Title: ${cardInfo.title || "Not provided"}
- Company: ${cardInfo.company || "Not provided"}
- Business Description: ${cardInfo.businessDescription || "Not provided"}

Rules:
- Each tagline must be under 8 words
- Make them memorable, professional, and relevant to their role and business
- The business description is key — capture the essence of what they do
- No quotes around the taglines
- Respond ONLY with a JSON array of 5 strings, nothing else

Example: ["Designing the future", "Code that matters", "Your vision, built", "Strategy meets execution", "Ideas into impact"]

JSON array:`;

      const res = await fetch("http://hari-3035-macstudio.csez.zohocorpin.com:11434/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "qwen3.6:35b",
          messages: [{ role: "user", content: prompt }],
          stream: false,
          think: false,
          options: { temperature: 0.7, num_predict: 256 },
        }),
      });
      const data = await res.json();
      const content = data?.message?.content || "";
      const jsonMatch = content.match(/\[[\s\S]*?\]/);
      if (!jsonMatch) { setTaglineSuggestions(defaults); setIsLoadingTaglines(false); return; }
      const taglines: string[] = JSON.parse(jsonMatch[0]);
      const valid = taglines.filter((t: string) => typeof t === "string" && t.length > 0 && t.length < 60).slice(0, 5);
      setTaglineSuggestions(valid.length >= 3 ? valid : defaults);
    } catch {
      setTaglineSuggestions(defaults);
    }
    setIsLoadingTaglines(false);
  };

  const handleConfirm = () => setStep("printers");

  /* ── download helpers ────────────────────────────────────────────── */
  /**
   * Best-effort human-readable description of any thrown thing.
   * dom-to-image frequently rejects with non-Error objects (Events from
   * `<img>` onerror, plain strings, etc.), so we go through several
   * shapes before giving up.
   */
  const describeError = (err: unknown): string => {
    if (err instanceof Error) return err.message;
    if (typeof err === "string") return err;
    if (err && typeof err === "object") {
      const e = err as Record<string, unknown>;
      if (typeof e.message === "string") return e.message;
      if (e.target && typeof e.target === "object") {
        const t = e.target as Record<string, unknown>;
        const src = typeof t.src === "string" ? t.src : "";
        return src
          ? `Image failed to load (likely too large or contains a cross-origin asset): ${src.slice(0, 80)}…`
          : "Image asset failed to load";
      }
      try {
        const s = JSON.stringify(err);
        if (s !== "{}") return s;
      } catch { /* ignore */ }
    }
    return String(err);
  };

  /**
   * Capture a node as a PNG data URL via dom-to-image.
   *
   * Resolution: cards are designed at 350×200 px (medium ref). For
   * print we want 300dpi at 3.5×2 in, i.e. 1050×600 px. The captured
   * node is rendered at "large" size (490×280) so we scale by
   * 1050/490 ≈ 2.14 ×, then 2× more for retina sharpness.
   */
  const captureNode = async (node: HTMLElement): Promise<string> => {
    if (!window.domtoimage) {
      throw new Error("Image library not loaded. Please refresh the page.");
    }
    // Wait for fonts and a layout tick so dimensions are stable
    await document.fonts.ready;
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

    const w = node.offsetWidth;
    const h = node.offsetHeight;
    if (!w || !h) {
      throw new Error("Card element has zero dimensions. Flip to that side and try again.");
    }

    const printScale = 1050 / w;     // 3.5in × 300dpi
    const scale = printScale * 2;    // retina

    return window.domtoimage.toPng(node, {
      width: w * scale,
      height: h * scale,
      style: {
        transform: `scale(${scale})`,
        transformOrigin: "top left",
        width: `${w}px`,
        height: `${h}px`,
        boxShadow: "none",
        overflow: "hidden",
        // Strip the dashed selection outline that editMode draws on the
        // selected element — we don't want it baked into the export.
        outline: "none",
      },
    });
  };

  const captureCard = async () => {
    const node = cardRef.current;
    if (!node) throw new Error("Card preview not found.");
    return captureNode(node);
  };

  /**
   * Wraps a capture run with the editor decorations cleared, so dashed
   * selection outlines and edit-mode chrome don't appear in the
   * exported image. Restores the previous selection afterwards.
   */
  const withCleanCapture = async <T,>(work: () => Promise<T>): Promise<T> => {
    const prevSelected = selectedEl;
    const prevExpanded = expandedRow;
    if (prevSelected !== null) setSelectedEl(null);
    if (prevExpanded !== null) setExpandedRow(null);
    // Wait one frame for React to apply the cleared selection
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    try {
      return await work();
    } finally {
      if (prevSelected !== null) setSelectedEl(prevSelected);
      if (prevExpanded !== null) setExpandedRow(prevExpanded);
    }
  };

  const downloadPng = async () => {
    setIsDownloading(true);
    setShowDownloadMenu(false);
    try {
      await withCleanCapture(async () => {
        const baseName = (cardInfo.name || "business-card").replace(/\s+/g, "-").toLowerCase();
        const frontUrl = await captureCard();
        const link = document.createElement("a");
        link.download = `${baseName}-front.png`;
        link.href = frontUrl;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        if (selectedDesign?.backFace && backCardRef.current) {
          const backUrl = await captureNode(backCardRef.current);
          // Tiny delay so the browser's download stack handles them in order
          await new Promise((r) => setTimeout(r, 250));
          const link2 = document.createElement("a");
          link2.download = `${baseName}-back.png`;
          link2.href = backUrl;
          document.body.appendChild(link2);
          link2.click();
          document.body.removeChild(link2);
        }
      });
    } catch (err) {
      console.error("PNG download failed:", err);
      alert(`PNG download failed: ${describeError(err)}`);
    } finally {
      setIsDownloading(false);
    }
  };

  const downloadPdf = async () => {
    setIsDownloading(true);
    setShowDownloadMenu(false);
    try {
      const { frontUrl, backUrl } = await withCleanCapture(async () => {
        const front = await captureCard();
        let back: string | null = null;
        if (selectedDesign?.backFace && backCardRef.current) {
          back = await captureNode(backCardRef.current);
        }
        return { frontUrl: front, backUrl: back };
      });

      const cardW = 3.5, cardH = 2, pageW = 8.5, pageH = 11, marginY = 1;
      const printWin = window.open("", "_blank");
      if (!printWin) {
        alert("Please allow pop-ups for this site to download PDFs.");
        return;
      }
      const backImg = backUrl ? `<img src="${backUrl}" alt="Business Card Back" style="margin-top:0.5in" />` : "";
      printWin.document.write(`<!DOCTYPE html><html><head><title>Business Card</title>
        <style>
          @page { size: ${pageW}in ${pageH}in; margin: 0; }
          * { margin: 0; padding: 0; }
          body { width: ${pageW}in; height: ${pageH}in; display: flex; flex-direction: column; align-items: center; padding-top: ${marginY}in; }
          img { width: ${cardW}in; height: ${cardH}in; object-fit: contain; }
          @media screen { body { background: #f3f4f6; padding-top: 2rem; }
            img { box-shadow: 0 4px 24px rgba(0,0,0,0.15); border-radius: 8px; }
            .hint { position: fixed; bottom: 1.5rem; left: 50%; transform: translateX(-50%);
              background: #1e293b; color: #fff; padding: 0.5rem 1.5rem; border-radius: 9999px;
              font: 13px/1.4 system-ui; } }
          @media print { .hint { display: none; } }
        </style></head><body>
        <img src="${frontUrl}" alt="Business Card Front" />
        ${backImg}
        <div class="hint">Use <b>Save as PDF</b> in the print dialog · Ctrl/Cmd + P</div>
        <script>window.onload=function(){setTimeout(function(){window.print()},400)}<\/script>
      </body></html>`);
      printWin.document.close();
    } catch (err) {
      console.error("PDF download failed:", err);
      alert(`PDF download failed: ${describeError(err)}`);
    } finally {
      setIsDownloading(false);
    }
  };

  /* ── guard ──────────────────────────────────────────────────────── */
  if (!selectedDesign) {
    return (
      <div className="text-center py-16">
        <p className="text-gray-400">No design selected.</p>
        <button onClick={() => setStep("designs")} className="mt-4 text-[#0e0f0c] hover:underline text-sm">Go back to pick a design</button>
      </div>
    );
  }

  const d = selectedDesign;
  const curStyle = selectedEl ? getElStyle(selectedEl) : null;
  const showColorPicker = selectedEl && selectedEl !== "logo" && selectedEl !== "qr";
  const showFontSize = selectedEl && selectedEl !== "logo" && selectedEl !== "qr";

  /**
   * Resolve the actual fontSize / color the renderer would use for the
   * selected element, taken from the template spec. Used by the inline
   * toolbar so the +/- buttons show the real starting value (not a
   * hardcoded 24/14/12 default that may not match the template).
   */
  const specDefaults = (() => {
    if (!selectedEl || selectedEl === "logo" || selectedEl === "qr") return null;
    const spec = getTemplateSpec(d.templateId);
    const el = spec?.elements.find((e) => e.id === selectedEl);
    if (!el || el.type !== "text") return null;
    const fontSize = typeof el.fontSize === "number"
      ? el.fontSize
      : resolveFontSize(el.fontSize as TypeToken);
    // Resolve color refs like "palette.primary" → actual hex
    let color = "#0e0f0c";
    if (typeof el.color === "string") {
      if (el.color.startsWith("palette.")) {
        const slot = el.color.slice("palette.".length) as keyof typeof d.colors;
        color = d.colors[slot] ?? d.colors.primary ?? "#0e0f0c";
      } else if (el.color.startsWith("#")) {
        color = el.color;
      }
    }
    return { fontSize, color };
  })();

  /* ── back-element helpers ────────────────────────────────────────── */
  const updateBackElement = (idx: number, patchEl: Partial<BackElement>) => {
    if (!d.backElements) return;
    const next = [...d.backElements];
    next[idx] = { ...next[idx], ...patchEl } as BackElement;
    patch({ backElements: next });
  };

  const removeBackElement = (idx: number) => {
    if (!d.backElements) return;
    const next = d.backElements.filter((_, i) => i !== idx);
    patch({ backElements: next.length ? next : undefined });
    // Drop back selection if the removed row was selected (or shift it left
    // when a lower-indexed row was removed).
    setSelectedBackIdx((cur) => {
      if (cur == null) return cur;
      if (cur === idx) return null;
      return cur > idx ? cur - 1 : cur;
    });
  };

  /* ── Custom-font upload ──────────────────────────────────────────────
     Reads a .woff2 / .woff / .ttf / .otf as a data URL, registers it on
     design.customFonts under a unique CSS family name derived from the
     filename, and (optionally) sets the upload as the active fontFamily
     for whichever text element is selected. The font then survives the
     share-link round-trip (handleShare ships design.customFonts). */
  const sanitizeFontFamily = (filename: string): string => {
    const stem = filename.replace(/\.[^.]+$/, "");
    const cleaned = stem.replace(/[^A-Za-z0-9_\- ]/g, " ").replace(/\s+/g, " ").trim();
    return cleaned || "Custom Font";
  };
  const uploadCustomFont = (
    file: File,
    onLoaded?: (family: string) => void,
  ) => {
    if (file.size > 4 * 1024 * 1024) {
      alert("Font file must be under 4 MB. Try a .woff2 if you have a heavier .ttf/.otf.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      let family = sanitizeFontFamily(file.name);
      const existing = new Set((d.customFonts ?? []).map((f) => f.family));
      // Disambiguate duplicates with a numeric suffix.
      let n = 2;
      while (existing.has(family)) family = `${sanitizeFontFamily(file.name)} ${n++}`;
      const mime = file.type
        || (file.name.endsWith(".woff2") ? "font/woff2"
          : file.name.endsWith(".woff") ? "font/woff"
          : file.name.endsWith(".ttf") ? "font/ttf"
          : file.name.endsWith(".otf") ? "font/otf"
          : "font/woff2");
      patch({ customFonts: [...(d.customFonts ?? []), { family, dataUrl, mime }] });
      onLoaded?.(family);
    };
    reader.readAsDataURL(file);
  };
  const removeCustomFont = (family: string) => {
    const next = (d.customFonts ?? []).filter((f) => f.family !== family);
    patch({ customFonts: next.length ? next : undefined });
    // Drop the override on any element that was using the removed font.
    if (d.elementOverrides) {
      const overrides: Record<string, ElementStyle> = {};
      for (const [id, style] of Object.entries(d.elementOverrides)) {
        if (style.fontFamily === family) {
          const { fontFamily: _f, ...rest } = style;
          if (Object.keys(rest).length > 0) overrides[id] = rest;
        } else {
          overrides[id] = style;
        }
      }
      patch({ elementOverrides: Object.keys(overrides).length ? overrides : undefined });
    }
    if (d.backElements) {
      const nextBack = d.backElements.map((el) =>
        el.type === "text" && el.fontFamily === family ? { ...el, fontFamily: undefined } : el,
      );
      patch({ backElements: nextBack });
    }
  };

  const addBackElement = (kind: "text" | "image") => {
    const list = d.backElements ?? [];
    const newIdx = list.length;
    const newEl: BackElement = kind === "text"
      ? { type: "text", text: "", x: 100, y: 80, fontSize: 12, color: d.colors.primary }
      : { type: "image", x: 100, y: 60, width: 70, height: 70 };
    patch({ backElements: [...list, newEl] });
    // Expand the new row so the user lands directly in its editor and
    // select it on the card so the dashed outline appears immediately.
    const rowId = kind === "text" ? `btext-${newIdx}` : `bimage-${newIdx}`;
    setExpandedRow(rowId);
    setSelectedBackIdx(newIdx);
    if (sideView !== "back") setSideView("back");
    // For images, pop the file picker as soon as React has mounted the
    // hidden input. The data-attribute selector on the new file input
    // lets us find it without threading refs through the row component.
    if (kind === "image") {
      setTimeout(() => {
        const input = document.querySelector<HTMLInputElement>(`[data-bimage-upload="${newIdx}"]`);
        input?.click();
      }, 80);
    }
  };

  /* ── small UI primitives ─────────────────────────────────────────── */
  /**
   * Visibility-toggle eye icon. Returns plain JSX (NOT a React component)
   * so it inlines into the parent's render tree without creating a
   * component boundary — that boundary would cause inputs further down
   * the tree to remount after every keystroke and lose focus.
   */
  const visToggle = (field: string, size = 13) => (
    <button
      key={`vis-${field}`}
      type="button"
      onClick={(e) => { e.stopPropagation(); toggleField(field); }}
      className={`p-1 rounded transition-colors ${isHidden(field) ? "text-red-400 hover:text-red-500 bg-red-500/12" : "text-[#868685] hover:text-[#fafaf7]"}`}
      title={isHidden(field) ? "Show on card" : "Hide from card"}
    >
      {isHidden(field) ? <EyeOff size={size} /> : <Eye size={size} />}
    </button>
  );

  /* Args for a row in the unified element list. */
  type RowArgs = {
    id: string;                  // unique id used for expansion state
    icon: LucideIcon;
    label: string;
    preview?: string;            // muted text on the right (e.g., field value)
    visibleField?: string;       // hiddenFields key (front-face) for visToggle
    visibleBacking?: { value: boolean; onToggle: () => void }; // arbitrary visibility (back-face / qr)
    selected?: boolean;
    onSelect?: () => void;       // sets selectedEl on card for inline toolbar
    onDelete?: () => void;
    onDuplicate?: () => void;
    body?: React.ReactNode;      // expanded controls
  };

  /**
   * Render a single element row.
   *
   * IMPORTANT: this is a function that returns JSX, not a React component.
   * If it were a component (`<ElementRow />`), every parent re-render would
   * create a new component identity, causing React to unmount and remount
   * any input inside — which loses focus after every keystroke.
   * Calling this as a plain function inlines the JSX as if written directly
   * in the parent, with no component boundary.
   */
  const renderRow = ({ id, icon: Icon, label, preview, visibleField, visibleBacking, selected, onSelect, onDelete, onDuplicate, body }: RowArgs) => {
    const open = expandedRow === id;
    const selectedClass = selected ? "border-[#9fe870] bg-[#9fe870]/10" : "border-transparent hover:bg-white/8";
    return (
      <div key={id} className={`rounded-lg border ${selectedClass} transition-colors`}>
        <div
          role="button"
          tabIndex={0}
          onClick={() => { setExpandedRow(open ? null : id); onSelect?.(); }}
          onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setExpandedRow(open ? null : id); onSelect?.(); } }}
          className="flex items-center gap-2 px-2 py-1.5 cursor-pointer"
        >
          <Icon size={13} className="text-[#868685] shrink-0" />
          <span className="text-xs font-medium text-[#fafaf7] shrink-0">{label}</span>
          {preview && (
            <span className="text-[11px] text-[#868685] truncate flex-1 text-left">{preview}</span>
          )}
          {!preview && <span className="flex-1" />}
          <div className="flex items-center gap-0.5 shrink-0">
            {onDuplicate && (
              <button type="button" onClick={(e) => { e.stopPropagation(); onDuplicate(); }}
                className="p-1 text-[#868685] hover:text-[#fafaf7]" title="Duplicate"><Copy size={12} /></button>
            )}
            {onDelete && (
              <button type="button" onClick={(e) => { e.stopPropagation(); onDelete(); }}
                className="p-1 text-[#868685] hover:text-red-400" title="Delete"><Trash2 size={12} /></button>
            )}
            {visibleField && visToggle(visibleField)}
            {visibleBacking && (
              <button type="button"
                onClick={(e) => { e.stopPropagation(); visibleBacking.onToggle(); }}
                className={`p-1 rounded transition-colors ${visibleBacking.value ? "text-[#868685] hover:text-[#fafaf7]" : "text-red-400 hover:text-red-500 bg-red-500/12"}`}
                title={visibleBacking.value ? "Hide from card" : "Show on card"}>
                {visibleBacking.value ? <Eye size={13} /> : <EyeOff size={13} />}
              </button>
            )}
            {open ? <ChevronDown size={13} className="text-[#868685]" /> : <ChevronRightIcon size={13} className="text-[#868685]" />}
          </div>
        </div>
        {open && body && (
          <div className="px-2.5 pb-2.5 pt-1 border-t border-white/8 space-y-2">{body}</div>
        )}
      </div>
    );
  };

  /* ── front-face element rows ────────────────────────────────────── */
  const renderTextFieldRow = ({ key, label, icon, type, placeholder }: typeof TEXT_FIELDS[number]) => {
    const value = (cardInfo as unknown as Record<string, string>)[key] ?? "";
    const isAi = key === "tagline";
    return renderRow({
      id: `text-${key}`,
      icon,
      label,
      preview: value,
      visibleField: key,
      selected: selectedEl === key,
      onSelect: () => setSelectedEl(key as EditableElementId),
      body: (
        <>
          {/* Text content */}
          <div className="flex items-center gap-1.5">
            <input type={type} value={value}
              onChange={(e) => setCardInfo({ [key]: e.target.value })}
              placeholder={placeholder} disabled={isHidden(key)}
              className="flex-1 px-2.5 py-1.5 rounded-md border border-white/12 bg-white/[0.04] text-xs text-[#fafaf7]
                placeholder:text-[#868685] outline-none focus:border-[#9fe870] focus:ring-1 focus:ring-[#9fe870]/30
                disabled:bg-white/[0.02] disabled:cursor-not-allowed" />
            {isAi && (
              <button type="button" onClick={handleSuggestTaglines} disabled={isLoadingTaglines || isHidden(key)}
                className="shrink-0 px-2 py-1.5 text-[11px] font-medium text-[#163300] bg-[#9fe870] rounded-md
                  hover:bg-[#cdffad] disabled:opacity-50"
                title="AI suggest taglines">
                {isLoadingTaglines ? <Loader2 size={11} className="animate-spin" /> : <Wand2 size={11} />}
              </button>
            )}
          </div>
          {isAi && taglineSuggestions.length > 0 && !isHidden("tagline") && (
            <div className="flex flex-wrap gap-1">
              {taglineSuggestions.map((tag, i) => (
                <button key={i} type="button"
                  onClick={() => { setCardInfo({ tagline: tag }); setTaglineSuggestions([]); }}
                  className="px-1.5 py-0.5 text-[10px] rounded-full border border-[#9fe870]/40 bg-[#9fe870]/12 text-[#9fe870] hover:bg-[#9fe870]/20">
                  {tag}
                </button>
              ))}
            </div>
          )}
          {!isHidden(key) && (
            <p className="text-[10px] text-[#868685] italic">
              Click the field on the card to open the edit toolbar (size, color, opacity, position).
            </p>
          )}
        </>
      ),
    });
  };

  const renderLogoRow = () => {
    const hasLogo = !!cardInfo.customLogoUrl || d.logo.id !== "none";
    const preview = cardInfo.customLogoUrl ? "Custom upload" : (d.logo.id === "none" ? "—" : d.logo.id);
    return renderRow({
      id: "logo",
      icon: ImagePlus,
      label: "Logo",
      preview,
      visibleField: "logo",
      selected: selectedEl === "logo",
      onSelect: () => setSelectedEl("logo"),
      body: (
        <>
          {/* Upload */}
          {cardInfo.customLogoUrl ? (
            <div className="flex items-center gap-2">
              <img src={cardInfo.customLogoUrl} alt="Logo" className="w-8 h-8 rounded object-contain border border-[#0e0f0c]/12" />
              <span className="text-[11px] text-[#454745] flex-1">Logo uploaded</span>
              <button type="button" onClick={() => setCardInfo({ customLogoUrl: "" })}
                className="p-1 text-[#868685] hover:text-red-500"><X size={13} /></button>
            </div>
          ) : (
            <label className="flex flex-col items-center justify-center gap-1.5 px-3 py-4 rounded-lg border border-dashed border-white/12
              text-[#868685] cursor-pointer hover:border-[#9fe870] hover:text-[#0e0f0c] transition-colors">
              <ImagePlus size={20} />
              <span className="text-sm font-medium">Drop your logo here</span>
              <span className="text-xs">PNG, SVG, or JPG · max 2 MB</span>
              <input type="file" accept="image/png,image/jpeg,image/svg+xml,image/webp" className="hidden" onChange={handleLogoUpload} />
            </label>
          )}
          {hasLogo && (
            <p className="text-[10px] text-[#868685] italic">
              Click the logo on the card to open the edit toolbar (size, position, opacity).
            </p>
          )}
        </>
      ),
    });
  };

  const renderQrRow = () => {
    const enabled = d.qr?.enabled ?? false;
    const ensureQr = () => d.qr ?? { enabled: false, content: "website" as const, placement: "bottom-right" as LogoPlacement, size: "small" as const };

    const updateQrElement = (next: Partial<QrElement>) => {
      patch({ qrElement: { ...ensureQrElement(), ...next, enabled: true } });
    };

    const qe = d.qrElement;

    return renderRow({
      id: "qr",
      icon: QrCode,
      label: "QR Code",
      preview: enabled ? (d.qr?.content ?? "website") : "off",
      selected: selectedEl === "qr",
      onSelect: () => { if (enabled) setSelectedEl("qr"); },
      visibleBacking: {
        value: enabled,
        onToggle: () => {
          const nextEnabled = !enabled;
          patch({
            qr: { ...ensureQr(), enabled: nextEnabled },
            qrElement: nextEnabled ? ensureQrElement() : null,
          });
        },
      },
      body: (
        <>
          {!enabled && (
            <div className="flex flex-col items-center justify-center gap-1.5 px-3 py-4 rounded-lg border border-dashed border-white/12 text-[#868685]">
              <QrCode size={20} />
              <span className="text-sm font-medium">Add a QR code to your card</span>
              <button type="button"
                onClick={() => patch({ qr: { ...ensureQr(), enabled: true }, qrElement: ensureQrElement() })}
                className="text-xs font-semibold text-[#163300] bg-[#9fe870] hover:bg-[#cdffad] rounded-full px-3 py-1 mt-1 transition-colors">
                Enable QR
              </button>
            </div>
          )}
          {enabled && (
            <>
              {/* Content type — three options for what scanning the QR does. */}
              <div>
                <span className="text-[10px] text-[#868685] block mb-1">Encodes</span>
                <div className="flex gap-1">
                  {([
                    { value: "website", label: "Website",  hint: "Opens your website URL when scanned." },
                    { value: "vcard",   label: "vCard",    hint: "Saves your name, title, company, phone, email, and website as a contact card the scanner's phone can add directly to its address book." },
                    { value: "custom",  label: "Custom",   hint: "Encodes any URL or text you type." },
                  ] as const).map(({ value, label, hint }) => (
                    <button key={value} type="button" title={hint}
                      onClick={() => {
                        patch({ qr: { ...d.qr!, content: value } });
                        updateQrElement({ content: value });
                      }}
                      className={`px-2 py-0.5 text-[10px] rounded transition-colors ${
                        d.qr!.content === value ? "bg-[#9fe870] text-[#163300]" : "bg-white/8 text-[#868685] hover:bg-white/12"
                      }`}>{label}</button>
                  ))}
                </div>
              </div>

              {d.qr!.content === "custom" && (
                <input type="text" value={d.qr!.customText || ""}
                  onChange={(e) => {
                    patch({ qr: { ...d.qr!, customText: e.target.value } });
                    updateQrElement({ customText: e.target.value });
                  }}
                  placeholder="URL or text..."
                  className="w-full px-2 py-1.5 text-xs border border-white/12 bg-white/[0.04] text-[#fafaf7] placeholder:text-[#868685] rounded-md outline-none focus:border-[#9fe870]" />
              )}

              {/* Live preview of what's encoded right now — helps confirm
                  the QR actually changes when you switch content type. */}
              <div className="flex items-start gap-1.5 px-2 py-1.5 rounded-md bg-white/[0.04] border border-white/8">
                <QrCode size={11} className="text-[#868685] shrink-0 mt-px" />
                <div className="flex-1 min-w-0">
                  <span className="text-[9px] uppercase tracking-wide text-[#868685] block">Scanning gives you</span>
                  <span className="text-[10px] text-[#fafaf7] break-all">
                    {d.qr!.content === "website" && (cardInfo.website || "https://example.com")}
                    {d.qr!.content === "vcard" && `Contact: ${cardInfo.name || "(no name)"}${cardInfo.company ? ` · ${cardInfo.company}` : ""}`}
                    {d.qr!.content === "custom" && (d.qr!.customText?.trim() || "(empty — type a URL or text above)")}
                  </span>
                </div>
              </div>

              <p className="text-[10px] text-[#868685] italic">
                Click the QR on the card to open the edit toolbar (size, position, opacity).
              </p>
            </>
          )}
        </>
      ),
    });
  };

  const renderImageRow = (img: ExtraImage, idx: number) => {
    const updateImage = (next: Partial<ExtraImage>) => {
      const imgs = [...(cardInfo.extraImages || [])];
      imgs[idx] = { ...imgs[idx], ...next };
      setCardInfo({ extraImages: imgs });
    };
    const removeImage = () => {
      setCardInfo({ extraImages: (cardInfo.extraImages || []).filter((_, i) => i !== idx) });
    };
    const duplicateImage = () => {
      const imgs = [...(cardInfo.extraImages || [])];
      imgs.splice(idx + 1, 0, { ...img, id: crypto.randomUUID() });
      setCardInfo({ extraImages: imgs });
    };
    return renderRow({
      id: `image-${img.id}`,
      icon: ImageIcon,
      label: `Image ${idx + 1}`,
      preview: img.placement,
      visibleBacking: {
        value: img.visible !== false,
        onToggle: () => updateImage({ visible: img.visible === false ? true : false }),
      },
      onDelete: removeImage,
      onDuplicate: duplicateImage,
      body: (
        <>
          <div className="flex items-center gap-2">
            <img src={img.dataUrl} alt="" className="w-8 h-8 rounded object-contain border border-white/12 bg-white/[0.04]" />
            <div className="flex-1 space-y-1">
              <div className="flex gap-1">
                {(["small", "medium", "large"] as const).map((s) => (
                  <button key={s} type="button"
                    onClick={() => updateImage({ size: s })}
                    className={`px-1.5 py-0.5 text-[9px] rounded ${img.size === s ? "bg-[#9fe870] text-[#163300]" : "bg-white/8 text-[#868685]"}`}>{s}</button>
                ))}
              </div>
              <div className="flex flex-wrap gap-0.5">
                {QR_PLACEMENTS.map((p) => (
                  <button key={p} type="button"
                    onClick={() => updateImage({ placement: p })}
                    className={`px-1 py-0.5 text-[8px] rounded ${img.placement === p ? "bg-[#9fe870] text-[#163300]" : "bg-white/4 text-[#868685] hover:bg-white/12"}`}>{p}</button>
                ))}
              </div>
            </div>
          </div>
          {/* Opacity slider */}
          <div>
            <span className="text-[10px] text-[#868685] block mb-0.5">Opacity {(img.opacity ?? 1).toFixed(2)}</span>
            <input type="range" min="0.1" max="1" step="0.05" value={img.opacity ?? 1}
              onChange={(e) => updateImage({ opacity: parseFloat(e.target.value) })}
              className="w-full h-1.5 accent-[#9fe870]" />
          </div>
        </>
      ),
    });
  };

  const renderCustomLineRow = (line: string, idx: number) => {
    const removeLine = () => {
      setCardInfo({ customLines: (cardInfo.customLines || []).filter((_, i) => i !== idx) });
    };
    return renderRow({
      id: `line-${idx}`,
      icon: Type,
      label: `Line ${idx + 1}`,
      preview: line,
      onDelete: removeLine,
      body: (
        <input type="text" value={line}
          onChange={(e) => {
            const lines = [...(cardInfo.customLines || [])];
            lines[idx] = e.target.value;
            setCardInfo({ customLines: lines });
          }}
          placeholder={`Custom line ${idx + 1}`}
          className="w-full px-2.5 py-1.5 rounded-md border border-white/12 bg-white/[0.04] text-xs text-[#fafaf7]
            placeholder:text-[#868685] outline-none focus:border-[#9fe870] focus:ring-1 focus:ring-[#9fe870]/30" />
      ),
    });
  };

  /* ── back-face element rows ─────────────────────────────────────── */
  /**
   * Map a placement enum (top-left, center, bottom-right, …) to (x, y)
   * coordinates for an element of given (w, h) on the 350×200 card.
   * Mirrors the placement helpers used for logo/QR/extras on the front
   * face, so back elements get the same "click a position chip" UX.
   */
  const placementCoords = (p: LogoPlacement, w: number, h: number) => {
    const cardW = 350, cardH = 200, margin = 12;
    switch (p) {
      case "top-left":      return { x: margin,             y: margin };
      case "top-center":    return { x: (cardW - w) / 2,    y: margin };
      case "top-right":     return { x: cardW - w - margin, y: margin };
      case "center-left":   return { x: margin,             y: (cardH - h) / 2 };
      case "center":        return { x: (cardW - w) / 2,    y: (cardH - h) / 2 };
      case "center-right":  return { x: cardW - w - margin, y: (cardH - h) / 2 };
      case "bottom-left":   return { x: margin,             y: cardH - h - margin };
      case "bottom-center": return { x: (cardW - w) / 2,    y: cardH - h - margin };
      case "bottom-right":  return { x: cardW - w - margin, y: cardH - h - margin };
    }
  };

  /** Reverse: which placement does (x, y) match? Returns null if free-positioned. */
  const detectPlacement = (x: number, y: number, w: number, h: number): LogoPlacement | null => {
    for (const p of QR_PLACEMENTS) {
      const c = placementCoords(p, w, h);
      if (Math.abs(x - c.x) < 8 && Math.abs(y - c.y) < 8) return p;
    }
    return null;
  };

  /** Image-element size enum → pixel sizing (mirrors extra-image enum). */
  const BACK_IMAGE_SIZES = { small: 40, medium: 70, large: 110 } as const;
  const detectImageSize = (px: number): keyof typeof BACK_IMAGE_SIZES | null => {
    for (const k of Object.keys(BACK_IMAGE_SIZES) as Array<keyof typeof BACK_IMAGE_SIZES>) {
      if (Math.abs(px - BACK_IMAGE_SIZES[k]) < 4) return k;
    }
    return null;
  };

  const renderBackTextRow = (el: Extract<BackElement, { type: "text" }>, idx: number) => {
    return renderRow({
      id: `btext-${idx}`,
      icon: Type,
      label: `Text ${idx + 1}`,
      preview: el.text,
      selected: selectedBackIdx === idx,
      onSelect: () => { setSelectedBackIdx(idx); if (sideView !== "back") setSideView("back"); },
      visibleBacking: {
        value: el.visible !== false,
        onToggle: () => updateBackElement(idx, { visible: el.visible === false ? true : false }),
      },
      onDelete: () => removeBackElement(idx),
      body: (
        <>
          {/* Text content — only content lives in the row body. Style fields
              (size, color, opacity, placement) are in the floating toolbar. */}
          <input type="text" value={el.text}
            autoFocus={el.text === ""}
            placeholder="Type your text…"
            onChange={(e) => updateBackElement(idx, { text: e.target.value })}
            className="w-full px-2.5 py-1.5 rounded-md border border-white/12 bg-white/[0.04] text-xs text-[#fafaf7] placeholder:text-[#868685] outline-none focus:border-[#9fe870]" />
          <p className="text-[10px] text-[#868685] italic">
            Click the text on the card to open the edit toolbar (size, color, opacity, position).
          </p>
        </>
      ),
    });
  };

  const renderBackImageRow = (el: Extract<BackElement, { type: "image" }>, idx: number) => {
    return renderRow({
      id: `bimage-${idx}`,
      icon: ImageIcon,
      label: `Image ${idx + 1}`,
      preview: el.source ? "uploaded" : (el.iconId ?? "—"),
      selected: selectedBackIdx === idx,
      onSelect: () => { setSelectedBackIdx(idx); if (sideView !== "back") setSideView("back"); },
      visibleBacking: {
        value: el.visible !== false,
        onToggle: () => updateBackElement(idx, { visible: el.visible === false ? true : false }),
      },
      onDelete: () => removeBackElement(idx),
      body: (
        <>
          <label className="flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-md border border-dashed border-white/12
            text-[11px] text-[#868685] cursor-pointer hover:border-[#9fe870] hover:text-[#fafaf7] transition-colors">
            <ImagePlus size={12} /> {el.source ? "Replace image" : "Upload image"}
            <input type="file" accept="image/png,image/jpeg,image/svg+xml,image/webp" className="hidden"
              data-bimage-upload={idx}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                if (file.size > 2 * 1024 * 1024) { alert("Image must be under 2 MB"); return; }
                const reader = new FileReader();
                reader.onload = () => updateBackElement(idx, { source: reader.result as string });
                reader.readAsDataURL(file);
                e.target.value = "";
              }} />
          </label>

          <p className="text-[10px] text-[#868685] italic">
            Click the image on the card to open the edit toolbar (size, position, opacity).
          </p>
        </>
      ),
    });
  };

  /* ── Element list (front and back) ───────────────────────────────── */
  const frontImages = cardInfo.extraImages || [];
  const customLines = cardInfo.customLines || [];

  const renderFrontList = () => (
    <div className="space-y-1">
      {renderLogoRow()}
      {renderQrRow()}
      {TEXT_FIELDS.map(renderTextFieldRow)}
      {customLines.map(renderCustomLineRow)}
      {frontImages.map(renderImageRow)}
    </div>
  );

  const renderBackList = () => {
    const enabled = !!d.backFace;
    return (
      <div className="space-y-2">
        {/* Enable toggle */}
        <div className="flex items-center justify-between px-1">
          <span className="text-[11px] text-[#868685]">Back face</span>
          <button type="button"
            onClick={() => { if (d.backFace) patch({ backFace: undefined, backElements: undefined }); else patch({ backFace: defaultBackFace(d) }); }}
            className={`px-2.5 py-0.5 text-[10px] rounded-full font-medium transition-colors ${
              enabled ? "bg-[#9fe870] text-[#163300]" : "bg-white/8 text-[#868685] hover:bg-white/12"
            }`}>{enabled ? "ON" : "OFF"}</button>
        </div>

        {!enabled && (
          <div className="flex flex-col items-center justify-center gap-1.5 px-3 py-6 rounded-lg border border-dashed border-white/12 text-[#868685]">
            <FlipHorizontal2 size={18} />
            <span className="text-sm font-medium">Add a back face to your card</span>
            <button type="button"
              onClick={() => patch({ backFace: defaultBackFace(d) })}
              className="text-xs font-semibold text-[#163300] bg-[#9fe870] hover:bg-[#cdffad] rounded-full px-3 py-1 mt-1 transition-colors">
              Enable Back Face
            </button>
          </div>
        )}

        {enabled && (
          <>
            {/* Preset — quick layout starter for the back face. Each
                option has a tooltip explaining what it does. */}
            <div>
              <span className="text-[10px] text-[#868685] block mb-1">Layout preset</span>
              <div className="grid grid-cols-3 gap-1">
                {BACK_PRESETS.map(({ value, label, description }) => (
                  <button key={value} type="button"
                    onClick={() => patch({ backFace: { ...d.backFace!, preset: value } })}
                    title={description}
                    className={`px-2 py-1 text-[10px] rounded transition-colors ${
                      d.backFace!.preset === value ? "bg-[#9fe870] text-[#163300]" : "bg-white/8 text-[#868685] hover:bg-white/12"
                    }`}>{label}</button>
                ))}
              </div>
              {/* Show the active preset's description below the grid */}
              <p className="text-[10px] text-[#868685] mt-1 italic">
                {BACK_PRESETS.find((p) => p.value === d.backFace!.preset)?.description}
              </p>
              {/* Tagline preset is meaningless without a tagline. Surface
                  an inline amber warning so the back face doesn't render
                  as an empty hero block. */}
              {d.backFace!.preset === "tagline" && !cardInfo.tagline?.trim() && (
                <div className="flex items-start gap-1.5 mt-2 px-2 py-1.5 rounded-md border border-amber-400/30 bg-amber-400/10 text-[10px] text-amber-200">
                  <AlertTriangle size={12} className="shrink-0 mt-px" />
                  <span>
                    No tagline set. Add one in <span className="font-semibold">Step 1</span> or pick a different preset — the Tagline layout uses your tagline as the hero element.
                  </span>
                </div>
              )}
            </div>

            {/* Background + pattern */}
            <div className="flex items-center gap-3">
              <div>
                <span className="text-[10px] text-[#868685] block mb-0.5">Background</span>
                <input type="color" value={d.backFace!.background}
                  onChange={(e) => patch({ backFace: { ...d.backFace!, background: e.target.value } })}
                  className="w-7 h-7 rounded border border-white/12 cursor-pointer" />
              </div>
              <div className="flex-1">
                <span className="text-[10px] text-[#868685] block mb-0.5">Pattern</span>
                <div className="flex gap-1">
                  {(["inherit", "none"] as const).map((v) => (
                    <button key={v} type="button"
                      onClick={() => patch({ backFace: { ...d.backFace!, patternId: v } })}
                      className={`px-2 py-0.5 text-[10px] rounded ${
                        d.backFace!.patternId === v ? "bg-[#9fe870] text-[#163300]" : "bg-white/8 text-[#868685] hover:bg-white/12"
                      }`}>{v}</button>
                  ))}
                </div>
              </div>
            </div>

            {/* Custom elements added via the global "+ Add element" button */}
            {(d.backElements && d.backElements.length > 0) && (
              <div className="pt-1 border-t border-white/8 space-y-1">
                {d.backElements.map((el, i) =>
                  el.type === "text" ? renderBackTextRow(el, i) : renderBackImageRow(el, i)
                )}
              </div>
            )}
          </>
        )}
      </div>
    );
  };

  /* ── Card style accordion ────────────────────────────────────────── */
  const renderCardStyle = () => (
    <div className="space-y-3">
      {/* Font */}
      <div>
        <span className="text-[10px] font-semibold text-[#868685] uppercase tracking-wider block mb-1">Font</span>
        <div className="flex gap-1">
          {([
            { value: "sans", label: "Sans", sample: "font-sans" },
            { value: "serif", label: "Serif", sample: "font-serif" },
            { value: "mono", label: "Mono", sample: "font-mono" },
          ] as const).map(({ value, label, sample }) => (
            <button key={value} type="button" onClick={() => patch({ font: value })}
              className={`px-2.5 py-1 rounded-md text-[11px] ${sample} transition-colors ${
                d.font === value ? "bg-[#9fe870] text-[#163300] font-semibold" : "bg-white/8 text-[#868685] hover:bg-white/12"
              }`}>{label}</button>
          ))}
        </div>
      </div>

      {/* Colors */}
      <div>
        <span className="text-[10px] font-semibold text-[#868685] uppercase tracking-wider block mb-1">Palette</span>
        <div className="flex gap-3">
          {([
            { label: "BG", value: d.colors.background, key: "background" },
            { label: "Alt", value: d.colors.backgroundAlt, key: "backgroundAlt" },
            { label: "Accent", value: d.colors.accent, key: "accent" },
          ] as const).map(({ label, value, key }) => (
            <div key={key} className="flex flex-col items-center gap-0.5">
              <input type="color" value={value}
                onChange={(e) => patch({ colors: { ...d.colors, [key]: e.target.value } })}
                className="w-7 h-7 rounded-md border border-white/12 cursor-pointer" />
              <span className="text-[9px] text-[#868685]">{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Pattern picker — always visible so users can pick or remove */}
      <div>
        <span className="text-[10px] font-semibold text-[#868685] uppercase tracking-wider block mb-1">Pattern</span>
        <div className="grid grid-cols-7 gap-1">
          {PATTERNS.map((p) => {
            const active = d.pattern.id === p.id;
            const previewBg = p.id !== "none"
              ? getPatternSVG(p.id, d.pattern.color || "#000000", 0.6)
              : null;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => patch({ pattern: { ...d.pattern, id: p.id } })}
                title={p.name}
                className={`relative w-full aspect-square rounded border text-[8px] transition-colors flex items-center justify-center overflow-hidden ${
                  active
                    ? "border-[#9fe870] ring-1 ring-[#9fe870]/40"
                    : "border-white/12 hover:border-white/30"
                }`}
                style={{
                  backgroundImage: previewBg ?? undefined,
                  backgroundColor: previewBg ? "#1a1a1a" : "transparent",
                  backgroundRepeat: "repeat",
                }}
              >
                {p.id === "none" && (
                  <span className="text-[#868685]">—</span>
                )}
              </button>
            );
          })}
        </div>
        {d.pattern.id !== "none" && (
          <div className="space-y-1.5 mt-2">
            <div className="flex items-center gap-2">
              <input type="color" value={d.pattern.color}
                onChange={(e) => patch({ pattern: { ...d.pattern, color: e.target.value } })}
                className="w-7 h-7 rounded border border-white/12 cursor-pointer" />
              <div className="flex-1">
                <span className="text-[10px] text-[#868685] block mb-0.5">Opacity {d.pattern.opacity.toFixed(2)}</span>
                <input type="range" min="0.02" max="0.4" step="0.01" value={d.pattern.opacity}
                  onChange={(e) => patch({ pattern: { ...d.pattern, opacity: parseFloat(e.target.value) } })}
                  className="w-full h-1.5 accent-[#9fe870]" />
              </div>
            </div>
            <div className="flex flex-wrap gap-0.5">
              {PATTERN_PLACEMENTS.map((p) => (
                <button key={p} type="button" onClick={() => patch({ pattern: { ...d.pattern, placement: p } })}
                  className={`px-1.5 py-0.5 text-[9px] rounded transition-colors ${
                    d.pattern.placement === p ? "bg-[#9fe870] text-[#163300]" : "bg-white/8 text-[#868685] hover:bg-white/12"
                  }`}>{p}</button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Border radius */}
      <div>
        <span className="text-[10px] font-semibold text-[#868685] uppercase tracking-wider block mb-1">Corners</span>
        <div className="flex gap-1">
          {(["none", "small", "medium", "large"] as const).map((r) => (
            <button key={r} type="button" onClick={() => patch({ borderRadius: r })}
              className={`px-2 py-0.5 text-[10px] rounded ${
                d.borderRadius === r ? "bg-[#9fe870] text-[#163300]" : "bg-white/8 text-[#868685] hover:bg-white/12"
              }`}>{r}</button>
          ))}
        </div>
      </div>
    </div>
  );

  /* ── Add element menu ────────────────────────────────────────────── */
  const handleAddImageFront = (file: File) => {
    if (file.size > 2 * 1024 * 1024) { alert("Image must be under 2 MB"); return; }
    const reader = new FileReader();
    reader.onload = () => {
      const newImg: ExtraImage = { id: crypto.randomUUID(), dataUrl: reader.result as string, placement: "bottom-left", size: "medium" };
      setCardInfo({ extraImages: [...(cardInfo.extraImages || []), newImg] });
    };
    reader.readAsDataURL(file);
  };

  const renderAddMenu = () => (
    <div className="relative">
      <button type="button"
        onClick={() => setShowAddMenu(!showAddMenu)}
        className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-dashed border-white/12
          text-xs font-medium text-[#868685] hover:border-[#9fe870] hover:text-[#fafaf7] transition-colors">
        <Plus size={12} /> Add element
      </button>
      {showAddMenu && (
        <div className="absolute bottom-full mb-1 left-0 right-0 bg-[#0e0f0c] rounded-lg shadow-lg border border-white/12 overflow-hidden z-30">
          {sideView === "front" ? (
            <>
              <button type="button"
                onClick={() => {
                  setCardInfo({ customLines: [...(cardInfo.customLines || []), ""] });
                  setShowAddMenu(false);
                  setExpandedRow(`line-${(cardInfo.customLines || []).length}`);
                }}
                className="flex items-center gap-2 w-full px-3 py-2 text-xs text-[#fafaf7] hover:bg-[#9fe870]/20 hover:text-[#9fe870]">
                <Type size={12} /> Custom text line
              </button>
              <label className="flex items-center gap-2 w-full px-3 py-2 text-xs text-[#fafaf7] hover:bg-[#9fe870]/20 hover:text-[#9fe870] border-t border-white/8 cursor-pointer">
                <ImageIcon size={12} /> Image
                <input type="file" accept="image/png,image/jpeg,image/svg+xml,image/webp" className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleAddImageFront(file);
                    setShowAddMenu(false);
                    e.target.value = "";
                  }} />
              </label>
            </>
          ) : (
            <>
              <button type="button"
                onClick={() => { addBackElement("text"); setShowAddMenu(false); }}
                className="flex items-center gap-2 w-full px-3 py-2 text-xs text-[#fafaf7] hover:bg-[#9fe870]/20 hover:text-[#9fe870]">
                <Type size={12} /> Text
              </button>
              <button type="button"
                onClick={() => { addBackElement("image"); setShowAddMenu(false); }}
                className="flex items-center gap-2 w-full px-3 py-2 text-xs text-[#fafaf7] hover:bg-[#9fe870]/20 hover:text-[#9fe870] border-t border-white/8">
                <ImageIcon size={12} /> Image
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );

  /* ═══════════════════════════════════════════════════════════════════ */
  return (
    <div className="w-full max-w-7xl mx-auto flex-1 min-h-0 flex flex-col">
      <div className="flex flex-col lg:flex-row gap-4 flex-1 min-h-0">
        {/* ────────────── Left — Card ────────────── */}
        <div className="flex-1 flex flex-col items-center justify-center min-w-0">
          {/* Action bar */}
          <div className="flex items-center gap-2 mb-3">
            <button type="button"
              onClick={() => setShowBack(!showBack)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                showBack
                  ? "bg-[#0e0f0c] text-[#9fe870]"
                  : "bg-[#0e0f0c]/8 text-[#0e0f0c] hover:bg-[#0e0f0c]/12"
              }`}
            >
              <FlipHorizontal2 size={14} />
              {showBack ? "Viewing Back" : "Flip to Back"}
            </button>

            {/* Share link */}
            <button type="button"
              onClick={handleShare}
              className="flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold bg-[#0e0f0c]/8 text-[#0e0f0c] hover:bg-[#0e0f0c]/12 transition-colors"
              title="Copy link to this card"
            >
              {shareCopied ? <Check size={14} /> : <Link2 size={14} />}
              {shareCopied ? "Copied" : "Share link"}
            </button>

            {/* Download (secondary) */}
            <div className="relative">
              <button type="button"
                onClick={() => setShowDownloadMenu(!showDownloadMenu)}
                disabled={isDownloading}
                className="flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold bg-[#0e0f0c]/8 text-[#0e0f0c] hover:bg-[#0e0f0c]/12 disabled:opacity-50 transition-colors"
              >
                {isDownloading ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
                Download
              </button>
              {showDownloadMenu && (
                <div className="absolute top-full mt-2 right-0 bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden min-w-[170px] z-50">
                  <button type="button" onClick={downloadPng}
                    className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-[#9fe870]/20 hover:text-[#0e0f0c]">
                    <FileImage size={15} className="text-green-500" />
                    <div className="text-left">
                      <div className="font-medium">PNG</div>
                      <div className="text-[10px] text-gray-400">High-res image</div>
                    </div>
                  </button>
                  <button type="button" onClick={downloadPdf}
                    className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-[#9fe870]/20 hover:text-[#0e0f0c] border-t border-gray-100">
                    <FileText size={15} className="text-red-500" />
                    <div className="text-left">
                      <div className="font-medium">PDF</div>
                      <div className="text-[10px] text-gray-400">Print-ready</div>
                    </div>
                  </button>
                </div>
              )}
            </div>

            {/* Print cards (primary CTA) */}
            <button type="button"
              onClick={handleConfirm}
              className="flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold bg-[#9fe870] text-[#163300] hover:bg-[#cdffad] hover:scale-[1.02] active:scale-[0.98] transition-all">
              <Printer size={14} />
              Print cards
            </button>
          </div>

          {/* Card preview */}
          <div className="relative">
            <div className={showBack ? "absolute -left-[9999px] pointer-events-none" : ""}>
              <BusinessCard
                ref={cardRef}
                design={d}
                info={cardInfo}
                size="large"
                editMode={true}
                selectedElement={selectedEl}
                onSelectElement={(el) => { setSelectedEl(el); setExpandedRow(`text-${el}`); }}
              />
            </div>
            <div className={showBack ? "" : "absolute -left-[9999px] pointer-events-none"}>
              <BusinessCardBack
                ref={backCardRef}
                design={d}
                info={cardInfo}
                size="large"
                editMode={true}
                selectedBackIndex={selectedBackIdx}
                onSelectBackElement={(i) => {
                  setSelectedBackIdx(i);
                  // Open the matching row in the right panel so size/color
                  // editing is one click away.
                  const el = (d.backElements ?? [])[i];
                  if (el) setExpandedRow(el.type === "text" ? `btext-${i}` : `bimage-${i}`);
                }}
              />
            </div>
          </div>

          {/* Element toolbar — shows when an element is selected on the front */}
          {selectedEl && curStyle && !showBack && (
            <div className="mt-3 bg-white rounded-xl shadow-md border border-gray-200 p-3 w-full max-w-md">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-gray-700">
                  <span className="text-[#0e0f0c]">{ELEMENT_LABELS[selectedEl]}</span>
                </span>
                <div className="flex items-center gap-2">
                  <button type="button" onClick={() => resetElStyle(selectedEl)}
                    className="flex items-center gap-1 text-[10px] text-gray-400 hover:text-red-500">
                    <RotateCcw size={10} /> Reset
                  </button>
                  <button type="button" onClick={() => setSelectedEl(null)}
                    className="text-gray-400 hover:text-gray-600"><X size={14} /></button>
                </div>
              </div>

              <div className="flex gap-3 items-start">
                {/* Position pad */}
                <div className="flex flex-col items-center gap-0.5">
                  <button type="button" onClick={() => moveEl(0, -MOVE_STEP)}
                    className="w-7 h-7 flex items-center justify-center rounded bg-gray-100 hover:bg-[#9fe870]/30 text-[#454745] hover:text-[#0e0f0c]">
                    <ArrowUp size={12} />
                  </button>
                  <div className="flex gap-0.5">
                    <button type="button" onClick={() => moveEl(-MOVE_STEP, 0)}
                      className="w-7 h-7 flex items-center justify-center rounded bg-gray-100 hover:bg-[#9fe870]/30 text-[#454745] hover:text-[#0e0f0c]">
                      <ArrowLeft size={12} />
                    </button>
                    <button type="button" onClick={() => moveEl(MOVE_STEP, 0)}
                      className="w-7 h-7 flex items-center justify-center rounded bg-gray-100 hover:bg-[#9fe870]/30 text-[#454745] hover:text-[#0e0f0c]">
                      <ArrowRightIcon size={12} />
                    </button>
                  </div>
                  <button type="button" onClick={() => moveEl(0, MOVE_STEP)}
                    className="w-7 h-7 flex items-center justify-center rounded bg-gray-100 hover:bg-[#9fe870]/30 text-[#454745] hover:text-[#0e0f0c]">
                    <ArrowDown size={12} />
                  </button>
                  <div className="text-[9px] text-gray-400 mt-1 text-center leading-tight">
                    arrows: 2px<br />
                    +shift: 10px<br />
                    +cmd: 50px
                  </div>
                </div>

                {/* Size + Color */}
                <div className="flex-1 space-y-2">
                  {showFontSize && (
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-gray-400 w-8">Size</span>
                      <button type="button" onClick={() => changeFontSize(-1)}
                        className="w-6 h-6 flex items-center justify-center rounded bg-gray-100 hover:bg-[#9fe870]/30 text-[#454745] hover:text-[#0e0f0c]">
                        <Minus size={10} />
                      </button>
                      <span className="text-xs font-medium text-gray-700 w-8 text-center tabular-nums">
                        {curStyle.fontSize ?? specDefaults?.fontSize ?? 12}
                      </span>
                      <button type="button" onClick={() => changeFontSize(1)}
                        className="w-6 h-6 flex items-center justify-center rounded bg-gray-100 hover:bg-[#9fe870]/30 text-[#454745] hover:text-[#0e0f0c]">
                        <Plus size={10} />
                      </button>
                    </div>
                  )}
                  {selectedEl === "logo" && (
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-gray-400 w-8">Size</span>
                      <button type="button" onClick={() => changeLogoSize(-2)}
                        className="w-6 h-6 flex items-center justify-center rounded bg-gray-100 hover:bg-[#9fe870]/30 text-[#454745] hover:text-[#0e0f0c]">
                        <Minus size={10} />
                      </button>
                      <span className="text-xs font-medium text-gray-700 w-8 text-center tabular-nums">
                        {curStyle.fontSize ?? 36}
                      </span>
                      <button type="button" onClick={() => changeLogoSize(2)}
                        className="w-6 h-6 flex items-center justify-center rounded bg-gray-100 hover:bg-[#9fe870]/30 text-[#454745] hover:text-[#0e0f0c]">
                        <Plus size={10} />
                      </button>
                    </div>
                  )}
                  {selectedEl === "qr" && (
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-gray-400 w-8">Size</span>
                      <button type="button" onClick={() => changeQrSize(-4)}
                        className="w-6 h-6 flex items-center justify-center rounded bg-gray-100 hover:bg-[#9fe870]/30 text-[#454745] hover:text-[#0e0f0c]">
                        <Minus size={10} />
                      </button>
                      <span className="text-xs font-medium text-gray-700 w-8 text-center tabular-nums">
                        {Math.round(d.qrElement?.width ?? ensureQrElement().width)}
                      </span>
                      <button type="button" onClick={() => changeQrSize(4)}
                        className="w-6 h-6 flex items-center justify-center rounded bg-gray-100 hover:bg-[#9fe870]/30 text-[#454745] hover:text-[#0e0f0c]">
                        <Plus size={10} />
                      </button>
                    </div>
                  )}
                  {showColorPicker && (
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-gray-400 w-8">Color</span>
                      <input type="color" value={curStyle.color || specDefaults?.color || d.colors.primary}
                        onChange={(e) => setElStyle(selectedEl, { color: e.target.value })}
                        className="w-6 h-6 rounded border border-gray-200 cursor-pointer" />
                      {curStyle.color && (
                        <button type="button" onClick={() => {
                          const { color: _color, ...rest } = curStyle;
                          if (Object.keys(rest).length === 0) resetElStyle(selectedEl);
                          else patch({ elementOverrides: { ...(d.elementOverrides ?? {}), [selectedEl]: rest } });
                        }} className="text-[10px] text-gray-400 hover:text-red-500">✕</button>
                      )}
                    </div>
                  )}

                  {/* Per-element font — text only. Falls back to card-wide
                      font when no override is set. Uploaded custom fonts
                      appear as additional chips. */}
                  {showFontSize && (
                    <div className="flex items-start gap-2">
                      <span className="text-[10px] text-gray-400 w-8 mt-0.5">Font</span>
                      <div className="flex-1 flex flex-wrap items-center gap-1">
                        {(["sans", "serif", "mono"] as const).map((fam) => {
                          const active = (curStyle.fontFamily ?? d.font) === fam;
                          return (
                            <button key={fam} type="button"
                              onClick={() => setElStyle(selectedEl, { fontFamily: fam })}
                              className={`px-2 py-0.5 text-[10px] rounded transition-colors ${
                                active ? "bg-[#9fe870] text-[#163300]" : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                              }`}>{fam}</button>
                          );
                        })}
                        {(d.customFonts ?? []).map((cf) => {
                          const active = curStyle.fontFamily === cf.family;
                          return (
                            <span key={cf.family} className="inline-flex items-center">
                              <button type="button"
                                onClick={() => setElStyle(selectedEl, { fontFamily: cf.family })}
                                style={{ fontFamily: `"${cf.family}", system-ui, sans-serif` }}
                                title={cf.family}
                                className={`px-2 py-0.5 text-[10px] rounded-l transition-colors ${
                                  active ? "bg-[#9fe870] text-[#163300]" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                                }`}>{cf.family}</button>
                              <button type="button"
                                onClick={() => removeCustomFont(cf.family)}
                                title={`Remove "${cf.family}"`}
                                className={`px-1 py-0.5 text-[10px] rounded-r border-l border-white/10 transition-colors ${
                                  active ? "bg-[#9fe870] text-[#163300] hover:bg-[#cdffad]" : "bg-gray-100 text-gray-400 hover:text-red-500 hover:bg-gray-200"
                                }`}>×</button>
                            </span>
                          );
                        })}
                        <label className="px-2 py-0.5 text-[10px] rounded bg-gray-100 text-gray-500 hover:bg-gray-200 cursor-pointer"
                          title="Upload .woff2 / .woff / .ttf / .otf">
                          + Upload
                          <input type="file" accept=".woff2,.woff,.ttf,.otf,font/woff2,font/woff,font/ttf,font/otf"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (!file) return;
                              uploadCustomFont(file, (family) => setElStyle(selectedEl, { fontFamily: family }));
                              e.target.value = "";
                            }} />
                        </label>
                        {curStyle.fontFamily && (
                          <button type="button" onClick={() => {
                            const { fontFamily: _f, ...rest } = curStyle;
                            if (Object.keys(rest).length === 0) resetElStyle(selectedEl);
                            else patch({ elementOverrides: { ...(d.elementOverrides ?? {}), [selectedEl]: rest } });
                          }} className="text-[10px] text-gray-400 hover:text-red-500" title="Reset to card font">✕</button>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Per-element capitalization. Lets the user override a
                      template that hard-codes uppercase. "none" disables
                      any spec-level transform; default (no override) keeps
                      whatever the template chose. */}
                  {showFontSize && (
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-gray-400 w-8">Case</span>
                      {([
                        { value: "none",       label: "Aa",     title: "Original casing" },
                        { value: "uppercase",  label: "AA",     title: "ALL UPPERCASE" },
                        { value: "lowercase",  label: "aa",     title: "all lowercase" },
                        { value: "capitalize", label: "Aa Bb",  title: "Title Case" },
                      ] as const).map(({ value, label, title }) => {
                        const active = curStyle.textTransform === value;
                        return (
                          <button key={value} type="button" title={title}
                            onClick={() => setElStyle(selectedEl, { textTransform: value })}
                            className={`px-2 py-0.5 text-[10px] rounded transition-colors ${
                              active ? "bg-[#9fe870] text-[#163300]" : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                            }`}>{label}</button>
                        );
                      })}
                      {curStyle.textTransform && (
                        <button type="button" onClick={() => {
                          const { textTransform: _t, ...rest } = curStyle;
                          if (Object.keys(rest).length === 0) resetElStyle(selectedEl);
                          else patch({ elementOverrides: { ...(d.elementOverrides ?? {}), [selectedEl]: rest } });
                        }} className="text-[10px] text-gray-400 hover:text-red-500" title="Use template default">✕</button>
                      )}
                    </div>
                  )}

                  {/* Wrap toggle — single-line by default; click to allow
                      multi-line for long company names / addresses. */}
                  {showFontSize && (
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-gray-400 w-8">Wrap</span>
                      <button type="button"
                        onClick={() => setElStyle(selectedEl, { wrap: !curStyle.wrap })}
                        title={curStyle.wrap ? "Wrap onto multiple lines" : "Single line — text expands"}
                        className={`px-2 py-0.5 text-[10px] rounded transition-colors ${
                          curStyle.wrap ? "bg-[#9fe870] text-[#163300]" : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                        }`}>{curStyle.wrap ? "Multi-line" : "Single line"}</button>
                    </div>
                  )}

                  {/* Opacity — universal for every selected element */}
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-gray-400 w-8">Opacity</span>
                    {(() => {
                      const op = selectedEl === "qr"
                        ? (d.qrElement?.opacity ?? 1)
                        : (curStyle.opacity ?? 1);
                      return (
                        <>
                          <input type="range" min="0.1" max="1" step="0.05" value={op}
                            onChange={(e) => {
                              const v = parseFloat(e.target.value);
                              if (selectedEl === "qr") {
                                const qe = ensureQrElement();
                                patch({ qrElement: { ...qe, opacity: v } });
                              } else {
                                setElStyle(selectedEl, { opacity: v });
                              }
                            }}
                            className="flex-1 h-1.5 accent-[#9fe870]" />
                          <span className="text-[10px] text-gray-500 w-8 text-right tabular-nums">{op.toFixed(2)}</span>
                        </>
                      );
                    })()}
                  </div>

                  {/* Placement chips — for logo and QR (text fields don't use placement) */}
                  {(selectedEl === "logo" || selectedEl === "qr") && (
                    <div className="flex flex-wrap items-center gap-1 pt-1 border-t border-gray-100">
                      <span className="text-[9px] text-gray-400 mr-0.5">snap:</span>
                      {QR_PLACEMENTS.map((p) => {
                        const active = selectedEl === "logo"
                          ? d.logo.placement === p
                          : d.qr?.placement === p;
                        return (
                          <button key={p} type="button"
                            onClick={() => {
                              if (selectedEl === "logo") {
                                patch({ logo: { ...d.logo, placement: p } });
                              } else {
                                patch({ qr: { ...d.qr!, placement: p }, qrElement: null });
                              }
                            }}
                            className={`px-1.5 py-0.5 text-[9px] rounded transition-colors ${
                              active ? "bg-[#9fe870] text-[#163300]" : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                            }`}>{p}</button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Back-side element toolbar — single home for size, color, opacity,
              position pad, and placement chips when a back element is selected. */}
          {showBack && selectedBackIdx != null && (d.backElements ?? [])[selectedBackIdx] && (() => {
            const bEl = d.backElements![selectedBackIdx];
            const isText = bEl.type === "text";
            // Compute current placement-chip selection from the live x/y/dims.
            const dims = isText
              ? { w: Math.max(40, ((bEl.text?.length ?? 4)) * bEl.fontSize * 0.55), h: bEl.fontSize * 1.2 }
              : { w: bEl.width, h: bEl.height };
            const currentPlacement = detectPlacement(bEl.x, bEl.y, dims.w, dims.h);
            const currentImageSize = !isText ? detectImageSize(bEl.width) : null;
            return (
              <div className="mt-3 bg-white rounded-xl shadow-md border border-gray-200 p-3 w-full max-w-md">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-gray-700">
                    <span className="text-[#0e0f0c]">
                      {isText ? "Back Text" : "Back Image"} {selectedBackIdx + 1}
                    </span>
                  </span>
                  <button type="button" onClick={() => setSelectedBackIdx(null)}
                    className="text-gray-400 hover:text-gray-600"><X size={14} /></button>
                </div>

                <div className="flex gap-3 items-start">
                  {/* Position pad */}
                  <div className="flex flex-col items-center gap-0.5">
                    <button type="button" onClick={() => moveBackEl(0, -MOVE_STEP)}
                      className="w-7 h-7 flex items-center justify-center rounded bg-gray-100 hover:bg-[#9fe870]/30 text-[#454745] hover:text-[#0e0f0c]">
                      <ArrowUp size={12} />
                    </button>
                    <div className="flex gap-0.5">
                      <button type="button" onClick={() => moveBackEl(-MOVE_STEP, 0)}
                        className="w-7 h-7 flex items-center justify-center rounded bg-gray-100 hover:bg-[#9fe870]/30 text-[#454745] hover:text-[#0e0f0c]">
                        <ArrowLeft size={12} />
                      </button>
                      <button type="button" onClick={() => moveBackEl(MOVE_STEP, 0)}
                        className="w-7 h-7 flex items-center justify-center rounded bg-gray-100 hover:bg-[#9fe870]/30 text-[#454745] hover:text-[#0e0f0c]">
                        <ArrowRightIcon size={12} />
                      </button>
                    </div>
                    <button type="button" onClick={() => moveBackEl(0, MOVE_STEP)}
                      className="w-7 h-7 flex items-center justify-center rounded bg-gray-100 hover:bg-[#9fe870]/30 text-[#454745] hover:text-[#0e0f0c]">
                      <ArrowDown size={12} />
                    </button>
                    <div className="text-[9px] text-gray-400 mt-1 text-center leading-tight">
                      arrows: 2px<br />
                      +shift: 10px<br />
                      +cmd: 50px
                    </div>
                  </div>

                  {/* Size + Color + Opacity */}
                  <div className="flex-1 space-y-2">
                    {/* Text font size */}
                    {isText && (
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-gray-400 w-10">Size</span>
                        <button type="button"
                          onClick={() => updateBackElement(selectedBackIdx, { fontSize: Math.max(6, bEl.fontSize - 1) })}
                          className="w-6 h-6 flex items-center justify-center rounded bg-gray-100 hover:bg-[#9fe870]/30 text-[#454745] hover:text-[#0e0f0c]">
                          <Minus size={10} />
                        </button>
                        <span className="text-xs font-medium text-gray-700 w-8 text-center tabular-nums">{bEl.fontSize}</span>
                        <button type="button"
                          onClick={() => updateBackElement(selectedBackIdx, { fontSize: Math.min(48, bEl.fontSize + 1) })}
                          className="w-6 h-6 flex items-center justify-center rounded bg-gray-100 hover:bg-[#9fe870]/30 text-[#454745] hover:text-[#0e0f0c]">
                          <Plus size={10} />
                        </button>
                      </div>
                    )}
                    {/* Image size enum */}
                    {!isText && (
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-gray-400 w-10">Size</span>
                        <div className="flex gap-1">
                          {(["small", "medium", "large"] as const).map((s) => (
                            <button key={s} type="button"
                              onClick={() => updateBackElement(selectedBackIdx, { width: BACK_IMAGE_SIZES[s], height: BACK_IMAGE_SIZES[s] })}
                              className={`px-2 py-0.5 text-[10px] rounded ${
                                currentImageSize === s ? "bg-[#9fe870] text-[#163300]" : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                              }`}>{s}</button>
                          ))}
                        </div>
                      </div>
                    )}
                    {/* Text color */}
                    {isText && (
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-gray-400 w-10">Color</span>
                        <input type="color" value={bEl.color || d.colors.primary}
                          onChange={(e) => updateBackElement(selectedBackIdx, { color: e.target.value })}
                          className="w-6 h-6 rounded border border-gray-200 cursor-pointer" />
                      </div>
                    )}
                    {/* Per-element font (text only) — falls back to card font.
                        Uploaded custom fonts appear as additional chips. */}
                    {isText && (
                      <div className="flex items-start gap-2">
                        <span className="text-[10px] text-gray-400 w-10 mt-0.5">Font</span>
                        <div className="flex-1 flex flex-wrap items-center gap-1">
                          {(["sans", "serif", "mono"] as const).map((fam) => {
                            const active = (bEl.fontFamily ?? d.font) === fam;
                            return (
                              <button key={fam} type="button"
                                onClick={() => updateBackElement(selectedBackIdx, { fontFamily: fam })}
                                className={`px-2 py-0.5 text-[10px] rounded transition-colors ${
                                  active ? "bg-[#9fe870] text-[#163300]" : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                                }`}>{fam}</button>
                            );
                          })}
                          {(d.customFonts ?? []).map((cf) => {
                            const active = bEl.fontFamily === cf.family;
                            return (
                              <button key={cf.family} type="button"
                                onClick={() => updateBackElement(selectedBackIdx, { fontFamily: cf.family })}
                                style={{ fontFamily: `"${cf.family}", system-ui, sans-serif` }}
                                title={cf.family}
                                className={`px-2 py-0.5 text-[10px] rounded transition-colors ${
                                  active ? "bg-[#9fe870] text-[#163300]" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                                }`}>{cf.family}</button>
                            );
                          })}
                          <label className="px-2 py-0.5 text-[10px] rounded bg-gray-100 text-gray-500 hover:bg-gray-200 cursor-pointer"
                            title="Upload .woff2 / .woff / .ttf / .otf">
                            + Upload
                            <input type="file" accept=".woff2,.woff,.ttf,.otf,font/woff2,font/woff,font/ttf,font/otf"
                              className="hidden"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (!file) return;
                                uploadCustomFont(file, (family) => updateBackElement(selectedBackIdx, { fontFamily: family }));
                                e.target.value = "";
                              }} />
                          </label>
                        </div>
                      </div>
                    )}
                    {/* Per-element capitalization (text only) */}
                    {isText && (
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-gray-400 w-10">Case</span>
                        {([
                          { value: "none",       label: "Aa",    title: "Original casing" },
                          { value: "uppercase",  label: "AA",    title: "ALL UPPERCASE" },
                          { value: "lowercase",  label: "aa",    title: "all lowercase" },
                          { value: "capitalize", label: "Aa Bb", title: "Title Case" },
                        ] as const).map(({ value, label, title }) => {
                          const active = (bEl.textTransform ?? "none") === value;
                          return (
                            <button key={value} type="button" title={title}
                              onClick={() => updateBackElement(selectedBackIdx, { textTransform: value })}
                              className={`px-2 py-0.5 text-[10px] rounded transition-colors ${
                                active ? "bg-[#9fe870] text-[#163300]" : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                              }`}>{label}</button>
                          );
                        })}
                      </div>
                    )}
                    {/* Wrap toggle (text only) */}
                    {isText && (
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-gray-400 w-10">Wrap</span>
                        <button type="button"
                          onClick={() => updateBackElement(selectedBackIdx, { wrap: !bEl.wrap })}
                          title={bEl.wrap ? "Wrap onto multiple lines" : "Single line — text expands"}
                          className={`px-2 py-0.5 text-[10px] rounded transition-colors ${
                            bEl.wrap ? "bg-[#9fe870] text-[#163300]" : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                          }`}>{bEl.wrap ? "Multi-line" : "Single line"}</button>
                      </div>
                    )}
                    {/* Opacity */}
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-gray-400 w-10">Opacity</span>
                      <input type="range" min="0.1" max="1" step="0.05" value={bEl.opacity ?? 1}
                        onChange={(e) => updateBackElement(selectedBackIdx, { opacity: parseFloat(e.target.value) })}
                        className="flex-1 h-1.5 accent-[#9fe870]" />
                      <span className="text-[10px] text-gray-500 w-8 text-right tabular-nums">{(bEl.opacity ?? 1).toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                {/* Placement snap chips — full row at the bottom */}
                <div className="flex flex-wrap items-center gap-1 mt-2 pt-2 border-t border-gray-100">
                  <span className="text-[9px] text-gray-400 mr-0.5">snap:</span>
                  {QR_PLACEMENTS.map((p) => (
                    <button key={p} type="button"
                      onClick={() => updateBackElement(selectedBackIdx, placementCoords(p, dims.w, dims.h))}
                      className={`px-1.5 py-0.5 text-[9px] rounded transition-colors ${
                        currentPlacement === p ? "bg-[#9fe870] text-[#163300]" : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                      }`}>{p}</button>
                  ))}
                </div>
              </div>
            );
          })()}
        </div>

        {/* ────────────── Right — Unified panel ────────────── */}
        <div className="w-full lg:w-[340px] shrink-0 min-h-0 flex flex-col gap-3 overflow-hidden">
          {/* Top: Back navigation */}
          <div className="bg-[#0e0f0c] rounded-2xl border border-white/8 p-3 shrink-0">
            <button type="button" onClick={() => setStep("designs")}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium text-[#868685] hover:text-[#fafaf7] hover:bg-white/8 transition-colors">
              <ArrowLeft size={13} /> Back to designs
            </button>
          </div>

          {/* Card style accordion */}
          <div className="bg-[#0e0f0c] rounded-2xl border border-white/8 overflow-hidden shrink-0">
            <button type="button"
              onClick={() => setCardStyleOpen(!cardStyleOpen)}
              className="w-full flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-[#fafaf7] hover:bg-white/8 transition-colors">
              <Settings2 size={13} className="text-[#868685]" />
              <span className="flex-1 text-left">Card style</span>
              {cardStyleOpen ? <ChevronDown size={14} className="text-[#868685]" /> : <ChevronRightIcon size={14} className="text-[#868685]" />}
            </button>
            {cardStyleOpen && (
              <div className="px-4 pb-4 pt-1 border-t border-white/8">
                {renderCardStyle()}
              </div>
            )}
          </div>

          {/* Elements panel */}
          <div className="bg-[#0e0f0c] rounded-2xl border border-white/8 overflow-hidden flex flex-col min-h-0 flex-1">
            {/* Header: side toggle */}
            <div className="flex items-center gap-2 px-3 py-2.5 border-b border-white/8 shrink-0">
              <Layers size={13} className="text-[#868685]" />
              <span className="text-xs font-semibold text-[#fafaf7]">Elements</span>
              <div className="ml-auto flex items-center bg-white/6 rounded-md p-0.5">
                <button type="button"
                  onClick={() => setSideView("front")}
                  className={`px-2.5 py-0.5 text-[10px] rounded font-medium transition-colors ${
                    sideView === "front" ? "bg-[#9fe870] text-[#163300]" : "text-[#868685] hover:text-white/60"
                  }`}>Front</button>
                <button type="button"
                  onClick={() => setSideView("back")}
                  className={`px-2.5 py-0.5 text-[10px] rounded font-medium transition-colors ${
                    sideView === "back" ? "bg-[#9fe870] text-[#163300]" : "text-[#868685] hover:text-white/60"
                  }`}>Back</button>
              </div>
            </div>

            {/* Scrollable list */}
            <div className="px-3 py-2 overflow-y-auto flex-1 min-h-0">
              {sideView === "front" ? renderFrontList() : renderBackList()}
            </div>

            {/* Add element bar — hidden on the back side until the back
                face is enabled (otherwise there's nothing to add to). */}
            {(sideView === "front" || d.backFace) && (
              <div className="p-2 border-t border-white/8 shrink-0">
                {renderAddMenu()}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
