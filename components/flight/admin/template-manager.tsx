"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Copy, Eye, FileWarning, Loader2, Plus } from "lucide-react";
import { toast } from "sonner";

import { StatusBadge } from "@/components/flight/status-badge";
import { Button } from "@/components/flight/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/flight/ui/table";
import { duplicateTemplate } from "@/lib/flight/actions/admin";
import { formatDate } from "@/lib/flight/format";
import { cn } from "@/lib/flight/utils";
import type { FormTemplate } from "@/lib/flight/types";

export function TemplateManager({ templates }: { templates: Omit<FormTemplate, "sections">[] }) {
  const router = useRouter();
  const [duplicating, setDuplicating] = useState<string | null>(null);

  async function handleDuplicate(id: string) {
    setDuplicating(id);
    const result = await duplicateTemplate(id);
    setDuplicating(null);

    if (!result.ok) {
      toast.error(result.error ?? "Couldn't duplicate template.");
      return;
    }

    toast.success("Template duplicated as draft.");
    router.refresh();
  }

  return (
    <>
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-[-0.025em] sm:text-[1.75rem] sm:leading-tight">
            Form Builder
          </h1>
          <p className="mt-1.5 text-[15px] text-muted-foreground">
            Manage your authorisation form templates.
          </p>
        </div>
      </header>

      {templates.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 border-b border-foreground/10 py-16 text-center">
          <FileWarning className="size-5 text-muted-foreground" />
          <p className="text-sm font-medium">No templates yet</p>
          <p className="max-w-sm text-sm text-muted-foreground">
            Run the setup migration to seed the default authorisation form.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border bg-card shadow-xs">
          <Table>
            <TableHeader>
              <TableRow className="border-b hover:bg-transparent">
                <TableHead className="h-11 px-4 text-[13px] font-semibold text-foreground/80">
                  Name
                </TableHead>
                <TableHead className="hidden h-11 px-4 text-[13px] font-semibold text-foreground/80 sm:table-cell">
                  Version
                </TableHead>
                <TableHead className="hidden h-11 px-4 text-[13px] font-semibold text-foreground/80 md:table-cell">
                  Status
                </TableHead>
                <TableHead className="hidden h-11 px-4 text-[13px] font-semibold text-foreground/80 lg:table-cell">
                  Published
                </TableHead>
                <TableHead className="h-11 w-32 px-4 text-right text-[13px] font-semibold text-foreground/80">
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {templates.map((template) => (
                <TableRow
                  key={template.id}
                  className={cn(
                    "border-b border-border/70 last:border-0 hover:bg-muted/30",
                    !template.is_active && "bg-muted/20"
                  )}
                >
                  <TableCell className="px-4 py-4">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        {template.name}
                      </p>
                      {template.description && (
                        <p className="mt-0.5 truncate text-xs text-muted-foreground">
                          {template.description}
                        </p>
                      )}
                    </div>
                  </TableCell>

                  <TableCell className="hidden px-4 py-4 text-sm text-foreground/80 sm:table-cell">
                    v{template.version}
                  </TableCell>

                  <TableCell className="hidden px-4 py-4 md:table-cell">
                    <span
                      className={cn(
                        "inline-flex h-6 items-center rounded-md px-2 text-xs font-medium",
                        template.is_active
                          ? "bg-success-muted text-success"
                          : "bg-muted text-muted-foreground"
                      )}
                    >
                      {template.is_active ? "Published" : "Draft"}
                    </span>
                  </TableCell>

                  <TableCell className="hidden px-4 py-4 text-sm text-muted-foreground lg:table-cell">
                    {template.published_at ? formatDate(template.published_at, "d MMM yyyy") : "—"}
                  </TableCell>

                  <TableCell className="px-4 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDuplicate(template.id)}
                        disabled={duplicating === template.id}
                        className="h-8 px-3 text-xs font-medium text-foreground/80 hover:text-foreground"
                      >
                        {duplicating === template.id ? (
                          <Loader2 className="mr-1.5 size-3.5 animate-spin" />
                        ) : (
                          <Copy className="mr-1.5 size-3.5" />
                        )}
                        Duplicate
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => router.push(`/admin/form-builder/${template.id}`)}
                        className="h-8 px-3 text-xs font-medium text-foreground/80 hover:text-foreground"
                      >
                        View
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </>
  );
}
