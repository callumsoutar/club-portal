"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Maximize, Minimize } from "lucide-react";

import { SplitFlapBoard } from "@/components/traffic/split-flap-board";
import type { TrafficSnapshot } from "@/lib/traffic/types";

import "./split-flap.css";

const POLL_MS = 60_000;

type FeedState = {
  snapshot: TrafficSnapshot | null;
  error: string | null;
  loading: boolean;
};

export function TrafficBoard({
  companyName,
  logoUrl,
}: {
  companyName: string;
  logoUrl: string | null;
}) {
  const [feed, setFeed] = useState<FeedState>({ snapshot: null, error: null, loading: true });
  const [now, setNow] = useState(() => Date.now());
  const [fullscreen, setFullscreen] = useState(false);

  useEffect(() => {
    document.body.classList.add("tv-body");
    return () => document.body.classList.remove("tv-body");
  }, []);

  useEffect(() => {
    const tick = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(tick);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (document.hidden) return;
      try {
        const response = await fetch("/api/traffic", { cache: "no-store" });
        const body = (await response.json()) as TrafficSnapshot | { error?: string };
        if (cancelled) return;
        if (!response.ok || !("aircraft" in body)) {
          const message = "error" in body && body.error ? body.error : "Traffic feed unavailable";
          setFeed((current) => ({
            snapshot: current.snapshot,
            error: message,
            loading: false,
          }));
          return;
        }
        setFeed({ snapshot: body, error: null, loading: false });
      } catch {
        if (cancelled) return;
        setFeed((current) => ({
          snapshot: current.snapshot,
          error: "Traffic feed unavailable",
          loading: false,
        }));
      }
    }

    void load();
    const poll = window.setInterval(() => void load(), POLL_MS);
    const onVisible = () => {
      if (!document.hidden) void load();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      cancelled = true;
      window.clearInterval(poll);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  useEffect(() => {
    const onFullscreen = () => setFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", onFullscreen);
    return () => document.removeEventListener("fullscreenchange", onFullscreen);
  }, []);

  async function toggleFullscreen() {
    const root = document.getElementById("traffic-board");
    if (!root) return;
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await root.requestFullscreen();
    } catch {
      setFullscreen(false);
    }
  }

  const snapshot = feed.snapshot;
  const updatedSeconds = snapshot ? Math.max(0, Math.round((now - Date.parse(snapshot.fetchedAt)) / 1000)) : null;
  const count = snapshot?.aircraft.length ?? 0;
  const countLabel =
    feed.loading && !snapshot ? "Loading" : !snapshot ? "Unavailable" : count === 1 ? "1 aircraft" : `${count} aircraft`;

  return (
    <div
      id="traffic-board"
      className="flex h-dvh flex-col overflow-hidden bg-[#07090b] text-[#f4f1ea] font-mono"
    >
      <header className="flex items-center justify-between gap-4 border-b border-white/10 px-4 py-4 sm:px-8">
        <div className="flex min-w-0 items-center gap-4">
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logoUrl} alt="" className="h-10 w-auto max-w-[140px] object-contain" />
          ) : null}
          <div className="min-w-0">
            <p className="truncate text-[11px] tracking-[0.22em] text-[#9aa0a6] uppercase">{companyName}</p>
            <h1 className="text-lg tracking-[0.14em] text-[#f5c16c] sm:text-xl">NZPP · 25 NM</h1>
          </div>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <p className="hidden text-right text-[11px] tracking-[0.16em] text-[#9aa0a6] uppercase sm:block">
            <span className="block text-[#f4f1ea]">
              {countLabel}
            </span>
            <span>{updatedSeconds == null ? "—" : `updated ${formatUpdated(updatedSeconds)}`}</span>
          </p>
          <Link
            href="/fly/instructor"
            className="border border-white/15 px-3 py-2 text-[11px] tracking-[0.14em] text-[#c8cdd2] uppercase hover:text-white"
          >
            Exit
          </Link>
          <button
            type="button"
            aria-label={fullscreen ? "Exit full screen" : "Enter full screen"}
            onClick={() => void toggleFullscreen()}
            className="grid size-9 place-items-center border border-white/15 text-[#c8cdd2] hover:text-white"
          >
            {fullscreen ? <Minimize size={16} /> : <Maximize size={16} />}
          </button>
        </div>
      </header>

      {snapshot?.stale || feed.error ? (
        <p className="border-b border-[#f5c16c]/30 bg-[#f5c16c]/10 px-4 py-2 text-center text-[12px] tracking-[0.08em] text-[#f5c16c] uppercase sm:px-8">
          {feed.error ?? "Last update is stale. The live feed did not respond."}
        </p>
      ) : null}

      <div className="flex min-h-0 flex-1 flex-col px-4 py-4 sm:px-6">
        {feed.loading && !snapshot ? (
          <p className="text-sm tracking-[0.16em] text-[#9aa0a6] uppercase">Loading traffic</p>
        ) : feed.error && !snapshot ? (
          <p className="max-w-md text-sm text-[#f4f1ea]">{feed.error}</p>
        ) : (
          <SplitFlapBoard aircraft={snapshot?.aircraft ?? []} />
        )}
      </div>

      <p className="px-4 pb-4 text-[11px] tracking-[0.14em] text-[#6f767c] uppercase sm:hidden">
        {countLabel}
        {updatedSeconds == null ? "" : ` · updated ${formatUpdated(updatedSeconds)}`}
      </p>
    </div>
  );
}

function formatUpdated(seconds: number) {
  if (seconds < 5) return "just now";
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  return `${Math.floor(minutes / 60)}h ago`;
}
