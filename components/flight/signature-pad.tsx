"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { RotateCcw } from "lucide-react";
import { motion } from "framer-motion";

import { Button } from "@/components/flight/ui/button";
import { cn } from "@/lib/flight/utils";

interface SignaturePadProps {
  value?: string;
  onChange: (dataUrl: string) => void;
  className?: string;
  disabled?: boolean;
}

/**
 * Touch signature pad.
 *
 * Built on pointer events rather than separate mouse/touch handlers so a
 * finger, a stylus and a trackpad all take the same code path. The canvas is
 * backed at device pixel ratio, otherwise signatures look soft on phones —
 * which is exactly where every one of these will be captured.
 */
export function SignaturePad({ value, onChange, className, disabled }: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const lastPoint = useRef<{ x: number; y: number } | null>(null);
  const [hasInk, setHasInk] = useState(Boolean(value));

  const setupCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    const rect = canvas.getBoundingClientRect();
    if (rect.width === 0) return;

    canvas.width = rect.width * ratio;
    canvas.height = rect.height * ratio;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.scale(ratio, ratio);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = 2.4;
    // Read the ink colour from the computed text colour.
    ctx.strokeStyle = getComputedStyle(canvas).getPropertyValue("color") || "#111";

    // Restore an existing signature (e.g. navigating back a step).
    if (value?.startsWith("data:image/")) {
      const img = new Image();
      img.onload = () => ctx.drawImage(img, 0, 0, rect.width, rect.height);
      img.src = value;
    } else {
      // White fill so JPEG exports stay readable (PNG was transparent).
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, rect.width, rect.height);
      ctx.fillStyle = ctx.strokeStyle;
    }
  }, [value]);

  useEffect(() => {
    setupCanvas();

    // Re-back the canvas on rotate/resize, which otherwise stretches the ink.
    const observer = new ResizeObserver(() => setupCanvas());
    if (canvasRef.current) observer.observe(canvasRef.current);
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function pointFrom(event: React.PointerEvent<HTMLCanvasElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  }

  function handleDown(event: React.PointerEvent<HTMLCanvasElement>) {
    if (disabled) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    drawing.current = true;
    lastPoint.current = pointFrom(event);
  }

  function handleMove(event: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawing.current || disabled) return;

    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx || !lastPoint.current) return;

    const point = pointFrom(event);

    // Midpoint quadratic smoothing — without it, fast finger strokes render as
    // visible polygons.
    const mid = {
      x: (lastPoint.current.x + point.x) / 2,
      y: (lastPoint.current.y + point.y) / 2,
    };

    ctx.beginPath();
    ctx.moveTo(lastPoint.current.x, lastPoint.current.y);
    ctx.quadraticCurveTo(lastPoint.current.x, lastPoint.current.y, mid.x, mid.y);
    ctx.stroke();

    lastPoint.current = point;
    if (!hasInk) setHasInk(true);
  }

  function handleUp() {
    if (!drawing.current) return;
    drawing.current = false;
    lastPoint.current = null;
    commit();
  }

  function commit() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    // JPEG keeps the server-action payload small — PNG signatures were multi-MB
    // on retina phones and made submit feel stuck in production.
    onChange(canvas.toDataURL("image/jpeg", 0.72));
  }

  function clear() {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const rect = canvas.getBoundingClientRect();
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, rect.width, rect.height);
    setHasInk(false);
    onChange("");
  }

  return (
    <div className={cn("space-y-3", className)}>
      <div
        className={cn(
          "relative overflow-hidden rounded-xl border-2 border-dashed transition-colors",
          hasInk ? "border-foreground/30 bg-background" : "border-border bg-background",
          disabled && "opacity-60",
        )}
      >
        <canvas
          ref={canvasRef}
          onPointerDown={handleDown}
          onPointerMove={handleMove}
          onPointerUp={handleUp}
          onPointerLeave={handleUp}
          onPointerCancel={handleUp}
          className="touch-none-safe block h-44 w-full cursor-crosshair text-foreground sm:h-52"
          aria-label="Signature pad"
          role="img"
        />

        {/* Baseline and prompt sit behind the ink and never intercept pointers. */}
        {!hasInk && (
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-1">
            <span className="text-sm text-muted-foreground">Sign here with your finger</span>
            <span className="text-xs text-muted-foreground/70">
              This becomes part of the legal record
            </span>
          </div>
        )}

        <div className="pointer-events-none absolute inset-x-8 bottom-9 border-b border-border/70" />
      </div>

      <div className="flex items-center justify-between">
        <motion.span
          initial={false}
          animate={{ opacity: hasInk ? 1 : 0 }}
          className="text-xs text-success"
        >
          Signature captured
        </motion.span>

        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={clear}
          disabled={disabled || !hasInk}
          className="gap-1.5 text-muted-foreground"
        >
          <RotateCcw className="size-3.5" />
          Clear
        </Button>
      </div>
    </div>
  );
}
