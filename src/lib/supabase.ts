import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Fail fast with a clear message instead of cryptic runtime errors.
if (!url || !anonKey) {
  throw new Error(
    "Missing Supabase config. Copy .env.example to .env.local and fill in your project values."
  );
}

export const supabase = createClient(url, anonKey);

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
