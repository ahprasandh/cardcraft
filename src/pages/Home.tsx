import { useWizardStore } from "@/lib/store";
import StepIndicator from "@/components/StepIndicator";
import LoadingOverlay from "@/components/LoadingOverlay";
import CardInfoStep from "@/components/steps/CardInfoStep";
import DesignPickerStep from "@/components/steps/DesignPickerStep";
import RefinementStep from "@/components/steps/RefinementStep";
import FindPrintersStep from "@/components/steps/FindPrintersStep";
import OrderStep from "@/components/steps/OrderStep";
import ConfirmationStep from "@/components/steps/ConfirmationStep";
import { CreditCard } from "lucide-react";

export default function Home() {
  const { step, isLoading } = useWizardStore();

  const renderStep = () => {
    switch (step) {
      case "info":
        return <CardInfoStep />;
      case "designs":
        return <DesignPickerStep />;
      case "refine":
        return <RefinementStep />;
      case "printers":
        return <FindPrintersStep />;
      case "order":
        return <OrderStep />;
      case "confirmation":
        return <ConfirmationStep />;
      default:
        return <CardInfoStep />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20">
      {isLoading && <LoadingOverlay />}

      {/* Header */}
      <header className="border-b border-gray-100 bg-white/70 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center">
              <CreditCard size={18} className="text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900 leading-none">
                CardCraft
              </h1>
              <span className="text-[10px] font-medium text-blue-600 uppercase tracking-wider">
                Design in seconds
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Step indicator */}
      {step !== "confirmation" && (
        <div className="py-6">
          <StepIndicator />
        </div>
      )}

      {/* Main content */}
      <main className="max-w-6xl mx-auto px-4 py-8 pb-20">{renderStep()}</main>

      {/* Footer */}
      <footer className="border-t border-gray-100 bg-white/50 py-4 mt-auto">
        <div className="max-w-6xl mx-auto px-4 text-center text-xs text-gray-400">
          CardCraft AI &middot; Design, Print, Done.
        </div>
      </footer>
    </div>
  );
}
