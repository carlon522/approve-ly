import type { NextRequest } from "next/server";
import { getDemoBootstrap } from "@/lib/server/demo-data";
import { isSupabaseBackendConfigured } from "@/lib/server/env";
import { errorResponse, jsonResponse } from "@/lib/server/http";
import { getBootstrap } from "@/lib/server/repository";
import { requireProfile } from "@/lib/server/supabase";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    if (!isSupabaseBackendConfigured()) {
      return jsonResponse({ mode: "demo", ...getDemoBootstrap() });
    }

    const profile = await requireProfile(request);
    const payload = await getBootstrap(profile);

    return jsonResponse({ mode: "live", ...payload });
  } catch (error) {
    return errorResponse(error);
  }
}
