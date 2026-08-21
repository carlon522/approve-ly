import { NextResponse } from "next/server";
import {
  MAX_UPLOAD_BYTES,
  isR2Configured,
  isSupabaseBackendConfigured,
  isSupabasePublicConfigured,
} from "@/lib/server/env";

export const runtime = "nodejs";

export function GET() {
  return NextResponse.json({
    maxUploadBytes: MAX_UPLOAD_BYTES,
    r2Configured: isR2Configured(),
    supabaseBackendConfigured: isSupabaseBackendConfigured(),
    supabasePublicConfigured: isSupabasePublicConfigured(),
  });
}
