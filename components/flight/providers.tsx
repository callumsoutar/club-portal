"use client";

import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { TooltipProvider } from "@/components/flight/ui/tooltip";
import { Toaster } from "@/components/flight/ui/sonner";

export function Providers({ children }: { children: React.ReactNode }) {
  // Created in state so the client is stable across re-renders but never
  // shared between users on the server.
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Most of this data is served fresh by RSC; TanStack Query handles
            // the interactive bits, where a short stale window feels instant
            // without hammering the database.
            staleTime: 30_000,
            gcTime: 5 * 60_000,
            retry: 1,
            refetchOnWindowFocus: false,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider delayDuration={200}>
        {children}
        <Toaster
          position="bottom-right"
          richColors
          closeButton
          offset={20}
          mobileOffset={16}
        />
      </TooltipProvider>
    </QueryClientProvider>
  );
}
