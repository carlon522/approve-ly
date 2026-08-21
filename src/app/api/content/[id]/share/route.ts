import type { NextRequest } from "next/server";
import { assertString, errorResponse, jsonResponse, readJson } from "@/lib/server/http";
import { shareContent } from "@/lib/server/repository";
import { requireProfile } from "@/lib/server/supabase";

export const runtime = "nodejs";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const profile = await requireProfile(request);
    const { id } = await context.params;
    const body = await readJson<{ mode?: string }>(request);
    const mode = assertString(body.mode, "Share mode") === "Public" ? "Public" : "Private";
    const result = await shareContent(profile, id, mode);

    return jsonResponse(result, 201);
  } catch (error) {
    return errorResponse(error);
  }
}
