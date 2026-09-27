import { redirect } from "next/navigation";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

/** Old queue URL — keep bookmarks working by forwarding here. */
export default async function QueueRedirect({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const qs = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (typeof value === "string" && value) qs.set(key, value);
    else if (Array.isArray(value)) {
      for (const item of value) {
        if (item) qs.append(key, item);
      }
    }
  }

  const query = qs.toString();
  redirect(query ? `/fly/instructor?${query}` : "/fly/instructor");
}
