/**
 * Mounts a single <style> tag into <head> with @font-face declarations for
 * each custom font registered on the current design.
 *
 * Why a portal-style component instead of a CSS file: custom fonts are
 * design-scoped (they ship inside the share-link config), so they're only
 * known at runtime — not at build time. Each font entry contains a base64
 * data URL, which we splice straight into a `src: url(...)` clause. Because
 * the resulting <style> is same-origin, dom-to-image can read its cssRules
 * during PNG/PDF export — exactly the constraint that ruled out Google
 * Fonts earlier.
 *
 * The component is cheap: it produces one <style> per design, replaces it
 * on edit, and removes it on unmount.
 */
import { useEffect } from "react";
import type { CustomFont } from "@/lib/types";

const STYLE_ID = "cardcraft-custom-fonts";

function formatHint(mime?: string): string {
  if (!mime) return "woff2";
  if (mime.includes("woff2")) return "woff2";
  if (mime.includes("woff")) return "woff";
  if (mime.includes("ttf") || mime.includes("truetype")) return "truetype";
  if (mime.includes("otf") || mime.includes("opentype")) return "opentype";
  return "woff2";
}

export default function CustomFontInjector({ fonts }: { fonts?: CustomFont[] }) {
  useEffect(() => {
    if (!fonts || fonts.length === 0) {
      const existing = document.getElementById(STYLE_ID);
      if (existing) existing.remove();
      return;
    }
    const css = fonts
      .map((f) => `@font-face {
  font-family: ${JSON.stringify(f.family)};
  src: url(${JSON.stringify(f.dataUrl)}) format(${JSON.stringify(formatHint(f.mime))});
  font-display: swap;
}`)
      .join("\n");
    let style = document.getElementById(STYLE_ID) as HTMLStyleElement | null;
    if (!style) {
      style = document.createElement("style");
      style.id = STYLE_ID;
      document.head.appendChild(style);
    }
    style.textContent = css;
  }, [fonts]);

  return null;
}
