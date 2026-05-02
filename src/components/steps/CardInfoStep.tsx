
import { useMemo, useState } from "react";
import { useWizardStore } from "@/lib/store";
import { generateFallbackDesigns } from "@/lib/designs";
import { recommendDesignsApp2 } from "@/lib/ollama-client";
import BusinessCard from "@/components/BusinessCard";
import type { CardDesign } from "@/lib/types";
import {
  Wand2,
  ArrowRight,
  Loader2,
  ImagePlus,
} from "lucide-react";

export default function CardInfoStep() {
  const { cardInfo, setCardInfo, setStep, setDesigns, setIsLoading } =
    useWizardStore();

  const [isGenerating, setIsGenerating] = useState(false);

  /**
   * Live preview — pinned to `minimal-clean` so the user sees a stable,
   * representative layout while typing. This is *just a preview* — the
   * actual design selection happens after the user clicks Generate.
   * Pinning to one template (instead of randomizing) avoids setting
   * the wrong expectation that "the final card looks exactly like this."
   */
  const previewDesign = useMemo<CardDesign>(() => ({
    id: "preview-card",
    templateId: "minimal-clean",
    name: "Preview",
    reasoning: "",
    colors: {
      primary: "#0e0f0c",
      secondary: "#454745",
      accent: "#9fe870",
      background: "#ffffff",
      backgroundAlt: "#0e0f0c",
      text: "#454745",
    },
    font: "sans",
    textAlign: "left",
    spacing: "normal",
    borderRadius: "medium",
    pattern: { id: "none", opacity: 0, color: "#9fe870", placement: "full" },
    backgroundEffect: { type: "none", color: "#9fe870", opacity: 0, angle: 0 },
    logo: { id: "none", placement: "top-right", size: "medium" },
    border: { sides: "none", width: 0, color: "#9fe870" },
  }), []);

  /**
   * Generate flow (App2 — progressive 3-wave).
   *
   * The user navigates to the designs step immediately. While there,
   * cards stream in three waves:
   *   wave 1 → 2 cards (top 2 templates × first palette)
   *   wave 2 → +2 cards (next 2 templates × 2 fresh palettes)
   *   wave 3 → +5 cards (remaining 5 templates × 5 more palettes)
   *
   * Skeletons fill the remaining slots between waves so the picker
   * never looks empty. App4 (single-call) is kept intact in
   * ollama-client.ts as a backup but isn't the active path.
   */
  const handleGenerate = async () => {
    setIsLoading(true);
    setIsGenerating(true);
    setDesigns([]); // start with an empty grid; skeletons fill it
    setStep("designs");

    try {
      await recommendDesignsApp2(
        cardInfo.businessDescription || "",
        cardInfo.designExpectations || "",
        {
          onWave: (newDesigns, _idx, isLast) => {
            // Append to whatever's already in the store (avoid stale closure
            // by reading the latest state directly).
            const current = useWizardStore.getState().designs;
            useWizardStore.getState().setDesigns([...current, ...newDesigns]);
            if (isLast) {
              setIsLoading(false);
              setIsGenerating(false);
            }
          },
          onError: (waveIdx) => {
            console.warn(`[CardInfoStep] App2 wave ${waveIdx} failed; padding with fallback`);
            const current = useWizardStore.getState().designs;
            const need = Math.max(0, 8 - current.length);
            if (need > 0) {
              useWizardStore.getState().setDesigns([...current, ...generateFallbackDesigns(need)]);
            }
            setIsLoading(false);
            setIsGenerating(false);
          },
        },
      );
    } catch {
      // Catastrophic failure — drop to fallback for the full grid
      setDesigns(generateFallbackDesigns(8));
      setIsLoading(false);
      setIsGenerating(false);
    }
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { alert("Logo must be under 2 MB"); return; }
    const reader = new FileReader();
    reader.onload = () => setCardInfo({ customLogoUrl: reader.result as string });
    reader.readAsDataURL(file);
  };

  const contactFields: { key: "email" | "phone" | "website" | "address"; placeholder: string; type: string }[] = [
    { key: "email",   placeholder: "Email",                type: "email" },
    { key: "phone",   placeholder: "Phone",                type: "tel" },
    { key: "website", placeholder: "Website",              type: "text" },
    { key: "address", placeholder: "Address (optional)",   type: "text" },
  ];

  return (
    <div className="w-full flex-1 min-h-0 flex">
      {/* ────────────── Left — AI prompt ────────────── */}
      <div className="flex-1 flex flex-col px-8 py-6 overflow-y-auto">
        <h2 className="text-xl font-extrabold text-[#0e0f0c] mb-1 tracking-tight">
          Describe your work
        </h2>
        <p className="text-sm text-[#868685] mb-5">AI picks the best card design for you</p>

        <label className="block text-sm font-semibold text-[#0e0f0c] mb-1.5">
          What do you do? <span className="text-[#868685] font-normal">— this drives the AI</span>
        </label>
        <textarea
          value={cardInfo.businessDescription}
          onChange={(e) => setCardInfo({ businessDescription: e.target.value })}
          placeholder="e.g. Freelance UX designer working with SaaS startups, or Family-run Italian restaurant in downtown..."
          rows={4}
          className="w-full px-4 py-3 rounded-xl border border-[#0e0f0c]/12
            focus:border-[#9fe870] focus:ring-2 focus:ring-[#9fe870]/30
            outline-none transition-all text-sm text-[#0e0f0c]
            placeholder:text-[#868685] resize-none mb-4"
        />

        <label className="block text-sm font-semibold text-[#0e0f0c] mb-1.5">
          Any design preferences? <span className="text-[#868685] font-normal">(optional)</span>
        </label>
        <textarea
          value={cardInfo.designExpectations}
          onChange={(e) => setCardInfo({ designExpectations: e.target.value })}
          placeholder="e.g. Clean and modern, earthy green tones, minimalist, premium feel..."
          rows={2}
          className="w-full px-4 py-3 rounded-xl border border-[#0e0f0c]/12
            focus:border-[#9fe870] focus:ring-2 focus:ring-[#9fe870]/30
            outline-none transition-all text-sm text-[#0e0f0c]
            placeholder:text-[#868685] resize-none mb-6"
        />

        <div className="flex-1" />

        <button
          onClick={handleGenerate}
          disabled={isGenerating}
          className="w-full flex items-center justify-center gap-2 py-3.5 px-6
            rounded-full text-[#163300] font-semibold text-base
            bg-[#9fe870] hover:bg-[#cdffad]
            hover:scale-[1.02] active:scale-[0.98]
            transition-all duration-150
            cursor-pointer disabled:opacity-60 disabled:scale-100"
        >
          {isGenerating ? (
            <Loader2 size={18} className="animate-spin" />
          ) : (
            <Wand2 size={18} />
          )}
          Generate Designs
          <ArrowRight size={18} />
        </button>
      </div>

      {/* ────────────── Right — Dark identity panel (45%, full bleed) ────────────── */}
      <div className="w-[45%] shrink-0 bg-[#0e0f0c] flex flex-col overflow-y-auto px-5 py-5">
        <h3 className="text-sm font-bold text-[#fafaf7] mb-4">Your card details</h3>

        {/* Logo + Name/Title/Company inline */}
        <div className="flex gap-3 mb-4">
          <div className="shrink-0">
            {cardInfo.customLogoUrl ? (
              <div className="relative">
                <img
                  src={cardInfo.customLogoUrl}
                  alt="Logo"
                  className="w-12 h-12 rounded-lg object-contain border border-white/12 bg-white/[0.04]"
                />
                <button
                  type="button"
                  onClick={() => setCardInfo({ customLogoUrl: "" })}
                  className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-red-500 text-white
                    flex items-center justify-center text-[8px]"
                  aria-label="Remove logo"
                >
                  ✕
                </button>
              </div>
            ) : (
              <label className="w-12 h-12 rounded-lg border-2 border-dashed border-white/15
                bg-white/[0.03] flex items-center justify-center cursor-pointer
                hover:border-[#9fe870]/50 transition-colors">
                <ImagePlus size={16} className="text-[#868685]" />
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/svg+xml,image/webp"
                  className="hidden"
                  onChange={handleLogoUpload}
                />
              </label>
            )}
          </div>
          <div className="flex-1 flex flex-col gap-1.5">
            <input
              value={cardInfo.name}
              onChange={(e) => setCardInfo({ name: e.target.value })}
              placeholder="Name"
              className="w-full px-3 py-1.5 rounded-lg border border-white/12 bg-white/[0.04]
                text-sm text-[#fafaf7] font-bold placeholder:text-[#868685]
                outline-none focus:border-[#9fe870] focus:ring-2 focus:ring-[#9fe870]/30 transition-all"
            />
            <div className="flex gap-1.5">
              <input
                value={cardInfo.title}
                onChange={(e) => setCardInfo({ title: e.target.value })}
                placeholder="Title"
                className="flex-1 min-w-0 px-3 py-1.5 rounded-lg border border-white/12 bg-white/[0.04]
                  text-xs text-[#fafaf7] placeholder:text-[#868685]
                  outline-none focus:border-[#9fe870] focus:ring-2 focus:ring-[#9fe870]/30 transition-all"
              />
              <input
                value={cardInfo.company}
                onChange={(e) => setCardInfo({ company: e.target.value })}
                placeholder="Company"
                className="flex-1 min-w-0 px-3 py-1.5 rounded-lg border border-white/12 bg-white/[0.04]
                  text-xs text-[#fafaf7] placeholder:text-[#868685]
                  outline-none focus:border-[#9fe870] focus:ring-2 focus:ring-[#9fe870]/30 transition-all"
              />
            </div>
          </div>
        </div>

        {/* Contact fields */}
        <div className="space-y-2 mb-6">
          {contactFields.map(({ key, placeholder, type }) => (
            <input
              key={key}
              value={cardInfo[key]}
              onChange={(e) => setCardInfo({ [key]: e.target.value })}
              placeholder={placeholder}
              type={type}
              className="w-full px-3 py-2 rounded-lg border border-white/12 bg-white/[0.04]
                text-sm text-[#fafaf7] placeholder:text-[#868685]
                outline-none focus:border-[#9fe870] focus:ring-2 focus:ring-[#9fe870]/30 transition-all"
            />
          ))}
        </div>

        {/* Live preview — placeholder layout, real designs come after Generate */}
        <div className="flex flex-col items-center gap-2 mt-auto">
          <span className="text-[10px] font-bold text-[#868685] tracking-widest uppercase">
            Visual Preview
          </span>
          <BusinessCard
            design={previewDesign}
            info={cardInfo}
            size="small"
          />
          <span className="text-[11px] text-[#868685] text-center max-w-[240px] leading-snug">
            Just so you can see your details placed —
            actual designs are generated after you click Generate.
          </span>
        </div>
      </div>
    </div>
  );
}
