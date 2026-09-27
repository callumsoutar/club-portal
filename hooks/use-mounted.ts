"use client";

import { useSyncExternalStore } from "react";

/** Never fires — mounted-ness never changes after hydration. */
const subscribe = () => () => {};

/**
 * True once hydrated, false during SSR.
 *
 * Preferred over the `useState(false)` + `useEffect(setTrue)` idiom: this
 * reads the value during render instead of triggering a second render pass,
 * so there's no cascading re-render and no flash of the wrong state.
 */
export function useMounted(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
}
