
import { useState } from "react";
import { useWizardStore } from "@/lib/store";
import { generateFallbackDesigns } from "@/lib/designs";
import { recommendDesigns, recommendDesignsSinglePrompt, recommendDesignsLean, recommendDesignsApp4 } from "@/lib/ollama-client";
import {
  Sparkles,
  ArrowRight,
  Loader2,
  ChevronRight,
  User,
} from "lucide-react";

export default function CardInfoStep() {
  const { cardInfo, setCardInfo, setStep, setDesigns, setIsLoading } =
    useWizardStore();

  const [isGeneratingDesigns, setIsGeneratingDesigns] = useState(false);
  const [isGeneratingApp2, setIsGeneratingApp2] = useState(false);
  const [isGeneratingApp3, setIsGeneratingApp3] = useState(false);
  const [isGeneratingApp4, setIsGeneratingApp4] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const anyLoading = isGeneratingDesigns || isGeneratingApp2 || isGeneratingApp3 || isGeneratingApp4;

  const hasAnyInfo = !!(cardInfo.name || cardInfo.title || cardInfo.company || cardInfo.email || cardInfo.phone || cardInfo.website);

  const handleGenerate = async () => {
    setIsLoading(true);
    setIsGeneratingDesigns(true);

    try {
      const data = await recommendDesigns(
        cardInfo.businessDescription || "",
        cardInfo.designExpectations || "",
      );
      if (data.designs?.length) {
        setDesigns(data.designs);
      } else {
        setDesigns(generateFallbackDesigns(8));
      }
    } catch {
      setDesigns(generateFallbackDesigns(8));
    }

    setIsLoading(false);
    setIsGeneratingDesigns(false);
    setStep("designs");
  };

  const handleGenerateApp2 = async () => {
    setIsLoading(true);
    setIsGeneratingApp2(true);

    try {
      const data = await recommendDesignsSinglePrompt(
        cardInfo.businessDescription || "",
        cardInfo.designExpectations || "",
      );
      if (data.designs?.length) {
        setDesigns(data.designs);
      } else {
        setDesigns(generateFallbackDesigns(8));
      }
    } catch {
      setDesigns(generateFallbackDesigns(8));
    }

    setIsLoading(false);
    setIsGeneratingApp2(false);
    setStep("designs");
  };

  const handleGenerateApp3 = async () => {
    setIsLoading(true);
    setIsGeneratingApp3(true);

    try {
      const data = await recommendDesignsLean(
        cardInfo.businessDescription || "",
        cardInfo.designExpectations || "",
      );
      if (data.designs?.length) {
        setDesigns(data.designs);
      } else {
        setDesigns(generateFallbackDesigns(4));
      }
    } catch {
      setDesigns(generateFallbackDesigns(4));
    }

    setIsLoading(false);
    setIsGeneratingApp3(false);
    setStep("designs");
  };

  const handleGenerateApp4 = async () => {
    // Navigate immediately — DesignPickerStep will show skeletons
    setIsLoading(true);
    setStep("designs");

    try {
      const data = await recommendDesignsApp4(
        cardInfo.businessDescription || "",
        cardInfo.designExpectations || "",
      );
      if (data.designs?.length) {
        setDesigns(data.designs);
      } else {
        setDesigns(generateFallbackDesigns(4));
      }
    } catch {
      setDesigns(generateFallbackDesigns(4));
    }

    setIsLoading(false);
  };

  return (
    <div className="w-full max-w-2xl mx-auto overflow-y-auto">
      {/* Hero header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-indigo-50 text-indigo-600 rounded-full text-sm font-medium mb-4">
          <Sparkles size={14} />
          AI-Powered Design
        </div>
        <h2 className="text-3xl font-bold text-gray-900">
          What should your card say about you?
        </h2>
        <p className="mt-2 text-gray-500">
          Describe your work and style — AI does the rest
        </p>
      </div>

      <div className="space-y-6">
        {/* Main prompt — business description */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <label className="block text-sm font-semibold text-gray-800 mb-2">
            What do you do? <span className="text-gray-400 font-normal">— this drives the AI</span>
          </label>
          <textarea
            value={cardInfo.businessDescription}
            onChange={(e) => setCardInfo({ businessDescription: e.target.value })}
            placeholder="e.g. Freelance UX designer working with SaaS startups, or Family-run Italian restaurant in downtown..."
            rows={4}
            className="w-full px-4 py-3 rounded-xl border border-gray-200
              focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100
              outline-none transition-all text-sm text-gray-900
              placeholder:text-gray-300 resize-none"
          />

          <label className="block text-sm font-semibold text-gray-800 mt-4 mb-2">
            Any design preferences? <span className="text-gray-400 font-normal">(optional)</span>
          </label>
          <textarea
            value={cardInfo.designExpectations}
            onChange={(e) => setCardInfo({ designExpectations: e.target.value })}
            placeholder="e.g. Clean and modern, earthy green tones, minimalist, premium feel..."
            rows={2}
            className="w-full px-4 py-3 rounded-xl border border-gray-200
              focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100
              outline-none transition-all text-sm text-gray-900
              placeholder:text-gray-300 resize-none"
          />
        </div>

        {/* Collapsible person info */}
        <div>
          <button
            type="button"
            onClick={() => setShowInfo((v) => !v)}
            className="w-full flex items-center gap-2 px-4 py-3 rounded-xl
              text-sm text-gray-500 hover:text-gray-700 hover:bg-gray-50
              transition-all cursor-pointer group"
          >
            <User size={15} className="text-gray-400 group-hover:text-gray-600" />
            <span className="font-medium">
              Add your info
              {hasAnyInfo && <span className="text-indigo-500 ml-1">· filled</span>}
            </span>
            <span className="text-xs text-gray-400 ml-auto mr-1">
              {!showInfo && "optional"}
            </span>
            <ChevronRight
              size={14}
              className={`text-gray-400 transition-transform duration-200 ${showInfo ? "rotate-90" : ""}`}
            />
          </button>

          <div
            className={`overflow-hidden transition-all duration-200 ease-in-out ${
              showInfo ? "max-h-[400px] opacity-100 mt-2" : "max-h-0 opacity-0"
            }`}
          >
            <div className="bg-white rounded-xl border border-gray-100 p-4">
              <div className="grid grid-cols-2 gap-3">
                <input
                  value={cardInfo.name}
                  onChange={(e) => setCardInfo({ name: e.target.value })}
                  placeholder="Name"
                  className="px-3 py-2 rounded-lg border border-gray-200 text-sm
                    focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100
                    outline-none transition-all placeholder:text-gray-300"
                />
                <input
                  value={cardInfo.title}
                  onChange={(e) => setCardInfo({ title: e.target.value })}
                  placeholder="Title"
                  className="px-3 py-2 rounded-lg border border-gray-200 text-sm
                    focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100
                    outline-none transition-all placeholder:text-gray-300"
                />
                <input
                  value={cardInfo.company}
                  onChange={(e) => setCardInfo({ company: e.target.value })}
                  placeholder="Company"
                  className="px-3 py-2 rounded-lg border border-gray-200 text-sm
                    focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100
                    outline-none transition-all placeholder:text-gray-300"
                />
                <input
                  value={cardInfo.email}
                  onChange={(e) => setCardInfo({ email: e.target.value })}
                  placeholder="Email"
                  type="email"
                  className="px-3 py-2 rounded-lg border border-gray-200 text-sm
                    focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100
                    outline-none transition-all placeholder:text-gray-300"
                />
                <input
                  value={cardInfo.phone}
                  onChange={(e) => setCardInfo({ phone: e.target.value })}
                  placeholder="Phone"
                  type="tel"
                  className="px-3 py-2 rounded-lg border border-gray-200 text-sm
                    focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100
                    outline-none transition-all placeholder:text-gray-300"
                />
                <input
                  value={cardInfo.website}
                  onChange={(e) => setCardInfo({ website: e.target.value })}
                  placeholder="Website"
                  className="px-3 py-2 rounded-lg border border-gray-200 text-sm
                    focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100
                    outline-none transition-all placeholder:text-gray-300"
                />
                <div className="col-span-2 flex items-center gap-3">
                  {cardInfo.customLogoUrl ? (
                    <div className="flex items-center gap-2">
                      <img src={cardInfo.customLogoUrl} alt="Logo" className="w-8 h-8 rounded object-contain border border-gray-200" />
                      <span className="text-xs text-gray-500">Logo uploaded</span>
                      <button type="button" onClick={() => setCardInfo({ customLogoUrl: "" })}
                        className="text-xs text-red-500 hover:text-red-700 cursor-pointer">Remove</button>
                    </div>
                  ) : (
                    <label className="flex items-center gap-2 px-3 py-2 rounded-lg border border-dashed border-gray-300
                      text-sm text-gray-400 hover:border-indigo-400 hover:text-indigo-500
                      transition-all cursor-pointer">
                      Upload logo (optional)
                      <input type="file" accept="image/png,image/jpeg,image/svg+xml,image/webp" className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          if (file.size > 2 * 1024 * 1024) { alert("Logo must be under 2 MB"); return; }
                          const reader = new FileReader();
                          reader.onload = () => setCardInfo({ customLogoUrl: reader.result as string });
                          reader.readAsDataURL(file);
                        }}
                      />
                    </label>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Generate buttons */}
        <div className="flex gap-3">
          {/* App1 & App2 hidden — kept in code for reference */}
          {false && <button onClick={handleGenerate} disabled={anyLoading}
            className="flex-1 flex items-center justify-center gap-2 py-3.5 px-6 rounded-xl text-white font-semibold text-base bg-gradient-to-r from-indigo-600 to-purple-600 cursor-pointer disabled:opacity-60">
            {isGeneratingDesigns ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />}
            Generate (2-step) <ArrowRight size={18} />
          </button>}
          {false && <button onClick={handleGenerateApp2} disabled={anyLoading}
            className="flex-1 flex items-center justify-center gap-2 py-3.5 px-6 rounded-xl text-white font-semibold text-base bg-gradient-to-r from-emerald-600 to-teal-600 cursor-pointer disabled:opacity-60">
            {isGeneratingApp2 ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />}
            App2 (1-step) <ArrowRight size={18} />
          </button>}
          {false && <button onClick={handleGenerateApp3} disabled={anyLoading}
            className="flex-1 flex items-center justify-center gap-2 py-3.5 px-6 rounded-xl text-white font-semibold text-base bg-gradient-to-r from-indigo-600 to-purple-600 cursor-pointer disabled:opacity-60">
            {isGeneratingApp3 ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />}
            App3 (lean) <ArrowRight size={18} />
          </button>}
          <button
            onClick={handleGenerateApp4}
            disabled={anyLoading}
            className="w-full flex items-center justify-center gap-2 py-3.5 px-6
              rounded-xl text-white font-semibold text-base
              bg-gradient-to-r from-indigo-600 to-purple-600
              hover:from-indigo-700 hover:to-purple-700
              transition-all duration-200 shadow-lg shadow-indigo-200
              cursor-pointer disabled:opacity-60"
          >
            {isGeneratingApp4 ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <Sparkles size={18} />
            )}
            Generate Designs
            <ArrowRight size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}
