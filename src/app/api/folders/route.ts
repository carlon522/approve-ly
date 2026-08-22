import type { NextRequest } from "next/server";
import { assertString, errorResponse, jsonResponse, readJson } from "@/lib/server/http";
import { createFolder } from "@/lib/server/repository";
import { requireProfile } from "@/lib/server/supabase";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const profile = await requireProfile(request);
    const body = await readJson<{
      campaign?: string;
      campaignId?: string;
      company?: string;
      name?: string;
    }>(request);
    const saved = await createFolder(profile, {
      campaign: assertString(body.campaign, "Campaign"),
      campaignId:
        typeof body.campaignId === "string" && body.campaignId.trim()
          ? body.campaignId.trim()
          : undefined,
      company: assertString(body.company, "Company"),
      name: assertString(body.name, "Folder name"),
    });

    const { created, ...folder } = saved;

    return jsonResponse({ created, folder }, 201);
  } catch (error) {
    return errorResponse(error);
  }
}
