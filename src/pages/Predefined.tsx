
import { useState, useMemo, useEffect } from "react";
import { TEMPLATES, COLOR_THEMES } from "@/lib/designs";
import { PATTERNS, getPatternSVG } from "@/lib/patterns";
import { LOGOS, LogoIcon } from "@/lib/logos";
import { TEMPLATE_CATALOG, type IndustryTag, type StyleTag, type MoodTag, type DensityTag, type CatalogEntry } from "@/lib/template-catalog";
import { getTemplateSpec } from "@/lib/template-specs";
import BusinessCard from "@/components/BusinessCard";
import CardBuilder from "@/components/CardBuilder";
import ElementToolbar from "@/components/ElementToolbar";
import Logo from "@/components/Logo";
import type { CardDesign, CardInfo, TemplateId, PatternPlacement } from "@/lib/types";

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
  customLogoUrl: "/logo.svg",
};

const PATTERN_PLACEMENTS: PatternPlacement[] = ["full", "top", "bottom", "left", "right", "top-left", "top-right", "bottom-left", "bottom-right", "diagonal-tl", "diagonal-br"];

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
                ? "bg-[#0e0f0c] text-[#9fe870]"
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
          <code className="text-[10px] bg-gray-100 px-1.5 py-0.5 rounded text-[#0e0f0c] font-mono truncate">{entry.variant.templateId}</code>
          <span className="text-[10px] text-gray-400 truncate">{entry.variant.name}</span>
        </div>
        <div className="flex flex-wrap gap-1">
          {entry.tags.industry.map((t) => (
            <span key={`i-${t}`} className="px-1.5 py-0.5 text-[9px] rounded-full bg-[#0e0f0c]/8 text-[#0e0f0c] font-medium">{t}</span>
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

/* ── Spec Editor Modal ───────────────────────────────────────────── */
function SpecEditorModal({ templateId, info, onClose }: { templateId: string; info: CardInfo; onClose: () => void }) {
  const originalSpec = getTemplateSpec(templateId);
  const [spec, setSpec] = useState(() => structuredClone(originalSpec!));
  const [selectedElId, setSelectedElId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [viewMode, setViewMode] = useState<"visual" | "json">("visual");
  const [jsonText, setJsonText] = useState(() => JSON.stringify(originalSpec, null, 2));
  const [jsonError, setJsonError] = useState<string | null>(null);

  // Keep JSON text in sync when spec changes in visual mode
  useEffect(() => {
    if (viewMode === "visual") {
      setJsonText(JSON.stringify(spec, null, 2));
    }
  }, [spec, viewMode]);

  // Parse JSON when switching back to visual
  const switchToVisual = () => {
    try {
      const parsed = JSON.parse(jsonText);
      setSpec(parsed);
      setJsonError(null);
      setViewMode("visual");
    } catch (e: unknown) {
      setJsonError((e as Error).message);
    }
  };

  const selectedEl = spec.elements.find((e: { id: string }) => e.id === selectedElId);

  const updateElement = (id: string, partial: Record<string, unknown>) => {
    setSpec((prev: typeof spec) => ({
      ...prev,
      elements: prev.elements.map((el: { id: string }) =>
        el.id === id ? { ...el, ...partial } : el
      ),
    }));
  };

  const handleCopy = () => {
    const text = viewMode === "json" ? jsonText : JSON.stringify(spec, null, 2);
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Build a preview design
  const theme = COLOR_THEMES[0];
  const design: CardDesign = {
    id: `editor-${templateId}`,
    templateId: templateId as TemplateId,
    name: templateId,
    reasoning: "",
    colors: theme.colors,
    font: "sans",
    textAlign: "left",
    spacing: "normal",
    borderRadius: "medium",
    pattern: { id: "none", opacity: 0, color: theme.colors.accent, placement: "full" },
    backgroundEffect: { type: "none", color: theme.colors.accent, opacity: 0, angle: 135 },
    logo: { id: "none", placement: "top-right", size: "medium" },
    border: { sides: "none", width: 0, color: theme.colors.accent },
  };

  // Resolve font size tokens for display
  const resolveFontSize = (fs: unknown): number => {
    if (typeof fs === "number") return fs;
    const map: Record<string, number> = { caption: 8, body: 10, heading: 16, display: 22 };
    return map[fs as string] ?? 12;
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <code className="text-sm font-mono font-semibold text-[#0e0f0c]">{templateId}</code>
            <div className="flex rounded-lg overflow-hidden border border-gray-200">
              <button onClick={() => setViewMode("visual")}
                className={`px-3 py-1 text-xs font-medium ${viewMode === "visual" ? "bg-[#0e0f0c] text-[#9fe870]" : "bg-gray-50 text-gray-600 hover:bg-gray-100"}`}>
                Visual
              </button>
              <button onClick={() => viewMode === "json" ? undefined : setViewMode("json")}
                className={`px-3 py-1 text-xs font-medium ${viewMode === "json" ? "bg-[#0e0f0c] text-[#9fe870]" : "bg-gray-50 text-gray-600 hover:bg-gray-100"}`}>
                JSON
              </button>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handleCopy}
              className="px-3 py-1.5 text-xs rounded-lg bg-[#0e0f0c] text-[#9fe870] hover:bg-[#0e0f0c]/80 transition-colors font-medium">
              {copied ? "Copied!" : `Export ${templateId}.json`}
            </button>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 min-h-0 flex">
          {viewMode === "json" ? (
            /* JSON editor mode */
            <div className="flex-1 min-h-0 flex flex-col">
              {jsonError && (
                <div className="px-3 py-1.5 bg-red-50 text-red-600 text-xs border-b border-red-100 flex items-center justify-between">
                  <span className="truncate">{jsonError}</span>
                  <button onClick={switchToVisual} className="text-xs text-red-700 font-medium ml-2 shrink-0">Fix & switch</button>
                </div>
              )}
              <textarea
                value={jsonText}
                onChange={(e) => { setJsonText(e.target.value); setJsonError(null); }}
                spellCheck={false}
                className="flex-1 w-full p-4 font-mono text-xs leading-relaxed resize-none focus:outline-none bg-gray-50"
              />
              {viewMode === "json" && !jsonError && (
                <div className="px-4 py-2 border-t border-gray-100 bg-gray-50">
                  <button onClick={switchToVisual} className="text-xs text-[#0e0f0c] font-medium hover:underline">
                    ← Apply JSON & switch to Visual
                  </button>
                </div>
              )}
            </div>
          ) : (
            /* Visual editor mode */
            <>
              {/* Left: Card preview (clickable elements) */}
              <div className="flex-1 min-h-0 flex flex-col items-center justify-center p-6 bg-gray-100">
                <div className="mb-3">
                  <BusinessCard
                    design={design}
                    info={info}
                    size="medium"
                    specOverride={spec}
                    editMode
                    selectedElement={selectedElId as never}
                    onSelectElement={(id) => setSelectedElId(id)}
                  />
                </div>
                {/* Toolbar below card */}
                {selectedEl && (
                  <div className="mt-3 w-full max-w-md">
                    <ElementToolbar
                      label={selectedEl.id}
                      x={selectedEl.x}
                      y={selectedEl.y}
                      width={selectedEl.type !== "text" ? selectedEl.width : undefined}
                      height={selectedEl.type !== "text" ? selectedEl.height : undefined}
                      fontSize={selectedEl.type === "text" ? resolveFontSize(selectedEl.fontSize) : undefined}
                      opacity={selectedEl.opacity ?? 1}
                      sizeMode={selectedEl.type === "text" ? "font" : "dimensions"}
                      onMove={(dx, dy) => updateElement(selectedEl.id, { x: selectedEl.x + dx, y: selectedEl.y + dy })}
                      onResize={selectedEl.type === "text" ? (delta) => {
                        const cur = resolveFontSize(selectedEl.fontSize);
                        updateElement(selectedEl.id, { fontSize: Math.max(4, cur + delta) });
                      } : undefined}
                      onResizeDimensions={selectedEl.type !== "text" ? (dw, dh) => {
                        updateElement(selectedEl.id, {
                          width: Math.max(2, (selectedEl.width ?? 0) + dw),
                          height: Math.max(2, (selectedEl.height ?? 0) + dh),
                        });
                      } : undefined}
                      onOpacityChange={(op) => updateElement(selectedEl.id, { opacity: op })}
                      onReset={() => {
                        const orig = originalSpec?.elements.find((e: { id: string }) => e.id === selectedElId);
                        if (orig) updateElement(selectedElId!, orig);
                      }}
                      onClose={() => setSelectedElId(null)}
                    />
                  </div>
                )}
              </div>

              {/* Right: Elements list */}
              <div className="w-[280px] flex-shrink-0 border-l border-gray-200 overflow-y-auto p-3">
                <h3 className="text-xs font-semibold text-gray-600 mb-2">Elements ({spec.elements.length})</h3>
                <div className="space-y-1">
                  {spec.elements.map((el: { id: string; type: string; source?: string; text?: string; shape?: string }) => (
                    <button
                      key={el.id}
                      onClick={() => setSelectedElId(el.id)}
                      className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs transition-colors flex items-center gap-2 ${
                        selectedElId === el.id
                          ? "bg-[#9fe870]/20 text-[#0e0f0c] ring-1 ring-[#9fe870]"
                          : "hover:bg-gray-100 text-gray-700"
                      }`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                        el.type === "text" ? "bg-blue-400" : el.type === "image" ? "bg-green-400" : "bg-gray-400"
                      }`} />
                      <span className="font-mono truncate">{el.id}</span>
                      <span className="text-[10px] text-gray-400 ml-auto shrink-0">
                        {el.type === "text" ? (el.source?.replace("cardInfo.", "") || el.text?.slice(0, 8) || "text") : el.type === "image" ? "img" : el.shape || "shape"}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
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

  // ── Catalog filter state ────────────────────────────────────────
  const [filterIndustry, setFilterIndustry] = useState<IndustryTag[]>([]);
  const [filterStyle, setFilterStyle] = useState<StyleTag[]>([]);
  const [filterMood, setFilterMood] = useState<MoodTag[]>([]);
  const [filterDensity, setFilterDensity] = useState<DensityTag[]>([]);
  const [catalogPage, setCatalogPage] = useState(0);

  // ── Logo position editor state ──────────────────────────────────
  const [editingTemplate, setEditingTemplate] = useState<string | null>(null);

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

  return (
    <div className="min-h-screen bg-white p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center gap-3 mb-2">
          <Logo variant="light" size={32} />
          <span className="text-2xl font-bold text-[#0e0f0c]">Design System Catalog</span>
        </div>
        <p className="text-[#454745] mb-6">Everything the LLM can pick from when designing cards</p>

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
                  ? "bg-white border border-gray-200 border-b-white text-[#0e0f0c]"
                  : "text-gray-500 hover:text-gray-700 hover:bg-gray-100"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* ═══ CARD BUILDER ═══ */}
        {activeTab === "builder" && (
        <section className="mb-16 rounded-xl overflow-hidden" style={{ height: "80vh" }}>
          <CardBuilder />
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
                  className="text-xs text-[#0e0f0c] hover:text-[#0e0f0c] font-medium">Clear all filters</button>
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

        {/* Spec Editor Modal */}
        {editingTemplate && (
          <SpecEditorModal templateId={editingTemplate} info={SAMPLE_INFO} onClose={() => setEditingTemplate(null)} />
        )}

        {/* Templates */}
        <section className="mb-12">
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-xl font-bold text-gray-800">Templates ({TEMPLATES.length})</h2>
          </div>
          <p className="text-sm text-gray-500 mb-4">Click any card to edit its spec JSON</p>
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {TEMPLATES.map((t, i) => {
              const theme = COLOR_THEMES[i % COLOR_THEMES.length];
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
                logo: { id: "none", placement: "top-right", size: "medium" },
                border: { sides: "none", width: 0, color: theme.colors.accent },
              };
              return (
                <div key={t.id} className="flex flex-col items-center gap-2 cursor-pointer group" onClick={() => setEditingTemplate(t.id)}>
                  <div className="group-hover:ring-2 group-hover:ring-[#9fe870] group-hover:ring-offset-1 rounded-lg transition-all">
                    <BusinessCard design={design} info={SAMPLE_INFO} size="small" />
                  </div>
                  <div className="text-center">
                    <code className="text-xs bg-gray-100 px-1.5 py-0.5 rounded text-[#0e0f0c] font-mono">{t.id}</code>
                    <p className="text-xs text-gray-500 mt-0.5">{t.bestFor}</p>
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
                    <code className="text-xs bg-gray-100 px-1.5 py-0.5 rounded text-[#0e0f0c] font-mono">{p.id}</code>
                    <h3 className="font-semibold text-sm text-gray-900 mt-1">{p.name}</h3>
                    <p className="text-xs text-gray-500">{p.description}</p>
                    <p className="text-xs text-[#454745] mt-0.5">Best for: {p.bestFor}</p>
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
                <code className="text-xs bg-gray-100 px-1.5 py-0.5 rounded text-[#0e0f0c] font-mono">{l.id}</code>
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
