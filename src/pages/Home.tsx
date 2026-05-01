import { useWizardStore } from "@/lib/store";
import StepIndicator from "@/components/StepIndicator";
import CardInfoStep from "@/components/steps/CardInfoStep";
import DesignPickerStep from "@/components/steps/DesignPickerStep";
import RefinementStep from "@/components/steps/RefinementStep";
import FindPrintersStep from "@/components/steps/FindPrintersStep";
import OrderStep from "@/components/steps/OrderStep";
import ConfirmationStep from "@/components/steps/ConfirmationStep";
import { CreditCard } from "lucide-react";

export default function Home() {
  const { step } = useWizardStore();

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
    <div className="h-screen flex flex-col overflow-hidden bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20">

      {/* Header */}
      <header className="shrink-0 border-b border-gray-100 bg-white/70 backdrop-blur-md z-40">
        <div className="max-w-6xl mx-auto px-4 py-2.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center">
              <CreditCard size={16} className="text-white" />
            </div>
            <div>
              <h1 className="text-base font-bold text-gray-900 leading-none">
                CardCraft
              </h1>
              <span className="text-[9px] font-medium text-blue-600 uppercase tracking-wider">
                Design in seconds
              </span>
            </div>
          </div>
          {step !== "confirmation" && <StepIndicator />}
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 min-h-0 flex flex-col overflow-hidden">
        <div className="flex-1 min-h-0 w-full px-6 py-2 flex flex-col">{renderStep()}</div>
      </main>

      {/* Footer */}
      <footer className="shrink-0 border-t border-gray-100 bg-white/50 py-2">
        <div className="max-w-6xl mx-auto px-4 text-center text-[10px] text-gray-400">
          CardCraft &middot; Design, Print, Done.
        </div>
      </footer>
    </div>
  );
}
