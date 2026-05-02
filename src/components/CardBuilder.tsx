/**
 * CardBuilder — reusable split-pane card design editor.
 *
 * Usage:
 *   - Standalone on the Predefined page (tab="builder")
 *   - Fullscreen modal via <CardBuilderModal> from DesignPickerStep
 *
 * Props let the parent control what happens when the user finishes:
 *   onDesignReady(design, info) — called when user clicks "Use this design"
 *   initialDesign / initialInfo   — optional seed values
 */

import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { TEMPLATES, COLOR_THEMES } from "@/lib/designs";
import { PATTERNS, getPatternSVG } from "@/lib/patterns";
import { LOGOS, LogoIcon } from "@/lib/logos";
import BusinessCard from "@/components/BusinessCard";
import type {
  CardDesign,
  CardInfo,
  TemplateId,
  PatternPlacement,
  LogoPlacement,
  ColorTheme,
} from "@/lib/types";
import {
  ChevronDown,
  ChevronRight,
  Search,
  Undo2,
  Redo2,
  RotateCcw,
  ZoomIn,
  ZoomOut,
  X,
} from "lucide-react";

/* ── Constants ────────────────────────────────────────────────────── */

const PATTERN_PLACEMENTS: PatternPlacement[] = [
  "full","top","bottom","left","right",
  "top-left","top-right","bottom-left","bottom-right",
  "diagonal-tl","diagonal-br",
];
const LOGO_PLACEMENTS: LogoPlacement[] = [
  "top-left","top-right","top-center",
  "center-left","center","center-right",
  "bottom-left","bottom-right","bottom-center",
];
const FONTS: CardDesign["font"][] = ["sans", "serif", "mono"];
const BORDER_RADII: CardDesign["borderRadius"][] = ["none", "small", "medium", "large"];
const BORDER_SIDES: CardDesign["border"]["sides"][] = ["none", "all", "top", "bottom", "left", "right"];
const LOGO_SIZES: CardDesign["logo"]["size"][] = ["small", "medium", "large"];
const BG_TYPES: CardDesign["backgroundEffect"]["type"][] = ["none", "solid", "gradient"];

const DEFAULT_INFO: CardInfo = {
  name: "James Smith",
  title: "Creative Director",
  company: "Artisan Studio",
  email: "james@artisan.co",
  phone: "(415) 555-0192",
  website: "artisan.co",
  address: "",
  businessDescription: "",
  designExpectations: "",
  tagline: "Design with purpose",
  customLogoUrl: "",
};

const TEMPLATE_CATEGORIES: { label: string; ids: string[] }[] = [
  { label: "Minimal", ids: ["minimal-clean","japanese-minimal","offset-minimal","zen-asymmetric","ribbon-minimal","soft-surface"] },
  { label: "Classic", ids: ["centered-classic","elegant-serif","retro-vintage","inset-elegant","corner-frame"] },
  { label: "Modern", ids: ["modern-left","top-accent","two-tone-split","swiss-grid","two-column-clean","horizontal-stack","right-accent-bar"] },
  { label: "Bold", ids: ["stacked-bold","brutalist","brutalist-grid","bold-accent","stacked-display","top-heavy","wide-band"] },
  { label: "Split", ids: ["split-sidebar","right-sidebar","vertical-split","diagonal-split","diagonal-accent","diagonal-modern","wave-divide"] },
  { label: "Geometric", ids: ["asymmetric-blocks","l-frame","orbit","twin-circles","corner-block","half-moon","stacked-bars","diamond-accent","circle-badge"] },
  { label: "Creative", ids: ["magazine-editorial","editorial-type","floating-name","vertical-text","glyph-mark","oversized-initial","mono-tech","mono-terminal","dark-gradient","three-column","edge-info"] },
];

const MAX_HISTORY = 40;

/* ── Types ────────────────────────────────────────────────────────── */

interface BuilderState {
  templateId: TemplateId;
  themeIdx: number;
  customColors: ColorTheme | null;
  font: CardDesign["font"];
  textAlign: CardDesign["textAlign"];
  spacing: CardDesign["spacing"];
  borderRadius: CardDesign["borderRadius"];
  patternId: string;
  patternOpacity: number;
  patternPlacement: PatternPlacement;
  logoId: string;
  logoPlacement: LogoPlacement;
  logoSize: CardDesign["logo"]["size"];
  borderSides: CardDesign["border"]["sides"];
  borderWidth: number;
  bgType: CardDesign["backgroundEffect"]["type"];
  bgOpacity: number;
  bgAngle: number;
}

const DEFAULT_STATE: BuilderState = {
  templateId: "minimal-clean",
  themeIdx: 0,
  customColors: null,
  font: "sans",
  textAlign: "left",
  spacing: "normal",
  borderRadius: "medium",
  patternId: "none",
  patternOpacity: 0.15,
  patternPlacement: "full",
  logoId: "circle-letter",
  logoPlacement: "top-left",
  logoSize: "medium",
  borderSides: "none",
  borderWidth: 2,
  bgType: "none",
  bgOpacity: 0.04,
  bgAngle: 135,
};

export interface CardBuilderProps {
  /** Called when user clicks "Use this design" */
  onDesignReady?: (design: CardDesign, info: CardInfo) => void;
  /** Seed with an existing design */
  initialDesign?: CardDesign;
  /** Seed with existing card info */
  initialInfo?: CardInfo;
  /** Show the "Use this design" CTA button */
  showCta?: boolean;
  /** CTA button label */
  ctaLabel?: string;
  /** Show close button (for modal usage) */
  onClose?: () => void;
  /** Compact mode hides the header */
  compact?: boolean;
}

/* ── Helpers ──────────────────────────────────────────────────────── */

function designFromState(s: BuilderState, info: CardInfo): CardDesign {
  const theme = s.customColors || COLOR_THEMES[s.themeIdx]?.colors || COLOR_THEMES[0].colors;
  return {
    id: "builder-preview",
    templateId: s.templateId,
    name: "Builder Preview",
    reasoning: "",
    colors: theme,
    font: s.font,
    textAlign: s.textAlign,
    spacing: s.spacing,
    borderRadius: s.borderRadius,
    pattern: { id: s.patternId, opacity: s.patternOpacity, color: theme.accent, placement: s.patternPlacement },
    backgroundEffect: { type: s.bgType, color: theme.accent, opacity: s.bgOpacity, angle: s.bgAngle },
    logo: { id: s.logoId as import("@/lib/logos").LogoId, placement: s.logoPlacement, size: s.logoSize },
    border: { sides: s.borderSides, width: s.borderWidth, color: theme.accent },
  };
}

function stateFromDesign(d: CardDesign): BuilderState {
  const themeIdx = COLOR_THEMES.findIndex(
    (t) => t.colors.background === d.colors.background && t.colors.primary === d.colors.primary
  );
  return {
    templateId: d.templateId,
    themeIdx: themeIdx >= 0 ? themeIdx : 0,
    customColors: themeIdx < 0 ? d.colors : null,
    font: d.font,
    textAlign: d.textAlign || "left",
    spacing: d.spacing || "normal",
    borderRadius: d.borderRadius || "medium",
    patternId: d.pattern?.id || "none",
    patternOpacity: d.pattern?.opacity ?? 0.15,
    patternPlacement: d.pattern?.placement || "full",
    logoId: d.logo?.id || "circle-letter",
    logoPlacement: d.logo?.placement || "top-left",
    logoSize: d.logo?.size || "medium",
    borderSides: d.border?.sides || "none",
    borderWidth: d.border?.width ?? 2,
    bgType: d.backgroundEffect?.type || "none",
    bgOpacity: d.backgroundEffect?.opacity ?? 0.04,
    bgAngle: d.backgroundEffect?.angle ?? 135,
  };
}

/* ── Sub-components ───────────────────────────────────────────────── */

function Accordion({ title, icon, defaultOpen, children }: {
  title: string; icon: string; defaultOpen?: boolean; children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen ?? false);
  return (
    <div className="border-b border-white/[0.06]">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2.5 px-4 py-3 text-left hover:bg-white/[0.03] transition-colors"
      >
        <span className="text-sm">{icon}</span>
        <span className="flex-1 text-[13px] font-semibold text-[#e4e4e3] tracking-tight">{title}</span>
        {open
          ? <ChevronDown size={14} className="text-[#868685]" />
          : <ChevronRight size={14} className="text-[#868685]" />
        }
      </button>
      {open && (
        <div className="px-4 pb-4 space-y-4 animate-fade-in">
          {children}
        </div>
      )}
    </div>
  );
}

function Chips<T extends string>({ options, value, onChange, label, renderLabel }: {
  options: T[]; value: T; onChange: (v: T) => void; label?: string; renderLabel?: (v: T) => string;
}) {
  return (
    <div>
      {label && <label className="text-[10px] font-semibold text-[#868685] uppercase tracking-wider mb-1.5 block">{label}</label>}
      <div className="flex flex-wrap gap-1">
        {options.map((o) => (
          <button key={o} onClick={() => onChange(o)}
            className={`px-2.5 py-1 text-[11px] rounded-md font-medium transition-all ${
              o === value
                ? "bg-[#9fe870] text-[#163300] shadow-sm"
                : "bg-white/[0.06] text-[#a0a09f] hover:bg-white/[0.1] hover:text-[#e4e4e3]"
            }`}
          >{renderLabel ? renderLabel(o) : o}</button>
        ))}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════ */
/*                         MAIN COMPONENT                           */
/* ══════════════════════════════════════════════════════════════════ */

export default function CardBuilder({
  onDesignReady,
  initialDesign,
  initialInfo,
  showCta = false,
  ctaLabel = "Use This Design",
  onClose,
  compact = false,
}: CardBuilderProps) {

  /* ── Core state ──────────────────────────────────────────────── */
  const [state, setStateRaw] = useState<BuilderState>(
    initialDesign ? stateFromDesign(initialDesign) : DEFAULT_STATE
  );
  const info: CardInfo = initialInfo || DEFAULT_INFO;
  const [previewSize, setPreviewSize] = useState<"small" | "medium" | "large">("large");
  const [templateSearch, setTemplateSearch] = useState("");
  const [templateCategory, setTemplateCategory] = useState<string | null>(null);

  /* ── Undo / Redo ─────────────────────────────────────────────── */
  const historyRef = useRef<BuilderState[]>([initialDesign ? stateFromDesign(initialDesign) : DEFAULT_STATE]);
  const historyIdxRef = useRef(0);

  const setState = useCallback((next: BuilderState | ((prev: BuilderState) => BuilderState)) => {
    setStateRaw((prev) => {
      const val = typeof next === "function" ? next(prev) : next;
      // Push to history
      const h = historyRef.current.slice(0, historyIdxRef.current + 1);
      h.push(val);
      if (h.length > MAX_HISTORY) h.shift();
      historyRef.current = h;
      historyIdxRef.current = h.length - 1;
      return val;
    });
  }, []);

  const patch = useCallback((p: Partial<BuilderState>) => {
    setState((prev) => ({ ...prev, ...p }));
  }, [setState]);

  const canUndo = historyIdxRef.current > 0;
  const canRedo = historyIdxRef.current < historyRef.current.length - 1;

  const undo = useCallback(() => {
    if (historyIdxRef.current <= 0) return;
    historyIdxRef.current--;
    setStateRaw(historyRef.current[historyIdxRef.current]);
  }, []);

  const redo = useCallback(() => {
    if (historyIdxRef.current >= historyRef.current.length - 1) return;
    historyIdxRef.current++;
    setStateRaw(historyRef.current[historyIdxRef.current]);
  }, []);

  const reset = useCallback(() => {
    const s = initialDesign ? stateFromDesign(initialDesign) : DEFAULT_STATE;
    setState(s);
  }, [initialDesign, setState]);

  /* Keyboard shortcuts */
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "z") {
        e.preventDefault();
        if (e.shiftKey) redo(); else undo();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [undo, redo]);

  /* ── Derived ─────────────────────────────────────────────────── */
  const theme = state.customColors || COLOR_THEMES[state.themeIdx]?.colors || COLOR_THEMES[0].colors;
  const design = useMemo(() => designFromState(state, info), [state, info]);

  /* ── Template filtering ──────────────────────────────────────── */
  const filteredTemplates = useMemo(() => {
    let list = TEMPLATES;
    if (templateSearch) {
      const q = templateSearch.toLowerCase();
      list = list.filter((t) => t.name.toLowerCase().includes(q) || t.id.includes(q) || t.bestFor.toLowerCase().includes(q));
    }
    if (templateCategory) {
      const cat = TEMPLATE_CATEGORIES.find((c) => c.label === templateCategory);
      if (cat) list = list.filter((t) => cat.ids.includes(t.id));
    }
    return list;
  }, [templateSearch, templateCategory]);

  /* ── Handlers ────────────────────────────────────────────────── */
  const handleCta = () => {
    onDesignReady?.(design, info);
  };

  /* ══════════════════════════════════════════════════════════════ */
  /*                          RENDER                               */
  /* ══════════════════════════════════════════════════════════════ */

  return (
    <div className="flex flex-col h-full bg-[#0e0f0c] overflow-hidden rounded-2xl">

      {/* ── Top bar ────────────────────────────────────────────── */}
      {!compact && (
        <div className="shrink-0 flex items-center justify-between px-4 py-2.5 border-b border-white/[0.06]">
          <div className="flex items-center gap-3">
            <h2 className="text-sm font-bold text-[#fafaf7] tracking-tight">Card Builder</h2>
            <span className="text-[10px] text-[#868685]">
              {TEMPLATES.find((t) => t.id === state.templateId)?.name} · {COLOR_THEMES[state.themeIdx]?.name || "Custom"}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={undo} disabled={!canUndo} title="Undo (Cmd+Z)"
              className="p-1.5 rounded-md text-[#868685] hover:text-[#e4e4e3] hover:bg-white/[0.06] disabled:opacity-30 transition-all">
              <Undo2 size={14} />
            </button>
            <button onClick={redo} disabled={!canRedo} title="Redo (Cmd+Shift+Z)"
              className="p-1.5 rounded-md text-[#868685] hover:text-[#e4e4e3] hover:bg-white/[0.06] disabled:opacity-30 transition-all">
              <Redo2 size={14} />
            </button>
            <button onClick={reset} title="Reset"
              className="p-1.5 rounded-md text-[#868685] hover:text-[#e4e4e3] hover:bg-white/[0.06] transition-all">
              <RotateCcw size={14} />
            </button>
            {onClose && (
              <>
                <div className="w-px h-4 bg-white/[0.08] mx-1" />
                <button onClick={onClose} title="Close"
                  className="p-1.5 rounded-md text-[#868685] hover:text-[#e4e4e3] hover:bg-white/[0.06] transition-all">
                  <X size={14} />
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── Main split pane ────────────────────────────────────── */}
      <div className="flex-1 min-h-0 flex">

        {/* ──── LEFT: Controls sidebar ─────────────────────────── */}
        <div className="w-[320px] shrink-0 overflow-y-auto border-r border-white/[0.06]
          scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">

          {/* 1. LAYOUT */}
          <Accordion title="Layout" icon="📐" defaultOpen>
            {/* Template picker */}
            <div>
              <label className="text-[10px] font-semibold text-[#868685] uppercase tracking-wider mb-1.5 block">
                Template ({filteredTemplates.length})
              </label>
              {/* Search */}
              <div className="relative mb-2">
                <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#666]" />
                <input
                  type="text"
                  value={templateSearch}
                  onChange={(e) => setTemplateSearch(e.target.value)}
                  placeholder="Search templates..."
                  className="w-full pl-7 pr-3 py-1.5 rounded-lg border border-white/[0.08] bg-white/[0.03]
                    text-[11px] text-[#e4e4e3] placeholder:text-[#555]
                    focus:border-[#9fe870]/50 outline-none transition-all"
                />
              </div>
              {/* Category chips */}
              <div className="flex flex-wrap gap-1 mb-2">
                <button
                  onClick={() => setTemplateCategory(null)}
                  className={`px-2 py-0.5 text-[10px] rounded-md font-medium transition-all ${
                    !templateCategory ? "bg-[#9fe870] text-[#163300]" : "bg-white/[0.06] text-[#868685] hover:bg-white/[0.1]"
                  }`}
                >All</button>
                {TEMPLATE_CATEGORIES.map((cat) => (
                  <button key={cat.label}
                    onClick={() => setTemplateCategory(templateCategory === cat.label ? null : cat.label)}
                    className={`px-2 py-0.5 text-[10px] rounded-md font-medium transition-all ${
                      templateCategory === cat.label ? "bg-[#9fe870] text-[#163300]" : "bg-white/[0.06] text-[#868685] hover:bg-white/[0.1]"
                    }`}
                  >{cat.label}</button>
                ))}
              </div>
              {/* Template grid with mini previews */}
              <div className="grid grid-cols-2 gap-1.5 max-h-[240px] overflow-y-auto pr-0.5
                scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                {filteredTemplates.map((t) => {
                  const isActive = t.id === state.templateId;
                  const previewTheme = state.customColors || COLOR_THEMES[state.themeIdx]?.colors || COLOR_THEMES[0].colors;
                  const previewDesign: CardDesign = {
                    ...design,
                    id: `tpl-${t.id}`,
                    templateId: t.id,
                    colors: previewTheme,
                  };
                  return (
                    <button key={t.id}
                      onClick={() => patch({ templateId: t.id })}
                      className={`group relative rounded-lg overflow-hidden border transition-all ${
                        isActive
                          ? "border-[#9fe870] ring-1 ring-[#9fe870]/40"
                          : "border-white/[0.06] hover:border-white/[0.15]"
                      }`}
                      title={`${t.name} — ${t.bestFor}`}
                    >
                      <div className="flex justify-center py-1.5 px-1 bg-white/[0.02]">
                        <div className="transform scale-[0.38] origin-center" style={{ width: 280 * 0.38, height: 160 * 0.38 }}>
                          <div style={{ transform: "scale(0.38)", transformOrigin: "top left", width: 280, height: 160 }}>
                            <BusinessCard design={previewDesign} info={info} size="small" />
                          </div>
                        </div>
                      </div>
                      <div className={`px-2 py-1 text-[9px] font-medium truncate text-center transition-colors ${
                        isActive ? "text-[#9fe870] bg-[#9fe870]/10" : "text-[#a0a09f] group-hover:text-[#e4e4e3]"
                      }`}>{t.name}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Font / Radius */}
            <div className="grid grid-cols-2 gap-3">
              <Chips options={FONTS} value={state.font} onChange={(v) => patch({ font: v })} label="Font" />
              <Chips options={BORDER_RADII} value={state.borderRadius} onChange={(v) => patch({ borderRadius: v })} label="Radius" />
            </div>
          </Accordion>

          {/* 2. COLOR & SURFACE */}
          <Accordion title="Color & Surface" icon="🎨">
            {/* Color themes */}
            <div>
              <label className="text-[10px] font-semibold text-[#868685] uppercase tracking-wider mb-1.5 block">Color Theme</label>
              <div className="grid grid-cols-1 gap-1 max-h-[200px] overflow-y-auto pr-0.5
                scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                {COLOR_THEMES.map((t, i) => {
                  const isActive = !state.customColors && i === state.themeIdx;
                  return (
                    <button key={t.name}
                      onClick={() => patch({ themeIdx: i, customColors: null })}
                      className={`flex items-center gap-2.5 px-2.5 py-2 rounded-lg border transition-all ${
                        isActive
                          ? "border-[#9fe870] bg-[#9fe870]/[0.06]"
                          : "border-white/[0.06] hover:border-white/[0.12] hover:bg-white/[0.02]"
                      }`}
                    >
                      <div className="flex gap-0.5 shrink-0">
                        {Object.values(t.colors).map((c, ci) => (
                          <div key={ci} className="w-4 h-4 rounded-sm border border-white/10" style={{ backgroundColor: c }} />
                        ))}
                      </div>
                      <span className={`text-[11px] font-medium truncate ${isActive ? "text-[#9fe870]" : "text-[#a0a09f]"}`}>
                        {t.name}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Pattern */}
            <div>
              <label className="text-[10px] font-semibold text-[#868685] uppercase tracking-wider mb-1.5 block">Pattern</label>
              <div className="flex flex-wrap gap-1.5">
                {PATTERNS.map((p) => {
                  const isActive = p.id === state.patternId;
                  const preview = p.id !== "none" ? getPatternSVG(p.id, "#ccc", 0.6) : null;
                  return (
                    <button key={p.id}
                      onClick={() => patch({ patternId: p.id })}
                      title={p.name}
                      className={`w-11 h-11 rounded-lg border flex items-center justify-center transition-all ${
                        isActive
                          ? "border-[#9fe870] ring-1 ring-[#9fe870]/40"
                          : "border-white/[0.08] hover:border-white/[0.2]"
                      }`}
                      style={preview ? { backgroundImage: preview, backgroundRepeat: "repeat", backgroundColor: "#1a1a1a" } : { backgroundColor: "#1a1a1a" }}
                    >
                      {p.id === "none" && <span className="text-[#666] text-[10px]">OFF</span>}
                    </button>
                  );
                })}
              </div>
              {state.patternId !== "none" && (
                <div className="mt-3 space-y-2">
                  <div>
                    <label className="text-[10px] text-[#868685] flex justify-between">
                      <span>Opacity</span><span>{state.patternOpacity.toFixed(2)}</span>
                    </label>
                    <input type="range" min="0.02" max="0.3" step="0.01"
                      value={state.patternOpacity}
                      onChange={(e) => patch({ patternOpacity: parseFloat(e.target.value) })}
                      className="w-full h-1 accent-[#9fe870] mt-1" />
                  </div>
                  <Chips options={PATTERN_PLACEMENTS} value={state.patternPlacement}
                    onChange={(v) => patch({ patternPlacement: v })} label="Placement" />
                </div>
              )}
            </div>

            {/* Background Effect */}
            <div>
              <Chips options={BG_TYPES} value={state.bgType}
                onChange={(v) => patch({ bgType: v })} label="Background Effect" />
              {state.bgType !== "none" && (
                <div className="mt-2 space-y-2">
                  <div>
                    <label className="text-[10px] text-[#868685] flex justify-between">
                      <span>Opacity</span><span>{state.bgOpacity.toFixed(2)}</span>
                    </label>
                    <input type="range" min="0.01" max="0.2" step="0.01"
                      value={state.bgOpacity}
                      onChange={(e) => patch({ bgOpacity: parseFloat(e.target.value) })}
                      className="w-full h-1 accent-[#9fe870] mt-1" />
                  </div>
                  {state.bgType === "gradient" && (
                    <div>
                      <label className="text-[10px] text-[#868685] flex justify-between">
                        <span>Angle</span><span>{state.bgAngle}°</span>
                      </label>
                      <input type="range" min="0" max="360" step="15"
                        value={state.bgAngle}
                        onChange={(e) => patch({ bgAngle: parseInt(e.target.value) })}
                        className="w-full h-1 accent-[#9fe870] mt-1" />
                    </div>
                  )}
                </div>
              )}
            </div>
          </Accordion>

          {/* 3. BRANDING */}
          <Accordion title="Branding" icon="✦">
            <div>
              <label className="text-[10px] font-semibold text-[#868685] uppercase tracking-wider mb-1.5 block">Logo Icon</label>
              <div className="flex flex-wrap gap-1.5">
                {LOGOS.map((l) => {
                  const isActive = l.id === state.logoId;
                  return (
                    <button key={l.id}
                      onClick={() => patch({ logoId: l.id })}
                      title={`${l.name} — ${l.bestFor}`}
                      className={`w-10 h-10 rounded-lg border flex items-center justify-center transition-all ${
                        isActive
                          ? "border-[#9fe870] ring-1 ring-[#9fe870]/40 bg-white/[0.06]"
                          : "border-white/[0.08] hover:border-white/[0.2]"
                      }`}
                    >
                      {l.id === "none"
                        ? <span className="text-[#666] text-[10px]">OFF</span>
                        : <LogoIcon logoId={l.id} letter="A" size={24} color="#9fe870" />
                      }
                    </button>
                  );
                })}
              </div>
              {state.logoId !== "none" && (
                <div className="mt-3 flex gap-3">
                  <Chips options={LOGO_SIZES} value={state.logoSize}
                    onChange={(v) => patch({ logoSize: v })} label="Size" />
                  <div>
                    <label className="text-[10px] font-semibold text-[#868685] uppercase tracking-wider mb-1.5 block">Position</label>
                    <select
                      value={state.logoPlacement}
                      onChange={(e) => patch({ logoPlacement: e.target.value as LogoPlacement })}
                      className="text-[11px] border border-white/[0.08] rounded-lg px-2 py-1.5 bg-white/[0.03] text-[#e4e4e3]
                        focus:border-[#9fe870]/50 outline-none"
                    >
                      {LOGO_PLACEMENTS.map((p) => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </div>
                </div>
              )}
            </div>
          </Accordion>

          {/* 4. BORDERS */}
          <Accordion title="Borders" icon="▣">
            <Chips options={BORDER_SIDES} value={state.borderSides}
              onChange={(v) => patch({ borderSides: v })} label="Sides" />
            {state.borderSides !== "none" && (
              <div>
                <label className="text-[10px] text-[#868685] flex justify-between">
                  <span>Width</span><span>{state.borderWidth}px</span>
                </label>
                <input type="range" min="1" max="6" step="1"
                  value={state.borderWidth}
                  onChange={(e) => patch({ borderWidth: parseInt(e.target.value) })}
                  className="w-full h-1 accent-[#9fe870] mt-1" />
              </div>
            )}
          </Accordion>

        </div>

        {/* ──── RIGHT: Preview area ────────────────────────────── */}
        <div className="flex-1 min-h-0 flex flex-col bg-[#141414]">

          {/* Preview toolbar */}
          <div className="shrink-0 flex items-center justify-end px-4 py-2 border-b border-white/[0.06]">
            <div className="flex items-center gap-1">
              <button onClick={() => setPreviewSize("small")} title="Small"
                className={`p-1.5 rounded-md transition-all ${previewSize === "small" ? "bg-white/[0.1] text-[#e4e4e3]" : "text-[#666] hover:text-[#aaa]"}`}>
                <ZoomOut size={13} />
              </button>
              <span className="text-[10px] text-[#666] w-8 text-center">{previewSize[0].toUpperCase()}</span>
              <button onClick={() => setPreviewSize("large")} title="Large"
                className={`p-1.5 rounded-md transition-all ${previewSize === "large" ? "bg-white/[0.1] text-[#e4e4e3]" : "text-[#666] hover:text-[#aaa]"}`}>
                <ZoomIn size={13} />
              </button>
            </div>
          </div>

          {/* Card preview (centered, flex-grow) */}
          <div className="flex-1 min-h-0 flex items-center justify-center p-6 overflow-auto">
            <div className="flex flex-col items-center gap-4">
              <BusinessCard design={design} info={info} size={previewSize} />
              <p className="text-[10px] text-[#555] text-center">
                {TEMPLATES.find((t) => t.id === state.templateId)?.name}
                {" · "}
                {state.customColors ? "Custom" : COLOR_THEMES[state.themeIdx]?.name}
                {" · "}
                {state.font}
              </p>
            </div>
          </div>

          {/* CTA bar */}
          {showCta && onDesignReady && (
            <div className="shrink-0 px-4 py-3 border-t border-white/[0.06] flex justify-end">
              <button
                onClick={handleCta}
                className="px-6 py-2.5 rounded-full bg-[#9fe870] text-[#163300] font-semibold text-sm
                  hover:bg-[#cdffad] hover:scale-[1.02] active:scale-[0.98] transition-all"
              >
                {ctaLabel}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════ */
/*           MODAL WRAPPER — for "I will design myself"             */
/* ══════════════════════════════════════════════════════════════════ */

export function CardBuilderModal({ open, onClose, onDesignReady, initialDesign, initialInfo }: {
  open: boolean;
  onClose: () => void;
  onDesignReady: (design: CardDesign, info: CardInfo) => void;
  initialDesign?: CardDesign;
  initialInfo?: CardInfo;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="w-[95vw] h-[92vh] max-w-[1400px]">
        <CardBuilder
          onDesignReady={(d, i) => { onDesignReady(d, i); onClose(); }}
          onClose={onClose}
          initialDesign={initialDesign}
          initialInfo={initialInfo}
          showCta
          ctaLabel="Use This Design"
        />
      </div>
    </div>
  );
}
