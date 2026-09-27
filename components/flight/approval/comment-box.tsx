"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Lock, Send } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/flight/ui/button";
import { Switch } from "@/components/flight/ui/switch";
import { Textarea } from "@/components/flight/ui/textarea";
import { addComment } from "@/lib/flight/actions/authorisations";
import { formatRelative } from "@/lib/flight/format";
import { cn } from "@/lib/flight/utils";
import type { Comment } from "@/lib/flight/types";

interface CommentBoxProps {
  authorisationId: string;
  comments: Comment[];
  /** Staff can post internal notes the pilot never sees. */
  canPostInternal: boolean;
  /** Drop bordered comment cards for document-style pages. */
  plain?: boolean;
}

export function CommentBox({
  authorisationId,
  comments,
  canPostInternal,
  plain = false,
}: CommentBoxProps) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [isInternal, setIsInternal] = useState(false);
  const [pending, setPending] = useState(false);

  async function submit() {
    if (body.trim().length === 0) return;
    setPending(true);

    const result = await addComment({ authorisationId, body, isInternal });
    setPending(false);

    if (!result.ok) {
      toast.error(result.error ?? "Couldn't post that comment.");
      return;
    }

    setBody("");
    router.refresh();
  }

  return (
    <div className="space-y-4">
      {comments.length > 0 && (
        <ul className={cn("space-y-3", plain && "space-y-4")}>
          {comments.map((comment) => (
            <li
              key={comment.id}
              className={cn(
                plain
                  ? comment.is_internal
                    ? "border-l-2 border-dashed border-border pl-3"
                    : "space-y-1"
                  : cn(
                      "rounded-xl border p-4",
                      comment.is_internal
                        ? "border-dashed bg-muted/40"
                        : "bg-card",
                    ),
              )}
            >
              <div className="mb-1 flex items-center gap-2">
                <span className="text-xs font-medium">{comment.author_name}</span>
                {comment.is_internal && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-medium text-muted-foreground">
                    <Lock className="size-2.5" />
                    Internal
                  </span>
                )}
                <span className="ml-auto text-xs text-muted-foreground">
                  {formatRelative(comment.created_at)}
                </span>
              </div>
              <p className="text-sm leading-relaxed whitespace-pre-wrap">
                {comment.body}
              </p>
            </li>
          ))}
        </ul>
      )}

      <div className="space-y-3">
        <Textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          onKeyDown={(e) => {
            // Enter sends, Shift+Enter breaks — matches every chat app the
            // instructor already uses.
            if (e.key === "Enter" && !e.shiftKey && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              submit();
            }
          }}
          placeholder="Add a note…"
          rows={3}
          className={cn(
            "resize-none text-base sm:text-sm",
            plain ? "rounded-lg" : "rounded-xl",
          )}
        />

        <div className="flex items-center justify-between gap-3">
          {canPostInternal ? (
            <label className="flex cursor-pointer items-center gap-2 text-xs text-muted-foreground">
              <Switch checked={isInternal} onCheckedChange={setIsInternal} />
              Internal note
              {isInternal && (
                <span className="text-[11px]">(pilot won&apos;t see this)</span>
              )}
            </label>
          ) : (
            <span />
          )}

          <Button
            size="sm"
            onClick={submit}
            disabled={pending || body.trim().length === 0}
            className="gap-1.5"
          >
            {pending ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Send className="size-3.5" />
            )}
            Post
          </Button>
        </div>
      </div>
    </div>
  );
}
