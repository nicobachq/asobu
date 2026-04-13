import type { ChangeEvent } from "react";
import { supabase } from "./supabase";

export const POST_MEDIA_BUCKET = "post-media";
export const MAX_POST_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;

export function sanitizeFileName(fileName: string) {
  const cleaned = fileName
    .toLowerCase()
    .replace(/[^a-z0-9.\-_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  return cleaned || "media";
}

export function revokeObjectUrl(url: string) {
  if (url.startsWith("blob:")) {
    URL.revokeObjectURL(url);
  }
}

export function validatePostImageFile(file: File) {
  if (!file.type.startsWith("image/")) {
    return "Please choose an image file.";
  }

  if (file.size > MAX_POST_IMAGE_SIZE_BYTES) {
    return "Image is too large. Maximum size is 5 MB.";
  }

  return null;
}

export async function uploadPostImage(file: File, userId: string) {
  const extension = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const safeName = sanitizeFileName(file.name.replace(/\.[^.]+$/, ""));
  const filePath = `${userId}/post-${Date.now()}-${safeName}.${extension}`;

  const { error: uploadError } = await supabase.storage
    .from(POST_MEDIA_BUCKET)
    .upload(filePath, file, {
      cacheControl: "3600",
      upsert: false,
    });

  if (uploadError) {
    throw new Error(uploadError.message);
  }

  const { data } = supabase.storage.from(POST_MEDIA_BUCKET).getPublicUrl(filePath);
  return data.publicUrl;
}

export function getFileFromInputEvent(event: ChangeEvent<HTMLInputElement>) {
  return event.target.files?.[0] || null;
}
