import { createClient } from "@supabase/supabase-js";

const rawUrl = import.meta.env.VITE_SUPABASE_URL;
const rawKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Fail fast with a clear message instead of cryptic runtime errors.
if (!rawUrl || !rawKey) {
  throw new Error(
    "Missing Supabase config. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY."
  );
}

// Normalize the URL: people paste values with trailing slashes or /rest/v1
// tails from the Supabase dashboard. Keep only scheme + host.
function normalizeUrl(input: string): string {
  try {
    return new URL(input.trim()).origin;
  } catch {
    throw new Error(`VITE_SUPABASE_URL is not a valid URL: "${input}"`);
  }
}

export const supabase = createClient(normalizeUrl(rawUrl), rawKey.trim());

export type UserRole = "coach" | "athlete" | "parent";

export interface Profile {
  id: string;
  role: UserRole;
  full_name: string;
  avatar_url: string | null;
}

/** Where each role lands after signing in. Pure so it's unit-testable. */
export function homePathForRole(role: UserRole): string {
  switch (role) {
    case "coach": return "/coach";
    case "athlete": return "/athlete";
    case "parent": return "/parent";
  }
}
