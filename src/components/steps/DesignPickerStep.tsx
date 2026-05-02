
import { useEffect, useState } from "react";
import { useWizardStore } from "@/lib/store";
import { generateColorVariations } from "@/lib/designs";
import { recommendDesignsApp2 } from "@/lib/ollama-client";
import BusinessCard from "@/components/BusinessCard";
import { CardBuilderModal } from "@/components/CardBuilder";
import {
  ArrowLeft,
  ArrowRight,
  Wand2,
  Palette,
  Loader2,
  Pencil,
} from "lucide-react";
import type { CardDesign } from "@/lib/types";

const LOADING_MESSAGES = [
  "AI is designing your cards…",
  "Mixing colors and layouts…",
  "Crafting something beautiful…",
  "Picking the perfect template…",
  "Almost ready…",
];

export default function DesignPickerStep() {
  const {
    designs,
    selectedDesign,
    setSelectedDesign,
    refinedDesigns,
    setRefinedDesigns,
    setStep,
    cardInfo,
    setCardInfo,
    isLoading,
  } = useWizardStore();

  const [isGenerating, setIsGenerating] = useState(false);
  const [generationSource, setGenerationSource] = useState<"" | "variations" | "ai">("");
  const [aiDesc, setAiDesc] = useState(cardInfo.businessDescription || "");
  const [aiPrefs, setAiPrefs] = useState(cardInfo.designExpectations || "");
  const [showRedesign, setShowRedesign] = useState(false);
  const [showBuilder, setShowBuilder] = useState(false);
  /** How many new cards have arrived so far during an AI Redesign. Used
   *  by the grid to render skeletons for the remaining slots above the
   *  originals (originals stay visible below the new wave). */
  const [redesignProgress, setRedesignProgress] = useState(0);

  // Rotating loading message for the right-panel takeover
  const [loadingMsgIdx, setLoadingMsgIdx] = useState(0);
  const isBusy = isLoading || isGenerating;
  useEffect(() => {
    if (!isBusy) return;
    const t = setInterval(() => setLoadingMsgIdx((i) => (i + 1) % LOADING_MESSAGES.length), 2200);
    return () => clearInterval(t);
  }, [isBusy]);

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

  /**
   * Re-run the design generation with new prompt input. Uses the same
   * App2 progressive flow as the initial generation — 3 waves of 1 / 2 /
   * 5 cards — so the right panel's loading takeover covers all three
   * waves and new cards stream in at the top of the grid as each wave
   * completes. Originals stay below so nothing is lost.
   */
  const handleAIRedesign = async () => {
    setIsGenerating(true);
    setGenerationSource("ai");
    setRedesignProgress(0); // start fresh — 0 new cards, 8 skeletons at top
    setCardInfo({ businessDescription: aiDesc, designExpectations: aiPrefs });
    setRefinedDesigns([]); // ensure refined view doesn't override the new prepends

    // Snapshot the originals once so each wave prepends above them in
    // arrival order (wave 1 ends up first; orig0 ends up at slot 9).
    const originals = useWizardStore.getState().designs;
    let newDesigns: CardDesign[] = [];

    try {
      await recommendDesignsApp2(aiDesc, aiPrefs, {
        onWave: (wave, _idx, isLast) => {
          newDesigns = [...newDesigns, ...wave];
          useWizardStore.getState().setDesigns([...newDesigns, ...originals]);
          setRedesignProgress(newDesigns.length);
          if (isLast) setIsGenerating(false);
        },
        onError: (waveIdx) => {
          console.warn(`[DesignPicker] Redesign wave ${waveIdx} failed; keeping what we have`);
          setIsGenerating(false);
        },
      });
    } catch {
      setIsGenerating(false);
    }
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
        <div className="flex-1 min-h-0 flex flex-col bg-[#f4f5f2] rounded-xl px-3">
          {refinedDesigns.length > 0 && (
            <h3 className="shrink-0 text-xs font-semibold text-[#868685] mb-2 mt-3">
              {generationSource === "ai" ? "✨ AI Redesigns" : "🎨 Color Variations"}
            </h3>
          )}

          <div className="flex-1 min-h-0 overflow-y-auto rounded-xl">
            <div className="grid grid-cols-3 gap-x-3 gap-y-8 justify-items-center pt-3 pb-2">
              {/* Shimmer keyframes — defined once, used by all skeleton tiles */}
              {(isGenerating || isLoading) && (
                <style>{`
                  @keyframes cardShimmer {
                    0%   { background-position: 200% 0; }
                    100% { background-position: -200% 0; }
                  }
                `}</style>
              )}
              {(() => {
                // ── Decide what to render in the grid ────────────────────────
                // - Initial generation: empty designs grow to 8 → skeletons fill the gap
                // - AI Redesign:        new prepended cards (first redesignProgress)
                //                       → 8-N skeletons
                //                       → originals below
                // - Idle / Try Other Palettes: all displayCards as cards
                const isRedesignLoading = isGenerating && generationSource === "ai";

                const renderCard = (design: typeof displayCards[number]) => (
                  <div key={design.id} className="flex flex-col items-center gap-1.5">
                    <BusinessCard
                      design={design}
                      info={cardInfo}
                      size="small"
                      selected={selectedDesign?.id === design.id}
                      onClick={() => handlePickDesign(design)}
                    />
                    <span className="text-xs font-medium text-[#454745] text-center max-w-[260px] truncate">
                      {design.name}
                    </span>
                    {design.reasoning && (
                      <span className="text-[10px] text-[#454745] text-center max-w-[260px] leading-tight italic">
                        {design.reasoning}
                      </span>
                    )}
                  </div>
                );

                const renderSkeleton = (key: string, slotIndex: number) => {
                  const offset = slotIndex * 120;
                  return (
                    <div key={key} className="flex flex-col items-center gap-2">
                      <div className="w-[280px] h-[160px] rounded-lg overflow-hidden relative bg-gray-100 shadow-md">
                        <div
                          className="absolute inset-0 z-10"
                          style={{
                            background:
                              "linear-gradient(90deg, transparent 0%, rgba(14,15,12,0.04) 30%, rgba(14,15,12,0.08) 50%, rgba(14,15,12,0.04) 70%, transparent 100%)",
                            backgroundSize: "200% 100%",
                            animation: `cardShimmer 1.8s ease-in-out infinite`,
                            animationDelay: `${offset}ms`,
                          }}
                        />
                        <div className="absolute inset-0 p-5 flex flex-col justify-between">
                          <div className="space-y-2">
                            <div className="h-3.5 w-28 rounded bg-gray-200/80 animate-pulse" style={{ animationDelay: `${offset}ms` }} />
                            <div className="h-2 w-16 rounded bg-gray-200/60 animate-pulse" style={{ animationDelay: `${offset + 100}ms` }} />
                            <div className="h-2 w-20 rounded bg-gray-200/50 animate-pulse" style={{ animationDelay: `${offset + 200}ms` }} />
                          </div>
                          <div className="space-y-1.5">
                            <div className="h-1.5 w-32 rounded bg-gray-200/60 animate-pulse" style={{ animationDelay: `${offset + 300}ms` }} />
                            <div className="h-1.5 w-24 rounded bg-gray-200/60 animate-pulse" style={{ animationDelay: `${offset + 400}ms` }} />
                          </div>
                        </div>
                      </div>
                      <span className="h-3 w-24 rounded bg-gray-200 animate-pulse" />
                    </div>
                  );
                };

                if (isRedesignLoading) {
                  // AI Redesign — split displayCards: first redesignProgress
                  // are new arrivals, remainder are originals (preserved below).
                  const newCards = displayCards.slice(0, redesignProgress);
                  const originals = displayCards.slice(redesignProgress);
                  const skeletonCount = Math.max(0, 8 - redesignProgress);
                  return (
                    <>
                      {newCards.map(renderCard)}
                      {Array.from({ length: skeletonCount }).map((_, i) =>
                        renderSkeleton(`redesign-skel-${i}`, redesignProgress + i)
                      )}
                      {originals.map(renderCard)}
                    </>
                  );
                }

                // Initial generation OR idle — cards then gap-skeletons.
                const skeletonCount = (isGenerating || isLoading)
                  ? Math.max(0, 8 - displayCards.length)
                  : 0;
                return (
                  <>
                    {displayCards.map(renderCard)}
                    {Array.from({ length: skeletonCount }).map((_, i) =>
                      renderSkeleton(`skel-${i}`, displayCards.length + i)
                    )}
                  </>
                );
              })()}
            </div>
          </div>
        </div>

        {/* Right panel — controls (replaced with a loading takeover while generating) */}
        <div
          className="w-[30%] shrink-0 flex flex-col animate-fade-in bg-[#0e0f0c] rounded-2xl overflow-hidden"
        >
          {isBusy ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-4 px-6 py-8 text-center">
              <style>{`
                @keyframes panelFade {
                  0%   { opacity: 0; transform: translateY(4px); }
                  15%  { opacity: 1; transform: translateY(0); }
                  85%  { opacity: 1; transform: translateY(0); }
                  100% { opacity: 0; transform: translateY(-4px); }
                }
              `}</style>
              <div className="relative w-14 h-14 rounded-full bg-[#9fe870]/15 flex items-center justify-center">
                <Wand2 size={24} className="text-[#9fe870] animate-pulse" />
                <div className="absolute inset-0 rounded-full border-2 border-[#9fe870]/40 animate-ping" />
              </div>
              <div className="space-y-1">
                <h2 className="text-base font-bold text-[#fafaf7]">Generating designs</h2>
                <p
                  key={loadingMsgIdx}
                  className="text-xs text-[#868685]"
                  style={{ animation: "panelFade 2.2s ease-in-out" }}
                >
                  {LOADING_MESSAGES[loadingMsgIdx]}
                </p>
              </div>
              <p className="text-[10px] text-[#868685]/60 max-w-[220px]">
                Pulling templates that match your business and styling them in fresh palettes.
              </p>
            </div>
          ) : (
          <>
          {/* Top: Navigation */}
          <div className="pb-4 border-b border-white/8 px-4 pt-4">
            <h2 className="text-sm font-bold text-[#fafaf7]">Like what you see?</h2>
            <p className="text-xs text-[#868685] mt-0.5">Select a card and continue to customize it</p>
            <div className="flex items-center justify-between mt-3">
              <button
                onClick={() => setStep("info")}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium
                  text-[#868685] hover:text-[#fafaf7] hover:bg-white/8 transition-colors"
              >
                <ArrowLeft size={13} /> Back
              </button>

              <div className="flex flex-col items-end gap-1">
                <button
                  onClick={() => setStep("refine")}
                  disabled={!selectedDesign}
                  className={`flex items-center gap-1.5 px-5 py-2.5 rounded-full
                    font-semibold text-xs transition-all ${
                      selectedDesign
                        ? "bg-[#9fe870] text-[#163300] hover:bg-[#cdffad] hover:scale-[1.02] active:scale-[0.98]"
                        : "bg-white/8 text-[#868685] cursor-not-allowed"
                    }`}
                >
                  Continue <ArrowRight size={13} />
                </button>
                {!selectedDesign && (
                  <span className="text-[10px] text-[#868685]">Select a card to continue</span>
                )}
              </div>
            </div>
          </div>

          {/* Bottom: Redesign controls */}
          <div className="flex-1 flex flex-col gap-4 pt-4 px-4 pb-4">
            {!showRedesign ? (
              <>
              <button
                onClick={() => setShowRedesign(true)}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl
                  border border-dashed border-white/12 text-[#868685] font-medium text-sm
                  hover:border-[#9fe870] hover:text-[#fafaf7] hover:bg-[#9fe870]/12 transition-all"
              >
                <Wand2 size={15} />
                Not quite right? Redesign
              </button>
              <button
                onClick={() => setShowBuilder(true)}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl
                  border border-dashed border-white/12 text-[#868685] font-medium text-sm
                  hover:border-white/30 hover:text-[#fafaf7] hover:bg-white/[0.06] transition-all"
              >
                <Pencil size={15} />
                I'll design it myself
              </button>
              </>
            ) : (
            <>
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-[#fafaf7]">Redesign</h2>
                <p className="text-xs text-[#868685] mt-0.5">Generate with AI or tweak colors</p>
              </div>
              <button
                onClick={() => setShowRedesign(false)}
                className="text-[10px] text-[#868685] hover:text-[#fafaf7] transition-colors"
              >
                Hide
              </button>
            </div>

            {/* AI Redesign */}
            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-[#868685] mb-1 block">What do you do?</label>
                <textarea
                  value={aiDesc}
                  onChange={(e) => setAiDesc(e.target.value)}
                  placeholder="e.g. Freelance UX designer for SaaS startups..."
                  rows={2}
                  disabled={isGenerating || isLoading}
                  className="w-full px-3 py-2 rounded-lg border border-white/12 bg-white/[0.04]
                    text-sm text-[#fafaf7]
                    focus:border-[#9fe870] focus:ring-2 focus:ring-[#9fe870]/30
                    outline-none transition-all placeholder:text-[#868685] resize-none
                    disabled:opacity-50"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-[#868685] mb-1 block">Design preferences</label>
                <textarea
                  value={aiPrefs}
                  onChange={(e) => setAiPrefs(e.target.value)}
                  placeholder='"Dark with gold", "Corporate", "Red bold"'
                  rows={1}
                  disabled={isGenerating || isLoading}
                  className="w-full px-3 py-2 rounded-lg border border-white/12 bg-white/[0.04]
                    text-sm text-[#fafaf7]
                    focus:border-[#9fe870] focus:ring-2 focus:ring-[#9fe870]/30
                    outline-none transition-all placeholder:text-[#868685] resize-none
                    disabled:opacity-50"
                />
              </div>
              <button
                onClick={handleAIRedesign}
                disabled={isGenerating || isLoading}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-full
                  text-[#163300] font-semibold text-sm
                  bg-[#9fe870] hover:bg-[#cdffad] transition-colors disabled:opacity-50"
              >
                {(isGenerating && generationSource === "ai") || isLoading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Generating…
                  </>
                ) : (
                  <>
                    <Wand2 size={16} />
                    Regenerate
                  </>
                )}
              </button>
            </div>

            {/* Color Variations */}
            <button
              onClick={handleColorVariations}
              disabled={isGenerating || !selectedDesign}
              className={`w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-full font-semibold text-sm transition-all ${
                selectedDesign
                  ? "bg-white/8 text-[#fafaf7] hover:bg-white/12"
                  : "bg-white/4 text-[#868685] cursor-not-allowed"
              } disabled:opacity-50`}
            >
              {isGenerating && generationSource === "variations" ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Palette size={16} />
              )}
              Try Other Palettes
            </button>

            {!selectedDesign && (
              <p className="text-[10px] text-[#868685] text-center -mt-2">Select a card first</p>
            )}

            {/* Back to originals */}
            {refinedDesigns.length > 0 && (
              <button
                onClick={() => setRefinedDesigns([])}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-xl border border-white/12
                  text-[#868685] text-xs font-medium hover:bg-white/8 transition-all"
              >
                Show Original Designs
              </button>
            )}
            </>
            )}
          </div>
          </>
          )}
        </div>
      </div>

      {/* Fullscreen Card Builder modal */}
      <CardBuilderModal
        open={showBuilder}
        onClose={() => setShowBuilder(false)}
        onDesignReady={(design, _info) => {
          setSelectedDesign(design);
          setShowBuilder(false);
          setStep("refine");
        }}
        initialDesign={selectedDesign || undefined}
        initialInfo={cardInfo}
      />
    </div>
  );
}
