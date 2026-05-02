
import { useEffect, useState } from "react";
import { useWizardStore } from "@/lib/store";
import { generateMockPrinters } from "@/lib/printers";
import {
  ArrowLeft,
  ArrowRight,
  MapPin,
  Star,
  Clock,
  Phone,
} from "lucide-react";
import type { Printer } from "@/lib/types";

export default function FindPrintersStep() {
  const {
    printers,
    setPrinters,
    selectedPrinter,
    setSelectedPrinter,
    setStep,
    setOrderDetails,
  } = useWizardStore();

  const [isSearching, setIsSearching] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      const results = generateMockPrinters(6);
      setPrinters(results);
      setIsSearching(false);
    }, 2000);
    return () => clearTimeout(timer);
  }, [setPrinters]);

  const handleSelect = (printer: Printer) => {
    setSelectedPrinter(printer);
    setOrderDetails({ printerId: printer.id });
  };

  const handleProceed = () => {
    if (!selectedPrinter) return;
    setStep("order");
  };

  return (
    <div className="w-full max-w-4xl mx-auto flex-1 min-h-0 flex flex-col">
      {/* Top: Navigation */}
      <div className="shrink-0 flex items-center justify-between pb-4 border-b border-gray-100 mb-4">
        <div>
          <h2 className="text-sm font-bold text-gray-900">Pick your printer</h2>
          <p className="text-xs text-gray-500 mt-0.5">Select a nearby shop to print your cards</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setStep("refine")}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium
              text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors"
          >
            <ArrowLeft size={13} /> Back
          </button>
          <button
            onClick={handleProceed}
            disabled={!selectedPrinter}
            className={`flex items-center gap-1.5 px-5 py-2.5 rounded-full font-semibold text-xs transition-all ${
              selectedPrinter
                ? "bg-[#9fe870] text-[#163300] hover:bg-[#cdffad] hover:scale-[1.02] active:scale-[0.98]"
                : "bg-[#0e0f0c]/8 text-[#868685] cursor-not-allowed"
            }`}
          >
            Place Order <ArrowRight size={13} />
          </button>
        </div>
      </div>

      {/* Bottom: Scrollable content */}
      <div className="flex-1 min-h-0 overflow-y-auto">

      {isSearching ? (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="relative mb-6">
            <div className="w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center">
              <MapPin size={28} className="text-blue-500" />
            </div>
            <div className="absolute inset-0 w-16 h-16 rounded-full border-2 border-blue-200 animate-ping opacity-40" />
          </div>
          <p className="text-gray-700 font-medium">
            Searching nearby print shops...
          </p>
          <p className="text-gray-400 text-sm mt-1">
            Finding the best options for your cards
          </p>
        </div>
      ) : (
        <>
          <div className="space-y-4">
            {printers.map((printer) => (
              <div
                key={printer.id}
                onClick={() => handleSelect(printer)}
                className={`
                  p-5 rounded-xl border-2 cursor-pointer transition-all duration-200
                  ${
                    selectedPrinter?.id === printer.id
                      ? "border-[#9fe870] bg-[#9fe870]/8"
                      : "border-[#0e0f0c]/12 bg-white hover:border-[#0e0f0c]/24"
                  }
                `}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-gray-900">
                        {printer.name}
                      </h3>
                      <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
                        {printer.priceRange}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 mt-1.5 text-sm text-gray-500">
                      <span className="flex items-center gap-1">
                        <MapPin size={14} />
                        {printer.address} &middot; {printer.distance}
                      </span>
                      <span className="flex items-center gap-1">
                        <Phone size={14} />
                        {printer.phone}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 mt-2">
                      <span className="flex items-center gap-1 text-sm">
                        <Star
                          size={14}
                          className="text-yellow-400 fill-yellow-400"
                        />
                        <span className="font-medium text-gray-700">
                          {printer.rating}
                        </span>
                        <span className="text-gray-400">
                          ({printer.reviewCount})
                        </span>
                      </span>
                      <span className="flex items-center gap-1 text-sm text-gray-500">
                        <Clock size={14} />
                        {printer.turnaround}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1.5 mt-2.5">
                      {printer.specialties.map((spec) => (
                        <span
                          key={spec}
                          className="text-xs bg-gray-50 text-gray-500 px-2 py-0.5 rounded border border-gray-100"
                        >
                          {spec}
                        </span>
                      ))}
                    </div>
                  </div>
                  {selectedPrinter?.id === printer.id && (
                    <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0 mt-1">
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="white"
                        strokeWidth="3"
                      >
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

        </>
      )}
      </div>
    </div>
  );
}
