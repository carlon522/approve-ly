import type { NextRequest } from "next/server";
import { cleanupArchivedContent } from "@/lib/server/repository";
import { ApiError, errorResponse, jsonResponse } from "@/lib/server/http";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const expectedSecret = process.env.CRON_SECRET;
    const providedSecret = request.headers.get("x-cron-secret");

    if (!expectedSecret || providedSecret !== expectedSecret) {
      throw new ApiError("Invalid maintenance credentials.", 401);
    }

    return jsonResponse(await cleanupArchivedContent());
  } catch (error) {
    return errorResponse(error);
  }
}
