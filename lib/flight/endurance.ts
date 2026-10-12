/** Usable fuel is always litres. Oil is always quarts. Fuel burn is litres per hour. */

export const FUEL_UNIT = "L";
export const OIL_UNIT = "qt";
export const FUEL_BURN_UNIT = "L/h";

export interface FlightFigures {
  fuelBurnLph: number | null;
  minOilQuarts: number | null;
  reserveMinutes: number;
}

export type QuantityTone = "ok" | "low" | "unknown";

export function quantityUnit(key: string): "L" | "qt" | null {
  if (key === "fuel_level") return FUEL_UNIT;
  if (key === "oil_level") return OIL_UNIT;
  return null;
}

/** Coerce a form answer or a Postgres numeric (often a string) into a number. */
export function asNumber(value: unknown): number | null {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value !== "string") return null;

  const trimmed = value.trim().replace(",", ".");
  if (!trimmed) return null;

  const direct = Number(trimmed);
  if (Number.isFinite(direct)) return direct;

  const match = trimmed.match(/-?\d+(?:\.\d+)?/);
  if (!match) return null;
  const parsed = Number(match[0]);
  return Number.isFinite(parsed) ? parsed : null;
}

export function formatQuantity(value: number): string {
  return new Intl.NumberFormat("en-NZ", { maximumFractionDigits: 1 }).format(value);
}

/** Hours and minutes, rounded to the nearest minute. Negative values use a minus sign. */
export function formatDurationMinutes(totalMinutes: number): string {
  const negative = totalMinutes < 0;
  const rounded = Math.round(Math.abs(totalMinutes));
  const hours = Math.floor(rounded / 60);
  const minutes = rounded % 60;
  const body =
    hours === 0
      ? `${minutes}m`
      : minutes === 0
        ? `${hours}h`
        : `${hours}h ${minutes.toString().padStart(2, "0")}m`;
  return negative ? `−${body}` : body;
}

export function computeEndurance(input: {
  usableFuelLitres: number | null;
  fuelBurnLph: number | null;
  reserveMinutes: number;
}): { enduranceMinutes: number | null; safeEnduranceMinutes: number | null } {
  const { usableFuelLitres, fuelBurnLph, reserveMinutes } = input;
  if (
    usableFuelLitres == null ||
    usableFuelLitres < 0 ||
    fuelBurnLph == null ||
    fuelBurnLph <= 0
  ) {
    return { enduranceMinutes: null, safeEnduranceMinutes: null };
  }

  const enduranceMinutes = (usableFuelLitres / fuelBurnLph) * 60;
  return {
    enduranceMinutes,
    safeEnduranceMinutes: enduranceMinutes - reserveMinutes,
  };
}

export interface FuelReview {
  display: string;
  enduranceLabel: string | null;
  safeLabel: string | null;
  tone: QuantityTone;
  detail: string | null;
}

export function reviewFuel(input: {
  answer: unknown;
  fuelBurnLph: number | null;
  reserveMinutes: number;
}): FuelReview {
  const litres = asNumber(input.answer);
  const display =
    litres == null
      ? input.answer == null || input.answer === ""
        ? "—"
        : String(input.answer)
      : `${formatQuantity(litres)} ${FUEL_UNIT}`;

  if (litres == null) {
    return {
      display,
      enduranceLabel: null,
      safeLabel: null,
      tone: "unknown",
      detail: null,
    };
  }

  if (input.fuelBurnLph == null || input.fuelBurnLph <= 0) {
    return {
      display,
      enduranceLabel: null,
      safeLabel: null,
      tone: "unknown",
      detail: "Set a fuel burn on this aircraft to calculate endurance.",
    };
  }

  const { enduranceMinutes, safeEnduranceMinutes } = computeEndurance({
    usableFuelLitres: litres,
    fuelBurnLph: input.fuelBurnLph,
    reserveMinutes: input.reserveMinutes,
  });

  const tone: QuantityTone =
    safeEnduranceMinutes != null && safeEnduranceMinutes <= 0 ? "low" : "ok";

  return {
    display,
    enduranceLabel:
      enduranceMinutes == null
        ? null
        : `Endurance ${formatDurationMinutes(enduranceMinutes)}`,
    safeLabel:
      safeEnduranceMinutes == null
        ? null
        : `Safe ${formatDurationMinutes(safeEnduranceMinutes)}`,
    tone,
    detail:
      tone === "low"
        ? `Short of the ${input.reserveMinutes} min club reserve.`
        : null,
  };
}

export interface OilReview {
  display: string;
  tone: QuantityTone;
  detail: string | null;
}

export function reviewOil(input: {
  answer: unknown;
  minOilQuarts: number | null;
}): OilReview {
  const quarts = asNumber(input.answer);
  const display =
    quarts == null
      ? input.answer == null || input.answer === ""
        ? "—"
        : String(input.answer)
      : `${formatQuantity(quarts)} ${OIL_UNIT}`;

  if (quarts == null) {
    return { display, tone: "unknown", detail: null };
  }

  if (input.minOilQuarts == null) {
    return {
      display,
      tone: "unknown",
      detail: "Set a minimum oil quantity on this aircraft.",
    };
  }

  if (quarts < input.minOilQuarts) {
    return {
      display,
      tone: "low",
      detail: `Below minimum ${formatQuantity(input.minOilQuarts)} qt`,
    };
  }

  return {
    display,
    tone: "ok",
    detail: `Minimum ${formatQuantity(input.minOilQuarts)} qt`,
  };
}

export function reviewQuantityIssues(
  answers: Record<string, unknown>,
  figures: FlightFigures,
): string[] {
  const issues: string[] = [];
  const fuel = reviewFuel({
    answer: answers.fuel_level,
    fuelBurnLph: figures.fuelBurnLph,
    reserveMinutes: figures.reserveMinutes,
  });
  if (fuel.tone === "low" && fuel.safeLabel) {
    issues.push(
      `${fuel.safeLabel} — short of the ${figures.reserveMinutes} min club reserve`,
    );
  }

  const oil = reviewOil({
    answer: answers.oil_level,
    minOilQuarts: figures.minOilQuarts,
  });
  if (oil.tone === "low" && oil.detail) {
    issues.push(`Oil ${oil.detail.charAt(0).toLowerCase()}${oil.detail.slice(1)}`);
  }

  return issues;
}
