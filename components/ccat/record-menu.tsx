"use client";

import Link from "next/link";
import { MoreHorizontal } from "lucide-react";

import { Button } from "@/components/flight/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/flight/ui/dropdown-menu";

export function RecordMenu({ studentId }: { studentId: string }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button type="button" variant="outline" size="sm" aria-label="Record actions">
          <MoreHorizontal />
          More
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        <DropdownMenuItem asChild>
          <Link href={`/training/students/${studentId}/record`}>Print record</Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <a href={`/training/students/${studentId}/export`}>Download CSV</a>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
