import { NextResponse } from "next/server";

import { getSessionUser, hasRole } from "@/lib/flight/auth";
import { getNzppTraffic, TrafficFeedError } from "@/lib/traffic/live";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }
  if (!hasRole(user.profile.role, "admin")) {
    return NextResponse.json({ error: "Admins only." }, { status: 403 });
  }

  try {
    const snapshot = await getNzppTraffic();
    return NextResponse.json(snapshot);
  } catch (error) {
    const message = error instanceof TrafficFeedError ? error.message : "Traffic feed unavailable";
    console.error("NZPP traffic feed failed:", message);
    return NextResponse.json({ error: message }, { status: 503 });
  }
}
