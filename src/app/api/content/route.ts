import type { NextRequest } from "next/server";
import { assertString, errorResponse, jsonResponse, readJson } from "@/lib/server/http";
import { createContent } from "@/lib/server/repository";
import { requireProfile } from "@/lib/server/supabase";
import type { CreateContentInput } from "@/lib/server/types";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const profile = await requireProfile(request);
    const body = await readJson<Partial<CreateContentInput>>(request);
    const item = await createContent(profile, {
      campaign: assertString(body.campaign, "Campaign"),
      company: assertString(body.company, "Company"),
      due: assertString(body.due, "Due date"),
      fileName: typeof body.fileName === "string" ? body.fileName : undefined,
      folder: assertString(body.folder, "Folder"),
      mimeType: typeof body.mimeType === "string" ? body.mimeType : undefined,
      platform: body.platform ?? "Instagram",
      size: assertString(body.size, "Size"),
      storageKey: typeof body.storageKey === "string" ? body.storageKey : undefined,
      tags: Array.isArray(body.tags) ? body.tags : [],
      title: assertString(body.title, "Title"),
      type: body.type ?? "Video",
    });

    return jsonResponse({ item }, 201);
  } catch (error) {
    return errorResponse(error);
  }
}
