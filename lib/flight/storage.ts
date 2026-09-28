import "server-only";

import { createServiceSupabase } from "@/lib/flight/supabase/server";
import { getSupabaseUrl } from "@/lib/flight/supabase/config";

const SIGNATURE_BUCKET = "signatures";
export const BRANDING_BUCKET = "branding";

const LOGO_MIME_EXT: Record<string, string> = {
  "image/png": "png",
  "image/webp": "webp",
  "image/svg+xml": "svg",
};

/** Public CDN URL for an object in the branding bucket. */
export function publicBrandingUrl(
  path: string | null | undefined,
  cacheBust?: string | null,
): string | null {
  if (!path) return null;
  if (path.startsWith("http") || path.startsWith("data:")) return path;

  const url = `${getSupabaseUrl()}/storage/v1/object/public/${BRANDING_BUCKET}/${path}`;
  if (!cacheBust) return url;
  return `${url}?v=${encodeURIComponent(cacheBust)}`;
}

/**
 * Upload a club logo (PNG / WebP / SVG, transparent backgrounds welcome).
 * Replaces any previous logo file and returns the storage path.
 */
export async function uploadClubLogoFile(
  file: File,
): Promise<{ path: string } | { error: string }> {
  const mime = file.type;
  const ext = LOGO_MIME_EXT[mime];
  if (!ext) {
    return { error: "Use a PNG, WebP, or SVG logo (transparent background works best)." };
  }

  if (file.size > 1024 * 1024) {
    return { error: "Logo must be 1 MB or smaller." };
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const path = `club-logo.${ext}`;
  const supabase = createServiceSupabase();

  // Remove any previous extension so we never leave stale files behind.
  const { data: existing } = await supabase.storage.from(BRANDING_BUCKET).list("", {
    search: "club-logo",
  });
  const stale = (existing ?? [])
    .map((f) => f.name)
    .filter((name) => name.startsWith("club-logo.") && name !== path);
  if (stale.length > 0) {
    await supabase.storage.from(BRANDING_BUCKET).remove(stale);
  }

  const { error } = await supabase.storage
    .from(BRANDING_BUCKET)
    .upload(path, buffer, { contentType: mime, upsert: true });

  if (error) {
    console.error("[storage] club logo upload failed", error);
    return { error: "Couldn't upload the logo. Try again." };
  }

  return { path };
}

export async function deleteClubLogoFiles(path: string | null): Promise<void> {
  if (!path || path.startsWith("http") || path.startsWith("data:")) return;
  const supabase = createServiceSupabase();
  const { error } = await supabase.storage.from(BRANDING_BUCKET).remove([path]);
  if (error) {
    console.error("[storage] club logo delete failed", error);
  }
}

/**
 * Persist a signature captured on the canvas.
 *
 * The client sends a data URL; we decode it server-side and write a real PNG to
 * a private bucket. Storing the image rather than the data URL keeps the
 * authorisation row small and means the signature can be served under an
 * expiring URL instead of embedded in every API response.
 */
export async function uploadSignature(
  dataUrl: string,
  reference: string,
): Promise<string | null> {
  if (!dataUrl?.startsWith("data:image/")) {
    // Already a stored path (e.g. re-submitting a duplicated authorisation).
    return dataUrl || null;
  }

  const match = /^data:(image\/[a-z+]+);base64,(.+)$/i.exec(dataUrl);
  if (!match) return null;

  const [, mime, base64] = match;
  const buffer = Buffer.from(base64!, "base64");

  // 2 MB ceiling mirrors the bucket policy — fail here with a clear reason
  // rather than getting an opaque storage error.
  if (buffer.byteLength > 2 * 1024 * 1024) {
    throw new Error("Signature image is too large.");
  }

  const ext = mime?.includes("jpeg") || mime?.includes("jpg") ? "jpg" : "png";
  const path = `${new Date().getFullYear()}/${reference}-${crypto.randomUUID()}.${ext}`;

  const supabase = createServiceSupabase();
  const { error } = await supabase.storage
    .from(SIGNATURE_BUCKET)
    .upload(path, buffer, { contentType: mime, upsert: false });

  if (error) {
    console.error("[storage] signature upload failed", error);
    return null;
  }

  return path;
}

/** Short-lived signed URL for displaying a stored signature. */
export async function getSignatureUrl(
  path: string | null,
  expiresInSeconds = 60 * 10,
): Promise<string | null> {
  if (!path) return null;
  if (path.startsWith("http") || path.startsWith("data:")) return path;

  try {
    const supabase = createServiceSupabase();
    const { data, error } = await supabase.storage
      .from(SIGNATURE_BUCKET)
      .createSignedUrl(path, expiresInSeconds);

    if (error) {
      console.error("[storage] signed url failed", error);
      return null;
    }
    return data?.signedUrl ?? null;
  } catch (error) {
    // A missing service key should hide the signature, not take down the queue.
    console.error("[storage] signed url failed", error);
    return null;
  }
}
