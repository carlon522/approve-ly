import { NextResponse } from "next/server";
import {
  MAX_UPLOAD_BYTES,
  isStorageConfigured,
  isSupabaseBackendConfigured,
  isSupabasePublicConfigured,
} from "@/lib/server/env";

export const runtime = "nodejs";

export function GET() {
  return NextResponse.json({
    maxUploadBytes: MAX_UPLOAD_BYTES,
    storageConfigured: isStorageConfigured(),
    supabaseBackendConfigured: isSupabaseBackendConfigured(),
    supabasePublicConfigured: isSupabasePublicConfigured(),
  });
}
