
import { useWizardStore } from "@/lib/store";
import type { WizardStep } from "@/lib/types";
import { Check } from "lucide-react";

const STEPS: { key: WizardStep; label: string }[] = [
  { key: "info", label: "Your Info" },
  { key: "designs", label: "Pick Design" },
  { key: "refine", label: "Preview" },
  { key: "printers", label: "Find Printer" },
  { key: "order", label: "Order" },
];

const stepOrder: WizardStep[] = [
  "info",
  "designs",
  "refine",
  "printers",
  "order",
  "confirmation",
];

function getStepIndex(step: WizardStep) {
  return stepOrder.indexOf(step);
}

export default function StepIndicator() {
  const { step: currentStep } = useWizardStore();
  const currentIndex = getStepIndex(currentStep);

  return (
    <div className="flex items-center gap-1">
      <div className="flex items-center">
        {STEPS.map((s, i) => {
          const stepIndex = getStepIndex(s.key);
          const isComplete = currentIndex > stepIndex;
          const isCurrent = currentStep === s.key;

          return (
            <div key={s.key} className="flex items-center">
              <div className="flex items-center gap-1.5">
                <div
                  className={`
                    w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-semibold
                    transition-all duration-300
                    ${isComplete ? "bg-green-500 text-white" : ""}
                    ${isCurrent ? "bg-blue-600 text-white ring-2 ring-blue-200" : ""}
                    ${!isComplete && !isCurrent ? "bg-gray-200 text-gray-500" : ""}
                  `}
                >
                  {isComplete ? <Check size={10} /> : i + 1}
                </div>
                <span
                  className={`text-[10px] font-medium whitespace-nowrap ${
                    isCurrent
                      ? "text-blue-600"
                      : isComplete
                        ? "text-green-600"
                        : "text-gray-400"
                  }`}
                >
                  {s.label}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div
                  className={`w-4 h-[1.5px] mx-2 transition-colors duration-300 ${
                    currentIndex > stepIndex ? "bg-green-400" : "bg-gray-200"
                  }`}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
