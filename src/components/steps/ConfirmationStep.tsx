
import { useWizardStore } from "@/lib/store";
import BusinessCard from "@/components/BusinessCard";
import { Check, RotateCcw } from "lucide-react";

export default function ConfirmationStep() {
  const { selectedDesign, selectedPrinter, cardInfo, orderDetails, reset } =
    useWizardStore();

  return (
    <div className="w-full max-w-2xl mx-auto overflow-y-auto">
      <div className="mb-8 text-center">
        <div className="w-20 h-20 bg-[#9fe870] rounded-full flex items-center justify-center mx-auto mb-4">
          <Check size={36} className="text-[#163300]" strokeWidth={3} />
        </div>
        <h2 className="text-3xl font-bold text-[#0e0f0c]">
          Your order details are ready
        </h2>
        <p className="mt-2 text-[#454745]">
          Take these files to your printer, or download them for later.
        </p>
      </div>

      {/* Card preview */}
      <div className="bg-white rounded-2xl border border-[#0e0f0c]/12 p-6 mb-8">
        <h3 className="text-xs font-semibold text-[#454745] uppercase tracking-wider mb-4">
          Your Card
        </h3>
        <div className="flex justify-center">
          {selectedDesign && (
            <BusinessCard
              design={selectedDesign}
              info={cardInfo}
              size="medium"
            />
          )}
        </div>
      </div>

      {/* Order summary */}
      <div className="bg-white rounded-2xl border border-[#0e0f0c]/12 p-6 text-left mb-8">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-[#868685]">Quantity</span>
            <p className="font-semibold text-[#0e0f0c]">
              {orderDetails.quantity} cards
            </p>
          </div>
          <div>
            <span className="text-[#868685]">Paper</span>
            <p className="font-semibold text-[#0e0f0c] capitalize">
              {orderDetails.paperStock}
            </p>
          </div>
          <div>
            <span className="text-[#868685]">Finish</span>
            <p className="font-semibold text-[#0e0f0c] capitalize">
              {orderDetails.finish}
            </p>
          </div>
          <div>
            <span className="text-[#868685]">Estimated Total</span>
            <p className="font-semibold text-[#0e0f0c] text-lg">
              ${orderDetails.estimatedPrice}
            </p>
          </div>
          <div className="col-span-2">
            <span className="text-[#868685]">Suggested printer</span>
            <p className="font-semibold text-[#0e0f0c]">
              {selectedPrinter?.name}
            </p>
            <p className="text-[#454745] text-xs">
              {selectedPrinter?.address} &middot; {selectedPrinter?.distance}
            </p>
          </div>
          <div className="col-span-2">
            <span className="text-[#868685]">Typical turnaround</span>
            <p className="font-semibold text-[#0e0f0c]">
              {orderDetails.estimatedDelivery}
            </p>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-center gap-4">
        <button
          onClick={reset}
          className="flex items-center gap-2 px-6 py-2.5 rounded-full bg-[#0e0f0c]/8 text-[#0e0f0c] hover:bg-[#0e0f0c]/12 transition-colors text-sm font-semibold"
        >
          <RotateCcw size={16} />
          Design another card
        </button>
      </div>
    </div>
  );
}
