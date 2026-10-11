"use client";

import { useRef, useState, type ReactNode } from "react";
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
import { PageHeader } from "@/components/portal/page";
import { updateClubSettings } from "@/lib/flight/actions/admin";
import type { ClubSettings } from "@/lib/flight/types";
import { cn } from "@/lib/utils";

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

  const memberEmailsEnabled = form.watch("emails_enabled");
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
    <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-6">
      <PageHeader
        title="Club settings"
        description="Club name, logo, member login, and authorisation email."
        actions={
          <Button type="submit" disabled={pending}>
            {pending ? <Loader2 className="size-4 animate-spin" /> : null}
            Save settings
          </Button>
        }
      />

      <div className="grid items-stretch gap-5 lg:grid-cols-2">
        <SettingsCard
          icon={ImageIcon}
          title="Club identity"
          description="One name and logo for the Safety Hub, login, TV display, and authorisation forms."
          className="lg:col-span-2"
        >
          <div className="grid gap-6 lg:grid-cols-2 lg:gap-x-12">
            <Field
              label="Club name"
              htmlFor="companyName"
              hint="Used in page titles, the header, and the briefing-room slideshow."
            >
              <Input
                id="companyName"
                className={controlClass}
                autoComplete="organization"
                {...form.register("companyName")}
              />
            </Field>

            <Field
              label="Logo"
              htmlFor="club-logo"
              hint="JPEG, PNG, or WebP, up to 2 MB. This is the only logo used across the club."
            >
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <div className="flex h-16 w-full items-center justify-center rounded-lg border border-dashed bg-background px-4 sm:h-11 sm:w-44 [&_.logo-image]:h-8 [&_.logo-image]:max-w-36">
                  <Logo companyName={displayName} logoUrl={displayLogo} />
                </div>
                <div className="flex flex-wrap gap-2">
                  <input
                    id="club-logo"
                    ref={fileRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="sr-only"
                    onChange={(e) => onLogoSelected(e.target.files?.[0])}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    className={controlClass}
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
                      className={controlClass}
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
            </Field>
          </div>
        </SettingsCard>

        <SettingsCard
          icon={Users}
          title="Member accounts"
          description={
            <>
              When off, pilots authorise as guests only — no login or signup prompts.
              Staff can still sign in at{" "}
              <span className="font-medium text-foreground">/login</span>.
            </>
          }
        >
          <ToggleRow
            id="member_login_enabled"
            label="Allow members to log in"
            hint="Turn on once Supabase Auth (domains, email templates) is ready."
            checked={memberLoginEnabled}
            onCheckedChange={(checked) =>
              form.setValue("member_login_enabled", checked, { shouldDirty: true })
            }
            className="mt-auto"
          />
        </SettingsCard>

        <SettingsCard
          icon={Mail}
          title="Email notifications"
          description="New authorisation requests go to the admin address. Member emails go to the person who submitted the form."
        >
          <Field
            label="Admin notification address"
            htmlFor="notification_email"
            hint="Receives each new authorisation request, with a link to the review page. Leave blank to stop admin emails."
          >
            <Input
              id="notification_email"
              type="email"
              className={controlClass}
              placeholder="fly@kapitiaeroclub.co.nz"
              autoComplete="email"
              {...form.register("notification_email")}
            />
          </Field>
          <ToggleRow
            id="emails_enabled"
            label="Email members"
            hint="Email the submitter when their authorisation is submitted, approved or declined, and when an instructor leaves a comment."
            checked={memberEmailsEnabled}
            onCheckedChange={(checked) =>
              form.setValue("emails_enabled", checked, { shouldDirty: true })
            }
            className="mt-auto"
          />
        </SettingsCard>
      </div>
    </form>
  );
}

const controlClass = "h-11 sm:h-11";

function SettingsCard({
  icon: Icon,
  title,
  description,
  className,
  children,
}: {
  icon: typeof ImageIcon;
  title: string;
  description: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section
      className={cn(
        "flex h-full flex-col overflow-hidden rounded-xl border bg-card shadow-xs",
        className,
      )}
    >
      <header className="flex items-start gap-3 border-b px-5 py-4">
        <div className="rounded-lg bg-muted p-2">
          <Icon className="size-4 text-muted-foreground" />
        </div>
        <div className="min-w-0 space-y-1">
          <h2 className="text-sm font-semibold tracking-tight">{title}</h2>
          <p className="text-sm text-pretty text-muted-foreground">{description}</p>
        </div>
      </header>
      <div className="flex flex-1 flex-col gap-5 p-5">{children}</div>
    </section>
  );
}

function Field({
  label,
  htmlFor,
  hint,
  children,
}: {
  label: string;
  htmlFor: string;
  hint: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      <p className="text-xs text-pretty text-muted-foreground">{hint}</p>
    </div>
  );
}

function ToggleRow({
  id,
  label,
  hint,
  checked,
  onCheckedChange,
  className,
}: {
  id: string;
  label: string;
  hint: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-4 rounded-lg border bg-background px-3.5 py-3",
        className,
      )}
    >
      <div className="min-w-0 space-y-0.5">
        <Label htmlFor={id} className="text-sm font-medium">
          {label}
        </Label>
        <p className="text-xs text-pretty text-muted-foreground">{hint}</p>
      </div>
      <Switch id={id} checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  );
}
