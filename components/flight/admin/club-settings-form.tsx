"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { ImageIcon, Loader2, Mail, Trash2, Upload, Users } from "lucide-react";
import { toast } from "sonner";

import { updateCompanySettings } from "@/app/(portal)/(account)/admin/settings/actions";
import { Button } from "@/components/flight/ui/button";
import { Input } from "@/components/flight/ui/input";
import { Label } from "@/components/flight/ui/label";
import { Switch } from "@/components/flight/ui/switch";
import { Logo } from "@/components/logo";
import { updateClubSettings } from "@/lib/flight/actions/admin";
import type { ClubSettings } from "@/lib/flight/types";

type Values = {
  companyName: string;
  emails_enabled: boolean;
  member_login_enabled: boolean;
  notification_email: string;
};

export function ClubSettingsForm({
  companyName,
  logoUrl,
  settings,
}: {
  companyName: string;
  logoUrl: string | null;
  settings: ClubSettings | null;
}) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState(false);
  const [removeLogo, setRemoveLogo] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const form = useForm<Values>({
    defaultValues: {
      companyName,
      emails_enabled: settings?.emails_enabled ?? false,
      member_login_enabled: settings?.member_login_enabled ?? false,
      notification_email: settings?.notification_email ?? "",
    },
  });

  const emailsEnabled = form.watch("emails_enabled");
  const memberLoginEnabled = form.watch("member_login_enabled");
  const watchedName = form.watch("companyName");
  const displayName = watchedName.trim() || companyName;
  const displayLogo = removeLogo ? null : (previewUrl ?? logoUrl);

  function onLogoSelected(file: File | undefined) {
    setPreviewUrl((current) => {
      if (current) URL.revokeObjectURL(current);
      return file ? URL.createObjectURL(file) : null;
    });
    if (file) setRemoveLogo(false);
  }

  function clearLogoFile() {
    if (fileRef.current) fileRef.current.value = "";
    setPreviewUrl((current) => {
      if (current) URL.revokeObjectURL(current);
      return null;
    });
  }

  async function onSubmit(values: Values) {
    const body = new FormData();
    body.set("companyName", values.companyName);
    if (removeLogo) body.set("removeLogo", "1");
    const file = fileRef.current?.files?.[0];
    if (file) body.set("logo", file);

    setPending(true);
    const identity = await updateCompanySettings(body);
    if (!identity.ok) {
      setPending(false);
      toast.error(identity.error);
      return;
    }

    const operations = await updateClubSettings({
      emails_enabled: values.emails_enabled,
      member_login_enabled: values.member_login_enabled,
      notification_email: values.notification_email,
    });
    setPending(false);

    if (!operations.ok) {
      toast.error(operations.error ?? "Couldn't save settings.");
      return;
    }

    toast.success("Club settings saved.");
    clearLogoFile();
    setRemoveLogo(false);
    router.refresh();
  }

  return (
    <form
      onSubmit={form.handleSubmit(onSubmit)}
      className="mx-auto max-w-xl space-y-5"
    >
      <section className="space-y-6 rounded-xl border bg-card p-6">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 rounded-lg bg-muted p-2">
            <ImageIcon className="size-4 text-muted-foreground" />
          </div>
          <div className="space-y-1">
            <h2 className="text-base font-semibold tracking-tight">Club identity</h2>
            <p className="text-sm text-muted-foreground">
              One name and logo for the Safety Hub, login, TV display, and
              authorisation forms.
            </p>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="companyName">Club name</Label>
          <Input
            id="companyName"
            autoComplete="organization"
            {...form.register("companyName")}
          />
          <p className="text-xs text-muted-foreground">
            Used in page titles, the header, and the briefing-room slideshow.
          </p>
        </div>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="flex h-24 w-full max-w-[14rem] items-center justify-center rounded-xl border border-dashed bg-background px-4">
            <Logo companyName={displayName} logoUrl={displayLogo} />
          </div>

          <div className="flex flex-wrap gap-2">
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="sr-only"
              onChange={(e) => onLogoSelected(e.target.files?.[0])}
            />
            <Button
              type="button"
              variant="outline"
              disabled={pending}
              onClick={() => fileRef.current?.click()}
            >
              <Upload className="size-4" />
              {displayLogo ? "Replace logo" : "Upload logo"}
            </Button>
            {displayLogo ? (
              <Button
                type="button"
                variant="ghost"
                disabled={pending}
                onClick={() => {
                  setRemoveLogo(true);
                  clearLogoFile();
                }}
              >
                <Trash2 className="size-4" />
                Remove
              </Button>
            ) : null}
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          JPEG, PNG, or WebP, up to 2 MB. This is the only logo used across the
          club.
        </p>
      </section>

      <section className="space-y-6 rounded-xl border bg-card p-6">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 rounded-lg bg-muted p-2">
            <Users className="size-4 text-muted-foreground" />
          </div>
          <div className="space-y-1">
            <h2 className="text-base font-semibold tracking-tight">
              Member accounts
            </h2>
            <p className="text-sm text-muted-foreground">
              When off, pilots authorise as guests only — no login or signup
              prompts. Staff can still sign in at{" "}
              <span className="font-medium text-foreground">/login</span>.
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between gap-4 rounded-lg border px-3.5 py-3">
          <div className="space-y-0.5">
            <Label htmlFor="member_login_enabled" className="text-sm font-medium">
              Allow members to log in
            </Label>
            <p className="text-xs text-muted-foreground">
              Turn on once Supabase Auth (domains, email templates) is ready.
            </p>
          </div>
          <Switch
            id="member_login_enabled"
            checked={memberLoginEnabled}
            onCheckedChange={(checked: boolean) =>
              form.setValue("member_login_enabled", checked, { shouldDirty: true })
            }
          />
        </div>

        <div className="flex items-start gap-3 border-t pt-6">
          <div className="mt-0.5 rounded-lg bg-muted p-2">
            <Mail className="size-4 text-muted-foreground" />
          </div>
          <div className="space-y-1">
            <h2 className="text-base font-semibold tracking-tight">
              Email notifications
            </h2>
            <p className="text-sm text-muted-foreground">
              When enabled, new authorisation requests go to the club inbox below,
              the submitter gets a tracking receipt, and approve / decline decisions
              are emailed to them.
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between gap-4 rounded-lg border px-3.5 py-3">
          <div className="space-y-0.5">
            <Label htmlFor="emails_enabled" className="text-sm font-medium">
              Send email notifications
            </Label>
            <p className="text-xs text-muted-foreground">
              Turn this off to pause all outbound email from the portal.
            </p>
          </div>
          <Switch
            id="emails_enabled"
            checked={emailsEnabled}
            onCheckedChange={(checked: boolean) =>
              form.setValue("emails_enabled", checked, { shouldDirty: true })
            }
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="notification_email">Central club inbox</Label>
          <Input
            id="notification_email"
            type="email"
            placeholder="ops@yourclub.example"
            autoComplete="email"
            disabled={!emailsEnabled}
            {...form.register("notification_email")}
          />
          <p className="text-xs text-muted-foreground">
            Receives new authorisation requests with a button to open the review page.
            Required when email is enabled.
          </p>
        </div>

        <div className="flex justify-end">
          <Button type="submit" disabled={pending}>
            {pending ? <Loader2 className="size-4 animate-spin" /> : null}
            Save settings
          </Button>
        </div>
      </section>
    </form>
  );
}
