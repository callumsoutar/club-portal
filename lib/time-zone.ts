/**
 * Club civil time.
 *
 * Instants are stored as UTC. The server (and any browser) may be in a
 * different zone, so nothing in here uses the host timezone. Wall-clock
 * values such as a return ETA are interpreted in the club's IANA zone,
 * which already includes daylight saving.
 */

export const DEFAULT_TIME_ZONE = "Pacific/Auckland";

export const CLUB_TIME_ZONE_OPTIONS = [
  { value: "Pacific/Auckland", label: "New Zealand — Auckland" },
  { value: "Pacific/Chatham", label: "New Zealand — Chatham Islands" },
  { value: "Australia/Sydney", label: "Australia — Sydney" },
  { value: "Australia/Melbourne", label: "Australia — Melbourne" },
  { value: "Australia/Brisbane", label: "Australia — Brisbane" },
  { value: "Australia/Adelaide", label: "Australia — Adelaide" },
  { value: "Australia/Perth", label: "Australia — Perth" },
  { value: "Australia/Hobart", label: "Australia — Hobart" },
  { value: "Australia/Darwin", label: "Australia — Darwin" },
  { value: "Australia/Lord_Howe", label: "Australia — Lord Howe Island" },
  { value: "Pacific/Norfolk", label: "Norfolk Island" },
  { value: "Pacific/Fiji", label: "Fiji" },
  { value: "Pacific/Apia", label: "Samoa" },
  { value: "Pacific/Tongatapu", label: "Tonga" },
  { value: "Pacific/Rarotonga", label: "Cook Islands" },
  { value: "UTC", label: "UTC" },
] as const;

const DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/;
const WALL_TIME = /^([01]\d|2[0-3]):([0-5]\d)$/;

export function isValidTimeZone(timeZone: string): boolean {
  if (!timeZone || timeZone.length > 64) return false;
  try {
    Intl.DateTimeFormat("en-NZ", { timeZone }).format(0);
    return true;
  } catch {
    return false;
  }
}

export function resolveTimeZone(timeZone: string | null | undefined): string {
  return timeZone && isValidTimeZone(timeZone) ? timeZone : DEFAULT_TIME_ZONE;
}

/** Calendar day of an instant in a zone, as `yyyy-MM-dd`. */
export function calendarDateInTimeZone(value: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: resolveTimeZone(timeZone),
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(value);
}

export function addCalendarDays(isoDate: string, days: number): string {
  const [year, month, day] = isoDate.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10);
}

export function calendarDaysBetween(fromIso: string, toIso: string): number {
  const toUtc = (iso: string) => {
    const [year, month, day] = iso.split("-").map(Number);
    return Date.UTC(year, month - 1, day);
  };
  return Math.round((toUtc(toIso) - toUtc(fromIso)) / 86_400_000);
}

/**
 * Interpret a club-local date and `HH:mm` as a UTC instant.
 * `2026-10-18` + `19:00` in Pacific/Auckland is `2026-10-18T06:00:00.000Z`.
 */
export function zonedWallTimeToUtc(
  date: string,
  time: string,
  timeZone: string,
): Date | null {
  const day = DATE_ONLY.exec(date.trim());
  const clock = WALL_TIME.exec(time.trim());
  if (!day || !clock) return null;

  const year = Number(day[1]);
  const month = Number(day[2]);
  const dayOfMonth = Number(day[3]);
  if (!isRealCalendarDate(year, month, dayOfMonth)) return null;

  const zone = resolveTimeZone(timeZone);
  const wallAsUtc = Date.UTC(
    year,
    month - 1,
    dayOfMonth,
    Number(clock[1]),
    Number(clock[2]),
    0,
  );
  const offset = zoneOffsetMs(new Date(wallAsUtc), zone);
  let utc = wallAsUtc - offset;
  const offsetAtResult = zoneOffsetMs(new Date(utc), zone);
  if (offsetAtResult !== offset) utc = wallAsUtc - offsetAtResult;

  const result = new Date(utc);
  return Number.isNaN(result.getTime()) ? null : result;
}

/** UTC instant for local midnight at the start of the club's current day. */
export function startOfZonedDay(timeZone: string, now = new Date()): string {
  const zone = resolveTimeZone(timeZone);
  const today = calendarDateInTimeZone(now, zone);
  return zonedWallTimeToUtc(today, "00:00", zone)?.toISOString() ?? now.toISOString();
}

/** Short offset label such as "GMT+13", for the settings hint. */
export function timeZoneOffsetLabel(timeZone: string, now = new Date()): string {
  const zone = resolveTimeZone(timeZone);
  const name = new Intl.DateTimeFormat("en-NZ", {
    timeZone: zone,
    timeZoneName: "shortOffset",
    hour: "2-digit",
  })
    .formatToParts(now)
    .find((part) => part.type === "timeZoneName")?.value;
  return name ?? zone;
}

type ZonedParts = {
  weekday: string;
  day: string;
  month: string;
  year: string;
  hour: string;
  minute: string;
};

const PATTERN_FORMATTERS: Record<string, (parts: ZonedParts) => string> = {
  "d MMM yyyy": (parts) => `${parts.day} ${parts.month} ${parts.year}`,
  "EEE d MMM": (parts) => `${parts.weekday} ${parts.day} ${parts.month}`,
  "d MMM": (parts) => `${parts.day} ${parts.month}`,
  "EEE d MMM yyyy": (parts) =>
    `${parts.weekday} ${parts.day} ${parts.month} ${parts.year}`,
  "d MMM yyyy 'at' HH:mm": (parts) =>
    `${parts.day} ${parts.month} ${parts.year} at ${parts.hour}:${parts.minute}`,
};

export function formatInTimeZone(
  value: Date,
  timeZone: string,
  pattern: string,
): string {
  const format = PATTERN_FORMATTERS[pattern] ?? PATTERN_FORMATTERS["d MMM yyyy"];
  return format(zonedParts(value, resolveTimeZone(timeZone)));
}

/** Format a `yyyy-MM-dd` calendar date without shifting it into another day. */
export function formatCalendarDate(isoDate: string, pattern: string): string | null {
  const match = DATE_ONLY.exec(isoDate.trim());
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (!isRealCalendarDate(year, month, day)) return null;
  const noonUtc = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
  return formatInTimeZone(noonUtc, "UTC", pattern);
}

function zonedParts(value: Date, timeZone: string): ZonedParts {
  const parts = new Intl.DateTimeFormat("en-NZ", {
    timeZone,
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(value);

  const read = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "";

  let hour = read("hour");
  if (hour === "24") hour = "00";

  return {
    weekday: read("weekday"),
    day: read("day"),
    month: read("month"),
    year: read("year"),
    hour: hour.padStart(2, "0"),
    minute: read("minute").padStart(2, "0"),
  };
}

/** Offset of `timeZone` at `instant`, in milliseconds. Positive east of UTC. */
function zoneOffsetMs(instant: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(instant);

  const num = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value);

  let hour = num("hour");
  if (hour === 24) hour = 0;

  const asUtc = Date.UTC(
    num("year"),
    num("month") - 1,
    num("day"),
    hour,
    num("minute"),
    num("second"),
  );
  return asUtc - instant.getTime();
}

function isRealCalendarDate(year: number, month: number, day: number): boolean {
  if (month < 1 || month > 12 || day < 1 || day > 31) return false;
  const probe = new Date(Date.UTC(year, month - 1, day));
  return (
    probe.getUTCFullYear() === year &&
    probe.getUTCMonth() === month - 1 &&
    probe.getUTCDate() === day
  );
}
