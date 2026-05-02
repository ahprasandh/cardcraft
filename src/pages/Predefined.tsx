
import { useState, useMemo, useEffect } from "react";
import { TEMPLATES, COLOR_THEMES } from "@/lib/designs";
import { PATTERNS, getPatternSVG } from "@/lib/patterns";
import { LOGOS, LogoIcon } from "@/lib/logos";
import { TEMPLATE_CATALOG, type IndustryTag, type StyleTag, type MoodTag, type DensityTag, type CatalogEntry } from "@/lib/template-catalog";
import BusinessCard from "@/components/BusinessCard";
import CardBuilder from "@/components/CardBuilder";
import Logo from "@/components/Logo";
import type { CardDesign, CardInfo, TemplateId, PatternPlacement, LogoPlacement } from "@/lib/types";

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
              className="text-xs px-3 py-1.5 rounded-lg bg-[#0e0f0c] text-[#9fe870] hover:bg-[#0e0f0c]/80 transition-colors font-medium"
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
                    <code className="text-xs bg-gray-100 px-1.5 py-0.5 rounded text-[#0e0f0c] font-mono">{t.id}</code>
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
                            ? "bg-[#0e0f0c] text-[#9fe870]"
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
