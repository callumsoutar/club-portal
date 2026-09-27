import { cn } from "@/lib/flight/utils";
import { APP_NAME } from "@/lib/flight/constants";

/**
 * Club logo when uploaded, otherwise the FlightAuth mark + wordmark.
 * Club logos are expected to have a transparent background.
 */
export function Logo({
  className,
  showWordmark = true,
  showMark = true,
  onDark = false,
  clubLogoUrl,
  size = "default",
}: {
  className?: string;
  showWordmark?: boolean;
  /** Icon mark beside the wordmark. */
  showMark?: boolean;
  /** White wordmark for the navy sidebar chrome. */
  onDark?: boolean;
  /** Public URL for the club logo from Settings. */
  clubLogoUrl?: string | null;
  size?: "default" | "lg";
}) {
  if (clubLogoUrl) {
    return (
      <span className={cn("inline-flex items-center", className)}>
        {/* Dynamic Supabase public URL — plain img keeps transparent PNGs sharp. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={clubLogoUrl}
          alt={APP_NAME}
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
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      {showMark && (
        <span className="relative flex size-8 items-center justify-center rounded-[10px] bg-gradient-to-br from-sky-500 to-blue-700 shadow-sm">
          <svg viewBox="0 0 24 24" className="size-4 text-white" fill="none">
            <path
              d="M3.5 14.5 20 5.5l-5.2 13-2.6-5.2-5.2-2.6Z"
              fill="currentColor"
              fillOpacity="0.95"
            />
            <path
              d="m12.2 13.3 3.4-3.4"
              stroke="oklch(0.48 0.16 258)"
              strokeWidth="1.4"
              strokeLinecap="round"
            />
          </svg>
        </span>
      )}

      {showWordmark && (
        <span
          className={cn(
            "text-[15px] font-semibold tracking-[-0.02em]",
            onDark ? "text-sidebar-foreground" : "text-foreground",
          )}
        >
          {APP_NAME}
        </span>
      )}
    </span>
  );
}
