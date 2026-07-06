import { useState, type ChangeEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { supabase, homePathForRole } from "../../lib/supabase";
import { safeRedirect } from "../../lib/navigation";

export default function SignInPage() {
  const nav = useNavigate();
  const [params] = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSignIn() {
    setError(null);
    if (!email || !password) { setError("Enter your email and password."); return; }
    setBusy(true);
    try {
      const { error: authErr } = await supabase.auth.signInWithPassword({ email, password });
      if (authErr) { setError(authErr.message); return; }
      // Fetch role to land the user on the right dashboard.
      const { data: userData } = await supabase.auth.getUser();
      const { data: prof, error: profErr } = await supabase
        .from("profiles").select("role").eq("id", userData.user!.id).single();
      if (profErr || !prof) { setError("Signed in, but your profile could not be loaded."); return; }
      nav(safeRedirect(params.get("redirect"), homePathForRole(prof.role)));
    } catch {
      setError("Something went wrong. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="auth-layout">
      <div className="card">
        <h1 className="brand">The Tennis Lab</h1>
        <p className="muted">Sign in to your coaching platform</p>
        <div className="field">
          <label htmlFor="email">Email</label>
          <input id="email" type="email" autoComplete="email" value={email}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="password">Password</label>
          <input id="password" type="password" autoComplete="current-password" value={password}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSignIn()} />
        </div>
        {error && <p className="error" role="alert">{error}</p>}
        <button className="btn" onClick={handleSignIn} disabled={busy}>
          {busy ? "Signing in…" : "Sign in"}
        </button>
        <p className="muted">New here? <Link to="/signup">Create an account</Link></p>
      </div>
    </main>
  );
}
