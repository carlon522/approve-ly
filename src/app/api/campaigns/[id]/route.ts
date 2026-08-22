import type { NextRequest } from "next/server";
import { errorResponse, jsonResponse } from "@/lib/server/http";
import { deleteCampaign } from "@/lib/server/repository";
import { requireProfile } from "@/lib/server/supabase";

export const runtime = "nodejs";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const profile = await requireProfile(request);
    const { id } = await params;
    return jsonResponse(await deleteCampaign(profile, id));
  } catch (error) {
    return errorResponse(error);
  }
}
