import { NZPP_RADIUS_NM } from "@/lib/traffic/types";

/** Kapiti Coast Airport, ARP. */
export const NZPP = { lat: -40.904722, lon: 174.989167 } as const;

const EARTH_RADIUS_KM = 6371;
const KM_PER_NM = 1.852;

function radians(degrees: number) {
  return (degrees * Math.PI) / 180;
}

/** Great-circle distance in nautical miles. */
export function haversineNm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const radiusNm = EARTH_RADIUS_KM / KM_PER_NM;
  const dLat = radians(lat2 - lat1);
  const dLon = radians(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(radians(lat1)) * Math.cos(radians(lat2)) * Math.sin(dLon / 2) ** 2;
  return radiusNm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Bounding box just outside the 25 nm circle, as "north,south,west,east".
 * The live query uses this to keep the payload small; haversine does the real cut.
 */
export function nzppBounds() {
  const radiusKm = NZPP_RADIUS_NM * KM_PER_NM * 1.02;
  const latDelta = radiusKm / 111.32;
  const lonDelta = radiusKm / (111.32 * Math.cos(radians(NZPP.lat)));
  const format = (value: number) => value.toFixed(6);
  const north = NZPP.lat + latDelta;
  const south = NZPP.lat - latDelta;
  const west = NZPP.lon - lonDelta;
  const east = NZPP.lon + lonDelta;
  return `${format(north)},${format(south)},${format(west)},${format(east)}`;
}
