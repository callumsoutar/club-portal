"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
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
 * iOS Safari will claim a finger for scrolling after a few pixels when the
 * canvas lives in an overflow scroller (the authorisation form does). Once it
 * does, it fires pointercancel and the stroke dies. `touch-action: none` has
 * to be a real style — and touchmove has to be cancelled from a non-passive
 * listener, because React's own touch listeners are passive and cannot call
 * preventDefault. Pointer moves are followed on window so the stroke continues
 * if the finger slides off the canvas.
 */
export function SignaturePad({ value, onChange, className, disabled }: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const activePointer = useRef<number | null>(null);
  const lastPoint = useRef<{ x: number; y: number } | null>(null);
  const hasInkRef = useRef(Boolean(value));
  const valueRef = useRef(value);
  const onChangeRef = useRef(onChange);
  const disabledRef = useRef(Boolean(disabled));
  const resizePending = useRef(false);
  const [hasInk, setHasInk] = useState(Boolean(value));

  // Declared before the other effects so the native listeners always see the latest props.
  useLayoutEffect(() => {
    valueRef.current = value;
    onChangeRef.current = onChange;
    disabledRef.current = Boolean(disabled);
  });

  const setupCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (drawing.current) {
      resizePending.current = true;
      return;
    }

    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    const rect = canvas.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;

    const nextWidth = Math.max(1, Math.round(rect.width * ratio));
    const nextHeight = Math.max(1, Math.round(rect.height * ratio));
    const sizeChanged = canvas.width !== nextWidth || canvas.height !== nextHeight;
    const snapshot = sizeChanged && hasInkRef.current ? canvas.toDataURL("image/png") : null;

    if (sizeChanged) {
      canvas.width = nextWidth;
      canvas.height = nextHeight;
    }

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = 2.4;
    ctx.strokeStyle = getComputedStyle(canvas).color || "#111";

    const paintWhite = () => {
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, rect.width, rect.height);
    };

    if (snapshot) {
      paintWhite();
      const img = new Image();
      img.onload = () => {
        const live = canvas.getContext("2d");
        if (!live) return;
        live.drawImage(img, 0, 0, rect.width, rect.height);
      };
      img.src = snapshot;
      return;
    }

    if (!sizeChanged && hasInkRef.current) return;

    paintWhite();

    const stored = valueRef.current;
    if (stored?.startsWith("data:image/")) {
      const img = new Image();
      img.onload = () => ctx.drawImage(img, 0, 0, rect.width, rect.height);
      img.src = stored;
    }
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    setupCanvas();

    const observer = new ResizeObserver(() => setupCanvas());
    observer.observe(canvas);

    const blockScroll = (event: TouchEvent) => {
      if (disabledRef.current) return;
      if (event.cancelable) event.preventDefault();
    };

    const pointFrom = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      return { x: event.clientX - rect.left, y: event.clientY - rect.top };
    };

    const commit = () => {
      if (!hasInkRef.current) return;
      onChangeRef.current(canvas.toDataURL("image/jpeg", 0.72));
    };

    const endStroke = () => {
      if (!drawing.current) return;
      drawing.current = false;
      activePointer.current = null;
      lastPoint.current = null;
      commit();
      if (resizePending.current) {
        resizePending.current = false;
        setupCanvas();
      }
    };

    const drawTo = (event: PointerEvent) => {
      const ctx = canvas.getContext("2d");
      if (!ctx || !lastPoint.current) return;

      let samples: PointerEvent[] = [];
      try {
        samples = typeof event.getCoalescedEvents === "function" ? event.getCoalescedEvents() : [];
      } catch {
        samples = [];
      }
      const points = samples.length > 0 ? samples : [event];

      for (const sample of points) {
        if (!lastPoint.current) break;
        const point = pointFrom(sample);
        const mid = {
          x: (lastPoint.current.x + point.x) / 2,
          y: (lastPoint.current.y + point.y) / 2,
        };

        ctx.beginPath();
        ctx.moveTo(lastPoint.current.x, lastPoint.current.y);
        ctx.quadraticCurveTo(lastPoint.current.x, lastPoint.current.y, mid.x, mid.y);
        ctx.stroke();
        lastPoint.current = point;
      }

      if (!hasInkRef.current) {
        hasInkRef.current = true;
        setHasInk(true);
      }
    };

    const handleDown = (event: PointerEvent) => {
      if (disabledRef.current) return;
      if (event.pointerType === "mouse" && event.button !== 0) return;

      drawing.current = true;
      activePointer.current = event.pointerId;
      lastPoint.current = pointFrom(event);

      try {
        canvas.setPointerCapture(event.pointerId);
      } catch {
        // Capture is a hint. Window listeners still follow the finger on iOS
        // when Safari refuses or drops capture inside a scroll container.
      }
    };

    const handleMove = (event: PointerEvent) => {
      if (!drawing.current || disabledRef.current || event.pointerId !== activePointer.current) {
        return;
      }
      drawTo(event);
    };

    const handleUp = (event: PointerEvent) => {
      if (event.pointerId !== activePointer.current) return;
      if (canvas.hasPointerCapture(event.pointerId)) {
        try {
          canvas.releasePointerCapture(event.pointerId);
        } catch {
          // Pointer already released.
        }
      }
      endStroke();
    };

    const blockContextMenu = (event: Event) => event.preventDefault();

    canvas.addEventListener("touchstart", blockScroll, { passive: false });
    canvas.addEventListener("touchmove", blockScroll, { passive: false });
    canvas.addEventListener("pointerdown", handleDown);
    canvas.addEventListener("contextmenu", blockContextMenu);
    window.addEventListener("pointermove", handleMove, true);
    window.addEventListener("pointerup", handleUp, true);
    window.addEventListener("pointercancel", handleUp, true);

    return () => {
      observer.disconnect();
      canvas.removeEventListener("touchstart", blockScroll);
      canvas.removeEventListener("touchmove", blockScroll);
      canvas.removeEventListener("pointerdown", handleDown);
      canvas.removeEventListener("contextmenu", blockContextMenu);
      window.removeEventListener("pointermove", handleMove, true);
      window.removeEventListener("pointerup", handleUp, true);
      window.removeEventListener("pointercancel", handleUp, true);
    };
  }, [setupCanvas]);

  function clear() {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const rect = canvas.getBoundingClientRect();
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, rect.width, rect.height);
    drawing.current = false;
    activePointer.current = null;
    lastPoint.current = null;
    hasInkRef.current = false;
    setHasInk(false);
    onChange("");
  }

  return (
    <div className={cn("space-y-3", className)}>
      <div
        className={cn(
          "relative overflow-clip rounded-xl border-2 border-dashed touch-none transition-colors",
          hasInk ? "border-foreground/30 bg-background" : "border-border bg-background",
          disabled && "opacity-60",
        )}
      >
        <canvas
          ref={canvasRef}
          className="block h-44 w-full cursor-crosshair touch-none text-foreground select-none sm:h-52"
          style={{ touchAction: "none", WebkitTouchCallout: "none" }}
          aria-label="Signature pad"
          role="img"
        />

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
