import assert from "node:assert/strict";
import { it } from "vitest";

import { studentProgress } from "@/lib/ccat/progress";
import type { CcatEvent, CcatItem, CcatStudent } from "@/lib/ccat/types";

const student: CcatStudent = {
  id: "student-1",
  fullName: "Chris Noldus",
  profileId: null,
  intakeId: "intake-1",
  status: "active",
  startedOn: null,
  notes: null,
};

function item(id: string, name: string, sortOrder: number): CcatItem {
  return {
    id,
    categoryId: "flight",
    categoryKey: "flight",
    categoryName: "Flight Lessons",
    categorySort: 1,
    name,
    sortOrder,
    isActive: true,
    signoffMode: "learnt_taught",
  };
}

const items = [item("steep", "Steep Turns", 11), item("wing", "Wingdrop Stalls", 13), item("low", "Low Flying I", 14)];

function event(partial: Partial<CcatEvent> & Pick<CcatEvent, "id" | "itemId" | "kind" | "eventDate">): CcatEvent {
  return {
    studentId: student.id,
    flightId: null,
    instructorId: null,
    instructorName: "A Instructor",
    notes: null,
    source: "manual",
    importKey: null,
    voidedAt: null,
    ...partial,
  };
}

it("learnt and taught stay independent and out of order does not complete earlier exercises", () => {
  const progress = studentProgress(
    student,
    items,
    [
      event({ id: "1", itemId: "steep", kind: "learnt", eventDate: "2026-10-12" }),
      event({ id: "2", itemId: "steep", kind: "taught", eventDate: "2026-10-19" }),
      event({ id: "3", itemId: "wing", kind: "learnt", eventDate: "2026-10-19" }),
    ],
    [],
  );

  const steep = progress.items.find((row) => row.item.id === "steep");
  const wing = progress.items.find((row) => row.item.id === "wing");
  const low = progress.items.find((row) => row.item.id === "low");
  assert.equal(steep?.status, "complete");
  assert.equal(steep?.learnt?.date, "2026-10-12");
  assert.equal(steep?.taught?.date, "2026-10-19");
  assert.equal(wing?.status, "learnt");
  assert.equal(wing?.taught, null);
  assert.equal(low?.status, "not_started");
});

it("a later learnt sign-off does not replace the original date", () => {
  const progress = studentProgress(
    student,
    [items[0]],
    [
      event({ id: "1", itemId: "steep", kind: "learnt", eventDate: "2026-10-12", instructorName: "First" }),
      event({ id: "2", itemId: "steep", kind: "learnt", eventDate: "2026-11-02", instructorName: "Second" }),
    ],
    [],
  );
  assert.equal(progress.items[0]?.learnt?.date, "2026-10-12");
  assert.equal(progress.items[0]?.learnt?.instructorName, "First");
});

it("a briefing can be delivered more than once and received only counts once", () => {
  const lecture: CcatItem = {
    ...item("lift", "Lift Formula", 4),
    categoryKey: "pof",
    categoryName: "POF Lectures",
    signoffMode: "delivery",
  };
  const progress = studentProgress(
    student,
    [lecture],
    [
      event({ id: "d2", itemId: "lift", kind: "delivered", eventDate: "2026-11-02", instructorName: "Second" }),
      event({ id: "d1", itemId: "lift", kind: "delivered", eventDate: "2026-10-12", instructorName: "First" }),
      event({ id: "r1", itemId: "lift", kind: "received", eventDate: "2026-11-08", instructorName: "First" }),
    ],
    [],
  );
  const row = progress.items[0];
  assert.equal(row?.status, "complete");
  assert.equal(row?.received?.date, "2026-11-08");
  assert.equal(row?.received?.instructorName, "First");
  assert.deepEqual(
    row?.deliveries.map((delivery) => delivery.date),
    ["2026-10-12", "2026-11-02"],
  );
  assert.equal(progress.pofPct, 100);
});
