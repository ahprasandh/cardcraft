
import { useState } from "react";
import { useWizardStore } from "@/lib/store";
import BusinessCard from "@/components/BusinessCard";
import {
  ArrowLeft,
  CreditCard,
  Package,
  MapPin,
  Check,
  Loader2,
} from "lucide-react";

const PAPER_OPTIONS = [
  { value: "standard", label: "Standard 14pt", price: 0 },
  { value: "premium", label: "Premium 16pt", price: 10 },
  { value: "ultra", label: "Ultra Thick 32pt", price: 25 },
  { value: "recycled", label: "Eco Recycled", price: 5 },
];

const FINISH_OPTIONS = [
  { value: "matte", label: "Matte", price: 0 },
  { value: "gloss", label: "Gloss UV", price: 8 },
  { value: "soft-touch", label: "Soft Touch", price: 15 },
  { value: "spot-uv", label: "Spot UV", price: 20 },
];

const QUANTITY_OPTIONS = [100, 250, 500, 1000, 2500];

function calculatePrice(quantity: number, paperStock: string, finish: string): string {
  const base = quantity * 0.08;
  const paperExtra = PAPER_OPTIONS.find((p) => p.value === paperStock)?.price || 0;
  const finishExtra = FINISH_OPTIONS.find((f) => f.value === finish)?.price || 0;
  const total = base + paperExtra + finishExtra;
  return total.toFixed(2);
}

export default function OrderStep() {
  const {
    selectedDesign,
    selectedPrinter,
    cardInfo,
    orderDetails,
    setOrderDetails,
    setStep,
  } = useWizardStore();

  const [isPlacing, setIsPlacing] = useState(false);

  const price = calculatePrice(
    orderDetails.quantity,
    orderDetails.paperStock,
    orderDetails.finish
  );

  const handlePlaceOrder = () => {
    setIsPlacing(true);
    setTimeout(() => {
      setOrderDetails({
        estimatedPrice: price,
        estimatedDelivery: "3-5 business days",
      });
      setIsPlacing(false);
      setStep("confirmation");
    }, 2500);
  };

  return (
    <div className="w-full max-w-4xl mx-auto">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-gray-900">Review & Order</h2>
        <p className="mt-2 text-gray-500">
          Almost there! Review your order and place it
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left: Card preview and printer info */}
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-gray-100 p-6">
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

          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
              <MapPin size={14} className="inline mr-1" />
              Printing With
            </h3>
            {selectedPrinter && (
              <div>
                <p className="font-semibold text-gray-900">
                  {selectedPrinter.name}
                </p>
                <p className="text-sm text-gray-500 mt-0.5">
                  {selectedPrinter.address} &middot; {selectedPrinter.distance}
                </p>
                <p className="text-sm text-gray-500">
                  {selectedPrinter.phone}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Right: Order options */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">
            <Package size={14} className="inline mr-1" />
            Order Options
          </h3>

          {/* Quantity */}
          <div className="mb-5">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Quantity
            </label>
            <div className="flex flex-wrap gap-2">
              {QUANTITY_OPTIONS.map((qty) => (
                <button
                  key={qty}
                  onClick={() => setOrderDetails({ quantity: qty })}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    orderDetails.quantity === qty
                      ? "bg-blue-600 text-white shadow-md"
                      : "bg-gray-50 text-gray-600 hover:bg-gray-100 border border-gray-200"
                  }`}
                >
                  {qty}
                </button>
              ))}
            </div>
          </div>

          {/* Paper Stock */}
          <div className="mb-5">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Paper Stock
            </label>
            <div className="space-y-2">
              {PAPER_OPTIONS.map((opt) => (
                <label
                  key={opt.value}
                  className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-all ${
                    orderDetails.paperStock === opt.value
                      ? "border-blue-500 bg-blue-50"
                      : "border-gray-100 hover:border-gray-300"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="paperStock"
                      value={opt.value}
                      checked={orderDetails.paperStock === opt.value}
                      onChange={() =>
                        setOrderDetails({ paperStock: opt.value })
                      }
                      className="accent-blue-600"
                    />
                    <span className="text-sm text-gray-700">{opt.label}</span>
                  </div>
                  {opt.price > 0 && (
                    <span className="text-xs text-gray-400">
                      +${opt.price}
                    </span>
                  )}
                </label>
              ))}
            </div>
          </div>

          {/* Finish */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Finish
            </label>
            <div className="space-y-2">
              {FINISH_OPTIONS.map((opt) => (
                <label
                  key={opt.value}
                  className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-all ${
                    orderDetails.finish === opt.value
                      ? "border-blue-500 bg-blue-50"
                      : "border-gray-100 hover:border-gray-300"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="finish"
                      value={opt.value}
                      checked={orderDetails.finish === opt.value}
                      onChange={() => setOrderDetails({ finish: opt.value })}
                      className="accent-blue-600"
                    />
                    <span className="text-sm text-gray-700">{opt.label}</span>
                  </div>
                  {opt.price > 0 && (
                    <span className="text-xs text-gray-400">
                      +${opt.price}
                    </span>
                  )}
                </label>
              ))}
            </div>
          </div>

          {/* Price Summary */}
          <div className="border-t border-gray-100 pt-4">
            <div className="flex justify-between items-center mb-4">
              <span className="text-gray-600">Estimated Total</span>
              <span className="text-2xl font-bold text-gray-900">${price}</span>
            </div>
            <button
              onClick={handlePlaceOrder}
              disabled={isPlacing}
              className="w-full flex items-center justify-center gap-2 py-3 px-6 
                rounded-xl text-white font-semibold
                bg-gradient-to-r from-green-500 to-emerald-600
                hover:from-green-600 hover:to-emerald-700
                disabled:opacity-70
                shadow-lg shadow-green-200 transition-all"
            >
              {isPlacing ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Placing Order...
                </>
              ) : (
                <>
                  <CreditCard size={18} />
                  Place Order - ${price}
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      <div className="mt-6">
        <button
          onClick={() => setStep("printers")}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-gray-200 
            text-gray-600 hover:bg-gray-50 transition-colors text-sm font-medium"
        >
          <ArrowLeft size={16} />
          Change Printer
        </button>
      </div>
    </div>
  );
}
