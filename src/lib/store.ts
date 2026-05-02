
import { create } from "zustand";
import type {
  CardInfo,
  CardDesign,
  Printer,
  OrderDetails,
  WizardStep,
} from "./types";

interface WizardState {
  step: WizardStep;
  cardInfo: CardInfo;
  designs: CardDesign[];
  selectedDesign: CardDesign | null;
  refinedDesigns: CardDesign[];
  printers: Printer[];
  selectedPrinter: Printer | null;
  orderDetails: OrderDetails;
  isLoading: boolean;

  setStep: (step: WizardStep) => void;
  setCardInfo: (info: Partial<CardInfo>) => void;
  setDesigns: (designs: CardDesign[]) => void;
  setSelectedDesign: (design: CardDesign | ((prev: CardDesign | null) => CardDesign | null)) => void;
  setRefinedDesigns: (designs: CardDesign[]) => void;
  setPrinters: (printers: Printer[]) => void;
  setSelectedPrinter: (printer: Printer) => void;
  setOrderDetails: (details: Partial<OrderDetails>) => void;
  setIsLoading: (loading: boolean) => void;
  reset: () => void;
}

const initialCardInfo: CardInfo = {
  name: "",
  title: "",
  company: "",
  email: "",
  phone: "",
  website: "",
  address: "",
  businessDescription: "",
  designExpectations: "",
  tagline: "",
  customLogoUrl: "",
  customLines: [],
};

const initialOrderDetails: OrderDetails = {
  quantity: 250,
  paperStock: "premium",
  finish: "matte",
  printerId: "",
  estimatedPrice: "",
  estimatedDelivery: "",
};

export const useWizardStore = create<WizardState>((set) => ({
  step: "info",
  cardInfo: initialCardInfo,
  designs: [],
  selectedDesign: null,
  refinedDesigns: [],
  printers: [],
  selectedPrinter: null,
  orderDetails: initialOrderDetails,
  isLoading: false,

  setStep: (step) => set({ step }),
  setCardInfo: (info) =>
    set((state) => ({ cardInfo: { ...state.cardInfo, ...info } })),
  setDesigns: (designs) => set({ designs }),
  setSelectedDesign: (design) => set((state) => ({
    selectedDesign: typeof design === "function" ? design(state.selectedDesign) : design,
  })),
  setRefinedDesigns: (designs) => set({ refinedDesigns: designs }),
  setPrinters: (printers) => set({ printers }),
  setSelectedPrinter: (printer) => set({ selectedPrinter: printer }),
  setOrderDetails: (details) =>
    set((state) => ({
      orderDetails: { ...state.orderDetails, ...details },
    })),
  setIsLoading: (loading) => set({ isLoading: loading }),
  reset: () =>
    set({
      step: "info",
      cardInfo: initialCardInfo,
      designs: [],
      selectedDesign: null,
      refinedDesigns: [],
      printers: [],
      selectedPrinter: null,
      orderDetails: initialOrderDetails,
      isLoading: false,
    }),
}));
