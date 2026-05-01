
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
    isLoading,
  } = useWizardStore();

  const [isGenerating, setIsGenerating] = useState(false);
  const [generationSource, setGenerationSource] = useState<"" | "variations" | "ai">("");
  const [aiDesc, setAiDesc] = useState(cardInfo.businessDescription || "");
  const [aiPrefs, setAiPrefs] = useState(cardInfo.designExpectations || "");
  const [showRedesign, setShowRedesign] = useState(false);

  const handleColorVariations = () => {
    if (!selectedDesign) return;
    setIsGenerating(true);
    setGenerationSource("variations");
    setTimeout(() => {
      const variations = generateColorVariations(selectedDesign, 8);
      setRefinedDesigns(variations);
      setIsGenerating(false);
    }, 300);
  };

  const handleAIRedesign = async () => {
    setIsGenerating(true);
    setGenerationSource("ai");
    setCardInfo({ businessDescription: aiDesc, designExpectations: aiPrefs });

    try {
      const data = await recommendDesignsApp4(aiDesc, aiPrefs);
      if (data.designs?.length) {
        setDesigns([...data.designs, ...designs]);
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
    <div className="w-full flex-1 min-h-0 flex flex-col">
      {/* Two-column layout */}
      <div className="flex-1 min-h-0 flex gap-6">

        {/* Left panel — card grid */}
        <div className="flex-1 min-h-0 flex flex-col">
          {refinedDesigns.length > 0 && (
            <h3 className="shrink-0 text-xs font-semibold text-gray-500 mb-2">
              {generationSource === "ai" ? "✨ AI Redesigns" : "🎨 Color Variations"}
            </h3>
          )}

          <div className="flex-1 min-h-0 overflow-y-auto rounded-xl">
            <div className="grid grid-cols-3 gap-x-3 gap-y-8 justify-items-center pt-3 pb-2">
              {(isGenerating || isLoading) ? (
                <>
                  <style>{`
                    @keyframes cardShimmer {
                      0%   { background-position: 200% 0; }
                      100% { background-position: -200% 0; }
                    }
                  `}</style>
                  {Array.from({ length: 9 }).map((_, i) => (
                    <div key={`skel-${i}`} className="flex flex-col items-center gap-2">
                      <div className="w-[280px] h-[160px] rounded-lg overflow-hidden relative bg-gray-100 shadow-md">
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
                      </div>
                      <span className="h-3 w-24 rounded bg-gray-200 animate-pulse" />
                    </div>
                  ))}
                </>
              ) : (
                displayCards.map((design) => (
                  <div key={design.id} className="flex flex-col items-center gap-1.5">
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
          </div>
        </div>

        {/* Right panel — controls */}
        <div
          className="w-[260px] shrink-0 flex flex-col animate-fade-in"
        >
          {/* Top: Navigation */}
          <div className="pb-4 border-b border-gray-100">
            <h2 className="text-sm font-bold text-gray-900">Like what you see?</h2>
            <p className="text-xs text-gray-500 mt-0.5">Select a card and continue to customize it</p>
            <div className="flex items-center justify-between mt-3">
              <button
                onClick={() => setStep("info")}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium
                  text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors"
              >
                <ArrowLeft size={13} /> Back
              </button>

              <div className="flex flex-col items-end gap-1">
                <button
                  onClick={() => setStep("refine")}
                  disabled={!selectedDesign}
                  className={`flex items-center gap-1.5 px-5 py-2.5 rounded-xl
                    font-semibold text-xs transition-all ${
                      selectedDesign
                        ? "bg-gradient-to-r from-indigo-500 to-indigo-600 text-white hover:from-indigo-600 hover:to-indigo-700 shadow-lg shadow-indigo-200"
                        : "bg-gray-100 text-gray-400 cursor-not-allowed"
                    }`}
                >
                  Continue <ArrowRight size={13} />
                </button>
                {!selectedDesign && (
                  <span className="text-[10px] text-gray-400">Select a card to continue</span>
                )}
              </div>
            </div>
          </div>

          {/* Bottom: Redesign controls */}
          <div className="flex-1 flex flex-col gap-4 pt-4">
            {!showRedesign ? (
              <button
                onClick={() => setShowRedesign(true)}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl
                  border-2 border-dashed border-gray-200 text-gray-500 font-medium text-sm
                  hover:border-indigo-300 hover:text-indigo-600 hover:bg-indigo-50/50 transition-all"
              >
                <Sparkles size={15} />
                Not quite right? Redesign
              </button>
            ) : (
            <>
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-gray-900">Redesign</h2>
                <p className="text-xs text-gray-500 mt-0.5">Generate with AI or tweak colors</p>
              </div>
              <button
                onClick={() => setShowRedesign(false)}
                className="text-[10px] text-gray-400 hover:text-gray-600 transition-colors"
              >
                Hide
              </button>
            </div>

            {/* AI Redesign */}
            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-gray-600 mb-1 block">What do you do?</label>
                <textarea
                  value={aiDesc}
                  onChange={(e) => setAiDesc(e.target.value)}
                  placeholder="e.g. Freelance UX designer for SaaS startups..."
                  rows={2}
                  disabled={isGenerating || isLoading}
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
                  placeholder='"Dark with gold", "Corporate", "Red bold"'
                  rows={1}
                  disabled={isGenerating || isLoading}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm
                    focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100
                    outline-none transition-all placeholder:text-gray-300 resize-none
                    disabled:opacity-50"
                />
              </div>
              <button
                onClick={handleAIRedesign}
                disabled={isGenerating || isLoading}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-xl
                  border-2 border-indigo-200 text-indigo-600 font-semibold text-sm
                  bg-indigo-50 hover:bg-indigo-100 transition-colors disabled:opacity-50"
              >
                {(isGenerating && generationSource === "ai") || isLoading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Generating…
                  </>
                ) : (
                  <>
                    <Sparkles size={16} />
                    Regenerate
                  </>
                )}
              </button>
            </div>

            {/* Color Variations */}
            <button
              onClick={handleColorVariations}
              disabled={isGenerating || !selectedDesign}
              className={`w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border-2 font-semibold text-sm transition-all ${
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

            {!selectedDesign && (
              <p className="text-[10px] text-gray-400 text-center -mt-2">Select a card first</p>
            )}

            {/* Back to originals */}
            {refinedDesigns.length > 0 && (
              <button
                onClick={() => setRefinedDesigns([])}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-xl border border-gray-200
                  text-gray-600 text-xs font-medium hover:bg-gray-50 transition-all"
              >
                Show Original Designs
              </button>
            )}
            </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
