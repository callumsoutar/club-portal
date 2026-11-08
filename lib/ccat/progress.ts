import type { CcatEvent, CcatFlight, CcatItem, CcatStudent } from "@/lib/ccat/types";

export interface SignoffStamp {
  eventId: string;
  date: string;
  instructorName: string | null;
}

export interface ItemProgress {
  item: CcatItem;
  learnt: SignoffStamp | null;
  taught: SignoffStamp | null;
  completed: SignoffStamp | null;
  status: "not_started" | "learnt" | "taught" | "complete";
}

export interface StudentProgress {
  student: CcatStudent;
  items: ItemProgress[];
  flightLearntPct: number;
  flightTaughtPct: number;
  flightOverallPct: number;
  pofPct: number;
  briefingPct: number;
  groundPct: number;
  dualHours: number;
  soloHours: number;
  lastActivity: string | null;
  status: "Not started" | "In progress" | "Nearing completion" | "Complete";
  nextLearn: string | null;
  nextTeach: string | null;
}

export interface ProgressPoint {
  date: string;
  learnt: number;
  taught: number;
}

const NEARING = 0.8;

function percent(done: number, total: number) {
  if (total <= 0) return 0;
  return Math.round((done / total) * 100);
}

function earliest(events: CcatEvent[], kind: CcatEvent["kind"], itemId: string) {
  let best: CcatEvent | null = null;
  for (const event of events) {
    if (event.voidedAt || event.itemId !== itemId || event.kind !== kind) continue;
    if (!best || event.eventDate < best.eventDate) best = event;
  }
  if (!best) return null;
  return {
    eventId: best.id,
    date: best.eventDate,
    instructorName: best.instructorName,
  } satisfies SignoffStamp;
}

export function itemProgress(item: CcatItem, events: CcatEvent[]): ItemProgress {
  const learnt = item.signoffMode === "learnt_taught" ? earliest(events, "learnt", item.id) : null;
  const taught = item.signoffMode === "learnt_taught" ? earliest(events, "taught", item.id) : null;
  const completed = item.signoffMode === "single" ? earliest(events, "completed", item.id) : null;
  let status: ItemProgress["status"] = "not_started";
  if (item.signoffMode === "single") status = completed ? "complete" : "not_started";
  else if (learnt && taught) status = "complete";
  else if (learnt) status = "learnt";
  else if (taught) status = "taught";
  return { item, learnt, taught, completed, status };
}

function categoryPct(items: ItemProgress[], key: string) {
  const rows = items.filter((row) => row.item.categoryKey === key && row.item.isActive);
  return percent(rows.filter((row) => row.status === "complete").length, rows.length);
}

export function studentProgress(
  student: CcatStudent,
  items: CcatItem[],
  events: CcatEvent[],
  flights: CcatFlight[],
): StudentProgress {
  const ownEvents = events.filter((event) => event.studentId === student.id);
  const ownFlights = flights.filter((flight) => flight.studentId === student.id && !flight.voidedAt);
  const rows = items.map((item) => itemProgress(item, ownEvents));
  const flight = rows.filter((row) => row.item.categoryKey === "flight" && row.item.isActive);
  const flightLearnt = flight.filter((row) => row.learnt).length;
  const flightTaught = flight.filter((row) => row.taught).length;
  const flightOverall = flight.filter((row) => row.status === "complete").length;
  const active = rows.filter((row) => row.item.isActive);
  const anyWork = ownFlights.length > 0 || ownEvents.some((event) => !event.voidedAt);
  const allDone = active.length > 0 && active.every((row) => row.status === "complete");
  const overallPct = percent(flightOverall, flight.length);
  let status: StudentProgress["status"] = "Not started";
  if (allDone) status = "Complete";
  else if (overallPct >= NEARING * 100) status = "Nearing completion";
  else if (anyWork) status = "In progress";

  const ordered = [...flight].sort((a, b) => a.item.sortOrder - b.item.sortOrder);
  const dates = [
    ...ownFlights.map((flight) => flight.flownOn),
    ...ownEvents.filter((event) => !event.voidedAt).map((event) => event.eventDate),
  ].sort();

  return {
    student,
    items: rows,
    flightLearntPct: percent(flightLearnt, flight.length),
    flightTaughtPct: percent(flightTaught, flight.length),
    flightOverallPct: overallPct,
    pofPct: categoryPct(rows, "pof"),
    briefingPct: categoryPct(rows, "briefing"),
    groundPct: categoryPct(rows, "ground"),
    dualHours: roundHours(ownFlights.reduce((sum, flight) => sum + flight.dualHours, 0)),
    soloHours: roundHours(ownFlights.reduce((sum, flight) => sum + flight.soloHours, 0)),
    lastActivity: dates.at(-1) ?? null,
    status,
    nextLearn: ordered.find((row) => !row.learnt)?.item.name ?? null,
    nextTeach: ordered.find((row) => row.learnt && !row.taught)?.item.name ?? null,
  };
}

export function roundHours(value: number) {
  return Math.round(value * 100) / 100;
}

export function progressSeries(items: ItemProgress[], events: CcatEvent[]): ProgressPoint[] {
  const flightIds = new Set(
    items.filter((row) => row.item.categoryKey === "flight" && row.item.isActive).map((row) => row.item.id),
  );
  const learnt = new Map<string, string>();
  const taught = new Map<string, string>();
  for (const event of events) {
    if (event.voidedAt || !flightIds.has(event.itemId)) continue;
    const bucket = event.kind === "learnt" ? learnt : event.kind === "taught" ? taught : null;
    if (!bucket) continue;
    const previous = bucket.get(event.itemId);
    if (!previous || event.eventDate < previous) bucket.set(event.itemId, event.eventDate);
  }
  const dates = [...new Set([...learnt.values(), ...taught.values()])].sort();
  return dates.map((date) => ({
    date,
    learnt: [...learnt.values()].filter((value) => value <= date).length,
    taught: [...taught.values()].filter((value) => value <= date).length,
  }));
}

export function staleBefore(lastActivity: string | null, today: string, days = 14) {
  if (!lastActivity) return true;
  const start = Date.parse(`${lastActivity}T00:00:00Z`);
  const end = Date.parse(`${today}T00:00:00Z`);
  if (Number.isNaN(start) || Number.isNaN(end)) return false;
  return (end - start) / 86_400_000 >= days;
}
