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
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <Card title="About you">
        <Field label="Full name">
          <Input {...register("full_name")} className="h-12 rounded-xl text-base sm:h-11 sm:text-sm" />
        </Field>
        <Field label="Email" hint="Contact the club to change this">
          <Input value={profile.email} disabled className="h-12 rounded-xl text-base sm:h-11 sm:text-sm" />
        </Field>
        <Field label="Phone">
          <Input
            {...register("phone")}
            type="tel"
            autoComplete="tel"
            className="h-12 rounded-xl text-base sm:h-11 sm:text-sm"
          />
        </Field>
      </Card>

      <Card title="Licence & currency">
        <Field label="Licence type">
          <Select
            value={watch("licence_type") || "__none"}
            onValueChange={(v: string) => setValue("licence_type", v === "__none" ? "" : (v as LicenceType))}
          >
            <SelectTrigger className="h-12 w-full rounded-xl text-base sm:h-11 sm:text-sm">
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
          <Input {...register("licence_number")} className="h-12 rounded-xl text-base sm:h-11 sm:text-sm" />
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
            className="h-12 rounded-xl sm:h-11 sm:text-sm"
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
            className="h-12 rounded-xl sm:h-11 sm:text-sm"
          />
        </Field>
      </Card>

      <Card title="Preferences">
        <Field label="Usual aircraft" hint="Pre-selected on your next authorisation">
          <Select
            value={watch("preferred_aircraft_id") || "__none"}
            onValueChange={(v: string) =>
              setValue("preferred_aircraft_id", v === "__none" ? "" : v)
            }
          >
            <SelectTrigger className="h-12 w-full rounded-xl text-base sm:h-11 sm:text-sm">
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
        <Field label="Name">
          <Input
            {...register("emergency_contact_name")}
            className="h-12 rounded-xl text-base sm:h-11 sm:text-sm"
          />
        </Field>
        <Field label="Phone">
          <Input
            {...register("emergency_contact_phone")}
            type="tel"
            className="h-12 rounded-xl text-base sm:h-11 sm:text-sm"
          />
        </Field>
      </Card>

      <div className="pb-safe sticky bottom-0 -mx-4 border-t bg-background/90 px-4 pt-3 pb-3 backdrop-blur-xl sm:mx-0 sm:border-0 sm:bg-transparent sm:px-0 sm:backdrop-blur-none">
        <Button
          type="submit"
          size="lg"
          disabled={pending}
          className="h-12 w-full gap-2 rounded-xl sm:w-auto"
        >
          {pending && <Loader2 className="size-4 animate-spin" />}
          Save changes
        </Button>
      </div>
    </form>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="surface-premium rounded-2xl border">
      <header className="border-b bg-muted/30 px-5 py-3">
        <h2 className="text-sm font-semibold">{title}</h2>
      </header>
      <div className="space-y-4 p-5">{children}</div>
    </section>
  );
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
      <div className="flex items-baseline justify-between gap-3">
        <Label className="text-sm font-medium">{label}</Label>
        {status && status.state !== "unknown" && (
          <span
            className={cn(
              "text-xs font-medium",
              status.state === "expired" && "text-destructive",
              status.state === "expiring" && "text-warning-foreground",
              status.state === "valid" && "text-success",
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
