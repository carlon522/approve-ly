import type { NextRequest } from "next/server";
import { assertString, errorResponse, jsonResponse, readJson } from "@/lib/server/http";
import { createUploadUrl } from "@/lib/server/storage";
import { requireProfile } from "@/lib/server/supabase";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const profile = await requireProfile(request);
    const body = await readJson<{
      contentType?: string;
      fileName?: string;
      size?: number;
    }>(request);
    const result = await createUploadUrl({
      contentType: assertString(body.contentType, "Content type"),
      fileName: assertString(body.fileName, "File name"),
      size: typeof body.size === "number" ? body.size : 0,
      userId: profile.id,
    });

    return jsonResponse(result, 201);
  } catch (error) {
    return errorResponse(error);
  }
}
