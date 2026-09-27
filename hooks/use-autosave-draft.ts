"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { useMounted } from "@/hooks/use-mounted";
import { DRAFT_STORAGE_KEY, draftStorageKey } from "@/lib/flight/constants";
import type { AnswerMap } from "@/lib/flight/types";

interface StoredDraft {
  answers: AnswerMap;
  step: number;
  savedAt: number;
  templateId: string;
}

export type SaveState = "idle" | "saving" | "saved";

/** Drafts older than this are discarded — a stale flight plan is worse than none. */
const MAX_AGE_MS = 24 * 60 * 60 * 1000;

/**
 * Read and validate a stored draft. Returns null (and clears storage) if the
 * draft is stale, belongs to an older form version, or is unparseable.
 */
function readDraft(templateId: string | undefined): StoredDraft | null {
  if (typeof window === "undefined" || !templateId) return null;

  const key = draftStorageKey(templateId);

  try {
    const raw =
      localStorage.getItem(key) ?? localStorage.getItem(DRAFT_STORAGE_KEY);
    if (!raw) return null;

    const draft = JSON.parse(raw) as StoredDraft;
    const isFresh = Date.now() - draft.savedAt < MAX_AGE_MS;
    // A draft from an older form version can't be trusted to still fit.
    const matchesTemplate = draft.templateId === templateId;

    if (isFresh && matchesTemplate) {
      // Migrate legacy single-slot drafts into the per-template key.
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, raw);
        localStorage.removeItem(DRAFT_STORAGE_KEY);
      }
      return draft;
    }

    localStorage.removeItem(key);
    if (matchesTemplate) localStorage.removeItem(DRAFT_STORAGE_KEY);
    return null;
  } catch {
    localStorage.removeItem(key);
    return null;
  }
}

/**
 * Persists wizard progress to localStorage.
 *
 * This is what makes the form survive a phone locking mid-checklist, a
 * dropped connection on the apron, or an accidental back-swipe. Deliberately
 * local rather than server-side: it works with no signal at all, and a guest
 * has nowhere on the server to put it.
 */
export function useAutosaveDraft(templateId: string | undefined) {
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Read once, lazily, during the first client render — no effect, no second
  // render pass. `mounted` gates the UI so SSR and hydration still agree.
  const [stored, setStored] = useState<StoredDraft | null>(() =>
    readDraft(templateId),
  );
  const mounted = useMounted();

  const save = useCallback(
    (answers: AnswerMap, step: number) => {
      if (!templateId) return;

      setSaveState("saving");
      if (timer.current) clearTimeout(timer.current);

      // Debounced: typing a name shouldn't mean twenty writes.
      timer.current = setTimeout(() => {
        try {
          const draft: StoredDraft = {
            answers,
            step,
            savedAt: Date.now(),
            templateId,
          };
          localStorage.setItem(
            draftStorageKey(templateId),
            JSON.stringify(draft),
          );
          localStorage.removeItem(DRAFT_STORAGE_KEY);
          setSaveState("saved");
        } catch {
          // Quota exceeded or private browsing — autosave is a nicety, so we
          // degrade silently rather than interrupting the pilot.
          setSaveState("idle");
        }
      }, 600);
    },
    [templateId],
  );

  const clear = useCallback(() => {
    if (templateId) localStorage.removeItem(draftStorageKey(templateId));
    localStorage.removeItem(DRAFT_STORAGE_KEY);
    setStored(null);
    setSaveState("idle");
  }, [templateId]);

  const dismissRestore = useCallback(() => setStored(null), []);

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  return {
    saveState,
    // Held back until hydration so the resume banner never causes a mismatch.
    restored: mounted ? stored : null,
    checked: mounted,
    save,
    clear,
    dismissRestore,
  };
}
