"use client";

import { motion } from "framer-motion";

/**
 * The confirmation moment.
 *
 * A ring draws, the tick strokes on, and two soft halos breathe outward once.
 * Under a second — enough to register, short enough not to delay a pilot.
 */
export function SuccessAnimation() {
  return (
    <div className="relative mx-auto flex size-[5.5rem] items-center justify-center sm:size-24">
      {[0, 0.18].map((delay, i) => (
        <motion.span
          key={i}
          className="absolute inset-0 rounded-full bg-success/25"
          initial={{ scale: 0.55, opacity: 0.65 }}
          animate={{ scale: 1.85, opacity: 0 }}
          transition={{ duration: 1.15, delay: 0.15 + delay, ease: "easeOut" }}
        />
      ))}

      <motion.div
        className="relative flex size-[4.5rem] items-center justify-center rounded-full bg-success-muted ring-1 ring-success/25 sm:size-20"
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 320, damping: 18 }}
      >
        <svg
          viewBox="0 0 52 52"
          className="size-10 sm:size-11"
          fill="none"
          aria-hidden
        >
          <motion.circle
            cx="26"
            cy="26"
            r="23"
            stroke="var(--color-success)"
            strokeWidth="2.5"
            strokeLinecap="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          />
          <motion.path
            d="m15 26.5 7.5 7.5L38 19"
            stroke="var(--color-success)"
            strokeWidth="3.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.3, delay: 0.35, ease: "easeOut" }}
          />
        </svg>
      </motion.div>
    </div>
  );
}
