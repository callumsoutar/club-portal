"use client";

export function PrintButton({ label = "Print or save PDF" }: { label?: string }) {
  return (
    <button type="button" onClick={() => window.print()} className="mt-3 text-sm text-primary print:hidden">
      {label}
    </button>
  );
}
