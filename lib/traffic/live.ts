import "server-only";

import { NZPP, haversineNm, nzppBounds } from "@/lib/traffic/geometry";
import { NZPP_RADIUS_NM, type TrafficAircraft, type TrafficSnapshot } from "@/lib/traffic/types";

const FRESH_MS = 45_000;
const STALE_OK_MS = 5 * 60_000;
const RESULT_LIMIT = 100;
const EMERGENCY_SQUAWKS = new Set(["7500", "7600", "7700"]);

type Cache = { fetchedAt: number; aircraft: TrafficAircraft[] };

const state = globalThis as typeof globalThis & {
  __nzppTrafficCache?: Cache;
  __nzppTrafficInflight?: Promise<TrafficAircraft[]>;
};

export class TrafficFeedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TrafficFeedError";
  }
}

export async function getNzppTraffic(): Promise<TrafficSnapshot> {
  const now = Date.now();
  const cached = state.__nzppTrafficCache;
  if (cached && now - cached.fetchedAt < FRESH_MS) {
    return toSnapshot(cached, false);
  }

  try {
    const aircraft = await loadShared();
    const next: Cache = { fetchedAt: Date.now(), aircraft };
    state.__nzppTrafficCache = next;
    return toSnapshot(next, false);
  } catch (error) {
    if (cached && now - cached.fetchedAt < STALE_OK_MS) {
      return toSnapshot(cached, true);
    }
    throw new TrafficFeedError(messageFor(error));
  }
}

function loadShared() {
  if (!state.__nzppTrafficInflight) {
    state.__nzppTrafficInflight = fetchInsideCircle().finally(() => {
      state.__nzppTrafficInflight = undefined;
    });
  }
  return state.__nzppTrafficInflight;
}

async function fetchInsideCircle(): Promise<TrafficAircraft[]> {
  const apiToken = process.env.FR24_API_TOKEN?.trim();
  if (!apiToken) {
    throw new TrafficFeedError("Traffic feed is not configured.");
  }

  const SDK = (await import("@flightradar24/fr24sdk")).default;
  const client = new SDK.Client({ apiToken });
  try {
    const flights = await client.live.getLight({ bounds: nzppBounds(), limit: RESULT_LIMIT });
    return flightsInside(Array.isArray(flights) ? flights : [], Date.now());
  } finally {
    client.close();
  }
}

function flightsInside(
  flights: Array<{
    fr24_id?: unknown;
    hex?: unknown;
    lat?: unknown;
    lon?: unknown;
    track?: unknown;
    alt?: unknown;
    gspeed?: unknown;
    vspeed?: unknown;
    squawk?: unknown;
    timestamp?: unknown;
    callsign?: unknown;
  }>,
  now: number,
): TrafficAircraft[] {
  const aircraft: TrafficAircraft[] = [];

  for (const flight of flights) {
    const lat = finite(flight.lat);
    const lon = finite(flight.lon);
    if (lat == null || lon == null) continue;

    const distanceNm = haversineNm(lat, lon, NZPP.lat, NZPP.lon);
    if (distanceNm > NZPP_RADIUS_NM) continue;

    const id = text(flight.fr24_id) ?? text(flight.hex);
    if (!id) continue;

    const squawk = squawkOf(flight.squawk);
    aircraft.push({
      id,
      callsign: text(flight.callsign),
      distanceNm: round1(distanceNm),
      altitudeFt: rounded(flight.alt),
      groundSpeedKt: rounded(flight.gspeed),
      trackDeg: trackOf(flight.track),
      verticalSpeedFpm: rounded(flight.vspeed),
      squawk,
      fixAgeSeconds: ageSeconds(flight.timestamp, now),
      emergency: squawk != null && EMERGENCY_SQUAWKS.has(squawk),
    });
  }

  aircraft.sort(
    (a, b) => a.distanceNm - b.distanceNm || (a.callsign ?? "").localeCompare(b.callsign ?? ""),
  );
  return aircraft;
}

function toSnapshot(cache: Cache, stale: boolean): TrafficSnapshot {
  return {
    airport: "NZPP",
    radiusNm: NZPP_RADIUS_NM,
    fetchedAt: new Date(cache.fetchedAt).toISOString(),
    stale,
    aircraft: cache.aircraft,
  };
}

function messageFor(error: unknown) {
  if (error instanceof TrafficFeedError) return error.message;
  const name = error instanceof Error ? error.name : "";
  if (name === "RateLimitError" || name === "PaymentRequiredError") {
    return "Traffic feed is rate limited.";
  }
  if (name === "AuthenticationError") {
    return "Traffic feed rejected the API token.";
  }
  return "Traffic feed unavailable";
}

function finite(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function rounded(value: unknown) {
  const parsed = finite(value);
  return parsed == null ? null : Math.round(parsed);
}

function round1(value: number) {
  return Math.round(value * 10) / 10;
}

function trackOf(value: unknown) {
  const parsed = rounded(value);
  if (parsed == null) return null;
  return ((parsed % 360) + 360) % 360;
}

function text(value: unknown) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function squawkOf(value: unknown) {
  if (typeof value === "number" && Number.isInteger(value)) {
    return String(value).padStart(4, "0");
  }
  const raw = text(value);
  if (!raw) return null;
  return /^\d{1,4}$/.test(raw) ? raw.padStart(4, "0") : raw;
}

function ageSeconds(value: unknown, now: number) {
  const raw = text(value);
  if (!raw) return null;
  const ms = Date.parse(raw);
  if (!Number.isFinite(ms)) return null;
  return Math.max(0, Math.round((now - ms) / 1000));
}
