import { companyInitials } from "@/lib/company-settings";
import { cn } from "@/lib/flight/utils";

/**
 * Club brand. Uses the uploaded logo from Club settings when there is one,
 * otherwise an initials mark beside the club name. Club logos are expected
 * to have a transparent background.
 */
export function Logo({
  companyName,
  clubLogoUrl,
  className,
  showWordmark = true,
  size = "default",
}: {
  companyName: string;
  /** Public URL for the club logo from Settings. */
  clubLogoUrl?: string | null;
  className?: string;
  /** Club name beside the initials mark. Ignored when a logo is uploaded. */
  showWordmark?: boolean;
  size?: "default" | "lg";
}) {
  if (clubLogoUrl) {
    return (
      <span className={cn("inline-flex items-center", className)}>
        {/* Dynamic Supabase public URL — plain img keeps transparent PNGs sharp. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={clubLogoUrl}
          alt={companyName}
          className={cn(
            "w-auto object-contain object-left",
            size === "lg"
              ? "h-12 max-w-[14rem] sm:h-14 sm:max-w-[16rem]"
              : "h-8 max-w-[10rem] sm:h-9 sm:max-w-[12rem]",
          )}
        />
      </span>
    );
  }

  return (
    <span className={cn("inline-flex min-w-0 items-center gap-2.5", className)}>
      <ClubMark companyName={companyName} />
      {showWordmark && (
        <span className="truncate text-[15px] font-semibold tracking-[-0.015em] text-foreground">
          {companyName}
        </span>
      )}
    </span>
  );
}

export function ClubMark({
  companyName,
  className,
}: {
  companyName: string;
  className?: string;
}) {
  return (
    <span
      aria-hidden
      className={cn(
        "flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary text-[11px] font-semibold tracking-wide text-primary-foreground",
        className,
      )}
    >
      {companyInitials(companyName)}
    </span>
  );
}
