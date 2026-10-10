"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/flight/ui/button";
import { DatePicker } from "@/components/flight/date-picker";
import { Input } from "@/components/flight/ui/input";
import { Label } from "@/components/flight/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/flight/ui/select";
import { updateProfile } from "@/lib/flight/actions/profile";
import { LICENCE_LABELS } from "@/lib/flight/constants";
import { getExpiryInfo } from "@/lib/flight/format";
import { cn } from "@/lib/flight/utils";
import type { Aircraft, LicenceType, PilotProfile, Profile } from "@/lib/flight/types";

interface ProfileFormProps {
  profile: Profile;
  pilot: PilotProfile | null;
  aircraft: Aircraft[];
}

type Values = {
  full_name: string;
  phone: string;
  licence_type: "" | LicenceType;
  licence_number: string;
  bfr_expiry: string;
  medical_expiry: string;
  preferred_aircraft_id: string;
  emergency_contact_name: string;
  emergency_contact_phone: string;
};

/**
 * Everything saved here becomes a default on the next authorisation. That's
 * the whole point of an account, so the expiry fields show their live status
 * inline rather than making the pilot work out whether they're still current.
 */
export function ProfileForm({ profile, pilot, aircraft }: ProfileFormProps) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  const { register, handleSubmit, watch, setValue } = useForm<Values>({
    defaultValues: {
      full_name: profile.full_name ?? "",
      phone: profile.phone ?? "",
      licence_type: pilot?.licence_type ?? "",
      licence_number: pilot?.licence_number ?? "",
      bfr_expiry: pilot?.bfr_expiry ?? "",
      medical_expiry: pilot?.medical_expiry ?? "",
      preferred_aircraft_id: pilot?.preferred_aircraft_id ?? "",
      emergency_contact_name: pilot?.emergency_contact_name ?? "",
      emergency_contact_phone: pilot?.emergency_contact_phone ?? "",
    },
  });

  const bfr = getExpiryInfo(watch("bfr_expiry"));
  const medical = getExpiryInfo(watch("medical_expiry"));

  async function onSubmit(values: Values) {
    setPending(true);
    const result = await updateProfile(values);
    setPending(false);

    if (!result.ok) {
      toast.error(result.error ?? "Couldn't save.");
      return;
    }

    toast.success("Profile saved");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <Card title="About you">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Full name">
            <Input {...register("full_name")} className={fieldClass} />
          </Field>
          <Field label="Phone">
            <Input
              {...register("phone")}
              type="tel"
              autoComplete="tel"
              className={fieldClass}
            />
          </Field>
          <Field label="Email" hint="Contact the club to change this" className="sm:col-span-2">
            <Input value={profile.email} disabled className={fieldClass} />
          </Field>
        </div>
      </Card>

      <Card title="Licence & currency">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Licence type">
            <Select
              value={watch("licence_type") || "__none"}
              onValueChange={(v: string) => setValue("licence_type", v === "__none" ? "" : (v as LicenceType))}
            >
              <SelectTrigger className={fieldClass}>
                <SelectValue placeholder="Choose your licence" />
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
            <Input {...register("licence_number")} className={fieldClass} />
          </Field>

          <Field label="BFR expiry" status={bfr}>
            <DatePicker
              id="bfr_expiry"
              value={watch("bfr_expiry")}
              onChange={(v) =>
                setValue("bfr_expiry", v, { shouldDirty: true, shouldValidate: true })
              }
              mode="expiry"
              clearable
              label="BFR expiry"
              className={fieldClass}
            />
          </Field>

          <Field label="Medical expiry" status={medical}>
            <DatePicker
              id="medical_expiry"
              value={watch("medical_expiry")}
              onChange={(v) =>
                setValue("medical_expiry", v, {
                  shouldDirty: true,
                  shouldValidate: true,
                })
              }
              mode="expiry"
              clearable
              label="Medical expiry"
              className={fieldClass}
            />
          </Field>
        </div>
      </Card>

      <Card title="Preferences">
        <Field label="Usual aircraft" hint="Pre-selected on your next authorisation">
          <Select
            value={watch("preferred_aircraft_id") || "__none"}
            onValueChange={(v: string) =>
              setValue("preferred_aircraft_id", v === "__none" ? "" : v)
            }
          >
            <SelectTrigger className={fieldClass}>
              <SelectValue placeholder="No preference" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none">No preference</SelectItem>
              {aircraft.map((a) => (
                <SelectItem key={a.id} value={a.id}>
                  {a.display_name || `${a.aircraft_type} · ${a.registration}`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      </Card>

      <Card title="Emergency contact">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Name">
            <Input
              {...register("emergency_contact_name")}
              className={fieldClass}
            />
          </Field>
          <Field label="Phone">
            <Input
              {...register("emergency_contact_phone")}
              type="tel"
              className={fieldClass}
            />
          </Field>
        </div>
      </Card>

      <div className="flex justify-end">
        <Button type="submit" disabled={pending} className="w-full sm:w-auto">
          {pending && <Loader2 className="size-4 animate-spin" />}
          Save changes
        </Button>
      </div>
    </form>
  );
}

const fieldClass = "h-11 w-full rounded-lg bg-background text-base sm:text-sm";

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="overflow-hidden rounded-xl border bg-card shadow-xs">
      <header className="border-b border-border/70 px-5 py-3.5">
        <h2 className="text-[13px] font-semibold">{title}</h2>
      </header>
      <div className="p-5">{children}</div>
    </section>
  );
}

function Field({
  label,
  hint,
  status,
  className,
  children,
}: {
  label: string;
  hint?: string;
  status?: ReturnType<typeof getExpiryInfo>;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center justify-between gap-3">
        <Label className="text-sm font-medium">{label}</Label>
        {status && status.state !== "unknown" && (
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
        )}
      </div>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}
