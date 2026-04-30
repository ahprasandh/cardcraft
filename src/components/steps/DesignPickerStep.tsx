
import { useState } from "react";
import { useWizardStore } from "@/lib/store";
import { generateColorVariations, generateFallbackDesigns } from "@/lib/designs";
import { recommendDesignsApp4 } from "@/lib/ollama-client";
import BusinessCard from "@/components/BusinessCard";
import {
  ArrowLeft,
  ArrowRight,
  Sparkles,
  Palette,
  Loader2,
} from "lucide-react";
import type { CardDesign } from "@/lib/types";

export default function DesignPickerStep() {
  const {
    designs,
    selectedDesign,
    setSelectedDesign,
    refinedDesigns,
    setRefinedDesigns,
    setStep,
    setDesigns,
    cardInfo,
    setCardInfo,
  } = useWizardStore();

  const [isGenerating, setIsGenerating] = useState(false);
  const [generationSource, setGenerationSource] = useState<"" | "variations" | "ai">("");
  const [showAiInput, setShowAiInput] = useState(false);
  const [aiDesc, setAiDesc] = useState(cardInfo.businessDescription || "");
  const [aiPrefs, setAiPrefs] = useState(cardInfo.designExpectations || "");

  const handleColorVariations = () => {
    if (!selectedDesign) return;
    setIsGenerating(true);
    setGenerationSource("variations");
    setShowAiInput(false);
    setTimeout(() => {
      const variations = generateColorVariations(selectedDesign, 8);
      setRefinedDesigns(variations);
      setIsGenerating(false);
    }, 300);
  };

  const handleAIRedesign = async () => {
    setIsGenerating(true);
    setGenerationSource("ai");

    // Update cardInfo so it persists
    setCardInfo({ businessDescription: aiDesc, designExpectations: aiPrefs });

    try {
      const data = await recommendDesignsApp4(aiDesc, aiPrefs);
      if (data.designs?.length) {
        // Append new designs to existing ones
        setDesigns([...designs, ...data.designs]);
        setRefinedDesigns([]);
      }
    } catch {
      // silently keep existing designs
    }

    setIsGenerating(false);
  };

  const handlePickDesign = (design: CardDesign) => {
    setSelectedDesign(design);
  };

  const displayCards = refinedDesigns.length > 0 ? refinedDesigns : designs;

  return (
    <div className="w-full max-w-6xl mx-auto">
      <div className="text-center mb-6">
        <h2 className="text-3xl font-bold text-gray-900">Pick a design you love</h2>
        <p className="mt-2 text-gray-500">
          Select a design, then tweak it with color variations or AI redesign
        </p>
      </div>

      {/* Action bar — always visible */}
      <div className="mb-6 border-b border-gray-100 pb-6">
        <div className="flex flex-col items-center gap-4">
          <div className="flex flex-wrap items-center justify-center gap-3">
            {/* Color Variations */}
            <button
              onClick={handleColorVariations}
              disabled={isGenerating || !selectedDesign}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl border-2 font-semibold text-sm transition-all ${
                selectedDesign
                  ? "border-purple-200 text-purple-600 bg-purple-50 hover:bg-purple-100"
                  : "border-gray-200 text-gray-400 bg-gray-50 cursor-not-allowed"
              } disabled:opacity-50`}
            >
              {isGenerating && generationSource === "variations" ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Palette size={16} />
              )}
              Color Variations
            </button>

            {/* Ask AI */}
            <button
              onClick={() => setShowAiInput(!showAiInput)}
              disabled={isGenerating}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl border-2 border-indigo-200
                text-indigo-600 font-semibold text-sm bg-indigo-50
                hover:bg-indigo-100 transition-all disabled:opacity-50"
            >
              {isGenerating && generationSource === "ai" ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Sparkles size={16} />
              )}
              Redesign with AI
            </button>

            {/* Back to originals */}
            {refinedDesigns.length > 0 && (
              <button
                onClick={() => setRefinedDesigns([])}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200
                  text-gray-600 text-sm font-medium hover:bg-gray-50 transition-all"
              >
                Show Original Designs
              </button>
            )}
          </div>

          {!selectedDesign && (
            <p className="text-xs text-gray-400">Select a card to enable color variations</p>
          )}

          {/* AI redesign inputs */}
          {showAiInput && (
            <div className="w-full max-w-xl mt-2 space-y-3">
              <div>
                <label className="text-xs font-semibold text-gray-600 mb-1 block">What do you do?</label>
                <textarea
                  value={aiDesc}
                  onChange={(e) => setAiDesc(e.target.value)}
                  placeholder="e.g. Freelance UX designer working with SaaS startups..."
                  rows={2}
                  disabled={isGenerating}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm
                    focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100
                    outline-none transition-all placeholder:text-gray-300 resize-none
                    disabled:opacity-50"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 mb-1 block">Design preferences</label>
                <textarea
                  value={aiPrefs}
                  onChange={(e) => setAiPrefs(e.target.value)}
                  placeholder='e.g. "Darker with gold accents", "More corporate", "Red and bold"'
                  rows={1}
                  disabled={isGenerating}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm
                    focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100
                    outline-none transition-all placeholder:text-gray-300 resize-none
                    disabled:opacity-50"
                />
              </div>
              <button
                onClick={handleAIRedesign}
                disabled={isGenerating}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl
                  bg-indigo-600 text-white font-semibold text-sm
                  hover:bg-indigo-700 transition-colors disabled:opacity-50"
              >
                {isGenerating && generationSource === "ai" ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Sparkles size={16} />
                )}
                Generate New Designs
              </button>
            </div>
          )}
          </div>
        </div>

      {/* Grid label */}
      {refinedDesigns.length > 0 && (
        <h3 className="text-sm font-semibold text-gray-500 mb-4 text-center">
          {generationSource === "ai" ? "✨ AI Redesigns" : "🎨 Color Variations"}
        </h3>
      )}

      {/* Design grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 justify-items-center">
        {isGenerating ? (
          <>
            {/* Inline keyframes for skeleton shimmer */}
            <style>{`
              @keyframes cardShimmer {
                0%   { background-position: 200% 0; }
                100% { background-position: -200% 0; }
              }
            `}</style>
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={`skel-${i}`} className="flex flex-col items-center gap-2">
                <div
                  className="w-[280px] h-[160px] rounded-lg overflow-hidden relative bg-gray-100 shadow-md"
                >
                  {/* Shimmer sweep */}
                  <div
                    className="absolute inset-0 z-10"
                    style={{
                      background:
                        "linear-gradient(90deg, transparent 0%, rgba(99,102,241,0.08) 30%, rgba(99,102,241,0.15) 50%, rgba(99,102,241,0.08) 70%, transparent 100%)",
                      backgroundSize: "200% 100%",
                      animation: `cardShimmer 1.8s ease-in-out infinite`,
                      animationDelay: `${i * 120}ms`,
                    }}
                  />
                  <div className="absolute inset-0 p-5 flex flex-col justify-between">
                    <div className="space-y-2">
                      <div className="h-3.5 w-28 rounded bg-gray-200/80 animate-pulse" style={{ animationDelay: `${i * 120}ms` }} />
                      <div className="h-2 w-16 rounded bg-gray-200/60 animate-pulse" style={{ animationDelay: `${i * 120 + 100}ms` }} />
                      <div className="h-2 w-20 rounded bg-gray-200/50 animate-pulse" style={{ animationDelay: `${i * 120 + 200}ms` }} />
                    </div>
                    <div className="space-y-1.5">
                      <div className="h-1.5 w-32 rounded bg-gray-200/60 animate-pulse" style={{ animationDelay: `${i * 120 + 300}ms` }} />
                      <div className="h-1.5 w-24 rounded bg-gray-200/60 animate-pulse" style={{ animationDelay: `${i * 120 + 400}ms` }} />
                    </div>
                  </div>
                  <div className="absolute top-3 right-3 w-8 h-8 rounded-full bg-gray-200/70 animate-pulse" style={{ animationDelay: `${i * 120 + 150}ms` }} />
                </div>
                <span className="h-3 w-24 rounded bg-gray-200 animate-pulse" />
              </div>
            ))}
          </>
        ) : (
        displayCards.map((design) => (
          <div key={design.id} className="flex flex-col items-center gap-2">
            <BusinessCard
              design={design}
              info={cardInfo}
              size="small"
              selected={selectedDesign?.id === design.id}
              onClick={() => handlePickDesign(design)}
            />
            <div className="flex flex-wrap justify-center gap-1 max-w-[260px]">
              {design.name.split("—").map((segment, i) => {
                const colors = [
                  "bg-slate-100 text-slate-600",
                  "bg-blue-50 text-blue-600",
                  "bg-violet-50 text-violet-600",
                ];
                return (
                  <span
                    key={i}
                    className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${colors[i % colors.length]}`}
                  >
                    {segment.trim()}
                  </span>
                );
              })}
            </div>
            {design.reasoning && (
              <span className="text-[10px] text-indigo-500 text-center max-w-[260px] leading-tight italic">
                {design.reasoning}
              </span>
            )}
          </div>
        ))
        )}
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between mt-10">
        <button
          onClick={() => setStep("info")}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-gray-200 
            text-gray-600 hover:bg-gray-50 transition-colors text-sm font-medium"
        >
          <ArrowLeft size={16} />
          Back
        </button>

        {selectedDesign ? (
          <button
            onClick={() => setStep("refine")}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl
              bg-gradient-to-r from-indigo-500 to-indigo-600
              text-white font-semibold text-sm
              hover:from-indigo-600 hover:to-indigo-700
              shadow-lg shadow-indigo-200 transition-all"
          >
            Preview &amp; Add Details
            <ArrowRight size={16} />
          </button>
        ) : (
          <p className="text-sm text-gray-400">Select a design to continue</p>
        )}
      </div>
    </div>
  );
}
