"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { Loader2, Search, UserRound } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/flight/ui/badge";
import { Button } from "@/components/flight/ui/button";
import { Input } from "@/components/flight/ui/input";
import { Label } from "@/components/flight/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/flight/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/flight/ui/sheet";
import { Switch } from "@/components/flight/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/flight/ui/table";
import { Textarea } from "@/components/flight/ui/textarea";
import { updateMemberProfile } from "@/lib/flight/actions/admin";
import { LICENCE_LABELS, LICENCE_SHORT } from "@/lib/flight/constants";
import { formatDate, getExpiryInfo } from "@/lib/flight/format";
import { cn } from "@/lib/flight/utils";
import type {
  Aircraft,
  AppRole,
  LicenceType,
  MemberAccount,
  PilotProfile,
} from "@/lib/flight/types";

const ROLE_LABELS: Record<AppRole, string> = {
  member: "Member",
  instructor: "Instructor",
  admin: "Admin",
};

const ROLE_FILTERS: { value: "all" | AppRole; label: string }[] = [
  { value: "all", label: "All" },
  { value: "member", label: "Members" },
  { value: "instructor", label: "Instructors" },
  { value: "admin", label: "Admins" },
];

type Values = {
  full_name: string;
  phone: string;
  role: AppRole;
  is_active: boolean;
  licence_type: "" | LicenceType;
  licence_number: string;
  bfr_expiry: string;
  medical_expiry: string;
  preferred_aircraft_id: string;
  emergency_contact_name: string;
  emergency_contact_phone: string;
  notes: string;
};

export function MemberManager({
  members,
  aircraft,
  currentUserId,
}: {
  members: MemberAccount[];
  aircraft: Aircraft[];
  currentUserId: string;
}) {
  const [query, setQuery] = useState("");
  const [role, setRole] = useState<"all" | AppRole>("all");
  const [selected, setSelected] = useState<MemberAccount | null>(null);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return members.filter((member) => {
      if (role !== "all" && member.profile.role !== role) return false;
      if (!needle) return true;
      const haystack = [
        member.profile.full_name,
        member.profile.email,
        member.profile.phone,
        member.pilot?.licence_number,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(needle);
    });
  }, [members, query, role]);

  const activeCount = members.filter((member) => member.profile.is_active).length;

  return (
    <>
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-[-0.025em] sm:text-[1.75rem] sm:leading-tight">
            Members
          </h1>
          <p className="mt-1.5 max-w-xl text-[15px] text-muted-foreground">
            Everyone who has created an account, and the details used on their next
            flight authorisation.
          </p>
        </div>
        {members.length > 0 && (
          <p className="text-sm text-muted-foreground tabular-nums">
            <span className="font-semibold text-foreground">{activeCount}</span> active
            <span className="mx-2 text-border">·</span>
            {members.length} total
          </p>
        )}
      </header>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative min-w-0 sm:max-w-sm sm:flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search name, email or phone"
            aria-label="Search members"
            className="h-10 pl-9"
          />
        </div>
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter by role">
          {ROLE_FILTERS.map((filter) => {
            const selectedFilter = role === filter.value;
            return (
              <Button
                key={filter.value}
                type="button"
                size="sm"
                variant={selectedFilter ? "default" : "outline"}
                className="h-8"
                aria-pressed={selectedFilter}
                onClick={() => setRole(filter.value)}
              >
                {filter.label}
              </Button>
            );
          })}
        </div>
      </div>

      {members.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 border-b border-foreground/10 py-16 text-center">
          <UserRound className="size-5 text-muted-foreground" />
          <p className="text-sm font-medium">No accounts yet</p>
          <p className="max-w-sm text-sm text-muted-foreground">
            People appear here after they sign up.
          </p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 border-b border-foreground/10 py-16 text-center">
          <Search className="size-5 text-muted-foreground" />
          <p className="text-sm font-medium">No members match</p>
          <p className="max-w-sm text-sm text-muted-foreground">
            Try a different name, email, or role.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border bg-card shadow-xs">
          <Table>
            <TableHeader>
              <TableRow className="border-b hover:bg-transparent">
                <TableHead className="h-11 px-4 text-[13px] font-semibold text-foreground/80">
                  Member
                </TableHead>
                <TableHead className="hidden h-11 px-4 text-[13px] font-semibold text-foreground/80 md:table-cell">
                  Licence
                </TableHead>
                <TableHead className="hidden h-11 px-4 text-[13px] font-semibold text-foreground/80 sm:table-cell">
                  Currency
                </TableHead>
                <TableHead className="h-11 px-4 text-[13px] font-semibold text-foreground/80">
                  Role
                </TableHead>
                <TableHead className="hidden h-11 px-4 text-[13px] font-semibold text-foreground/80 lg:table-cell">
                  Joined
                </TableHead>
                <TableHead className="h-11 w-16 px-3 text-right text-[13px] font-semibold text-foreground/80">
                  <span className="sr-only">Open</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((member) => {
                const currency = currencySummary(member.pilot);
                const licence = member.pilot?.licence_type
                  ? LICENCE_SHORT[member.pilot.licence_type]
                  : "—";

                return (
                  <TableRow
                    key={member.profile.id}
                    className={cn(
                      "cursor-pointer border-b border-border/70 last:border-0 hover:bg-muted/30",
                      !member.profile.is_active && "bg-muted/20",
                    )}
                    onClick={() => setSelected(member)}
                  >
                    <TableCell className="px-4 py-4">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">
                          {member.profile.full_name?.trim() || "Unnamed member"}
                        </p>
                        <p className="mt-0.5 truncate text-xs text-muted-foreground">
                          {member.profile.email}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell className="hidden px-4 py-4 text-[13px] text-muted-foreground md:table-cell">
                      {licence}
                    </TableCell>
                    <TableCell className="hidden px-4 py-4 sm:table-cell">
                      <CurrencyBadge state={currency.state} label={currency.label} />
                    </TableCell>
                    <TableCell className="px-4 py-4">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <RoleBadge role={member.profile.role} />
                        {member.safetyAdmin ? (
                          <Badge variant="outline">Safety</Badge>
                        ) : null}
                        {!member.profile.is_active ? (
                          <Badge variant="secondary">Inactive</Badge>
                        ) : null}
                      </div>
                    </TableCell>
                    <TableCell className="hidden px-4 py-4 text-[13px] text-muted-foreground lg:table-cell">
                      {formatDate(member.profile.created_at)}
                    </TableCell>
                    <TableCell className="px-3 py-4 text-right">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-8"
                        onClick={() => setSelected(member)}
                      >
                        View
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      <Sheet open={selected !== null} onOpenChange={(open) => !open && setSelected(null)}>
        <SheetContent className="w-full gap-0 overflow-hidden p-0 sm:max-w-lg">
          {selected ? (
            <MemberEditor
              key={selected.profile.id}
              member={selected}
              aircraft={aircraft}
              isSelf={selected.profile.id === currentUserId}
              onClose={() => setSelected(null)}
            />
          ) : null}
        </SheetContent>
      </Sheet>
    </>
  );
}

function MemberEditor({
  member,
  aircraft,
  isSelf,
  onClose,
}: {
  member: MemberAccount;
  aircraft: Aircraft[];
  isSelf: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const pilot = member.pilot;

  const { register, handleSubmit, watch, setValue } = useForm<Values>({
    defaultValues: {
      full_name: member.profile.full_name ?? "",
      phone: member.profile.phone ?? "",
      role: member.profile.role,
      is_active: member.profile.is_active,
      licence_type: pilot?.licence_type ?? "",
      licence_number: pilot?.licence_number ?? "",
      bfr_expiry: pilot?.bfr_expiry ?? "",
      medical_expiry: pilot?.medical_expiry ?? "",
      preferred_aircraft_id: pilot?.preferred_aircraft_id ?? "",
      emergency_contact_name: pilot?.emergency_contact_name ?? "",
      emergency_contact_phone: pilot?.emergency_contact_phone ?? "",
      notes: pilot?.notes ?? "",
    },
  });

  const bfr = getExpiryInfo(watch("bfr_expiry"));
  const medical = getExpiryInfo(watch("medical_expiry"));

  async function onSubmit(values: Values) {
    setPending(true);
    const result = await updateMemberProfile({
      id: member.profile.id,
      full_name: values.full_name,
      phone: values.phone,
      role: values.role,
      is_active: values.is_active,
      licence_type: values.licence_type,
      licence_number: values.licence_number,
      bfr_expiry: values.bfr_expiry,
      medical_expiry: values.medical_expiry,
      preferred_aircraft_id: values.preferred_aircraft_id,
      emergency_contact_name: values.emergency_contact_name,
      emergency_contact_phone: values.emergency_contact_phone,
      notes: values.notes,
    });
    setPending(false);

    if (!result.ok) {
      toast.error(result.error ?? "Couldn't save.");
      return;
    }

    toast.success("Member updated");
    onClose();
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex h-full min-h-0 flex-col">
      <SheetHeader className="border-b border-border/70 pr-12">
        <SheetTitle>{member.profile.full_name?.trim() || "Unnamed member"}</SheetTitle>
        <SheetDescription>
          Joined {formatDate(member.profile.created_at)}
          {isSelf ? " · This is your account" : ""}
        </SheetDescription>
      </SheetHeader>

      <div className="flex-1 space-y-6 overflow-y-auto p-4">
        <section className="space-y-4">
          <SectionTitle>Account</SectionTitle>
          <Field label="Full name">
            <Input {...register("full_name", { required: true })} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Phone">
              <Input {...register("phone")} type="tel" />
            </Field>
            <Field label="Email" hint="Sign-in address. It can't be changed here.">
              <Input value={member.profile.email} disabled />
            </Field>
          </div>
          <Field
            label="Flight role"
            hint="Admin can manage the fleet, instructors and forms. Instructor can review flights."
          >
            <Select
              value={watch("role")}
              onValueChange={(value: string) => setValue("role", value as AppRole)}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(ROLE_LABELS) as AppRole[]).map((value) => (
                  <SelectItem key={value} value={value}>
                    {ROLE_LABELS[value]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <label className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2.5">
            <span className="space-y-0.5">
              <span className="block text-sm font-medium">Active</span>
              <span className="block text-xs text-muted-foreground">
                {isSelf
                  ? "You can't deactivate your own account."
                  : "Inactive accounts stay in this list."}
              </span>
            </span>
            <Switch
              checked={watch("is_active")}
              disabled={isSelf}
              onCheckedChange={(checked: boolean) => setValue("is_active", checked)}
            />
          </label>
          {member.safetyAdmin ? (
            <p className="text-xs text-muted-foreground">
              This person can also edit safety articles. That access is separate from
              the flight role.
            </p>
          ) : null}
        </section>

        <section className="space-y-4">
          <SectionTitle>Licence & currency</SectionTitle>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Licence type">
              <Select
                value={watch("licence_type") || "__none"}
                onValueChange={(value: string) =>
                  setValue("licence_type", value === "__none" ? "" : (value as LicenceType))
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Not stated" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none">Not stated</SelectItem>
                  {Object.entries(LICENCE_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Licence number">
              <Input {...register("licence_number")} />
            </Field>
            <Field label="BFR expiry" status={bfr}>
              <Input {...register("bfr_expiry")} type="date" />
            </Field>
            <Field label="Medical expiry" status={medical}>
              <Input {...register("medical_expiry")} type="date" />
            </Field>
          </div>
        </section>

        <section className="space-y-4">
          <SectionTitle>Preferences</SectionTitle>
          <Field label="Usual aircraft">
            <Select
              value={watch("preferred_aircraft_id") || "__none"}
              onValueChange={(value: string) =>
                setValue("preferred_aircraft_id", value === "__none" ? "" : value)
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="No preference" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none">No preference</SelectItem>
                {aircraft.map((item) => (
                  <SelectItem key={item.id} value={item.id}>
                    {item.display_name || `${item.aircraft_type} · ${item.registration}`}
                    {item.is_active ? "" : " (inactive)"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </section>

        <section className="space-y-4">
          <SectionTitle>Emergency contact</SectionTitle>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Name">
              <Input {...register("emergency_contact_name")} />
            </Field>
            <Field label="Phone">
              <Input {...register("emergency_contact_phone")} type="tel" />
            </Field>
          </div>
        </section>

        <section className="space-y-4">
          <SectionTitle>Notes</SectionTitle>
          <Textarea {...register("notes")} placeholder="Club notes about this member" />
        </section>
      </div>

      <SheetFooter className="border-t border-border/70 sm:flex-row sm:justify-end">
        <Button type="button" variant="ghost" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" disabled={pending} className="gap-2">
          {pending ? <Loader2 className="size-4 animate-spin" /> : null}
          Save changes
        </Button>
      </SheetFooter>
    </form>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="text-[13px] font-semibold">{children}</h2>;
}

function Field({
  label,
  hint,
  status,
  children,
}: {
  label: string;
  hint?: string;
  status?: ReturnType<typeof getExpiryInfo>;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <Label className="text-sm font-medium">{label}</Label>
        {status && status.state !== "unknown" ? (
          <span
            className={cn(
              "shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium",
              status.state === "expired" && "bg-danger-muted text-destructive",
              status.state === "expiring" && "bg-warning-muted text-warning-foreground",
              status.state === "valid" && "bg-success-muted text-success",
            )}
          >
            {status.label}
          </span>
        ) : null}
      </div>
      {children}
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

function RoleBadge({ role }: { role: AppRole }) {
  return (
    <Badge variant={role === "admin" ? "default" : role === "instructor" ? "secondary" : "outline"}>
      {ROLE_LABELS[role]}
    </Badge>
  );
}

function CurrencyBadge({
  state,
  label,
}: {
  state: ReturnType<typeof currencySummary>["state"];
  label: string;
}) {
  return (
    <Badge
      variant={state === "expired" ? "destructive" : "outline"}
      className={cn(
        state === "expiring" && "border-transparent bg-warning-muted text-warning-foreground",
        state === "valid" && "border-transparent bg-success-muted text-success",
      )}
    >
      {label}
    </Badge>
  );
}

function currencySummary(pilot: PilotProfile | null) {
  const states = [
    getExpiryInfo(pilot?.bfr_expiry).state,
    getExpiryInfo(pilot?.medical_expiry).state,
  ];
  if (states.includes("expired")) return { label: "Expired", state: "expired" as const };
  if (states.includes("expiring")) return { label: "Due soon", state: "expiring" as const };
  if (states.every((state) => state === "unknown")) {
    return { label: "Not set", state: "unknown" as const };
  }
  return { label: "Current", state: "valid" as const };
}
