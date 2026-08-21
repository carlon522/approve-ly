import type { NextRequest } from "next/server";
import { assertString, errorResponse, jsonResponse, readJson } from "@/lib/server/http";
import { addComment } from "@/lib/server/repository";
import { requireProfile } from "@/lib/server/supabase";

export const runtime = "nodejs";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const profile = await requireProfile(request);
    const { id } = await context.params;
    const body = await readJson<{ anchor?: string; body?: string }>(request);
    const result = await addComment(profile, id, {
      anchor: assertString(body.anchor, "Anchor"),
      body: assertString(body.body, "Comment"),
    });

    return jsonResponse(result, 201);
  } catch (error) {
    return errorResponse(error);
  }
}
