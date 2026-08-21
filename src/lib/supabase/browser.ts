"use client";

import { createBrowserClient } from "@supabase/ssr";

export function isSupabaseBrowserConfigured() {
  return Boolean(getSupabaseUrl() && getSupabaseAnonKey());
}

export function createBrowserSupabaseClient() {
  const url = getSupabaseUrl();
  const key = getSupabaseAnonKey();

  if (!url || !key) {
    throw new Error("Supabase browser client is not configured.");
  }

  return createBrowserClient(url, key);
}

function getSupabaseUrl() {
  return process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
}

function getSupabaseAnonKey() {
  return (
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    ""
  );
}
