"use client";

import { useMemo } from "react";

import { FlapCell } from "@/components/traffic/flap-cell";

const FLAP_ALPHABET = /[^ A-Z0-9.-]/g;

export function BoardRow({
  text,
  length,
  align = "left",
  className,
}: {
  text: string;
  length: number;
  align?: "left" | "right";
  className?: string;
}) {
  const targetChars = useMemo(() => {
    const cleaned = text.toUpperCase().replace(FLAP_ALPHABET, " ").slice(0, length);
    const padded = align === "right" ? cleaned.padStart(length, " ") : cleaned.padEnd(length, " ");
    return padded.split("");
  }, [align, length, text]);

  return (
    <div className={className ? `board-row ${className}` : "board-row"} aria-hidden="true">
      {targetChars.map((char, index) => (
        <FlapCell key={index} targetChar={char} />
      ))}
    </div>
  );
}
