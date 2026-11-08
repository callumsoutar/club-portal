"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { confirmImport } from "@/lib/ccat/actions";
import { parseTrainingCsv, type ImportRecord } from "@/lib/ccat/import-csv";
import { Button } from "@/components/flight/ui/button";
import { Label } from "@/components/flight/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/flight/ui/select";

interface Directory {
  students: { id: string; fullName: string }[];
  instructors: { id: string; fullName: string }[];
  items: { id: string; name: string; categoryKey: string }[];
  existingImportKeys: string[];
}

export function ImportPanel({ directory }: { directory: Directory }) {
  const router = useRouter();
  const [format, setFormat] = useState<string>("");
  const [records, setRecords] = useState<ImportRecord[]>([]);
  const [included, setIncluded] = useState<Record<string, boolean>>({});
  const [pending, setPending] = useState(false);

  const readyCount = useMemo(
    () => records.filter((record) => included[record.importKey] && isReady(record)).length,
    [records, included],
  );

  async function onFile(file: File | undefined) {
    if (!file) return;
    const text = await file.text();
    const parsed = parseTrainingCsv(text, directory);
    setFormat(parsed.format);
    setRecords(parsed.records);
    setIncluded(Object.fromEntries(parsed.records.map((record) => [record.importKey, isReady(record)])));
  }

  function update(index: number, next: ImportRecord) {
    setRecords((current) => current.map((record, position) => (position === index ? next : record)));
  }

  async function save() {
    const chosen = records.filter((record) => included[record.importKey] && isReady(record));
    setPending(true);
    const result = await confirmImport({
      records: chosen.map((record) => {
        if (record.type === "signoff") {
          return {
            type: "signoff" as const,
            importKey: record.importKey,
            studentId: record.studentId,
            instructorId: record.instructorId,
            instructorName: record.instructorName,
            itemId: record.itemId,
            kind: record.kind,
            date: record.date,
            notes: record.notes,
          };
        }
        return {
          type: "flight" as const,
          importKey: record.importKey,
          studentId: record.studentId,
          instructorId: record.instructorId,
          instructorName: record.instructorName,
          date: record.date,
          registration: record.registration,
          dualHours: record.dualHours,
          soloHours: record.soloHours,
          notes: record.notes,
          learntItemIds: record.learnt.map((item) => item.id).filter((id): id is string => Boolean(id)),
          taughtItemIds: record.taught.map((item) => item.id).filter((id): id is string => Boolean(id)),
        };
      }),
    });
    setPending(false);
    if (!result.ok) {
      toast.error(result.error ?? "Could not import.");
      return;
    }
    toast.success(`Imported ${result.inserted ?? 0}. Skipped ${result.skipped ?? 0} already recorded.`);
    setRecords([]);
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="space-y-2">
        <Label htmlFor="ccat-csv">Spreadsheet or booking CSV</Label>
        <input
          id="ccat-csv"
          type="file"
          accept=".csv,text/csv"
          onChange={(event) => void onFile(event.target.files?.[0])}
          className="block w-full text-sm file:mr-3 file:rounded-md file:border file:bg-background file:px-3 file:py-2"
        />
        <p className="text-sm text-muted-foreground">
          Accepts a booking export (CheckIn, MemberName, StaffName, Description, Registration, Solo, Dual), a syllabus sheet with Learnt and Taught columns, or Student, Exercise, Kind, Date, Instructor. Nothing is saved until you confirm the review.
        </p>
      </div>

      {format === "unknown" && records.length === 0 ? (
        <p className="text-sm text-muted-foreground">The file does not match one of the expected layouts. Check the header row and try again.</p>
      ) : null}

      {records.length > 0 ? (
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">{records.length} rows · {readyCount} ready</p>
            <Button size="sm" onClick={save} disabled={pending || readyCount === 0}>
              {pending ? <Loader2 className="size-4 animate-spin" /> : null}
              Import {readyCount}
            </Button>
          </div>
          <ul className="divide-y rounded-xl border bg-card">
            {records.map((record, index) => (
              <li key={`${record.importKey}-${index}`} className="flex flex-col gap-3 px-3 py-3">
                <label className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    className="mt-1 size-4"
                    checked={Boolean(included[record.importKey])}
                    onChange={(event) => setIncluded((current) => ({ ...current, [record.importKey]: event.target.checked }))}
                  />
                  <span className="min-w-0 text-sm">
                    <span className="font-medium">{record.studentName || "Unnamed student"}</span>
                    <span className="text-muted-foreground"> · {record.date ?? "No date"} · {record.type === "flight" ? "Flight" : record.kind}</span>
                    {record.duplicate ? <span className="text-muted-foreground"> · Already imported</span> : null}
                  </span>
                </label>
                {record.issues.length > 0 ? (
                  <ul className="pl-7 text-sm text-warning-foreground">
                    {record.issues.map((issue) => <li key={issue}>{issue}</li>)}
                  </ul>
                ) : null}
                <div className="grid gap-3 pl-7 sm:grid-cols-2">
                  <MatchSelect
                    label="Student"
                    value={record.studentId}
                    options={directory.students.map((student) => ({ id: student.id, label: student.fullName }))}
                    onChange={(id) => {
                      const student = directory.students.find((entry) => entry.id === id);
                      update(index, { ...record, studentId: id, studentName: student?.fullName ?? record.studentName, issues: record.issues.filter((issue) => !issue.startsWith("No student")) });
                    }}
                  />
                  <MatchSelect
                    label="Instructor"
                    value={record.instructorId}
                    options={directory.instructors.map((instructor) => ({ id: instructor.id, label: instructor.fullName }))}
                    onChange={(id) => {
                      const instructor = directory.instructors.find((entry) => entry.id === id);
                      update(index, { ...record, instructorId: id, instructorName: instructor?.fullName ?? record.instructorName });
                    }}
                  />
                  {record.type === "signoff" ? (
                    <MatchSelect
                      label="Exercise"
                      value={record.itemId}
                      options={directory.items.map((item) => ({ id: item.id, label: item.name }))}
                      onChange={(id) => {
                        const item = directory.items.find((entry) => entry.id === id);
                        update(index, { ...record, itemId: id, itemName: item?.name ?? record.itemName, issues: record.issues.filter((issue) => !issue.startsWith("No syllabus")) });
                      }}
                    />
                  ) : (
                    <>
                      <MatchSelect
                        label="Taught"
                        value={record.taught[0]?.id ?? null}
                        options={directory.items.filter((item) => item.categoryKey === "flight").map((item) => ({ id: item.id, label: item.name }))}
                        onChange={(id) => {
                          const item = directory.items.find((entry) => entry.id === id);
                          update(index, { ...record, taught: item ? [{ id: item.id, name: item.name }] : [], issues: record.issues.filter((issue) => !issue.includes("ambiguous") && !issue.startsWith("No syllabus")) });
                        }}
                      />
                      <MatchSelect
                        label="Learnt"
                        value={record.learnt[0]?.id ?? null}
                        options={directory.items.filter((item) => item.categoryKey === "flight").map((item) => ({ id: item.id, label: item.name }))}
                        onChange={(id) => {
                          const item = directory.items.find((entry) => entry.id === id);
                          update(index, { ...record, learnt: item ? [{ id: item.id, name: item.name }] : [], issues: record.issues.filter((issue) => !issue.includes("ambiguous") && !issue.startsWith("No syllabus")) });
                        }}
                      />
                    </>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

function isReady(record: ImportRecord) {
  if (record.duplicate || !record.studentId || !record.date) return false;
  if (record.type === "signoff") return Boolean(record.itemId && record.kind);
  const learnt = record.learnt.some((item) => item.id);
  const taught = record.taught.some((item) => item.id);
  return learnt || taught;
}

function MatchSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string | null;
  options: { id: string; label: string }[];
  onChange: (id: string | null) => void;
}) {
  return (
    <div className="space-y-1">
      <Label className="text-xs">{label}</Label>
      <Select value={value || "none"} onValueChange={(next) => onChange(next === "none" ? null : next)}>
        <SelectTrigger className="w-full"><SelectValue placeholder="Choose" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="none">Unresolved</SelectItem>
          {options.map((option) => (
            <SelectItem key={option.id} value={option.id}>{option.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
