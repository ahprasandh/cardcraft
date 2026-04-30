// ---- Logo / Icon Repository ----
// Simple SVG logos the LLM can pick for each card design.
// These are small geometric/abstract icons rendered inline.

import React from "react";

export type LogoId =
  | "none"
  | "circle-letter"
  | "square-letter"
  | "rounded-letter"
  | "diamond"
  | "hexagon"
  | "shield"
  | "leaf"
  | "star"
  | "abstract-wave"
  | "arrow-up"
  | "gear"
  | "lighthouse"
  | "book"
  | "crown"
  | "mountains"
  | "globe"
  | "code-brackets"
  | "heart-pulse"
  | "flame";

export interface LogoMeta {
  id: LogoId;
  name: string;
  description: string;
  bestFor: string;
}

export const LOGOS: LogoMeta[] = [
  { id: "none", name: "No Logo", description: "Text-only card with no logo icon.", bestFor: "ultra-minimal designs" },
  { id: "circle-letter", name: "Circle Letter", description: "First letter of the company inside a circle.", bestFor: "general business, corporate, startups" },
  { id: "square-letter", name: "Square Letter", description: "First letter of the company inside a rounded square.", bestFor: "tech, apps, software companies" },
  { id: "rounded-letter", name: "Rounded Badge", description: "First letter inside a soft rounded rectangle badge.", bestFor: "modern brands, SaaS, agencies" },
  { id: "diamond", name: "Diamond", description: "Clean diamond/rhombus shape with company initial.", bestFor: "luxury, jewelry, fashion, premium" },
  { id: "hexagon", name: "Hexagon", description: "Hexagonal shape with initial inside.", bestFor: "tech, biotech, engineering, innovation" },
  { id: "shield", name: "Shield", description: "Shield/crest shape with initial, conveying trust and protection.", bestFor: "security, insurance, law, finance" },
  { id: "leaf", name: "Leaf", description: "Simple leaf outline, eco and nature themed.", bestFor: "organic, environmental, wellness, agriculture" },
  { id: "star", name: "Star", description: "Five-pointed star with initial or standalone.", bestFor: "entertainment, events, hospitality, awards" },
  { id: "abstract-wave", name: "Abstract Wave", description: "Flowing wave curves, modern and dynamic.", bestFor: "creative, media, music, water-related" },
  { id: "arrow-up", name: "Arrow Up", description: "Upward arrow/chevron suggesting growth and progress.", bestFor: "finance, consulting, coaching, startups" },
  { id: "gear", name: "Gear", description: "Simple gear/cog icon for engineering and industry.", bestFor: "manufacturing, engineering, automotive, IT" },
  { id: "lighthouse", name: "Lighthouse", description: "Lighthouse silhouette suggesting guidance and reliability.", bestFor: "consulting, education, mentoring, real estate" },
  { id: "book", name: "Book", description: "Open book icon for knowledge and learning.", bestFor: "education, publishing, libraries, research" },
  { id: "crown", name: "Crown", description: "Simple crown suggesting premium quality and leadership.", bestFor: "luxury, premium services, leadership coaching" },
  { id: "mountains", name: "Mountains", description: "Mountain peaks silhouette for adventure and outdoors.", bestFor: "travel, outdoor, adventure, real estate" },
  { id: "globe", name: "Globe", description: "Simple globe/world outline for international reach.", bestFor: "import/export, translation, NGOs, logistics" },
  { id: "code-brackets", name: "Code Brackets", description: "Angle brackets < /> for coding and development.", bestFor: "developers, software, tech, IT services" },
  { id: "heart-pulse", name: "Heart Pulse", description: "Heart with pulse line for health and care.", bestFor: "healthcare, medical, fitness, wellness" },
  { id: "flame", name: "Flame", description: "Simple flame icon for energy and passion.", bestFor: "restaurants, energy, passion brands, fitness" },
];

interface LogoProps {
  logoId: LogoId;
  letter: string; // first letter of company name
  size: number;   // pixel size
  color: string;  // primary color
  bgColor?: string; // optional background color
}

/**
 * Renders a simple SVG logo based on the logoId.
 * Returns null for "none".
 */
export function LogoIcon({ logoId, letter, size, color, bgColor }: LogoProps): React.ReactElement | null {
  if (logoId === "none") return null;

  const l = letter.toUpperCase();
  const fontSize = Math.round((size * 0.45) / size * 40);
  const bg = bgColor || color + "15";

  const textEl = `<text x="20" y="21" text-anchor="middle" dominant-baseline="central" fill="${color}" font-size="${fontSize}" font-weight="700">${l}</text>`;

  let inner = "";
  switch (logoId) {
    case "circle-letter":
      inner = `<circle cx="20" cy="20" r="18" fill="${bg}" stroke="${color}" stroke-width="1.5" />${textEl}`;
      break;
    case "square-letter":
      inner = `<rect x="3" y="3" width="34" height="34" rx="6" fill="${bg}" stroke="${color}" stroke-width="1.5" />${textEl}`;
      break;
    case "rounded-letter":
      inner = `<rect x="2" y="6" width="36" height="28" rx="8" fill="${bg}" stroke="${color}" stroke-width="1.5" />${textEl}`;
      break;
    case "diamond":
      inner = `<rect x="6" y="6" width="28" height="28" rx="2" transform="rotate(45 20 20)" fill="${bg}" stroke="${color}" stroke-width="1.5" />${textEl}`;
      break;
    case "hexagon":
      inner = `<polygon points="20,2 36,11 36,29 20,38 4,29 4,11" fill="${bg}" stroke="${color}" stroke-width="1.5" />${textEl}`;
      break;
    case "shield":
      inner = `<path d="M20 3 L35 10 L35 24 Q35 34 20 38 Q5 34 5 24 L5 10 Z" fill="${bg}" stroke="${color}" stroke-width="1.5" />${textEl}`;
      break;
    case "leaf":
      inner = `<path d="M20 4 Q36 10 36 28 Q28 36 20 36 Q4 36 4 20 Q4 4 20 4 Z" fill="${bg}" stroke="${color}" stroke-width="1.5" /><path d="M10 32 Q20 20 34 10" stroke="${color}" stroke-width="0.8" opacity="0.5" />`;
      break;
    case "star":
      inner = `<polygon points="20,3 24,15 37,15 27,23 31,36 20,28 9,36 13,23 3,15 16,15" fill="${bg}" stroke="${color}" stroke-width="1.3" />`;
      break;
    case "abstract-wave":
      inner = `<circle cx="20" cy="20" r="18" fill="${bg}" stroke="${color}" stroke-width="1.2" /><path d="M6 20 Q13 12 20 20 Q27 28 34 20" stroke="${color}" stroke-width="2" fill="none" /><path d="M6 26 Q13 18 20 26 Q27 34 34 26" stroke="${color}" stroke-width="1.2" fill="none" opacity="0.4" />`;
      break;
    case "arrow-up":
      inner = `<circle cx="20" cy="20" r="18" fill="${bg}" stroke="${color}" stroke-width="1.2" /><path d="M13 24 L20 12 L27 24" stroke="${color}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" fill="none" /><line x1="20" y1="12" x2="20" y2="30" stroke="${color}" stroke-width="2.5" stroke-linecap="round" />`;
      break;
    case "gear":
      inner = `<circle cx="20" cy="20" r="8" fill="${bg}" stroke="${color}" stroke-width="1.5" /><circle cx="20" cy="20" r="14" fill="none" stroke="${color}" stroke-width="1" stroke-dasharray="4 3" /><circle cx="20" cy="20" r="4" fill="${color}" opacity="0.3" />`;
      break;
    case "lighthouse":
      inner = `<path d="M16 36 L14 18 L20 6 L26 18 L24 36 Z" fill="${bg}" stroke="${color}" stroke-width="1.5" /><circle cx="20" cy="12" r="3" fill="${color}" opacity="0.4" /><line x1="12" y1="36" x2="28" y2="36" stroke="${color}" stroke-width="1.5" />`;
      break;
    case "book":
      inner = `<path d="M7 8 Q20 4 20 4 L20 34 Q20 34 7 30 Z" fill="${bg}" stroke="${color}" stroke-width="1.3" /><path d="M33 8 Q20 4 20 4 L20 34 Q20 34 33 30 Z" fill="${bg}" stroke="${color}" stroke-width="1.3" />`;
      break;
    case "crown":
      inner = `<path d="M6 28 L10 12 L16 20 L20 8 L24 20 L30 12 L34 28 Z" fill="${bg}" stroke="${color}" stroke-width="1.5" /><line x1="6" y1="30" x2="34" y2="30" stroke="${color}" stroke-width="1.5" />`;
      break;
    case "mountains":
      inner = `<polygon points="3,34 15,10 27,34" fill="${bg}" stroke="${color}" stroke-width="1.3" /><polygon points="18,34 28,14 38,34" fill="${bg}" stroke="${color}" stroke-width="1.3" /><line x1="3" y1="34" x2="38" y2="34" stroke="${color}" stroke-width="1" />`;
      break;
    case "globe":
      inner = `<circle cx="20" cy="20" r="16" fill="${bg}" stroke="${color}" stroke-width="1.3" /><ellipse cx="20" cy="20" rx="8" ry="16" fill="none" stroke="${color}" stroke-width="0.8" /><line x1="4" y1="20" x2="36" y2="20" stroke="${color}" stroke-width="0.8" /><path d="M6 12 Q20 10 34 12" fill="none" stroke="${color}" stroke-width="0.6" /><path d="M6 28 Q20 30 34 28" fill="none" stroke="${color}" stroke-width="0.6" />`;
      break;
    case "code-brackets":
      inner = `<rect x="3" y="3" width="34" height="34" rx="6" fill="${bg}" stroke="${color}" stroke-width="1.2" /><text x="20" y="22" text-anchor="middle" dominant-baseline="central" fill="${color}" font-size="16" font-weight="600" font-family="monospace">&lt;/&gt;</text>`;
      break;
    case "heart-pulse":
      inner = `<path d="M20 34 Q6 24 6 14 Q6 6 13 6 Q18 6 20 12 Q22 6 27 6 Q34 6 34 14 Q34 24 20 34 Z" fill="${bg}" stroke="${color}" stroke-width="1.3" /><polyline points="10,20 16,20 18,14 22,26 24,20 30,20" stroke="${color}" stroke-width="1.5" fill="none" />`;
      break;
    case "flame":
      inner = `<path d="M20 4 Q28 14 28 22 Q28 32 20 36 Q12 32 12 22 Q12 14 20 4 Z" fill="${bg}" stroke="${color}" stroke-width="1.3" /><path d="M20 16 Q24 20 24 24 Q24 30 20 32 Q16 30 16 24 Q16 20 20 16 Z" fill="${color}" opacity="0.25" />`;
      break;
    default:
      return null;
  }

  const svgString = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 40 40" fill="none">${inner}</svg>`;
  const dataUrl = `data:image/svg+xml;base64,${btoa(svgString)}`;

  return (
    <img
      src={dataUrl}
      alt="Logo"
      width={size}
      height={size}
      className="shrink-0"
      style={{ width: size, height: size, minWidth: size, minHeight: size }}
    />
  );
}
