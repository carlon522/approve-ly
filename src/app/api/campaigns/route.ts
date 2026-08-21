import type { NextRequest } from "next/server";
import { assertString, errorResponse, jsonResponse, readJson } from "@/lib/server/http";
import { createCampaign } from "@/lib/server/repository";
import { requireProfile } from "@/lib/server/supabase";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const profile = await requireProfile(request);
    const body = await readJson<{ company?: string; due?: string; name?: string }>(request);
    const campaign = await createCampaign(profile, {
      company: assertString(body.company, "Company"),
      due: assertString(body.due, "Due date"),
      name: assertString(body.name, "Campaign name"),
    });

    return jsonResponse({ campaign }, 201);
  } catch (error) {
    return errorResponse(error);
  }
}
