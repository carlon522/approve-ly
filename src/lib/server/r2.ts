import { GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { randomUUID } from "node:crypto";
import { MAX_UPLOAD_BYTES, isR2Configured, requireEnv } from "./env";
import { ApiError } from "./http";

let r2Client: S3Client | null = null;

function getR2Client() {
  if (!isR2Configured()) {
    throw new ApiError("Cloudflare R2 is not configured.", 503);
  }

  if (!r2Client) {
    const accountId = requireEnv("CLOUDFLARE_ACCOUNT_ID");

    r2Client = new S3Client({
      credentials: {
        accessKeyId: requireEnv("CLOUDFLARE_R2_ACCESS_KEY_ID"),
        secretAccessKey: requireEnv("CLOUDFLARE_R2_SECRET_ACCESS_KEY"),
      },
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      region: "auto",
    });
  }

  return r2Client;
}

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
    throw new ApiError("Files cannot exceed 5GB.", 413);
  }

  const bucket = requireEnv("CLOUDFLARE_R2_BUCKET");
  const key = `uploads/${userId}/${new Date().toISOString().slice(0, 10)}/${randomUUID()}-${safeFileName(fileName)}`;
  const command = new PutObjectCommand({
    Bucket: bucket,
    ContentType: contentType,
    Key: key,
  });
  const uploadUrl = await getSignedUrl(getR2Client(), command, { expiresIn: 900 });

  return {
    expiresIn: 900,
    headers: {
      "Content-Type": contentType,
    },
    maxBytes: MAX_UPLOAD_BYTES,
    storageKey: key,
    uploadUrl,
  };
}

export async function createDownloadUrl(storageKey: string, fileName?: string) {
  const bucket = requireEnv("CLOUDFLARE_R2_BUCKET");
  const command = new GetObjectCommand({
    Bucket: bucket,
    Key: storageKey,
    ResponseContentDisposition: fileName
      ? `attachment; filename="${safeFileName(fileName)}"`
      : undefined,
  });

  return getSignedUrl(getR2Client(), command, { expiresIn: 3600 });
}

function safeFileName(fileName: string) {
  return fileName.replace(/[^a-zA-Z0-9._-]/g, "-").slice(0, 140) || "asset";
}
