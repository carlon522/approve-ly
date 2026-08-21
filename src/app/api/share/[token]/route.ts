import type { NextRequest } from "next/server";
import { isSupabaseBackendConfigured } from "@/lib/server/env";
import { ApiError, errorResponse, jsonResponse } from "@/lib/server/http";
import { getSharedBootstrap } from "@/lib/server/repository";
import { requireProfile } from "@/lib/server/supabase";

export const runtime = "nodejs";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ token: string }> },
) {
  try {
    if (!isSupabaseBackendConfigured()) {
      throw new ApiError("Sharing requires Supabase configuration.", 503);
    }

    const { token } = await context.params;
    let profile;

    if (request.headers.get("authorization")?.startsWith("Bearer ")) {
      profile = await requireProfile(request);
    }

    const payload = await getSharedBootstrap(token, profile);
    return jsonResponse({ mode: "share", ...payload });
  } catch (error) {
    return errorResponse(error);
  }
}
