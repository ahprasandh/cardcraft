
import { useState, useRef, useEffect } from "react";

declare global {
  interface Window { domtoimage: { toPng: (node: HTMLElement, opts?: Record<string, unknown>) => Promise<string> } }
}
import { useWizardStore } from "@/lib/store";
import BusinessCard from "@/components/BusinessCard";
import BusinessCardBack from "@/components/BusinessCardBack";
import type { EditableElementId } from "@/components/BusinessCard";
import type { CardDesign, ElementStyle, PatternPlacement, LogoPlacement, QrSpec, ExtraImage, BackFacePreset, BackFaceSpec } from "@/lib/types";
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
} from "lucide-react";

/* ── constants ─────────────────────────────────────────────────────── */
const MOVE_STEP = 2;
const PATTERN_PLACEMENTS: PatternPlacement[] = ["full", "top", "bottom", "left", "right", "top-left", "top-right", "bottom-left", "bottom-right", "diagonal-tl", "diagonal-br"];
const QR_PLACEMENTS: LogoPlacement[] = ["top-left", "top-right", "top-center", "center-left", "center", "center-right", "bottom-left", "bottom-right", "bottom-center"];

const BACK_PRESETS: { value: BackFacePreset; label: string; desc: string }[] = [
  { value: "logo-centered", label: "Logo", desc: "Centered logo + company" },
  { value: "qr-focus", label: "QR", desc: "Large QR code" },
  { value: "pattern-fill", label: "Pattern", desc: "Full pattern overlay" },
  { value: "minimal-info", label: "Minimal", desc: "Company + website" },
  { value: "solid", label: "Solid", desc: "Clean solid color" },
  { value: "tagline", label: "Tagline", desc: "Feature your tagline" },
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
};

/* ── helpers ───────────────────────────────────────────────────────── */
function usePatchDesign() {
  const { selectedDesign, setSelectedDesign } = useWizardStore();
  return (patch: Partial<CardDesign>) => {
    if (!selectedDesign) return;
    setSelectedDesign({ ...selectedDesign, ...patch });
  };
}

/* ═══════════════════════════════════════════════════════════════════ */
export default function RefinementStep() {
  const { selectedDesign, setStep, cardInfo, setCardInfo } = useWizardStore();
  const patch = usePatchDesign();

  const cardRef = useRef<HTMLDivElement>(null);
  const backCardRef = useRef<HTMLDivElement>(null);

  // Load dom-to-image from CDN
  useEffect(() => {
    if (window.domtoimage) return;
    const s = document.createElement("script");
    s.src = "https://cdnjs.cloudflare.com/ajax/libs/dom-to-image/2.6.0/dom-to-image.min.js";
    s.async = true;
    document.head.appendChild(s);
  }, []);

  const [showBack, setShowBack] = useState(false);
  const [activeTab, setActiveTab] = useState<"details" | "style" | "back-face">("details");
  const [selectedEl, setSelectedEl] = useState<EditableElementId | null>(null);
  const [taglineSuggestions, setTaglineSuggestions] = useState<string[]>([]);
  const [isLoadingTaglines, setIsLoadingTaglines] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [showDownloadMenu, setShowDownloadMenu] = useState(false);

  /* ── element override helpers ────────────────────────────────────── */
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

  const moveEl = (dx: number, dy: number) => {
    if (!selectedEl) return;
    const cur = getElStyle(selectedEl);
    setElStyle(selectedEl, {
      offsetX: (cur.offsetX ?? 0) + dx,
      offsetY: (cur.offsetY ?? 0) + dy,
    });
  };

  const changeFontSize = (delta: number) => {
    if (!selectedEl) return;
    const cur = getElStyle(selectedEl);
    const base = selectedEl === "name" ? 24 : selectedEl === "title" ? 14 : 12;
    const newSize = Math.max(6, Math.min(48, (cur.fontSize ?? base) + delta));
    setElStyle(selectedEl, { fontSize: newSize });
  };

  const changeLogoSize = (delta: number) => {
    const cur = getElStyle("logo");
    const base = 36; // default large-card logo size
    const newSize = Math.max(16, Math.min(72, (cur.fontSize ?? base) + delta));
    setElStyle("logo", { fontSize: newSize });
  };

  /* ── hidden fields helpers ──────────────────────────────────────── */
  const hiddenFields = new Set(selectedDesign?.hiddenFields ?? []);

  const toggleField = (field: string) => {
    if (!selectedDesign) return;
    const current = new Set(selectedDesign.hiddenFields ?? []);
    if (current.has(field)) {
      current.delete(field);
    } else {
      current.add(field);
    }
    patch({ hiddenFields: current.size > 0 ? Array.from(current) : undefined });
  };

  const isHidden = (field: string) => hiddenFields.has(field);

  /* ── Keyboard shortcuts ───────────────────────────────────────────── */
  const ELEMENTS: EditableElementId[] = ["name", "title", "company", "tagline", "contacts", "logo"];
  const editStateRef = useRef({ selectedEl, moveEl, changeFontSize, changeLogoSize, toggleField, setSelectedEl });
  editStateRef.current = { selectedEl, moveEl, changeFontSize, changeLogoSize, toggleField, setSelectedEl };

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const { selectedEl: sel, moveEl: move, changeFontSize: cfs, changeLogoSize: cls, toggleField: tf, setSelectedEl: sSel } = editStateRef.current;
      const tag = (e.target as HTMLElement).tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;

      if (e.key === "Escape") {
        e.preventDefault();
        if (sel) sSel(null);
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
      if (!sel) return;
      switch (e.key) {
        case "ArrowUp":    e.preventDefault(); move(0, -MOVE_STEP); break;
        case "ArrowDown":  e.preventDefault(); move(0, MOVE_STEP); break;
        case "ArrowLeft":  e.preventDefault(); move(-MOVE_STEP, 0); break;
        case "ArrowRight": e.preventDefault(); move(MOVE_STEP, 0); break;
        case "+": case "=": e.preventDefault(); sel === "logo" ? cls(2) : cfs(1); break;
        case "-": case "_": e.preventDefault(); sel === "logo" ? cls(-2) : cfs(-1); break;
        case "Delete": case "Backspace":
          if (sel !== "logo") { e.preventDefault(); tf(sel); }
          break;
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  /* ── other handlers ──────────────────────────────────────────────── */
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

  const handleConfirm = () => {
    setStep("printers");
  };

  /* ── download helpers ────────────────────────────────────────────── */

  const captureNode = async (node: HTMLElement) => {
    if (!window.domtoimage) throw new Error("dom-to-image not loaded");

    await document.fonts.ready;

    // Scale factor: card is 490×280 on screen, standard biz card = 1050×600 @ 300dpi
    const printScale = 1050 / node.offsetWidth; // ≈2.14×
    const scale = printScale * 2;
    const w = node.offsetWidth;
    const h = node.offsetHeight;

    const dataUrl = await window.domtoimage.toPng(node, {
      width: w * scale,
      height: h * scale,
      style: {
        transform: `scale(${scale})`,
        transformOrigin: "top left",
        width: `${w}px`,
        height: `${h}px`,
        boxShadow: "none",
        overflow: "hidden",
      },
    });
    return dataUrl;
  };

  const captureCard = async () => {
    const node = cardRef.current;
    if (!node) throw new Error("Card element not found");
    return captureNode(node);
  };

  const downloadPng = async () => {
    setIsDownloading(true);
    setShowDownloadMenu(false);
    try {
      const baseName = (cardInfo.name || "business-card").replace(/\s+/g, "-").toLowerCase();
      // Front
      const frontUrl = await captureCard();
      const link = document.createElement("a");
      link.download = `${baseName}-front.png`;
      link.href = frontUrl;
      link.click();
      // Back (if enabled)
      if (selectedDesign?.backFace && backCardRef.current) {
        const backUrl = await captureNode(backCardRef.current);
        const link2 = document.createElement("a");
        link2.download = `${baseName}-back.png`;
        link2.href = backUrl;
        setTimeout(() => link2.click(), 200);
      }
    } catch (err) {
      console.error("PNG download failed:", err);
      alert("Download failed. Please try again.");
    }
    setIsDownloading(false);
  };

  const downloadPdf = async () => {
    setIsDownloading(true);
    setShowDownloadMenu(false);
    try {
      const frontUrl = await captureCard();
      let backUrl: string | null = null;
      if (selectedDesign?.backFace && backCardRef.current) {
        backUrl = await captureNode(backCardRef.current);
      }
      // Standard business card: 3.5 × 2 inches
      const cardW = 3.5;
      const cardH = 2;
      const pageW = 8.5;
      const pageH = 11;
      const marginY = 1; // 1 inch from top
      const printWin = window.open("", "_blank");
      if (!printWin) { alert("Please allow pop-ups to download PDF"); setIsDownloading(false); return; }
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
      alert("Download failed. Please try again.");
    }
    setIsDownloading(false);
  };

  /* ── guard ──────────────────────────────────────────────────────── */
  if (!selectedDesign) {
    return (
      <div className="text-center py-16">
        <p className="text-gray-400">No design selected.</p>
        <button onClick={() => setStep("designs")} className="mt-4 text-indigo-600 hover:underline text-sm">Go back to pick a design</button>
      </div>
    );
  }

  const d = selectedDesign;
  const curStyle = selectedEl ? getElStyle(selectedEl) : null;
  const showColorPicker = selectedEl && selectedEl !== "logo";
  const showFontSize = selectedEl && selectedEl !== "logo";

  /* ── visibility toggle button ───────────────────────────────────── */
  const VisToggle = ({ field }: { field: string }) => (
    <button
      type="button"
      onClick={() => toggleField(field)}
      className={`p-1 rounded transition-colors ${isHidden(field) ? "text-red-400 hover:text-red-500 bg-red-50" : "text-gray-300 hover:text-gray-500"}`}
      title={isHidden(field) ? "Show on card" : "Hide from card"}
    >
      {isHidden(field) ? <EyeOff size={13} /> : <Eye size={13} />}
    </button>
  );

  /* ── Tab content renderers ──────────────────────────────────────── */
  const renderDetailsTab = () => (
    <div className="space-y-3">
      {/* Logo upload */}
      <div className="flex items-center gap-1">
        <div className={`flex-1 ${isHidden("logo") ? "opacity-40" : ""}`}>
          {cardInfo.customLogoUrl ? (
            <div className="flex items-center gap-2">
              <img src={cardInfo.customLogoUrl} alt="Logo" className="w-9 h-9 rounded object-contain border border-gray-200" />
              <span className="text-xs text-gray-500">Logo uploaded</span>
              <button type="button" onClick={() => setCardInfo({ customLogoUrl: "" })}
                className="ml-auto p-1 text-gray-400 hover:text-red-500 transition-colors"><X size={14} /></button>
            </div>
          ) : (
            <label className="flex items-center gap-2 px-3 py-2 rounded-lg border border-dashed border-gray-300
              text-xs text-gray-500 cursor-pointer hover:border-indigo-400 hover:text-indigo-600 transition-colors">
              <ImagePlus size={15} />
              Upload your logo
              <input type="file" accept="image/png,image/jpeg,image/svg+xml,image/webp" className="hidden" onChange={handleLogoUpload} />
            </label>
          )}
        </div>
        <VisToggle field="logo" />
      </div>

      {/* Name */}
      <div className="flex items-center gap-1">
        <div className={`flex-1 relative ${isHidden("name") ? "opacity-40" : ""}`}>
          <User size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input type="text" value={cardInfo.name} onChange={(e) => setCardInfo({ name: e.target.value })}
            placeholder="Full Name" disabled={isHidden("name")}
            className="w-full pl-8 pr-3 py-2 rounded-lg border border-gray-200 text-sm text-gray-900
              placeholder:text-gray-300 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100
              disabled:bg-gray-50 disabled:cursor-not-allowed" />
        </div>
        <VisToggle field="name" />
      </div>

      {/* Title */}
      <div className="flex items-center gap-1">
        <div className={`flex-1 relative ${isHidden("title") ? "opacity-40" : ""}`}>
          <Briefcase size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input type="text" value={cardInfo.title} onChange={(e) => setCardInfo({ title: e.target.value })}
            placeholder="Job Title" disabled={isHidden("title")}
            className="w-full pl-8 pr-3 py-2 rounded-lg border border-gray-200 text-sm text-gray-900
              placeholder:text-gray-300 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100
              disabled:bg-gray-50 disabled:cursor-not-allowed" />
        </div>
        <VisToggle field="title" />
      </div>

      {/* Company */}
      <div className="flex items-center gap-1">
        <div className={`flex-1 relative ${isHidden("company") ? "opacity-40" : ""}`}>
          <Building2 size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input type="text" value={cardInfo.company} onChange={(e) => setCardInfo({ company: e.target.value })}
            placeholder="Company" disabled={isHidden("company")}
            className="w-full pl-8 pr-3 py-2 rounded-lg border border-gray-200 text-sm text-gray-900
              placeholder:text-gray-300 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100
              disabled:bg-gray-50 disabled:cursor-not-allowed" />
        </div>
        <VisToggle field="company" />
      </div>

      {/* Tagline + AI */}
      <div className="flex items-center gap-1">
        <div className={`flex-1 flex gap-1.5 ${isHidden("tagline") ? "opacity-40" : ""}`}>
          <div className="flex-1 relative">
            <MessageSquareQuote size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input type="text" value={cardInfo.tagline} onChange={(e) => setCardInfo({ tagline: e.target.value })}
              placeholder="Tagline" disabled={isHidden("tagline")}
              className="w-full pl-8 pr-3 py-2 rounded-lg border border-gray-200 text-sm text-gray-900
                placeholder:text-gray-300 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100
                disabled:bg-gray-50 disabled:cursor-not-allowed" />
          </div>
          <button type="button" onClick={handleSuggestTaglines} disabled={isLoadingTaglines || isHidden("tagline")}
            className="shrink-0 flex items-center gap-1 px-2 py-2 text-xs font-medium
              text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100 disabled:opacity-50 border border-indigo-100">
            {isLoadingTaglines ? <Loader2 size={12} className="animate-spin" /> : <Wand2 size={12} />}
          </button>
        </div>
        <VisToggle field="tagline" />
      </div>
      {taglineSuggestions.length > 0 && !isHidden("tagline") && (
        <div className="flex flex-wrap gap-1.5 pl-1">
          {taglineSuggestions.map((tag, i) => (
            <button key={i} type="button"
              onClick={() => { setCardInfo({ tagline: tag }); setTaglineSuggestions([]); }}
              className="px-2 py-0.5 text-[11px] rounded-full border border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100">
              {tag}
            </button>
          ))}
        </div>
      )}

      {/* Contact */}
      <div className="space-y-2.5 pt-2 border-t border-gray-100">
        {([
          { key: "email", icon: Mail, placeholder: "Email", type: "email" },
          { key: "phone", icon: Phone, placeholder: "Phone", type: "tel" },
          { key: "website", icon: Globe, placeholder: "Website", type: "text" },
          { key: "address", icon: MapPin, placeholder: "Address", type: "text" },
        ] as const).map(({ key, icon: Icon, placeholder, type }) => (
          <div key={key} className="flex items-center gap-1">
            <div className={`flex-1 relative ${isHidden(key) ? "opacity-40" : ""}`}>
              <Icon size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input type={type} value={cardInfo[key]} onChange={(e) => setCardInfo({ [key]: e.target.value })}
                placeholder={placeholder} disabled={isHidden(key)}
                className="w-full pl-8 pr-3 py-2 rounded-lg border border-gray-200 text-sm text-gray-900
                  placeholder:text-gray-300 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100
                  disabled:bg-gray-50 disabled:cursor-not-allowed" />
            </div>
            <VisToggle field={key} />
          </div>
        ))}
      </div>

      {/* Custom text lines */}
      <div className="pt-2 border-t border-gray-100">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Custom Lines</span>
          <button type="button"
            onClick={() => setCardInfo({ customLines: [...(cardInfo.customLines || []), ""] })}
            className="flex items-center gap-0.5 px-2 py-0.5 text-[10px] rounded-full font-medium bg-gray-100 text-gray-500 hover:bg-gray-200 transition-colors">
            <Plus size={10} /> Add
          </button>
        </div>
        {(cardInfo.customLines || []).map((line, idx) => (
          <div key={idx} className="flex items-center gap-1 mb-1.5">
            <input type="text" value={line}
              onChange={(e) => {
                const lines = [...(cardInfo.customLines || [])];
                lines[idx] = e.target.value;
                setCardInfo({ customLines: lines });
              }}
              placeholder={`Line ${idx + 1}`}
              className="flex-1 px-3 py-2 rounded-lg border border-gray-200 text-sm text-gray-900
                placeholder:text-gray-300 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100" />
            <button type="button"
              onClick={() => setCardInfo({ customLines: (cardInfo.customLines || []).filter((_, i) => i !== idx) })}
              className="p-1 text-gray-400 hover:text-red-500 transition-colors"><X size={13} /></button>
          </div>
        ))}
      </div>
    </div>
  );

  const renderStyleTab = () => (
    <div className="space-y-4">
      {/* Font */}
      <div>
        <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider block mb-1.5">Font</span>
        <div className="flex gap-1.5">
          {([
            { value: "sans", label: "Sans", sample: "font-sans" },
            { value: "serif", label: "Serif", sample: "font-serif" },
            { value: "mono", label: "Mono", sample: "font-mono" },
          ] as const).map(({ value, label, sample }) => (
            <button key={value} type="button" onClick={() => patch({ font: value })}
              className={`px-3 py-1.5 rounded-lg text-xs ${sample} transition-colors ${
                d.font === value ? "bg-indigo-600 text-white font-semibold" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}>{label}</button>
          ))}
        </div>
      </div>

      {/* Colors */}
      <div>
        <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider block mb-1.5">Colors</span>
        <div className="flex gap-3">
          {([
            { label: "BG", value: d.colors.background, key: "background" },
            { label: "Alt", value: d.colors.backgroundAlt, key: "backgroundAlt" },
            { label: "Accent", value: d.colors.accent, key: "accent" },
          ] as const).map(({ label, value, key }) => (
            <div key={key} className="flex flex-col items-center gap-1">
              <input type="color" value={value}
                onChange={(e) => patch({ colors: { ...d.colors, [key]: e.target.value } })}
                className="w-8 h-8 rounded-lg border border-gray-200 cursor-pointer" />
              <span className="text-[9px] text-gray-400">{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Pattern */}
      {d.pattern.id !== "none" && (
        <div>
          <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider block mb-1.5">Pattern</span>
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <input type="color" value={d.pattern.color}
                onChange={(e) => patch({ pattern: { ...d.pattern, color: e.target.value } })}
                className="w-7 h-7 rounded border border-gray-200 cursor-pointer" />
              <div className="flex-1">
                <span className="text-[10px] text-gray-400 block mb-0.5">Opacity {d.pattern.opacity.toFixed(2)}</span>
                <input type="range" min="0.02" max="0.4" step="0.01" value={d.pattern.opacity}
                  onChange={(e) => patch({ pattern: { ...d.pattern, opacity: parseFloat(e.target.value) } })}
                  className="w-full h-1.5 accent-indigo-600" />
              </div>
            </div>
            <div className="flex flex-wrap gap-1">
              {PATTERN_PLACEMENTS.map((p) => (
                <button key={p} type="button" onClick={() => patch({ pattern: { ...d.pattern, placement: p } })}
                  className={`px-1.5 py-0.5 text-[9px] rounded transition-colors ${
                    d.pattern.placement === p ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                  }`}>{p}</button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* QR */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-1">
            <QrCode size={11} /> QR Code
          </span>
          <button type="button"
            onClick={() => {
              const current = d.qr ?? { enabled: false, content: "website" as const, placement: "bottom-right" as LogoPlacement, size: "small" as const };
              patch({ qr: { ...current, enabled: !current.enabled } });
            }}
            className={`px-2.5 py-0.5 text-[10px] rounded-full font-medium transition-colors ${
              d.qr?.enabled ? "bg-indigo-600 text-white" : "bg-gray-200 text-gray-500 hover:bg-gray-300"
            }`}>{d.qr?.enabled ? "ON" : "OFF"}</button>
        </div>
        {d.qr?.enabled && (
          <div className="space-y-2 pl-1">
            <div className="flex gap-1.5">
              {(["website", "vcard", "custom"] as const).map((type) => (
                <button key={type} type="button" onClick={() => patch({ qr: { ...d.qr!, content: type } })}
                  className={`px-2 py-0.5 text-[10px] rounded transition-colors ${
                    d.qr!.content === type ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                  }`}>{type}</button>
              ))}
            </div>
            {d.qr!.content === "custom" && (
              <input type="text" value={d.qr!.customText || ""}
                onChange={(e) => patch({ qr: { ...d.qr!, customText: e.target.value } })}
                placeholder="URL or text..."
                className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded-lg outline-none focus:border-indigo-400" />
            )}
            <div className="flex gap-3">
              <div className="flex gap-1">
                {(["small", "medium"] as const).map((s) => (
                  <button key={s} type="button" onClick={() => patch({ qr: { ...d.qr!, size: s } })}
                    className={`px-2 py-0.5 text-[10px] rounded ${
                      d.qr!.size === s ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-500"
                    }`}>{s}</button>
                ))}
              </div>
            </div>
            <div className="flex flex-wrap gap-1">
              {QR_PLACEMENTS.map((p) => (
                <button key={p} type="button" onClick={() => patch({ qr: { ...d.qr!, placement: p } })}
                  className={`px-1.5 py-0.5 text-[9px] rounded transition-colors ${
                    d.qr!.placement === p ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                  }`}>{p}</button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Extra Images */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-1">
            <ImageIcon size={11} /> Images
          </span>
          <label className="px-2.5 py-0.5 text-[10px] rounded-full font-medium bg-gray-100 text-gray-500 hover:bg-gray-200 cursor-pointer">
            + Add
            <input type="file" accept="image/png,image/jpeg,image/svg+xml,image/webp" className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                if (file.size > 2 * 1024 * 1024) { alert("Image must be under 2 MB"); return; }
                const reader = new FileReader();
                reader.onload = () => {
                  const newImg: ExtraImage = { id: crypto.randomUUID(), dataUrl: reader.result as string, placement: "bottom-left", size: "medium" };
                  setCardInfo({ extraImages: [...(cardInfo.extraImages || []), newImg] });
                };
                reader.readAsDataURL(file);
                e.target.value = "";
              }} />
          </label>
        </div>
        {(cardInfo.extraImages || []).map((img, idx) => (
          <div key={img.id} className="flex items-center gap-2 mb-2 p-2 rounded-lg bg-gray-50">
            <img src={img.dataUrl} alt="" className="w-7 h-7 rounded object-contain border border-gray-200" />
            <div className="flex-1 space-y-1">
              <div className="flex gap-1">
                {(["small", "medium", "large"] as const).map((s) => (
                  <button key={s} type="button"
                    onClick={() => { const imgs = [...(cardInfo.extraImages || [])]; imgs[idx] = { ...imgs[idx], size: s }; setCardInfo({ extraImages: imgs }); }}
                    className={`px-1.5 py-0.5 text-[9px] rounded ${img.size === s ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-500"}`}>{s}</button>
                ))}
              </div>
              <div className="flex flex-wrap gap-0.5">
                {QR_PLACEMENTS.map((p) => (
                  <button key={p} type="button"
                    onClick={() => { const imgs = [...(cardInfo.extraImages || [])]; imgs[idx] = { ...imgs[idx], placement: p }; setCardInfo({ extraImages: imgs }); }}
                    className={`px-1 py-0.5 text-[8px] rounded ${img.placement === p ? "bg-indigo-600 text-white" : "bg-gray-50 text-gray-400 hover:bg-gray-200"}`}>{p}</button>
                ))}
              </div>
            </div>
            <button type="button" onClick={() => setCardInfo({ extraImages: (cardInfo.extraImages || []).filter((_, i) => i !== idx) })}
              className="p-1 text-gray-400 hover:text-red-500"><Trash2 size={12} /></button>
          </div>
        ))}
      </div>
    </div>
  );

  const renderBackFaceTab = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Back Face</span>
        <button type="button"
          onClick={() => { if (d.backFace) patch({ backFace: undefined }); else patch({ backFace: defaultBackFace(d) }); }}
          className={`px-3 py-1 text-xs rounded-full font-medium transition-colors ${
            d.backFace ? "bg-indigo-600 text-white" : "bg-gray-200 text-gray-500 hover:bg-gray-300"
          }`}>{d.backFace ? "Enabled" : "Disabled"}</button>
      </div>

      {d.backFace && (
        <>
          {/* Presets */}
          <div>
            <span className="text-[10px] text-gray-400 block mb-1.5">Preset</span>
            <div className="grid grid-cols-3 gap-1.5">
              {BACK_PRESETS.map(({ value, label, desc }) => (
                <button key={value} type="button"
                  onClick={() => patch({ backFace: { ...d.backFace!, preset: value } })}
                  className={`px-2 py-1.5 text-[10px] rounded-lg transition-colors text-left ${
                    d.backFace!.preset === value ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}>
                  <div className="font-medium">{label}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Background */}
          <div className="flex items-center gap-4">
            <div>
              <span className="text-[10px] text-gray-400 block mb-1">Background</span>
              <div className="flex items-center gap-2">
                <input type="color" value={d.backFace!.background}
                  onChange={(e) => patch({ backFace: { ...d.backFace!, background: e.target.value } })}
                  className="w-8 h-8 rounded-lg border border-gray-200 cursor-pointer" />
                <span className="text-[10px] text-gray-500 font-mono">{d.backFace!.background}</span>
              </div>
            </div>
            <div>
              <span className="text-[10px] text-gray-400 block mb-1">Pattern</span>
              <div className="flex gap-1">
                {(["inherit", "none"] as const).map((v) => (
                  <button key={v} type="button"
                    onClick={() => patch({ backFace: { ...d.backFace!, patternId: v } })}
                    className={`px-2.5 py-1 text-[10px] rounded-lg transition-colors ${
                      d.backFace!.patternId === v ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                    }`}>{v}</button>
                ))}
              </div>
            </div>
          </div>

          {/* Show elements */}
          <div>
            <span className="text-[10px] text-gray-400 block mb-1.5">Show on back</span>
            <div className="flex flex-wrap gap-1.5">
              {([
                { key: "showLogo", label: "Logo" },
                { key: "showQr", label: "QR" },
                { key: "showCompany", label: "Company" },
                { key: "showTagline", label: "Tagline" },
                { key: "showWebsite", label: "Website" },
              ] as const).map(({ key, label }) => (
                <button key={key} type="button"
                  onClick={() => patch({ backFace: { ...d.backFace!, [key]: !d.backFace![key] } })}
                  className={`px-2.5 py-1 text-[10px] rounded-lg transition-colors ${
                    d.backFace![key] ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                  }`}>{label}</button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );

  return (
    <div className="w-full max-w-7xl mx-auto flex-1 min-h-0 flex flex-col">
      <div className="flex flex-col lg:flex-row gap-4 flex-1 min-h-0">
        {/* ────────────── Left — Card ────────────── */}
        <div className="flex-1 flex flex-col items-center justify-center min-w-0">
          {/* Action bar */}
          <div className="flex items-center gap-2 mb-3">
            <button type="button"
              onClick={() => setShowBack(!showBack)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                showBack
                  ? "bg-indigo-600 text-white shadow-md"
                  : "bg-white text-gray-600 border border-gray-200 hover:border-gray-300 shadow-sm"
              }`}
            >
              <FlipHorizontal2 size={14} />
              {showBack ? "Viewing Back" : "Flip to Back"}
            </button>

            {/* Download */}
            <div className="relative">
              <button type="button"
                onClick={() => setShowDownloadMenu(!showDownloadMenu)}
                disabled={isDownloading}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold bg-indigo-50 border border-indigo-200 text-indigo-700 hover:bg-indigo-100 hover:border-indigo-300 shadow-sm disabled:opacity-50 transition-colors"
              >
                {isDownloading ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
                Download
              </button>
              {showDownloadMenu && (
                <div className="absolute top-full mt-2 right-0 bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden min-w-[170px] z-50">
                  <button type="button" onClick={downloadPng}
                    className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-indigo-50 hover:text-indigo-700">
                    <FileImage size={15} className="text-green-500" />
                    <div className="text-left">
                      <div className="font-medium">PNG</div>
                      <div className="text-[10px] text-gray-400">High-res image</div>
                    </div>
                  </button>
                  <button type="button" onClick={downloadPdf}
                    className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-indigo-50 hover:text-indigo-700 border-t border-gray-100">
                    <FileText size={15} className="text-red-500" />
                    <div className="text-left">
                      <div className="font-medium">PDF</div>
                      <div className="text-[10px] text-gray-400">Print-ready</div>
                    </div>
                  </button>
                </div>
              )}
            </div>
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
                onSelectElement={(el) => { setSelectedEl(el); setActiveTab("style"); }}
              />
            </div>
            <div className={showBack ? "" : "absolute -left-[9999px] pointer-events-none"}>
              <BusinessCardBack
                ref={backCardRef}
                design={d}
                info={cardInfo}
                size="large"
              />
            </div>
          </div>


          {/* Element toolbar — shows when an element is selected */}
          {selectedEl && curStyle && (
            <div className="mt-3 bg-white rounded-xl shadow-md border border-gray-200 p-3 w-full max-w-md">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-gray-700">
                  <span className="text-indigo-600">{ELEMENT_LABELS[selectedEl]}</span>
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
                    className="w-7 h-7 flex items-center justify-center rounded bg-gray-100 hover:bg-indigo-100 text-gray-600 hover:text-indigo-600">
                    <ArrowUp size={12} />
                  </button>
                  <div className="flex gap-0.5">
                    <button type="button" onClick={() => moveEl(-MOVE_STEP, 0)}
                      className="w-7 h-7 flex items-center justify-center rounded bg-gray-100 hover:bg-indigo-100 text-gray-600 hover:text-indigo-600">
                      <ArrowLeft size={12} />
                    </button>
                    <button type="button" onClick={() => moveEl(MOVE_STEP, 0)}
                      className="w-7 h-7 flex items-center justify-center rounded bg-gray-100 hover:bg-indigo-100 text-gray-600 hover:text-indigo-600">
                      <ArrowRightIcon size={12} />
                    </button>
                  </div>
                  <button type="button" onClick={() => moveEl(0, MOVE_STEP)}
                    className="w-7 h-7 flex items-center justify-center rounded bg-gray-100 hover:bg-indigo-100 text-gray-600 hover:text-indigo-600">
                    <ArrowDown size={12} />
                  </button>
                </div>

                {/* Size + Color */}
                <div className="flex-1 space-y-2">
                  {showFontSize && (
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-gray-400 w-8">Size</span>
                      <button type="button" onClick={() => changeFontSize(-1)}
                        className="w-6 h-6 flex items-center justify-center rounded bg-gray-100 hover:bg-indigo-100 text-gray-600 hover:text-indigo-600">
                        <Minus size={10} />
                      </button>
                      <span className="text-xs font-medium text-gray-700 w-8 text-center tabular-nums">
                        {curStyle.fontSize ?? (selectedEl === "name" ? 24 : selectedEl === "title" ? 14 : 12)}
                      </span>
                      <button type="button" onClick={() => changeFontSize(1)}
                        className="w-6 h-6 flex items-center justify-center rounded bg-gray-100 hover:bg-indigo-100 text-gray-600 hover:text-indigo-600">
                        <Plus size={10} />
                      </button>
                    </div>
                  )}
                  {selectedEl === "logo" && (
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-gray-400 w-8">Size</span>
                      <button type="button" onClick={() => changeLogoSize(-2)}
                        className="w-6 h-6 flex items-center justify-center rounded bg-gray-100 hover:bg-indigo-100 text-gray-600 hover:text-indigo-600">
                        <Minus size={10} />
                      </button>
                      <span className="text-xs font-medium text-gray-700 w-8 text-center tabular-nums">
                        {curStyle.fontSize ?? 36}
                      </span>
                      <button type="button" onClick={() => changeLogoSize(2)}
                        className="w-6 h-6 flex items-center justify-center rounded bg-gray-100 hover:bg-indigo-100 text-gray-600 hover:text-indigo-600">
                        <Plus size={10} />
                      </button>
                    </div>
                  )}
                  {showColorPicker && (
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-gray-400 w-8">Color</span>
                      <input type="color" value={curStyle.color || d.colors.primary}
                        onChange={(e) => setElStyle(selectedEl, { color: e.target.value })}
                        className="w-6 h-6 rounded border border-gray-200 cursor-pointer" />
                      {curStyle.color && (
                        <button type="button" onClick={() => {
                          const { color: _, ...rest } = curStyle;
                          if (Object.keys(rest).length === 0) resetElStyle(selectedEl);
                          else patch({ elementOverrides: { ...(d.elementOverrides ?? {}), [selectedEl]: rest } });
                        }} className="text-[10px] text-gray-400 hover:text-red-500">✕</button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ────────────── Right — Two-Row Panel ────────────── */}
        <div className="w-full lg:w-[340px] shrink-0 min-h-0 flex flex-col gap-3 overflow-hidden">
          {/* Top: Navigation */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 shrink-0">
            <h2 className="text-sm font-bold text-gray-900">Happy with your card?</h2>
            <p className="text-xs text-gray-500 mt-0.5">Download or find a local printer</p>
            <div className="flex items-center justify-between mt-3">
              <button type="button" onClick={() => setStep("designs")}
                className="flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-medium text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors">
                <ArrowLeft size={13} /> Designs
              </button>
              <button type="button" onClick={handleConfirm}
                className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-xs font-semibold
                  bg-gradient-to-r from-green-500 to-emerald-600 text-white
                  hover:from-green-600 hover:to-emerald-700 shadow-lg shadow-green-200 transition-all">
                <MapPin size={14} /> Find Printer
              </button>
            </div>
          </div>

          {/* Bottom: Tabbed Controls */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col min-h-0 flex-1">
            {/* Tabs */}
            <div className="flex border-b border-gray-100 shrink-0">
              {([
                { id: "details", label: "Details" },
                { id: "style", label: "Style" },
                { id: "back-face", label: "Back Face" },
              ] as const).map(({ id, label }) => (
                <button key={id} type="button" onClick={() => setActiveTab(id)}
                  className={`flex-1 px-3 py-2.5 text-xs font-semibold transition-colors ${
                    activeTab === id
                      ? "text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50/50"
                      : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                  }`}>{label}</button>
              ))}
            </div>

            {/* Tab content */}
            <div className="p-4 overflow-y-auto flex-1 min-h-0">
              {activeTab === "details" && renderDetailsTab()}
              {activeTab === "style" && renderStyleTab()}
              {activeTab === "back-face" && renderBackFaceTab()}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
