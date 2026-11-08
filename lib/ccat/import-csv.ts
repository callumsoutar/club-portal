import type { NamedMatch } from "@/lib/ccat/types";

export interface ImportDirectory {
  students: { id: string; fullName: string }[];
  instructors: { id: string; fullName: string }[];
  items: { id: string; name: string; categoryKey: string }[];
  existingImportKeys: string[];
}

export interface ImportFlight {
  type: "flight";
  importKey: string;
  studentName: string;
  studentId: string | null;
  instructorName: string | null;
  instructorId: string | null;
  date: string | null;
  registration: string | null;
  dualHours: number;
  soloHours: number;
  notes: string | null;
  learnt: NamedMatch[];
  taught: NamedMatch[];
  issues: string[];
  duplicate: boolean;
}

export interface ImportSignoff {
  type: "signoff";
  importKey: string;
  studentName: string;
  studentId: string | null;
  instructorName: string | null;
  instructorId: string | null;
  itemName: string;
  itemId: string | null;
  kind: "learnt" | "taught" | "completed";
  date: string | null;
  notes: string | null;
  issues: string[];
  duplicate: boolean;
}

export type ImportRecord = ImportFlight | ImportSignoff;

export interface ImportParseResult {
  format: "booking" | "matrix" | "long" | "unknown";
  records: ImportRecord[];
}

export function parseTrainingCsv(text: string, directory: ImportDirectory): ImportParseResult {
  const rows = parseCsv(text);
  if (rows.length < 2) return { format: "unknown", records: [] };
  const headers = rows[0].map((cell) => cell.trim());
  const normalised = headers.map((cell) => normalise(cell));
  if (normalised.includes("checkin") && normalised.includes("membername")) {
    return { format: "booking", records: parseBooking(headers, rows.slice(1), directory) };
  }
  if (normalised.includes("student") && normalised.includes("exercise") && normalised.includes("kind")) {
    return { format: "long", records: parseLong(headers, rows.slice(1), directory) };
  }
  if (headers.some((header) => /\b(learnt|taught)\b/i.test(header))) {
    return { format: "matrix", records: parseMatrix(headers, rows.slice(1), directory) };
  }
  return { format: "unknown", records: [] };
}

function parseBooking(headers: string[], rows: string[][], directory: ImportDirectory): ImportFlight[] {
  const index = headerIndex(headers);
  return rows
    .filter((row) => row.some((cell) => cell.trim()))
    .map((row) => {
      const studentName = cell(row, index, "membername");
      const instructorName = cell(row, index, "staffname");
      const description = cell(row, index, "description");
      const date = parseClubDate(cell(row, index, "checkin"));
      const registration = cell(row, index, "registration") || null;
      const student = matchByName(studentName, directory.students);
      const instructor = matchByName(instructorName, directory.instructors);
      const hours = bookingHours(row, index);
      const split = splitDescription(description, directory.items);
      const learnt = split.learnt.map((name) => matchExercise(name, directory.items));
      const taught = split.taught.map((name) => matchExercise(name, directory.items));
      const issues: string[] = [];
      if (!studentName) issues.push("Student name is missing.");
      else if (!student) issues.push(`No student match for ${studentName}.`);
      if (!date) issues.push("Check-in date is missing or not D/M/YYYY.");
      if (instructorName && !instructor) issues.push(`No instructor match for ${instructorName}.`);
      if (!description) issues.push("Description is empty.");
      else if (split.ambiguous) issues.push("Description is ambiguous. Choose learnt and taught before importing.");
      for (const match of [...learnt, ...taught]) {
        if (!match.id) issues.push(`No syllabus match for ${match.name}.`);
      }
      const importKey = [
        "flight",
        date ?? "",
        student?.id ?? keyPart(studentName),
        keyPart(registration ?? ""),
        keyPart(description),
      ].join(":");
      return {
        type: "flight",
        importKey,
        studentName,
        studentId: student?.id ?? null,
        instructorName: instructorName || null,
        instructorId: instructor?.id ?? null,
        date,
        registration,
        dualHours: hours.dual,
        soloHours: hours.solo,
        notes: cell(row, index, "flighttype") || null,
        learnt,
        taught,
        issues,
        duplicate: directory.existingImportKeys.includes(importKey),
      };
    });
}

function parseLong(headers: string[], rows: string[][], directory: ImportDirectory): ImportSignoff[] {
  const index = headerIndex(headers);
  return rows
    .filter((row) => row.some((cell) => cell.trim()))
    .map((row) => {
      const studentName = cell(row, index, "student");
      const itemName = cell(row, index, "exercise");
      const kindText = normalise(cell(row, index, "kind"));
      const kind = kindText === "learnt" || kindText === "taught" || kindText === "completed" ? kindText : null;
      const date = parseClubDate(cell(row, index, "date"));
      const instructorName = cell(row, index, "instructor");
      const student = matchByName(studentName, directory.students);
      const instructor = matchByName(instructorName, directory.instructors);
      const item = matchExercise(itemName, directory.items);
      const issues: string[] = [];
      if (!student) issues.push(studentName ? `No student match for ${studentName}.` : "Student name is missing.");
      if (!item.id) issues.push(itemName ? `No syllabus match for ${itemName}.` : "Exercise is missing.");
      if (!kind) issues.push("Kind must be learnt, taught, or completed.");
      if (!date) issues.push("Date is missing or not D/M/YYYY.");
      if (instructorName && !instructor) issues.push(`No instructor match for ${instructorName}.`);
      const importKey = [
        "signoff",
        student?.id ?? keyPart(studentName),
        item.id ?? keyPart(itemName),
        kind ?? "",
        date ?? "",
        keyPart(instructorName),
      ].join(":");
      return {
        type: "signoff",
        importKey,
        studentName,
        studentId: student?.id ?? null,
        instructorName: instructorName || null,
        instructorId: instructor?.id ?? null,
        itemName,
        itemId: item.id,
        kind: kind ?? "learnt",
        date,
        notes: cell(row, index, "notes") || null,
        issues,
        duplicate: directory.existingImportKeys.includes(importKey),
      };
    });
}

function parseMatrix(headers: string[], rows: string[][], directory: ImportDirectory): ImportSignoff[] {
  const groups = new Map<string, { student: string; kind: "learnt" | "taught"; flag?: number; date?: number; instructor?: number; notes?: number }>();
  headers.forEach((header, index) => {
    const match = /^(.*?)\s+(learnt|taught)(?:\s+(date|instructor|notes|note|checkbox))?$/i.exec(header.trim());
    if (!match) return;
    const student = match[1].trim();
    const kind = match[2].toLowerCase() as "learnt" | "taught";
    const field = (match[3] ?? "checkbox").toLowerCase() === "note" ? "notes" : (match[3] ?? "flag").toLowerCase();
    const key = `${normalise(student)}:${kind}`;
    const group = groups.get(key) ?? { student, kind };
    if (field === "date") group.date = index;
    else if (field === "instructor") group.instructor = index;
    else if (field === "notes") group.notes = index;
    else group.flag = index;
    groups.set(key, group);
  });

  const records: ImportSignoff[] = [];
  for (const row of rows) {
    const itemName = row[0]?.trim() ?? "";
    if (!itemName) continue;
    const item = matchExercise(itemName, directory.items);
    for (const group of groups.values()) {
      const flagged = group.flag == null ? false : truthy(row[group.flag] ?? "");
      const date = group.date == null ? null : parseClubDate(row[group.date] ?? "");
      if (!flagged && !date) continue;
      const instructorName = group.instructor == null ? "" : (row[group.instructor] ?? "").trim();
      const notes = group.notes == null ? "" : (row[group.notes] ?? "").trim();
      const student = matchByName(group.student, directory.students);
      const instructor = matchByName(instructorName, directory.instructors);
      const issues: string[] = [];
      if (!student) issues.push(`No student match for ${group.student}.`);
      if (!item.id) issues.push(`No syllabus match for ${itemName}.`);
      if (!date) issues.push("Sign-off date is missing.");
      if (instructorName && !instructor) issues.push(`No instructor match for ${instructorName}.`);
      const importKey = [
        "signoff",
        student?.id ?? keyPart(group.student),
        item.id ?? keyPart(itemName),
        group.kind,
        date ?? "",
        keyPart(instructorName),
      ].join(":");
      records.push({
        type: "signoff",
        importKey,
        studentName: group.student,
        studentId: student?.id ?? null,
        instructorName: instructorName || null,
        instructorId: instructor?.id ?? null,
        itemName,
        itemId: item.id,
        kind: group.kind,
        date,
        notes: notes || null,
        issues,
        duplicate: directory.existingImportKeys.includes(importKey),
      });
    }
  }
  return records;
}

export function splitDescription(description: string, items: { id: string; name: string }[]) {
  const text = description.trim();
  if (!text) return { taught: [] as string[], learnt: [] as string[], ambiguous: true };
  if (matchExercise(text, items).id) return { taught: [] as string[], learnt: [] as string[], ambiguous: true };
  const slash = text.split(/\s+\/\s+/);
  const amp = text.split(/\s+&\s+/);
  if (slash.length === 2 && !text.includes("&")) {
    return { taught: [slash[0].trim()], learnt: [slash[1].trim()], ambiguous: false };
  }
  if (amp.length === 2 && !text.includes("/")) {
    return { taught: [amp[0].trim()], learnt: [amp[1].trim()], ambiguous: false };
  }
  return { taught: [] as string[], learnt: [] as string[], ambiguous: true };
}

export function parseClubDate(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(trimmed);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  const parts = /^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})$/.exec(trimmed);
  if (!parts) return null;
  const day = Number(parts[1]);
  const month = Number(parts[2]);
  let year = Number(parts[3]);
  if (year < 100) year += 2000;
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
    return null;
  }
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function normalise(value: string) {
  return value.toLowerCase().replace(/&/g, " and ").replace(/[^a-z0-9]+/g, " ").trim();
}

function keyPart(value: string) {
  return normalise(value).replace(/ /g, "_");
}

function matchByName<T extends { id: string; fullName: string }>(input: string, options: T[]): T | null {
  const key = normalise(input);
  if (!key) return null;
  const exact = options.filter((option) => normalise(option.fullName) === key);
  if (exact.length === 1) return exact[0];
  if (exact.length > 1) return null;
  const partial = options.filter((option) => {
    const name = normalise(option.fullName);
    return name.includes(key) || key.includes(name);
  });
  return partial.length === 1 ? partial[0] : null;
}

function matchExercise(input: string, items: { id: string; name: string; categoryKey?: string }[]): NamedMatch {
  const name = input.trim();
  const flight = items.filter((item) => !item.categoryKey || item.categoryKey === "flight");
  const pool = flight.length > 0 ? flight : items;
  const key = normalise(name);
  const exact = pool.filter((item) => normalise(item.name) === key);
  if (exact.length === 1) return { name, id: exact[0].id };
  const partial = pool.filter((item) => normalise(item.name).includes(key) || key.includes(normalise(item.name)));
  if (partial.length === 1) return { name, id: partial[0].id };
  return { name, id: null };
}

function bookingHours(row: string[], index: Map<string, number>) {
  const soloRaw = cell(row, index, "solo");
  const dualRaw = cell(row, index, "dual");
  const flightTime = numberOrNull(cell(row, index, "flighttime"));
  const soloNumber = numberOrNull(soloRaw);
  const dualNumber = numberOrNull(dualRaw);
  if (soloNumber != null || dualNumber != null) {
    return { solo: soloNumber ?? 0, dual: dualNumber ?? 0 };
  }
  if (flightTime == null) return { solo: 0, dual: 0 };
  if (truthy(soloRaw) && !truthy(dualRaw)) return { solo: flightTime, dual: 0 };
  if (truthy(dualRaw) && !truthy(soloRaw)) return { solo: 0, dual: flightTime };
  return { solo: 0, dual: flightTime };
}

function numberOrNull(value: string) {
  if (!value.trim()) return null;
  const parsed = Number(value.replace(/,/g, ""));
  if (!Number.isFinite(parsed) || parsed < 0) return null;
  return Math.round(parsed * 100) / 100;
}

function truthy(value: string) {
  return ["1", "true", "yes", "y", "x", "checked"].includes(value.trim().toLowerCase());
}

function headerIndex(headers: string[]) {
  return new Map(headers.map((header, index) => [normalise(header), index]));
}

function cell(row: string[], index: Map<string, number>, name: string) {
  const position = index.get(name);
  if (position == null) return "";
  return row[position]?.trim() ?? "";
}

export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let value = "";
  let quoted = false;
  const source = text.replace(/^\uFEFF/, "");
  for (let i = 0; i < source.length; i += 1) {
    const char = source[i];
    if (quoted) {
      if (char === '"') {
        if (source[i + 1] === '"') {
          value += '"';
          i += 1;
        } else quoted = false;
      } else value += char;
      continue;
    }
    if (char === '"') {
      quoted = true;
      continue;
    }
    if (char === ",") {
      row.push(value);
      value = "";
      continue;
    }
    if (char === "\n" || char === "\r") {
      if (char === "\r" && source[i + 1] === "\n") i += 1;
      row.push(value);
      if (row.some((cell) => cell.trim())) rows.push(row);
      row = [];
      value = "";
      continue;
    }
    value += char;
  }
  row.push(value);
  if (row.some((cell) => cell.trim())) rows.push(row);
  return rows;
}
