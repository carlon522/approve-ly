import type { NextRequest } from "next/server";
import { errorResponse, jsonResponse } from "@/lib/server/http";
import { downloadContent } from "@/lib/server/repository";
import { requireProfile } from "@/lib/server/supabase";

export const runtime = "nodejs";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const profile = await requireProfile(request);
    const { id } = await context.params;
    const final = request.nextUrl.searchParams.get("final") === "true";
    const result = await downloadContent(profile, id, final);

    return jsonResponse(result);
  } catch (error) {
    return errorResponse(error);
  }
}
