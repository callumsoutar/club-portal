import { ScrollText } from "lucide-react";

import { EmptyState } from "@/components/flight/empty-state";
import { Page, PageHeader } from "@/components/portal/page";
import { requireAdmin } from "@/lib/flight/auth";
import { formatDateTime } from "@/lib/flight/format";
import { createServerSupabase } from "@/lib/flight/supabase/server";

export const metadata = { title: "Audit log" };

export default async function AuditPage() {
  await requireAdmin();

  const supabase = await createServerSupabase();
  const { data: logs } = await supabase
    .from("audit_logs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200);

  return (
    <Page className="gap-6">
      <PageHeader
        title="Audit log"
        description="Every privileged action, with who did it and from where. Showing the latest 200."
      />

      {!logs?.length ? (
        <EmptyState
          icon={ScrollText}
          title="Nothing logged yet"
          description="Submissions, approvals and configuration changes will be recorded here as they happen."
        />
      ) : (
        <ul className="divide-y overflow-hidden rounded-xl border bg-card shadow-xs">
          {logs.map((log) => (
            <li key={log.id} className="flex items-baseline gap-4 px-5 py-3.5">
              <code className="shrink-0 rounded-md bg-secondary px-1.5 py-0.5 font-mono text-xs">
                {log.action}
              </code>

              <div className="min-w-0 flex-1">
                <p className="truncate text-sm">
                  {log.actor_label ?? "System"}
                  <span className="text-muted-foreground"> · {log.entity_type}</span>
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatDateTime(log.created_at)}
                  {log.ip_address && ` · ${log.ip_address}`}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Page>
  );
}
