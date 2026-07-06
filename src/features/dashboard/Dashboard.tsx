import { useAuth } from "../auth/AuthProvider";

/** Placeholder dashboard shared by all roles until Phase 1 features land. */
export default function Dashboard({ title }: { title: string }) {
  const { profile, signOut } = useAuth();
  return (
    <main className="auth-layout">
      <div className="card">
        <h1 className="brand">{title}</h1>
        <p className="muted">
          Signed in as {profile?.full_name || "…"} ({profile?.role}). Phase 1 features land here.
        </p>
        <button className="btn" onClick={signOut}>Sign out</button>
      </div>
    </main>
  );
}
