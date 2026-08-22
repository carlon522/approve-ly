import type { NextRequest } from "next/server";
import { assertString, errorResponse, jsonResponse, readJson } from "@/lib/server/http";
import { addCampaignApprover, listCampaignMembers } from "@/lib/server/repository";
import { requireProfile } from "@/lib/server/supabase";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const profile = await requireProfile(request);
    const { id } = await context.params;
    const members = await listCampaignMembers(profile, id);

    return jsonResponse({ members });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const profile = await requireProfile(request);
    const { id } = await context.params;
    const body = await readJson<{ email?: string }>(request);
    const member = await addCampaignApprover(profile, id, assertString(body.email, "Approver email"));

    return jsonResponse({ member }, 201);
  } catch (error) {
    return errorResponse(error);
  }
}
