import type { Printer } from "./types";
import { v4 as uuidv4 } from "uuid";

const PRINTER_NAMES = [
  "FedEx Office Print & Ship Center",
  "The UPS Store",
  "Staples Print & Marketing",
  "Minuteman Press",
  "AlphaGraphics",
  "Sir Speedy",
  "PostNet Printing",
  "Moo Print Shop",
  "PrintingForLess.com Local",
  "Quick Print Solutions",
  "Metro Business Cards",
  "Elite Print Studio",
];

const STREETS = [
  "Main St", "Oak Ave", "Commerce Blvd", "Market St", "Tech Park Dr",
  "Business Loop", "Print Way", "Center Ave", "Broadway", "5th Ave",
];

const SPECIALTIES = [
  "Business Cards", "Premium Finishes", "Same-Day Printing",
  "Eco-Friendly Options", "Foil Stamping", "Embossing",
  "Die-Cut Cards", "Thick Card Stock", "UV Coating",
  "Letterpress", "Metal Cards", "NFC Cards",
];

export function generateMockPrinters(count: number = 6): Printer[] {
  const printers: Printer[] = [];

  for (let i = 0; i < count; i++) {
    const name = PRINTER_NAMES[i % PRINTER_NAMES.length];
    const street = STREETS[Math.floor(Math.random() * STREETS.length)];
    const num = Math.floor(Math.random() * 9000) + 100;
    const rating = Math.round((3.5 + Math.random() * 1.5) * 10) / 10;
    const distance = (0.3 + Math.random() * 8).toFixed(1);

    const numSpecialties = 2 + Math.floor(Math.random() * 3);
    const shuffled = [...SPECIALTIES].sort(() => Math.random() - 0.5);
    const specs = shuffled.slice(0, numSpecialties);

    const priceRanges = ["$", "$$", "$$$"];
    const turnarounds = [
      "Same day",
      "1-2 business days",
      "2-3 business days",
      "3-5 business days",
    ];

    printers.push({
      id: uuidv4(),
      name,
      address: `${num} ${street}`,
      distance: `${distance} mi`,
      rating,
      reviewCount: Math.floor(Math.random() * 500) + 20,
      phone: `(555) ${String(Math.floor(Math.random() * 900) + 100)}-${String(Math.floor(Math.random() * 9000) + 1000)}`,
      priceRange: priceRanges[Math.floor(Math.random() * priceRanges.length)],
      turnaround: turnarounds[Math.floor(Math.random() * turnarounds.length)],
      specialties: specs,
    });
  }

  // Sort by distance
  printers.sort(
    (a, b) => parseFloat(a.distance) - parseFloat(b.distance)
  );

  return printers;
}
