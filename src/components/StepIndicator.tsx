
import { useWizardStore } from "@/lib/store";
import type { WizardStep } from "@/lib/types";
import { Check } from "lucide-react";

/**
 * Three-step design phase. Print flow (printers/order/confirmation) is
 * deliberately omitted — those run inside a modal sheet over the Refine
 * step so the user never feels like they "left" their design.
 */
const STEPS: { key: WizardStep; label: string }[] = [
  { key: "info", label: "Your Info" },
  { key: "designs", label: "Pick Design" },
  { key: "refine", label: "Refine" },
];

const designStepOrder: WizardStep[] = ["info", "designs", "refine"];
/** Print-flow steps still highlight Refine in the indicator. */
const PRINT_FLOW: WizardStep[] = ["printers", "order", "confirmation"];

function effectiveStepIndex(step: WizardStep) {
  if (PRINT_FLOW.includes(step)) return designStepOrder.indexOf("refine");
  return designStepOrder.indexOf(step);
}

export default function StepIndicator() {
  const { step: currentStep } = useWizardStore();
  const currentIndex = effectiveStepIndex(currentStep);

  return (
    <div className="flex items-center">
      {STEPS.map((s, i) => {
        const stepIndex = designStepOrder.indexOf(s.key);
        const isComplete = currentIndex > stepIndex;
        const isCurrent = currentIndex === stepIndex;

        return (
          <div key={s.key} className="flex items-center">
            <div className="flex items-center gap-1.5">
              <div
                className={`
                  w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-semibold
                  transition-all duration-300
                  ${isComplete ? "bg-[#9fe870] text-[#163300]" : ""}
                  ${isCurrent ? "bg-[#0e0f0c] text-[#9fe870] ring-2 ring-[#9fe870]/30" : ""}
                  ${!isComplete && !isCurrent ? "bg-[#0e0f0c]/8 text-[#868685]" : ""}
                `}
              >
                {isComplete ? <Check size={11} /> : i + 1}
              </div>
              <span
                className={`text-sm font-medium whitespace-nowrap ${
                  isCurrent
                    ? "text-[#0e0f0c]"
                    : isComplete
                      ? "text-[#454745]"
                      : "text-[#868685]"
                }`}
              >
                {s.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div
                className={`w-4 h-[1.5px] mx-2 transition-colors duration-300 ${
                  currentIndex > stepIndex ? "bg-[#9fe870]" : "bg-[#0e0f0c]/12"
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
