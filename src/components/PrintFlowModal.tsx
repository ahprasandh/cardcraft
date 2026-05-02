/**
 * Slide-up sheet that hosts the print flow (FindPrinters → Order →
 * Confirmation) on top of the Refine step.
 *
 * Why a modal: the print flow is a separate mode (delivery/checkout) that
 * shouldn't compete with the design steps in the top step indicator.
 * Keeping the user "on" the Refine step visually preserves the sense that
 * they're not losing their design.
 *
 * The print sub-step is driven by the wizard store's existing `step`
 * value — so the inner components (`FindPrintersStep`, `OrderStep`,
 * `ConfirmationStep`) keep their existing `setStep(...)` navigation
 * unchanged. Closing the sheet just sets `step` back to `"refine"`.
 */
import { useEffect } from "react";
import { useWizardStore } from "@/lib/store";
import FindPrintersStep from "@/components/steps/FindPrintersStep";
import OrderStep from "@/components/steps/OrderStep";
import ConfirmationStep from "@/components/steps/ConfirmationStep";
import { X } from "lucide-react";
import type { WizardStep } from "@/lib/types";

const PRINT_FLOW: WizardStep[] = ["printers", "order", "confirmation"];

export default function PrintFlowModal() {
  const { step, setStep } = useWizardStore();
  const open = PRINT_FLOW.includes(step);

  // Esc closes the sheet (returns to refine)
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setStep("refine");
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, setStep]);

  // Lock body scroll while open
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  if (!open) return null;

  const close = () => setStep("refine");

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-[#0e0f0c]/40 backdrop-blur-sm"
        onClick={close}
        style={{ animation: "printSheetFadeIn 200ms ease-out" }}
      />

      {/* Sheet */}
      <div
        className="relative w-full sm:max-w-5xl bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col overflow-hidden"
        style={{
          height: "90vh",
          maxHeight: "90vh",
          animation: "printSheetSlideUp 250ms cubic-bezier(0.16, 1, 0.3, 1)",
        }}
      >
        {/* Drag handle (mobile) + close */}
        <div className="shrink-0 flex items-center justify-between px-4 pt-3 pb-2 border-b border-[#0e0f0c]/8">
          <div className="sm:hidden mx-auto w-8 h-1 rounded-full bg-[#0e0f0c]/16 absolute left-1/2 -translate-x-1/2 top-2" />
          <span className="text-xs font-semibold text-[#454745] uppercase tracking-wider">
            {step === "printers" && "Find a printer"}
            {step === "order" && "Review your order"}
            {step === "confirmation" && "Order summary"}
          </span>
          <button
            type="button"
            onClick={close}
            aria-label="Close print flow"
            className="p-1.5 rounded-full text-[#454745] hover:text-[#0e0f0c] hover:bg-[#0e0f0c]/8 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 min-h-0 overflow-y-auto px-4 sm:px-6 py-4">
          {step === "printers" && <FindPrintersStep />}
          {step === "order" && <OrderStep />}
          {step === "confirmation" && <ConfirmationStep />}
        </div>
      </div>

      <style>{`
        @keyframes printSheetFadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes printSheetSlideUp {
          from { transform: translateY(20px); opacity: 0; }
          to   { transform: translateY(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
