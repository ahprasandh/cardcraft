
import { useState, useMemo, useCallback, useEffect } from "react";
import { TEMPLATES } from "@/lib/designs";
import { PATTERNS, getPatternSVG } from "@/lib/patterns";
import { LOGOS, LogoIcon } from "@/lib/logos";
import { TEMPLATE_CATALOG, type IndustryTag, type StyleTag, type MoodTag, type DensityTag, type CatalogEntry } from "@/lib/template-catalog";
import BusinessCard from "@/components/BusinessCard";
import type { CardDesign, CardInfo, TemplateId, PatternPlacement, LogoPlacement, ColorTheme } from "@/lib/types";

const SAMPLE_INFO: CardInfo = {
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

const COLOR_THEMES: { name: string; colors: ColorTheme }[] = [
  { name: "Navy Gold", colors: { primary: "#1a365d", secondary: "#d4a843", accent: "#d4a843", background: "#ffffff", backgroundAlt: "#1a365d", text: "#4a5568" } },
  { name: "Slate Blue", colors: { primary: "#1e293b", secondary: "#3b82f6", accent: "#3b82f6", background: "#f8fafc", backgroundAlt: "#1e293b", text: "#64748b" } },
  { name: "Forest Green", colors: { primary: "#1b4332", secondary: "#a5d6a7", accent: "#2d6a4f", background: "#ffffff", backgroundAlt: "#1b4332", text: "#4b5563" } },
  { name: "Midnight Teal", colors: { primary: "#ffffff", secondary: "#5eead4", accent: "#14b8a6", background: "#0f172a", backgroundAlt: "#134e4a", text: "#94a3b8" } },
  { name: "Burgundy Cream", colors: { primary: "#7f1d1d", secondary: "#a16207", accent: "#991b1b", background: "#fefce8", backgroundAlt: "#7f1d1d", text: "#57534e" } },
  { name: "Pure Mono", colors: { primary: "#111827", secondary: "#4b5563", accent: "#111827", background: "#ffffff", backgroundAlt: "#f3f4f6", text: "#6b7280" } },
  { name: "Royal Purple", colors: { primary: "#ffffff", secondary: "#c4b5fd", accent: "#8b5cf6", background: "#2e1065", backgroundAlt: "#4c1d95", text: "#a5b4fc" } },
  { name: "Coral Warm", colors: { primary: "#1c1917", secondary: "#f97316", accent: "#ea580c", background: "#fff7ed", backgroundAlt: "#ea580c", text: "#78716c" } },
  { name: "Cool Charcoal", colors: { primary: "#f9fafb", secondary: "#9ca3af", accent: "#6366f1", background: "#1f2937", backgroundAlt: "#111827", text: "#d1d5db" } },
  { name: "Rose Elegant", colors: { primary: "#1c1917", secondary: "#be185d", accent: "#e11d48", background: "#fff1f2", backgroundAlt: "#be185d", text: "#71717a" } },
  { name: "Earth Tone", colors: { primary: "#292524", secondary: "#a16207", accent: "#b45309", background: "#faf5ef", backgroundAlt: "#44403c", text: "#78716c" } },
  { name: "Ocean Deep", colors: { primary: "#ffffff", secondary: "#38bdf8", accent: "#0ea5e9", background: "#0c4a6e", backgroundAlt: "#075985", text: "#bae6fd" } },
  { name: "Sage Minimal", colors: { primary: "#1a2e1a", secondary: "#6b8f6b", accent: "#4a7c4a", background: "#f0f5f0", backgroundAlt: "#d1e7d1", text: "#5c6b5c" } },
  { name: "Sunset Gradient", colors: { primary: "#ffffff", secondary: "#fbbf24", accent: "#f59e0b", background: "#7c2d12", backgroundAlt: "#c2410c", text: "#fed7aa" } },
  { name: "Arctic Clean", colors: { primary: "#0f172a", secondary: "#0284c7", accent: "#0ea5e9", background: "#f0f9ff", backgroundAlt: "#e0f2fe", text: "#475569" } },
];

const PATTERN_PLACEMENTS: PatternPlacement[] = ["full", "top", "bottom", "left", "right", "top-left", "top-right", "bottom-left", "bottom-right", "diagonal-tl", "diagonal-br"];
const LOGO_PLACEMENTS: LogoPlacement[] = ["top-left", "top-right", "top-center", "center-left", "center", "center-right", "bottom-left", "bottom-right", "bottom-center"];
const FONTS: CardDesign["font"][] = ["sans", "serif", "mono"];
const TEXT_ALIGNS: CardDesign["textAlign"][] = ["left", "center", "right"];
const SPACINGS: CardDesign["spacing"][] = ["compact", "normal", "spacious"];
const BORDER_RADII: CardDesign["borderRadius"][] = ["none", "small", "medium", "large"];
const BORDER_SIDES: CardDesign["border"]["sides"][] = ["none", "all", "top", "bottom", "left", "right"];
const LOGO_SIZES: CardDesign["logo"]["size"][] = ["small", "medium", "large"];
const BG_TYPES: CardDesign["backgroundEffect"]["type"][] = ["none", "solid", "gradient"];

const ALL_INDUSTRY_TAGS: IndustryTag[] = [
  "tech", "finance", "legal", "healthcare", "education",
  "food-dining", "creative-agency", "real-estate", "retail",
  "beauty-wellness", "consulting", "nonprofit", "entertainment",
  "photography", "construction",
];
const ALL_STYLE_TAGS: StyleTag[] = ["minimal", "classic", "bold", "elegant", "modern"];
const ALL_MOOD_TAGS: MoodTag[] = ["light", "dark", "warm", "cool"];
const ALL_DENSITY_TAGS: DensityTag[] = ["airy", "balanced", "compact"];
const CATALOG_PAGE_SIZE = 24;

/* ── Tiny reusable toggle button row ─────────────────────────────── */
function Toggle<T extends string>({ options, value, onChange, label }: { options: T[]; value: T; onChange: (v: T) => void; label: string }) {
  return (
    <div>
      <label className="text-xs font-semibold text-gray-600 mb-1 block">{label}</label>
      <div className="flex flex-wrap gap-1">
        {options.map((o) => (
          <button key={o} onClick={() => onChange(o)}
            className={`px-2 py-1 text-xs rounded font-mono transition-colors ${o === value ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
          >{o}</button>
        ))}
      </div>
    </div>
  );
}

/* ── Tag filter row for catalog ──────────────────────────────────── */
function FilterRow<T extends string>({ label, tags, active, onToggle }: { label: string; tags: T[]; active: T[]; onToggle: (t: T) => void }) {
  return (
    <div>
      <label className="text-xs font-semibold text-gray-600 mb-1 block">{label}</label>
      <div className="flex flex-wrap gap-1.5">
        {tags.map((t) => (
          <button key={t} onClick={() => onToggle(t)}
            className={`px-2.5 py-1 text-xs rounded-full font-medium transition-colors ${
              active.includes(t)
                ? "bg-indigo-600 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >{t}</button>
        ))}
      </div>
    </div>
  );
}

/* ── Single catalog card with tag badges ─────────────────────────── */
function CatalogCard({ entry, info }: { entry: CatalogEntry; info: CardInfo }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
      <div className="p-3 flex justify-center bg-gray-50">
        <BusinessCard design={entry.variant} info={info} size="small" />
      </div>
      <div className="p-3 space-y-2">
        <div className="flex items-center gap-1.5">
          <code className="text-[10px] bg-gray-100 px-1.5 py-0.5 rounded text-indigo-600 font-mono truncate">{entry.variant.templateId}</code>
          <span className="text-[10px] text-gray-400 truncate">{entry.variant.name}</span>
        </div>
        <div className="flex flex-wrap gap-1">
          {entry.tags.industry.map((t) => (
            <span key={`i-${t}`} className="px-1.5 py-0.5 text-[9px] rounded-full bg-blue-50 text-blue-700 font-medium">{t}</span>
          ))}
          {entry.tags.style.map((t) => (
            <span key={`s-${t}`} className="px-1.5 py-0.5 text-[9px] rounded-full bg-purple-50 text-purple-700 font-medium">{t}</span>
          ))}
          {[...new Set(entry.tags.mood)].map((t) => (
            <span key={`m-${t}`} className="px-1.5 py-0.5 text-[9px] rounded-full bg-amber-50 text-amber-700 font-medium">{t}</span>
          ))}
          {entry.tags.density.map((t) => (
            <span key={`d-${t}`} className="px-1.5 py-0.5 text-[9px] rounded-full bg-green-50 text-green-700 font-medium">{t}</span>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════ */

export default function PredefinedPage() {
  // ── Tab routing from hash ───────────────────────────────────────
  type Tab = "builder" | "catalog" | "reference";
  const getTab = (): Tab => {
    const hash = window.location.hash;
    if (hash.includes("/catalog")) return "catalog";
    if (hash.includes("/reference")) return "reference";
    return "builder";
  };
  const [activeTab, setActiveTab] = useState<Tab>(getTab);

  useEffect(() => {
    const onHash = () => setActiveTab(getTab());
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  const navigate = (tab: Tab) => {
    window.location.hash = tab === "builder" ? "/predefined" : `/predefined/${tab}`;
  };

  // ── Builder state ───────────────────────────────────────────────
  const [templateId, setTemplateId] = useState<TemplateId>("minimal-clean");
  const [themeIdx, setThemeIdx] = useState(0);
  const [font, setFont] = useState<CardDesign["font"]>("sans");
  const [textAlign, setTextAlign] = useState<CardDesign["textAlign"]>("left");
  const [spacing, setSpacing] = useState<CardDesign["spacing"]>("normal");
  const [borderRadius, setBorderRadius] = useState<CardDesign["borderRadius"]>("medium");
  const [patternId, setPatternId] = useState("none");
  const [patternOpacity, setPatternOpacity] = useState(0.15);
  const [patternPlacement, setPatternPlacement] = useState<PatternPlacement>("full");
  const [logoId, setLogoId] = useState("circle-letter");
  const [logoPlacement, setLogoPlacement] = useState<LogoPlacement>("top-left");
  const [logoSize, setLogoSize] = useState<CardDesign["logo"]["size"]>("medium");
  const [borderSides, setBorderSides] = useState<CardDesign["border"]["sides"]>("none");
  const [borderWidth, setBorderWidth] = useState(2);
  const [bgType, setBgType] = useState<CardDesign["backgroundEffect"]["type"]>("none");
  const [bgOpacity, setBgOpacity] = useState(0.04);
  const [bgAngle, setBgAngle] = useState(135);
  const [showJson, setShowJson] = useState(false);
  const [copied, setCopied] = useState(false);

  // ── Catalog filter state ────────────────────────────────────────
  const [filterIndustry, setFilterIndustry] = useState<IndustryTag[]>([]);
  const [filterStyle, setFilterStyle] = useState<StyleTag[]>([]);
  const [filterMood, setFilterMood] = useState<MoodTag[]>([]);
  const [filterDensity, setFilterDensity] = useState<DensityTag[]>([]);
  const [catalogPage, setCatalogPage] = useState(0);

  // ── Logo position editor state ──────────────────────────────────
  const ALL_LOGO_PLACEMENTS: LogoPlacement[] = ["top-left", "top-right", "top-center", "center-left", "center", "center-right", "bottom-left", "bottom-right", "bottom-center"];
  const [logoPositions, setLogoPositions] = useState<Record<string, string>>({});
  useEffect(() => {
    try {
      const saved = localStorage.getItem("bcard-logo-positions");
      if (saved) setLogoPositions(JSON.parse(saved));
    } catch { /* ignore */ }
  }, []);

  const filteredCatalog = useMemo(() => {
    return TEMPLATE_CATALOG.filter((entry) => {
      if (filterIndustry.length && !filterIndustry.some((t) => entry.tags.industry.includes(t))) return false;
      if (filterStyle.length && !filterStyle.some((t) => entry.tags.style.includes(t))) return false;
      if (filterMood.length && !filterMood.some((t) => entry.tags.mood.includes(t))) return false;
      if (filterDensity.length && !filterDensity.some((t) => entry.tags.density.includes(t))) return false;
      return true;
    });
  }, [filterIndustry, filterStyle, filterMood, filterDensity]);

  const catalogTotalPages = Math.ceil(filteredCatalog.length / CATALOG_PAGE_SIZE);
  const catalogSlice = filteredCatalog.slice(catalogPage * CATALOG_PAGE_SIZE, (catalogPage + 1) * CATALOG_PAGE_SIZE);

  function toggleTag<T extends string>(arr: T[], tag: T, setter: (v: T[]) => void) {
    setter(arr.includes(tag) ? arr.filter((t) => t !== tag) : [...arr, tag]);
    setCatalogPage(0);
  }

  const theme = COLOR_THEMES[themeIdx];

  const builderDesign: CardDesign = {
    id: "builder-preview",
    templateId,
    name: "Builder Preview",
    reasoning: "",
    colors: theme.colors,
    font,
    textAlign,
    spacing,
    borderRadius,
    pattern: { id: patternId, opacity: patternOpacity, color: theme.colors.accent, placement: patternPlacement },
    backgroundEffect: { type: bgType, color: theme.colors.accent, opacity: bgOpacity, angle: bgAngle },
    logo: { id: logoId, placement: logoPlacement, size: logoSize },
    border: { sides: borderSides, width: borderWidth, color: theme.colors.accent },
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Design System Catalog</h1>
        <p className="text-gray-500 mb-6">Everything the LLM can pick from when designing cards</p>

        {/* Tab bar */}
        <div className="flex gap-1 mb-8 border-b border-gray-200">
          {([
            { id: "builder" as Tab, label: "Card Builder" },
            { id: "catalog" as Tab, label: "Template Catalog" },
            { id: "reference" as Tab, label: "Reference Catalog" },
          ]).map((tab) => (
            <button
              key={tab.id}
              onClick={() => navigate(tab.id)}
              className={`px-5 py-2.5 text-sm font-medium rounded-t-lg transition-colors -mb-px ${
                activeTab === tab.id
                  ? "bg-white border border-gray-200 border-b-white text-indigo-600"
                  : "text-gray-500 hover:text-gray-700 hover:bg-gray-100"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* ═══ CARD BUILDER ═══ */}
        {activeTab === "builder" && (
        <section className="mb-16 bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="bg-indigo-600 px-6 py-3">
            <h2 className="text-lg font-bold text-white">Card Builder</h2>
            <p className="text-indigo-200 text-sm">Pick every property and see it live</p>
          </div>

          <div className="flex flex-col lg:flex-row">
            {/* Controls */}
            <div className="flex-1 p-6 space-y-5 overflow-y-auto max-h-[80vh] border-r border-gray-100">

              {/* Template */}
              <div>
                <label className="text-xs font-semibold text-gray-600 mb-1 block">Template</label>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-1 max-h-40 overflow-y-auto pr-1">
                  {TEMPLATES.map((t) => (
                    <button key={t.id} onClick={() => setTemplateId(t.id)}
                      className={`px-2 py-1.5 text-[10px] rounded text-left truncate transition-colors ${t.id === templateId ? "bg-indigo-600 text-white" : "bg-gray-50 text-gray-700 hover:bg-gray-100"}`}
                      title={t.description}
                    >{t.name}</button>
                  ))}
                </div>
              </div>

              {/* Color Theme */}
              <div>
                <label className="text-xs font-semibold text-gray-600 mb-1 block">Color Theme</label>
                <div className="flex flex-wrap gap-1.5">
                  {COLOR_THEMES.map((t, i) => (
                    <button key={t.name} onClick={() => setThemeIdx(i)} title={t.name}
                      className={`w-8 h-8 rounded-full border-2 transition-all flex items-center justify-center ${i === themeIdx ? "border-indigo-500 scale-110" : "border-transparent hover:border-gray-300"}`}
                    >
                      <div className="w-6 h-6 rounded-full overflow-hidden flex">
                        <div className="flex-1" style={{ backgroundColor: t.colors.background }} />
                        <div className="flex-1" style={{ backgroundColor: t.colors.backgroundAlt }} />
                      </div>
                    </button>
                  ))}
                </div>
                <p className="text-[10px] text-gray-400 mt-1">{theme.name}</p>
              </div>

              {/* Font / Align / Spacing / Border Radius row */}
              <div className="grid grid-cols-2 gap-4">
                <Toggle options={FONTS} value={font} onChange={setFont} label="Font" />
                <Toggle options={TEXT_ALIGNS} value={textAlign} onChange={setTextAlign} label="Text Align" />
                <Toggle options={SPACINGS} value={spacing} onChange={setSpacing} label="Spacing" />
                <Toggle options={BORDER_RADII} value={borderRadius} onChange={setBorderRadius} label="Border Radius" />
              </div>

              {/* Pattern */}
              <div>
                <label className="text-xs font-semibold text-gray-600 mb-1 block">Pattern</label>
                <div className="flex flex-wrap gap-1">
                  {PATTERNS.map((p) => {
                    const preview = p.id !== "none" ? getPatternSVG(p.id, "#333", 0.5) : null;
                    return (
                      <button key={p.id} onClick={() => setPatternId(p.id)} title={p.name}
                        className={`w-10 h-10 rounded border text-[9px] transition-all ${p.id === patternId ? "border-indigo-500 ring-2 ring-indigo-300" : "border-gray-200 hover:border-gray-400"}`}
                        style={preview ? { backgroundImage: preview, backgroundRepeat: "repeat", backgroundColor: "#f5f5f5" } : { backgroundColor: "#fff" }}
                      >{p.id === "none" ? "∅" : ""}</button>
                    );
                  })}
                </div>
                {patternId !== "none" && (
                  <div className="flex gap-4 mt-2 items-end">
                    <div className="flex-1">
                      <label className="text-[10px] text-gray-500">Opacity: {patternOpacity.toFixed(2)}</label>
                      <input type="range" min="0.02" max="0.3" step="0.01" value={patternOpacity}
                        onChange={(e) => setPatternOpacity(parseFloat(e.target.value))}
                        className="w-full h-1.5 accent-indigo-600" />
                    </div>
                    <div>
                      <label className="text-[10px] text-gray-500 block">Placement</label>
                      <select value={patternPlacement} onChange={(e) => setPatternPlacement(e.target.value as PatternPlacement)}
                        className="text-xs border rounded px-1.5 py-1 bg-white">
                        {PATTERN_PLACEMENTS.map((p) => <option key={p} value={p}>{p}</option>)}
                      </select>
                    </div>
                  </div>
                )}
              </div>

              {/* Logo */}
              <div>
                <label className="text-xs font-semibold text-gray-600 mb-1 block">Logo</label>
                <div className="flex flex-wrap gap-1.5">
                  {LOGOS.map((l) => (
                    <button key={l.id} onClick={() => setLogoId(l.id)} title={l.name}
                      className={`w-10 h-10 rounded border flex items-center justify-center transition-all ${l.id === logoId ? "border-indigo-500 ring-2 ring-indigo-300" : "border-gray-200 hover:border-gray-400"}`}
                    >
                      {l.id === "none"
                        ? <span className="text-gray-400 text-xs">∅</span>
                        : <LogoIcon logoId={l.id} letter="A" size={24} color="#4f46e5" />
                      }
                    </button>
                  ))}
                </div>
                {logoId !== "none" && (
                  <div className="flex gap-4 mt-2">
                    <Toggle options={LOGO_SIZES} value={logoSize} onChange={setLogoSize} label="Size" />
                    <div>
                      <label className="text-[10px] text-gray-500 block mb-1">Placement</label>
                      <select value={logoPlacement} onChange={(e) => setLogoPlacement(e.target.value as LogoPlacement)}
                        className="text-xs border rounded px-1.5 py-1 bg-white">
                        {LOGO_PLACEMENTS.map((p) => <option key={p} value={p}>{p}</option>)}
                      </select>
                    </div>
                  </div>
                )}
              </div>

              {/* Border */}
              <div>
                <label className="text-xs font-semibold text-gray-600 mb-1 block">Border</label>
                <div className="flex gap-4 items-end">
                  <Toggle options={BORDER_SIDES} value={borderSides} onChange={setBorderSides} label="Sides" />
                  {borderSides !== "none" && (
                    <div className="flex-1">
                      <label className="text-[10px] text-gray-500">Width: {borderWidth}px</label>
                      <input type="range" min="1" max="6" step="1" value={borderWidth}
                        onChange={(e) => setBorderWidth(parseInt(e.target.value))}
                        className="w-full h-1.5 accent-indigo-600" />
                    </div>
                  )}
                </div>
              </div>

              {/* Background Effect */}
              <div>
                <Toggle options={BG_TYPES} value={bgType} onChange={setBgType} label="Background Effect" />
                {bgType !== "none" && (
                  <div className="flex gap-4 mt-2">
                    <div className="flex-1">
                      <label className="text-[10px] text-gray-500">Opacity: {bgOpacity.toFixed(2)}</label>
                      <input type="range" min="0.01" max="0.2" step="0.01" value={bgOpacity}
                        onChange={(e) => setBgOpacity(parseFloat(e.target.value))}
                        className="w-full h-1.5 accent-indigo-600" />
                    </div>
                    {bgType === "gradient" && (
                      <div className="flex-1">
                        <label className="text-[10px] text-gray-500">Angle: {bgAngle}°</label>
                        <input type="range" min="0" max="360" step="15" value={bgAngle}
                          onChange={(e) => setBgAngle(parseInt(e.target.value))}
                          className="w-full h-1.5 accent-indigo-600" />
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Live preview (sticky) */}
            <div className="lg:w-[440px] p-6 flex flex-col items-center bg-gray-50 lg:sticky lg:top-0 lg:self-start">
              <BusinessCard design={builderDesign} info={SAMPLE_INFO} size="large" />
              <p className="text-xs text-gray-400 mt-4 text-center">
                {TEMPLATES.find((t) => t.id === templateId)?.name} · {theme.name} · {font}
              </p>

              <div className="flex gap-2 mt-4">
                <button onClick={() => setShowJson((v) => !v)}
                  className="px-3 py-1.5 text-xs font-medium rounded bg-gray-200 text-gray-700 hover:bg-gray-300 transition-colors">
                  {showJson ? "Hide JSON" : "Show JSON"}
                </button>
                <button onClick={() => {
                  navigator.clipboard.writeText(JSON.stringify(builderDesign, null, 2));
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                }}
                  className="px-3 py-1.5 text-xs font-medium rounded bg-indigo-600 text-white hover:bg-indigo-700 transition-colors">
                  {copied ? "Copied!" : "Copy JSON"}
                </button>
              </div>

              {showJson && (
                <pre className="mt-3 w-full max-h-64 overflow-auto bg-gray-900 text-green-400 text-[10px] leading-tight p-3 rounded-lg font-mono">
                  {JSON.stringify(builderDesign, null, 2)}
                </pre>
              )}
            </div>
          </div>
        </section>
        )}

        {/* ═══ 1000-VARIANT CATALOG BROWSER ═══ */}
        {activeTab === "catalog" && (
        <section className="mb-16">
          <h2 className="text-2xl font-bold text-gray-900 mb-1">Template Catalog ({TEMPLATE_CATALOG.length} variants)</h2>
          <p className="text-gray-500 text-sm mb-5">40 layouts × 5 palettes × 5 styles — filter by tags to browse</p>

          {/* Tag filters */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6 space-y-3">
            <FilterRow label="Industry" tags={ALL_INDUSTRY_TAGS} active={filterIndustry}
              onToggle={(t: IndustryTag) => toggleTag(filterIndustry, t, setFilterIndustry)} />
            <FilterRow label="Style" tags={ALL_STYLE_TAGS} active={filterStyle}
              onToggle={(t: StyleTag) => toggleTag(filterStyle, t, setFilterStyle)} />
            <FilterRow label="Mood" tags={ALL_MOOD_TAGS} active={filterMood}
              onToggle={(t: MoodTag) => toggleTag(filterMood, t, setFilterMood)} />
            <FilterRow label="Density" tags={ALL_DENSITY_TAGS} active={filterDensity}
              onToggle={(t: DensityTag) => toggleTag(filterDensity, t, setFilterDensity)} />

            <div className="flex items-center justify-between pt-2 border-t border-gray-100">
              <span className="text-sm text-gray-600">
                Showing <strong>{filteredCatalog.length}</strong> of {TEMPLATE_CATALOG.length} variants
              </span>
              {(filterIndustry.length + filterStyle.length + filterMood.length + filterDensity.length > 0) && (
                <button onClick={() => { setFilterIndustry([]); setFilterStyle([]); setFilterMood([]); setFilterDensity([]); setCatalogPage(0); }}
                  className="text-xs text-indigo-600 hover:text-indigo-800 font-medium">Clear all filters</button>
              )}
            </div>
          </div>

          {/* Card grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {catalogSlice.map((entry) => (
              <CatalogCard key={entry.variant.id} entry={entry} info={SAMPLE_INFO} />
            ))}
          </div>

          {/* Pagination */}
          {catalogTotalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-6">
              <button onClick={() => setCatalogPage((p) => Math.max(0, p - 1))} disabled={catalogPage === 0}
                className="px-3 py-1.5 text-sm rounded border border-gray-300 disabled:opacity-40 hover:bg-gray-50">← Prev</button>
              <span className="text-sm text-gray-600">Page {catalogPage + 1} of {catalogTotalPages}</span>
              <button onClick={() => setCatalogPage((p) => Math.min(catalogTotalPages - 1, p + 1))} disabled={catalogPage >= catalogTotalPages - 1}
                className="px-3 py-1.5 text-sm rounded border border-gray-300 disabled:opacity-40 hover:bg-gray-50">Next →</button>
            </div>
          )}
        </section>
        )}

        {/* ═══ CATALOG (reference) ═══ */}
        {activeTab === "reference" && (<>
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Reference Catalog</h2>

        {/* Templates */}
        <section className="mb-12">
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-xl font-bold text-gray-800">Templates ({TEMPLATES.length})</h2>
            <button
              onClick={() => {
                const map: Record<string, string[]> = {};
                TEMPLATES.forEach((t) => {
                  map[t.id] = logoPositions[t.id] ? [logoPositions[t.id]] : ["top-right"];
                });
                const code = TEMPLATES.map((t) => {
                  const pos = logoPositions[t.id] || "top-right";
                  return `  "${t.id}": ["${pos}"],`;
                }).join("\n");
                navigator.clipboard.writeText(`{\n${code}\n}`);
                alert("Copied safeLogoPositions map to clipboard!");
              }}
              className="text-xs px-3 py-1.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-colors font-medium"
            >
              Export Logo Positions
            </button>
          </div>
          <p className="text-sm text-gray-500 mb-4">Click logo position buttons to adjust. Changes saved to localStorage.</p>
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {TEMPLATES.map((t, i) => {
              const theme = COLOR_THEMES[i % COLOR_THEMES.length];
              const currentPlacement = (logoPositions[t.id] || "top-right") as LogoPlacement;
              const design: CardDesign = {
                id: `preview-${t.id}`,
                templateId: t.id as TemplateId,
                name: `${t.name} · ${theme.name}`,
                reasoning: t.description,
                colors: theme.colors,
                font: (["sans", "serif", "mono"] as const)[i % 3],
                textAlign: "left",
                spacing: "normal",
                borderRadius: "medium",
                pattern: { id: "none", opacity: 0.07, color: theme.colors.accent, placement: "full" },
                backgroundEffect: { type: "none", color: theme.colors.accent, opacity: 0.04, angle: 135 },
                logo: { id: "circle-letter", placement: currentPlacement, size: "medium" },
                border: { sides: "none", width: 0, color: theme.colors.accent },
              };
              return (
                <div key={t.id} className="flex flex-col items-center gap-2">
                  <BusinessCard design={design} info={SAMPLE_INFO} size="small" />
                  <div className="text-center">
                    <code className="text-xs bg-gray-100 px-1.5 py-0.5 rounded text-indigo-600 font-mono">{t.id}</code>
                    <p className="text-xs text-gray-500 mt-0.5">{t.bestFor}</p>
                  </div>
                  <div className="flex flex-wrap justify-center gap-1">
                    {ALL_LOGO_PLACEMENTS.map((pos) => (
                      <button
                        key={pos}
                        onClick={() => setLogoPositions((prev) => {
                          const next = { ...prev, [t.id]: pos };
                          localStorage.setItem("bcard-logo-positions", JSON.stringify(next));
                          return next;
                        })}
                        className={`text-[9px] px-1.5 py-0.5 rounded transition-colors ${
                          currentPlacement === pos
                            ? "bg-indigo-600 text-white"
                            : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                        }`}
                      >
                        {pos}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Color Themes */}
        <section className="mb-12">
          <h2 className="text-xl font-bold text-gray-800 mb-1">Color Themes ({COLOR_THEMES.length})</h2>
          <p className="text-sm text-gray-500 mb-4">Fallback palettes — LLM generates custom hex colors</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
            {COLOR_THEMES.map((t) => (
              <div key={t.name} className="bg-white rounded-lg border border-gray-200 p-3">
                <h3 className="font-semibold text-sm text-gray-900 mb-2">{t.name}</h3>
                <div className="flex gap-1 mb-2">
                  {Object.entries(t.colors).map(([key, val]) => (
                    <div key={key} className="flex-1 flex flex-col items-center">
                      <div
                        className="w-full h-8 rounded border border-gray-200"
                        style={{ backgroundColor: val }}
                        title={`${key}: ${val}`}
                      />
                      <span className="text-[9px] text-gray-400 mt-0.5">{key.replace("background", "bg").replace("Alt", "Alt")}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Patterns */}
        <section className="mb-12">
          <h2 className="text-xl font-bold text-gray-800 mb-1">Background Patterns ({PATTERNS.length})</h2>
          <p className="text-sm text-gray-500 mb-4">SVG overlays — LLM picks id, opacity, color, and placement</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
            {PATTERNS.filter((p) => p.id !== "none").map((p) => {
              const patternUrl = getPatternSVG(p.id, "#1e3a5f", 0.6);
              return (
                <div key={p.id} className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                  <div
                    className="h-24 border-b border-gray-100"
                    style={patternUrl ? {
                      backgroundImage: patternUrl,
                      backgroundRepeat: "repeat",
                      backgroundColor: "#f0f4f8",
                    } : { backgroundColor: "#f0f4f8" }}
                  />
                  <div className="p-3">
                    <code className="text-xs bg-gray-100 px-1.5 py-0.5 rounded text-indigo-600 font-mono">{p.id}</code>
                    <h3 className="font-semibold text-sm text-gray-900 mt-1">{p.name}</h3>
                    <p className="text-xs text-gray-500">{p.description}</p>
                    <p className="text-xs text-indigo-500 mt-0.5">Best for: {p.bestFor}</p>
                  </div>
                </div>
              );
            })}
          </div>

          <h3 className="text-sm font-semibold text-gray-700 mt-6 mb-2">Pattern Placements ({PATTERN_PLACEMENTS.length})</h3>
          <div className="flex flex-wrap gap-2">
            {PATTERN_PLACEMENTS.map((p) => (
              <span key={p} className="text-xs bg-gray-100 px-2 py-1 rounded font-mono text-gray-700">{p}</span>
            ))}
          </div>
        </section>

        {/* Logos */}
        <section className="mb-12">
          <h2 className="text-xl font-bold text-gray-800 mb-1">Logo Icons ({LOGOS.length})</h2>
          <p className="text-sm text-gray-500 mb-4">SVG icons — LLM picks id, placement, and size</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
            {LOGOS.filter((l) => l.id !== "none").map((l) => (
              <div key={l.id} className="bg-white rounded-lg border border-gray-200 p-3 flex flex-col items-center">
                <div className="mb-2">
                  <LogoIcon logoId={l.id} letter="A" size={48} color="#3b82f6" />
                </div>
                <code className="text-xs bg-gray-100 px-1.5 py-0.5 rounded text-indigo-600 font-mono">{l.id}</code>
                <h3 className="font-semibold text-xs text-gray-900 mt-1 text-center">{l.name}</h3>
                <p className="text-[10px] text-gray-500 text-center mt-0.5">{l.bestFor}</p>
              </div>
            ))}
          </div>
        </section>
        </>)}
      </div>
    </div>
  );
}
