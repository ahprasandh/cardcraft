import { useWizardStore } from "@/lib/store";
import StepIndicator from "@/components/StepIndicator";
import CardInfoStep from "@/components/steps/CardInfoStep";
import DesignPickerStep from "@/components/steps/DesignPickerStep";
import RefinementStep from "@/components/steps/RefinementStep";
import PrintFlowModal from "@/components/PrintFlowModal";
import Logo from "@/components/Logo";
import type { WizardStep } from "@/lib/types";

const PRINT_FLOW: WizardStep[] = ["printers", "order", "confirmation"];

export default function Home() {
  const { step } = useWizardStore();
  const inPrintFlow = PRINT_FLOW.includes(step);

  /**
   * The print flow runs as a modal sheet over the Refine step. So while
   * `step` is one of "printers"/"order"/"confirmation", the main content
   * area still renders `RefinementStep` underneath. This is what gives
   * the user the sense that they never left their design.
   */
  const renderStep = () => {
    if (inPrintFlow) return <RefinementStep />;
    switch (step) {
      case "info":
        return <CardInfoStep />;
      case "designs":
        return <DesignPickerStep />;
      case "refine":
        return <RefinementStep />;
      default:
        return <CardInfoStep />;
    }
  };

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-white">

      {/* Header */}
      <header className="shrink-0 border-b border-[#0e0f0c]/12 bg-white z-40">
        <div className="w-full px-6 py-2.5 flex items-center justify-between">
          <a href="#/" className="flex items-center">
            <Logo variant="light" size={32} />
          </a>
          <StepIndicator />
        </div>
      </header>

      {/* Main content — CardInfoStep manages its own padding so the
           dark right panel can bleed edge-to-edge. */}
      <main className="flex-1 min-h-0 flex flex-col overflow-hidden">
        <div className={`flex-1 min-h-0 w-full flex flex-col ${step === "info" ? "" : "px-6 py-2"}`}>
          {renderStep()}
        </div>
      </main>

      {/* Footer — same agent-discoverability copy as Gallery/Render so
           AI agents that introspect any page on the site can find skill.md. */}
      <footer className="shrink-0 border-t border-[#0e0f0c]/12 bg-white py-3">
        <div className="w-full px-6 text-center text-xs text-[#454745]">
          <span className="text-[#868685]">AI assistant?</span>{" "}
          <a href="/skill.md" target="_blank" rel="noreferrer" className="font-medium hover:text-[#0e0f0c] transition-colors">
            /skill.md
          </a>{" "}
          <span className="text-[#868685]">tells you how to generate cards via the API.</span>
        </div>
      </footer>

      {/* Print-flow sheet overlays the Refine step */}
      <PrintFlowModal />
    </div>
  );
}
