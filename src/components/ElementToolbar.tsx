/**
 * ElementToolbar — reusable editing controls for positioned elements.
 *
 * Provides: position pad, size ±, color picker, opacity slider.
 * Used by the reference catalog spec editor and (eventually) RefinementStep.
 */

import { ArrowUp, ArrowDown, ArrowLeft, ArrowRight, Minus, Plus, RotateCcw } from "lucide-react";

export interface ElementToolbarProps {
  /** Display label for the selected element */
  label: string;
  /** Current x position */
  x: number;
  /** Current y position */
  y: number;
  /** Current width */
  width?: number;
  /** Current height */
  height?: number;
  /** Current font size (for text elements) */
  fontSize?: number;
  /** Current color (hex) */
  color?: string;
  /** Current opacity (0–1) */
  opacity?: number;
  /** Whether size controls use width/height (image, shape) vs fontSize (text) */
  sizeMode?: "dimensions" | "font";
  /** Called when position changes */
  onMove: (dx: number, dy: number) => void;
  /** Called when size changes */
  onResize?: (delta: number) => void;
  /** Called when width/height change separately */
  onResizeDimensions?: (dw: number, dh: number) => void;
  /** Called when color changes */
  onColorChange?: (hex: string) => void;
  /** Called when opacity changes */
  onOpacityChange?: (opacity: number) => void;
  /** Called to reset element */
  onReset?: () => void;
  /** Called to close/deselect */
  onClose?: () => void;
}

const MOVE_STEP = 2;

export default function ElementToolbar({
  label,
  x,
  y,
  width,
  height,
  fontSize,
  color,
  opacity = 1,
  sizeMode = "font",
  onMove,
  onResize,
  onResizeDimensions,
  onColorChange,
  onOpacityChange,
  onReset,
  onClose,
}: ElementToolbarProps) {
  const btnClass = "w-7 h-7 flex items-center justify-center rounded bg-gray-100 hover:bg-[#9fe870]/30 text-[#454745] hover:text-[#0e0f0c]";
  const smallBtnClass = "w-6 h-6 flex items-center justify-center rounded bg-gray-100 hover:bg-[#9fe870]/30 text-[#454745] hover:text-[#0e0f0c]";

  return (
    <div className="bg-white rounded-xl shadow-md border border-gray-200 p-3 w-full max-w-md">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold text-[#0e0f0c]">{label}</span>
        <div className="flex items-center gap-2">
          {onReset && (
            <button type="button" onClick={onReset}
              className="flex items-center gap-1 text-[10px] text-gray-400 hover:text-red-500">
              <RotateCcw size={10} /> Reset
            </button>
          )}
          {onClose && (
            <button type="button" onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-sm">✕</button>
          )}
        </div>
      </div>

      <div className="flex gap-3 items-start">
        {/* Position pad */}
        <div className="flex flex-col items-center gap-0.5">
          <button type="button" onClick={() => onMove(0, -MOVE_STEP)} className={btnClass}>
            <ArrowUp size={12} />
          </button>
          <div className="flex gap-0.5">
            <button type="button" onClick={() => onMove(-MOVE_STEP, 0)} className={btnClass}>
              <ArrowLeft size={12} />
            </button>
            <button type="button" onClick={() => onMove(MOVE_STEP, 0)} className={btnClass}>
              <ArrowRight size={12} />
            </button>
          </div>
          <button type="button" onClick={() => onMove(0, MOVE_STEP)} className={btnClass}>
            <ArrowDown size={12} />
          </button>
          <div className="text-[9px] text-gray-400 mt-1 text-center leading-tight">
            x: {Math.round(x)}, y: {Math.round(y)}
          </div>
        </div>

        {/* Size + Color + Opacity */}
        <div className="flex-1 space-y-2">
          {/* Font size (text elements) */}
          {sizeMode === "font" && fontSize !== undefined && onResize && (
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-gray-400 w-12">Font size</span>
              <button type="button" onClick={() => onResize(-1)} className={smallBtnClass}>
                <Minus size={10} />
              </button>
              <span className="text-xs font-medium text-gray-700 w-8 text-center tabular-nums">{fontSize}</span>
              <button type="button" onClick={() => onResize(1)} className={smallBtnClass}>
                <Plus size={10} />
              </button>
            </div>
          )}

          {/* Width/Height (image, shape elements) */}
          {sizeMode === "dimensions" && width !== undefined && height !== undefined && onResizeDimensions && (
            <>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-gray-400 w-12">Width</span>
                <button type="button" onClick={() => onResizeDimensions(-2, 0)} className={smallBtnClass}>
                  <Minus size={10} />
                </button>
                <span className="text-xs font-medium text-gray-700 w-8 text-center tabular-nums">{Math.round(width)}</span>
                <button type="button" onClick={() => onResizeDimensions(2, 0)} className={smallBtnClass}>
                  <Plus size={10} />
                </button>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-gray-400 w-12">Height</span>
                <button type="button" onClick={() => onResizeDimensions(0, -2)} className={smallBtnClass}>
                  <Minus size={10} />
                </button>
                <span className="text-xs font-medium text-gray-700 w-8 text-center tabular-nums">{Math.round(height)}</span>
                <button type="button" onClick={() => onResizeDimensions(0, 2)} className={smallBtnClass}>
                  <Plus size={10} />
                </button>
              </div>
            </>
          )}

          {/* Color picker */}
          {onColorChange && (
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-gray-400 w-12">Color</span>
              <input type="color" value={color || "#000000"}
                onChange={(e) => onColorChange(e.target.value)}
                className="w-6 h-6 rounded border border-gray-200 cursor-pointer" />
              <span className="text-[10px] text-gray-500 font-mono">{color || "palette"}</span>
            </div>
          )}

          {/* Opacity slider */}
          {onOpacityChange && (
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-gray-400 w-12">Opacity</span>
              <input type="range" min="0.05" max="1" step="0.05" value={opacity}
                onChange={(e) => onOpacityChange(parseFloat(e.target.value))}
                className="flex-1 h-1.5 accent-[#9fe870]" />
              <span className="text-[10px] text-gray-500 w-8 text-right tabular-nums">{opacity.toFixed(2)}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
