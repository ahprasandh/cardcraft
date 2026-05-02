/**
 * Brand mark + wordmark.
 *
 * - Mark: an abstract C formed by an open card edge, with a small accent
 *   rectangle inside it. Drawn inline as SVG so it ships zero requests
 *   and inherits color via stroke/fill props.
 * - Wordmark: "CardCraft" with `Card` in pure black and `Craft` in the
 *   green accent. Uses the app's default sans (Tailwind system stack);
 *   no external font load.
 *
 * Variants:
 *   - "light"  → for light-bg headers (default in this app)
 *   - "dark"   → for dark-bg surfaces
 *   - "mono"   → all black (print / single-color contexts)
 */
interface LogoProps {
  variant?: "light" | "dark" | "mono";
  /** Pixel size of the SVG mark. Wordmark scales relative to this. */
  size?: number;
  /** Hide the wordmark and render the mark only (favicon-style). */
  markOnly?: boolean;
  className?: string;
}

const ACCENT = "#9fe870";
const PURE_BLACK = "#000000";
const OFF_WHITE = "#fafaf7";

export default function Logo({
  variant = "light",
  size = 28,
  markOnly = false,
  className = "",
}: LogoProps) {
  // Mark colors per variant
  const stroke =
    variant === "mono" ? PURE_BLACK : ACCENT;
  // Rect inside the C: black at 60% on light/mono, accent at 20% on dark.
  const rectFill =
    variant === "dark" ? ACCENT : PURE_BLACK;
  const rectOpacity = variant === "dark" ? 0.2 : 0.6;

  // Wordmark colors per variant — Card text uses pure black on light
  const cardColor =
    variant === "dark" ? OFF_WHITE : PURE_BLACK;
  const craftColor =
    variant === "mono" ? PURE_BLACK : ACCENT;

  const Mark = (
    <svg
      width={size}
      height={size}
      viewBox="0 0 36 36"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden={markOnly ? undefined : true}
      role={markOnly ? "img" : undefined}
      aria-label={markOnly ? "CardCraft" : undefined}
    >
      <path
        d="M28 6H10C6.7 6 4 8.7 4 12v12c0 3.3 2.7 6 6 6h18"
        stroke={stroke}
        strokeWidth={3}
        strokeLinecap="round"
        fill="none"
      />
      <rect
        x={22}
        y={10}
        width={12}
        height={16}
        rx={2}
        fill={rectFill}
        opacity={rectOpacity}
      />
    </svg>
  );

  if (markOnly) return <span className={className}>{Mark}</span>;

  // Wordmark size scales with mark size (default mark 28 → text ~17px)
  const fontSizePx = Math.round(size * 0.6);

  return (
    <span className={`flex items-center gap-2 ${className}`}>
      {Mark}
      <span
        className="font-black tracking-tight leading-none"
        style={{ fontSize: fontSizePx, letterSpacing: "-0.02em" }}
      >
        <span style={{ color: cardColor }}>Card</span>
        <span style={{ color: craftColor }}>Craft</span>
      </span>
    </span>
  );
}
