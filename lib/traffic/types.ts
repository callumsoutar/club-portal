export const NZPP_RADIUS_NM = 25;

export type TrafficAircraft = {
  id: string;
  callsign: string | null;
  distanceNm: number;
  altitudeFt: number | null;
  groundSpeedKt: number | null;
  trackDeg: number | null;
  verticalSpeedFpm: number | null;
  squawk: string | null;
  fixAgeSeconds: number | null;
  emergency: boolean;
};

export type TrafficSnapshot = {
  airport: "NZPP";
  radiusNm: typeof NZPP_RADIUS_NM;
  fetchedAt: string;
  stale: boolean;
  aircraft: TrafficAircraft[];
};
