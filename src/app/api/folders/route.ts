import type { NextRequest } from "next/server";
import { assertString, errorResponse, jsonResponse, readJson } from "@/lib/server/http";
import { createFolder } from "@/lib/server/repository";
import { requireProfile } from "@/lib/server/supabase";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const profile = await requireProfile(request);
    const body = await readJson<{ campaign?: string; company?: string; name?: string }>(request);
    const folder = await createFolder(profile, {
      campaign: assertString(body.campaign, "Campaign"),
      company: assertString(body.company, "Company"),
      name: assertString(body.name, "Folder name"),
    });

    return jsonResponse({ folder }, 201);
  } catch (error) {
    return errorResponse(error);
  }
}
