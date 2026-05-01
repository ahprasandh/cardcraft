
import { useWizardStore } from "@/lib/store";
import BusinessCard from "@/components/BusinessCard";
import { PartyPopper, RotateCcw } from "lucide-react";

export default function ConfirmationStep() {
  const { selectedDesign, selectedPrinter, cardInfo, orderDetails, reset } =
    useWizardStore();

  return (
    <div className="w-full max-w-2xl mx-auto overflow-y-auto">
      <div className="mb-8 text-center">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <PartyPopper size={36} className="text-green-600" />
        </div>
        <h2 className="text-3xl font-bold text-gray-900">
          Order Placed!
        </h2>
        <p className="mt-2 text-gray-500">
          Your business cards are on their way. Here&apos;s your order summary.
        </p>
      </div>

      {/* Card preview — same as Order page */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6 mb-8">
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">
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
      <div className="bg-white rounded-2xl border border-gray-100 p-6 text-left mb-8">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-400">Quantity</span>
            <p className="font-semibold text-gray-900">
              {orderDetails.quantity} cards
            </p>
          </div>
          <div>
            <span className="text-gray-400">Paper</span>
            <p className="font-semibold text-gray-900 capitalize">
              {orderDetails.paperStock}
            </p>
          </div>
          <div>
            <span className="text-gray-400">Finish</span>
            <p className="font-semibold text-gray-900 capitalize">
              {orderDetails.finish}
            </p>
          </div>
          <div>
            <span className="text-gray-400">Total</span>
            <p className="font-semibold text-green-600 text-lg">
              ${orderDetails.estimatedPrice}
            </p>
          </div>
          <div className="col-span-2">
            <span className="text-gray-400">Printing at</span>
            <p className="font-semibold text-gray-900">
              {selectedPrinter?.name}
            </p>
            <p className="text-gray-500 text-xs">
              {selectedPrinter?.address} &middot; {selectedPrinter?.distance}
            </p>
          </div>
          <div className="col-span-2">
            <span className="text-gray-400">Estimated Delivery</span>
            <p className="font-semibold text-gray-900">
              {orderDetails.estimatedDelivery}
            </p>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-center gap-4">
        <button
          onClick={reset}
          className="flex items-center gap-2 px-6 py-2.5 rounded-xl border border-gray-200 
            text-gray-600 hover:bg-gray-50 transition-colors text-sm font-medium"
        >
          <RotateCcw size={16} />
          Design Another Card
        </button>
      </div>
    </div>
  );
}
