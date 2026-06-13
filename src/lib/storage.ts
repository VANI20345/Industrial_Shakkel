import { supabase } from "@/integrations/supabase/client";

const slug = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60) || "file";

export async function uploadToBucket(
  bucket: "brand-logos" | "product-images" | "datasheets" | "product-documents",
  file: File,
  folder = "",
): Promise<string> {
  const ext = file.name.split(".").pop()?.toLowerCase() || "bin";
  const path = `${folder ? folder.replace(/\/+$/, "") + "/" : ""}${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${slug(
    file.name.replace(/\.[^.]+$/, ""),
  )}.${ext}`;
  const { error } = await supabase.storage.from(bucket).upload(path, file, {
    cacheControl: "3600",
    upsert: false,
    contentType: file.type || undefined,
  });
  if (error) throw error;
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}

export const ALLOWED_LOGO = ["image/png", "image/svg+xml", "image/webp", "image/jpeg", "image/avif"];
export const ALLOWED_PRODUCT_IMAGE = [
  "image/png", "image/jpeg", "image/jpg", "image/webp", "image/svg+xml", "image/avif",
];
export const ALLOWED_DATASHEET = ["application/pdf"];
export const ALLOWED_DOCUMENT = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "image/png", "image/jpeg", "image/jpg", "image/webp",
];
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
export const MAX_PDF_BYTES = 15 * 1024 * 1024;
export const MAX_DOC_BYTES = 15 * 1024 * 1024;

export const slugify = slug;
