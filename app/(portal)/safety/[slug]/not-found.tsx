import Link from "next/link";
import { FileQuestion } from "lucide-react";

import { EmptyState } from "@/components/flight/empty-state";
import { Button } from "@/components/flight/ui/button";
import { Page } from "@/components/portal/page";

export default function ArticleNotFound() {
  return (
    <Page width="narrow">
      <EmptyState
        icon={FileQuestion}
        title="Article not found"
        description="This article may have been unpublished or its address changed. Browse the Safety Hub to find it."
        action={
          <Button asChild>
            <Link href="/safety">Go to the Safety Hub</Link>
          </Button>
        }
      />
    </Page>
  );
}
