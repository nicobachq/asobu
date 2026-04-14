import type { ChangeEvent } from "react";
import { supabase } from "./supabase";

export const POST_MEDIA_BUCKET = "post-media";
export const MAX_POST_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;
export const MAX_PROFILE_AVATAR_SIZE_BYTES = 3 * 1024 * 1024;
export const MAX_PROFILE_BANNER_SIZE_BYTES = 6 * 1024 * 1024;

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

export function validateImageFile(file: File, maxSizeBytes: number, label = "Image") {
  if (!file.type.startsWith("image/")) {
    return `${label} must be an image file.`;
  }

  if (file.size > maxSizeBytes) {
    return `${label} is too large. Maximum size is ${Math.round(maxSizeBytes / (1024 * 1024))} MB.`;
  }

  return null;
}

export function validatePostImageFile(file: File) {
  return validateImageFile(file, MAX_POST_IMAGE_SIZE_BYTES, "Image");
}

function buildMediaPath(prefix: string, file: File, userId: string) {
  const extension = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const safeName = sanitizeFileName(file.name.replace(/\.[^.]+$/, ""));
  return `${userId}/${prefix}-${Date.now()}-${safeName}.${extension}`;
}

async function uploadPublicImage(filePath: string, file: File) {
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

export async function uploadPostImage(file: File, userId: string) {
  return uploadPublicImage(buildMediaPath("post", file, userId), file);
}

export async function uploadProfileMedia(file: File, userId: string, kind: "avatar" | "banner") {
  return uploadPublicImage(buildMediaPath(`profile-${kind}`, file, userId), file);
}

export function getFileFromInputEvent(event: ChangeEvent<HTMLInputElement>) {
  return event.target.files?.[0] || null;
}
