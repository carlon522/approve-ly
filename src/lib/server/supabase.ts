import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { NextRequest } from "next/server";
import {
  getSupabaseServiceRoleKey,
  getSupabaseUrl,
  isSupabaseBackendConfigured,
} from "./env";
import { ApiError } from "./http";
import type { Profile, Role } from "./types";

let adminClient: SupabaseClient | null = null;

export function getSupabaseAdmin() {
  if (!isSupabaseBackendConfigured()) {
    throw new ApiError("Supabase backend is not configured.", 503);
  }

  if (!adminClient) {
    adminClient = createClient(getSupabaseUrl(), getSupabaseServiceRoleKey(), {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }

  return adminClient;
}

export async function requireProfile(request: NextRequest): Promise<Profile> {
  const authHeader = request.headers.get("authorization") ?? "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice("Bearer ".length) : "";

  if (!token) {
    throw new ApiError("You must be signed in.", 401);
  }

  const supabase = getSupabaseAdmin();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(token);

  if (error || !user) {
    throw new ApiError("Your session is invalid or expired.", 401);
  }

  const { data: existingProfile, error: profileError } = await supabase
    .from("profiles")
    .select("id,email,name,role")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    throw new ApiError(profileError.message, 500);
  }

  if (existingProfile) {
    return {
      email: existingProfile.email ?? user.email ?? "",
      id: existingProfile.id,
      name: existingProfile.name ?? user.email ?? "User",
      role: normalizeRole(existingProfile.role),
    };
  }

  const createdProfile = {
    email: user.email ?? "",
    id: user.id,
    name:
      typeof user.user_metadata?.name === "string"
        ? user.user_metadata.name
        : user.email ?? "User",
    role: normalizeRole(user.app_metadata?.role),
  };

  const { data: insertedProfile, error: insertError } = await supabase
    .from("profiles")
    .insert(createdProfile)
    .select("id,email,name,role")
    .single();

  if (insertError) {
    throw new ApiError(insertError.message, 500);
  }

  return {
    email: insertedProfile.email,
    id: insertedProfile.id,
    name: insertedProfile.name,
    role: normalizeRole(insertedProfile.role),
  };
}

export function normalizeRole(value: unknown): Role {
  if (value === "Approver" || value === "Assistant" || value === "Creative") {
    return value;
  }

  return "Creative";
}
