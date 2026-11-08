import assert from "node:assert/strict";
import test from "node:test";

import { parseClubDate, parseTrainingCsv, splitDescription } from "@/lib/ccat/import-csv";

const directory = {
  students: [
    { id: "chris", fullName: "Chris Noldus" },
    { id: "joseph", fullName: "Joseph Peirce" },
  ],
  instructors: [{ id: "cal", fullName: "Cal Souter" }],
  items: [
    { id: "steep", name: "Steep Turns", categoryKey: "flight" },
    { id: "wing", name: "Wingdrop Stalls", categoryKey: "flight" },
    { id: "efato", name: "EFATO / Go-round", categoryKey: "flight" },
  ],
  existingImportKeys: [],
};

test("booking rows treat X / Y and X & Y as taught then learnt", () => {
  const csv = [
    "CheckIn,MemberName,StaffName,FlightType,Description,Registration,Solo,Dual,FlightTime",
    "12/10/2026,Chris Noldus,Cal Souter,Dual,Steep Turns / Wingdrop Stalls,ZK-EAA,0,1.1,1.1",
    "19/10/2026,Joseph Peirce,Cal Souter,Dual,Steep Turns & Wingdrop Stalls,ZK-EAA,,1.0,1.0",
  ].join("\n");
  const result = parseTrainingCsv(csv, directory);
  assert.equal(result.format, "booking");
  const first = result.records[0];
  const second = result.records[1];
  assert.equal(first?.type, "flight");
  if (first?.type !== "flight" || second?.type !== "flight") return;
  assert.equal(first.date, "2026-10-12");
  assert.equal(first.studentId, "chris");
  assert.equal(first.taught[0]?.id, "steep");
  assert.equal(first.learnt[0]?.id, "wing");
  assert.equal(first.dualHours, 1.1);
  assert.deepEqual(first.issues, []);
  assert.equal(second.taught[0]?.id, "steep");
  assert.equal(second.learnt[0]?.id, "wing");
});

test("a syllabus name that contains a slash is not split", () => {
  const split = splitDescription("EFATO / Go-round", directory.items);
  assert.equal(split.ambiguous, true);
  assert.deepEqual(split.taught, []);
});

test("a single exercise name is left unresolved", () => {
  const csv = [
    "CheckIn,MemberName,StaffName,Description,Registration,Solo,Dual",
    "1/11/2026,Chris Noldus,Cal Souter,Steep Turns,ZK-EAA,0,1",
  ].join("\n");
  const result = parseTrainingCsv(csv, directory);
  const row = result.records[0];
  assert.equal(row?.type, "flight");
  if (row?.type !== "flight") return;
  assert.equal(row.learnt.length, 0);
  assert.ok(row.issues.some((issue) => issue.includes("ambiguous")));
});

test("matrix columns keep learnt and taught dates apart", () => {
  const csv = [
    "Exercise,Chris Noldus Learnt,Chris Noldus Learnt Date,Chris Noldus Learnt Instructor,Chris Noldus Taught,Chris Noldus Taught Date,Chris Noldus Taught Instructor",
    "Steep Turns,TRUE,12/10/2026,Cal Souter,TRUE,19/10/2026,Cal Souter",
    "Low Flying I,FALSE,,,FALSE,,",
  ].join("\n");
  const result = parseTrainingCsv(csv, directory);
  assert.equal(result.format, "matrix");
  assert.equal(result.records.length, 2);
  const learnt = result.records.find((record) => record.type === "signoff" && record.kind === "learnt");
  const taught = result.records.find((record) => record.type === "signoff" && record.kind === "taught");
  assert.equal(learnt?.type, "signoff");
  assert.equal(taught?.type, "signoff");
  if (learnt?.type !== "signoff" || taught?.type !== "signoff") return;
  assert.equal(learnt.date, "2026-10-12");
  assert.equal(taught.date, "2026-10-19");
  assert.equal(learnt.itemId, "steep");
  assert.equal(learnt.instructorId, "cal");
});

test("dates before the 10th stay in the right month", () => {
  assert.equal(parseClubDate("8/11/2026"), "2026-11-08");
  assert.equal(parseClubDate("2026-11-08"), "2026-11-08");
  assert.equal(parseClubDate("31/02/2026"), null);
});

test("an existing import key is marked duplicate", () => {
  const csv = [
    "Student,Exercise,Kind,Date,Instructor",
    "Chris Noldus,Steep Turns,learnt,12/10/2026,Cal Souter",
  ].join("\n");
  const once = parseTrainingCsv(csv, directory);
  const key = once.records[0]?.importKey;
  const again = parseTrainingCsv(csv, { ...directory, existingImportKeys: key ? [key] : [] });
  assert.equal(again.records[0]?.duplicate, true);
});
