"use client";

import { useState, type ReactNode } from "react";
import { Check, Link2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/flight/ui/button";
import { cn } from "@/lib/flight/utils";

interface CopyLinkButtonProps {
  /** Path relative to the app origin — resolved client-side. */
  path: string;
  label: string;
  copiedLabel?: string;
  icon?: ReactNode;
  className?: string;
}

// The icon lives here rather than being passed in by default: component
// objects can't cross the server → client boundary as props.
export function CopyLinkButton({
  path,
  label,
  copiedLabel = "Copied",
  icon,
  className,
}: CopyLinkButtonProps) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    const url = `${window.location.origin}${path}`;

    try {
      // Prefer the native share sheet on mobile — it lets a pilot drop the
      // link straight into their own notes or messages.
      if (navigator.share && /Mobi|Android/i.test(navigator.userAgent)) {
        await navigator.share({ title: "My flight authorisation", url });
        return;
      }

      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success("Link copied");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // User dismissed the share sheet, or the clipboard was blocked.
      toast.error("Couldn't copy — long-press the link instead.");
    }
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="lg"
      onClick={copy}
      className={cn("h-12 w-full gap-2 rounded-xl", className)}
    >
      {copied ? (
        <Check className="size-4 text-success" />
      ) : (
        (icon ?? <Link2 className="size-4" />)
      )}
      {copied ? copiedLabel : label}
    </Button>
  );
}
