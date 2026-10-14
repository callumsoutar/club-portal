"use client";

import { useEffect, useState, useSyncExternalStore } from "react";

const CHAR_SET = " ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789.-";
const STEP_MS = 55;

type FlapStore = {
  get: () => number;
  set: (next: number) => void;
  subscribe: (listener: () => void) => () => void;
};

function createFlapStore(): FlapStore {
  let index = 0;
  const listeners = new Set<() => void>();
  return {
    get: () => index,
    set: (next) => {
      if (next === index) return;
      index = next;
      listeners.forEach((listener) => listener());
    },
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}

function useIsMounted() {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
}

function usePrefersReducedMotion() {
  return useSyncExternalStore(
    (onChange) => {
      const media = window.matchMedia("(prefers-reduced-motion: reduce)");
      media.addEventListener("change", onChange);
      return () => media.removeEventListener("change", onChange);
    },
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    () => false,
  );
}

export function FlapCell({ targetChar: rawTargetChar }: { targetChar: string }) {
  const targetChar = (rawTargetChar || " ").toUpperCase();
  const targetIndex = CHAR_SET.indexOf(targetChar) === -1 ? 0 : CHAR_SET.indexOf(targetChar);
  const [store] = useState(createFlapStore);
  const currentIndex = useSyncExternalStore(store.subscribe, store.get, () => 0);
  const isMounted = useIsMounted();
  const reduceMotion = usePrefersReducedMotion();

  useEffect(() => {
    if (!isMounted) return;

    if (reduceMotion) {
      store.set(targetIndex);
      return;
    }

    if (store.get() === targetIndex) return;

    const interval = setInterval(() => {
      const next = (store.get() + 1) % CHAR_SET.length;
      store.set(next);
      if (next === targetIndex) clearInterval(interval);
    }, STEP_MS);

    return () => clearInterval(interval);
  }, [targetIndex, isMounted, reduceMotion, store]);

  const currentChar = CHAR_SET[currentIndex];
  const nextChar = CHAR_SET[(currentIndex + 1) % CHAR_SET.length];
  const isFlipping = isMounted && !reduceMotion && currentIndex !== targetIndex;
  const bottomChar = isFlipping ? nextChar : currentChar;
  const shown = isMounted ? currentChar : " ";

  return (
    <div className="flap-cell" aria-hidden="true">
      <div className="flap-half flap-bottom">
        <span>{isMounted ? bottomChar : " "}</span>
      </div>
      <div className="flap-half flap-top">
        <span>{shown}</span>
      </div>
      <div key={`top-${currentIndex}`} className={`flap-leaf${isFlipping ? " flipping" : ""}`}>
        <span>{shown}</span>
      </div>
      <div key={`bottom-${currentIndex}`} className={`flap-leaf-bottom${isFlipping ? " flipping" : ""}`}>
        <span>{isMounted ? bottomChar : " "}</span>
      </div>
    </div>
  );
}
