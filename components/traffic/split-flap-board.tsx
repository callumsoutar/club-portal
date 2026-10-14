"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";

import { BoardRow } from "@/components/traffic/board-row";
import type { TrafficAircraft } from "@/lib/traffic/types";

const COLUMNS = [
  { key: "call", label: "Call", length: 8, align: "left" },
  { key: "nm", label: "Nm", length: 5, align: "right" },
  { key: "alt", label: "Alt", length: 5, align: "right" },
  { key: "kt", label: "Kt", length: 4, align: "right" },
  { key: "trk", label: "Trk", length: 2, align: "left" },
] as const;

type ColumnKey = (typeof COLUMNS)[number]["key"];

const CHAR_COUNT = COLUMNS.reduce((sum, column) => sum + column.length, 0);
const INNER_GAPS = CHAR_COUNT - COLUMNS.length;
const COLUMN_GAPS = COLUMNS.length - 1;
const CELL_GAP = 4;
const COL_GAP = 20;
const CELL_RATIO = 1.45;

export function SplitFlapBoard({ aircraft }: { aircraft: TrafficAircraft[] }) {
  const lines = aircraft.length > 0 ? aircraft.map(lineForAircraft) : [clearLine()];
  const stageRef = useRef<HTMLDivElement>(null);
  const [cell, setCell] = useState(48);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;

    const measure = () => {
      const width = stage.clientWidth;
      const height = stage.clientHeight;
      if (width < 1 || height < 1) return;
      const rows = Math.max(1, lines.length);
      const labelBlock = 40;
      const rowGap = 16;
      const byWidth = (width - CELL_GAP * INNER_GAPS - COL_GAP * COLUMN_GAPS) / CHAR_COUNT;
      const availableHeight = height - labelBlock - rowGap * Math.max(0, rows - 1);
      const byHeight = availableHeight / rows / CELL_RATIO;
      const next = Math.floor(Math.min(byWidth, byHeight, 180));
      setCell(Math.max(32, next));
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(stage);
    return () => observer.disconnect();
  }, [lines.length]);

  return (
    <div
      ref={stageRef}
      className="board-scroll min-h-0 flex-1"
      style={
        {
          "--cell": `${cell}px`,
          "--cell-h": `${Math.round(cell * CELL_RATIO)}px`,
          "--cell-gap": `${CELL_GAP}px`,
          "--col-gap": `${COL_GAP}px`,
        } as CSSProperties
      }
    >
      <div className="board-table">
        <div className="board-labels">
          {COLUMNS.map((column) => (
            <div
              key={column.key}
              className="board-field-label"
              style={{ width: `calc(var(--cell) * ${column.length} + var(--cell-gap) * ${column.length - 1})` }}
            >
              {column.label}
            </div>
          ))}
        </div>
        <ul>
          {lines.map((line) => (
            <li key={line.id} className={line.emergency ? "board-line is-emergency" : "board-line"}>
              <span className="sr-only">{line.spoken}</span>
              {COLUMNS.map((column) => (
                <BoardRow
                  key={column.key}
                  text={line.fields[column.key]}
                  length={column.length}
                  align={column.align}
                  className={column.key === "call" ? "is-call" : undefined}
                />
              ))}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

type BoardLine = {
  id: string;
  emergency: boolean;
  spoken: string;
  fields: Record<ColumnKey, string>;
};

function lineForAircraft(aircraft: TrafficAircraft): BoardLine {
  const callsign = aircraft.callsign ?? "UNKNOWN";
  const track = aircraft.trackDeg == null ? null : compassPoint(aircraft.trackDeg);
  return {
    id: aircraft.id,
    emergency: aircraft.emergency,
    spoken: [
      callsign,
      `${aircraft.distanceNm.toFixed(1)} nautical miles`,
      aircraft.altitudeFt == null ? "altitude unknown" : `${aircraft.altitudeFt} feet`,
      aircraft.groundSpeedKt == null ? "speed unknown" : `${aircraft.groundSpeedKt} knots`,
      track == null ? "track unknown" : `track ${track.name}`,
      aircraft.emergency ? `emergency squawk ${aircraft.squawk}` : "",
    ]
      .filter(Boolean)
      .join(", "),
    fields: {
      call: callsign,
      nm: aircraft.distanceNm.toFixed(1),
      alt: aircraft.altitudeFt == null ? "" : String(aircraft.altitudeFt),
      kt: aircraft.groundSpeedKt == null ? "" : String(aircraft.groundSpeedKt),
      trk: track?.short ?? "",
    },
  };
}

function clearLine(): BoardLine {
  return {
    id: "clear",
    emergency: false,
    spoken: "No aircraft inside 25 nautical miles of NZPP.",
    fields: {
      call: "CLEAR",
      nm: "",
      alt: "",
      kt: "",
      trk: "",
    },
  };
}

const COMPASS = [
  { short: "N", name: "north" },
  { short: "NE", name: "northeast" },
  { short: "E", name: "east" },
  { short: "SE", name: "southeast" },
  { short: "S", name: "south" },
  { short: "SW", name: "southwest" },
  { short: "W", name: "west" },
  { short: "NW", name: "northwest" },
] as const;

/** Eight-point compass. 330° is NW, centred on 315°. */
function compassPoint(trackDeg: number) {
  const normalized = ((trackDeg % 360) + 360) % 360;
  const index = Math.round(normalized / 45) % 8;
  return COMPASS[index] ?? COMPASS[0];
}
