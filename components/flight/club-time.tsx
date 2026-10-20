"use client";

import { createContext, useContext } from "react";

import { DEFAULT_TIME_ZONE, resolveTimeZone } from "@/lib/time-zone";

const ClubTimeZoneContext = createContext(DEFAULT_TIME_ZONE);

export function ClubTimeZoneProvider({
  timeZone,
  children,
}: {
  timeZone: string;
  children: React.ReactNode;
}) {
  return (
    <ClubTimeZoneContext.Provider value={resolveTimeZone(timeZone)}>
      {children}
    </ClubTimeZoneContext.Provider>
  );
}

/** Club IANA zone for client components. Comes from company settings. */
export function useClubTimeZone() {
  return useContext(ClubTimeZoneContext);
}
