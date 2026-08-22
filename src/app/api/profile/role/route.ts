import type { NextRequest } from "next/server";
import { errorResponse, jsonResponse, readJson } from "@/lib/server/http";
import { confirmProfileRole } from "@/lib/server/repository";
import { requireProfile } from "@/lib/server/supabase";
import type { Role } from "@/lib/server/types";

export const runtime = "nodejs";

export async function PATCH(request: NextRequest) {
  try {
    const profile = await requireProfile(request);
    const body = await readJson<{ role?: Role }>(request);
    const updatedProfile = await confirmProfileRole(profile, body.role as Role);

    return jsonResponse({ profile: updatedProfile });
  } catch (error) {
    return errorResponse(error);
  }
}
