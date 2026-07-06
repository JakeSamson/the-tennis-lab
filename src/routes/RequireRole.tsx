import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../features/auth/AuthProvider";
import { homePathForRole, type UserRole } from "../lib/supabase";

/**
 * Route guard. Renders children only when the signed-in user has one of the
 * allowed roles; otherwise redirects to sign-in or to the user's own home.
 * Note: this is UX only — real security lives in the RLS policies.
 */
export default function RequireRole({ allow }: { allow: UserRole[] }) {
  const { session, profile, loading } = useAuth();

  if (loading) {
    return <main className="auth-layout"><p className="muted" role="status">Loading…</p></main>;
  }
  if (!session || !profile) return <Navigate to="/" replace />;
  if (!allow.includes(profile.role)) return <Navigate to={homePathForRole(profile.role)} replace />;
  return <Outlet />;
}
