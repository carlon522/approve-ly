import { randomUUID } from "node:crypto";
import { MAX_UPLOAD_BYTES, getSupabaseStorageBucket, isStorageConfigured } from "./env";
import { ApiError } from "./http";
import { getSupabaseAdmin } from "./supabase";

export async function createUploadUrl({
  contentType,
  fileName,
  size,
  userId,
}: {
  contentType: string;
  fileName: string;
  size: number;
  userId: string;
}) {
  if (size > MAX_UPLOAD_BYTES) {
    throw new ApiError("Files cannot exceed 50MB on the free storage plan.", 413);
  }

  if (!isStorageConfigured()) {
    throw new ApiError("Supabase Storage is not configured.", 503);
  }

  const bucket = getSupabaseStorageBucket();
  const storageKey = `uploads/${userId}/${new Date().toISOString().slice(0, 10)}/${randomUUID()}-${safeFileName(fileName)}`;
  const { data, error } = await getSupabaseAdmin()
    .storage
    .from(bucket)
    .createSignedUploadUrl(storageKey);

  if (error || !data) {
    throw new ApiError(error?.message ?? "Could not create a signed upload URL.", 500);
  }

  return {
    bucket,
    contentType,
    expiresIn: 7200,
    maxBytes: MAX_UPLOAD_BYTES,
    storageKey,
    uploadToken: data.token,
  };
}

export async function createDownloadUrl(storageKey: string, fileName?: string) {
  const bucket = getSupabaseStorageBucket();
  const { data, error } = await getSupabaseAdmin()
    .storage
    .from(bucket)
    .createSignedUrl(storageKey, 3600, {
      download: fileName ? safeFileName(fileName) : true,
    });

  if (error || !data?.signedUrl) {
    throw new ApiError(error?.message ?? "Could not create a signed download URL.", 500);
  }

  return data.signedUrl;
}

export async function deleteStoredObject(storageKey: string) {
  const { error } = await getSupabaseAdmin()
    .storage
    .from(getSupabaseStorageBucket())
    .remove([storageKey]);

  if (error) {
    throw new ApiError(error.message, 500);
  }
}

function safeFileName(fileName: string) {
  return fileName.replace(/[^a-zA-Z0-9._-]/g, "-").slice(0, 140) || "asset";
}
