import type { NextRequest } from "next/server";
import { errorResponse, jsonResponse } from "@/lib/server/http";
import { archiveContent } from "@/lib/server/repository";
import { requireProfile } from "@/lib/server/supabase";

export const runtime = "nodejs";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const profile = await requireProfile(request);
    const { id } = await context.params;
    const item = await archiveContent(profile, id);

    return jsonResponse({ item });
  } catch (error) {
    return errorResponse(error);
  }
}
