import { useState, type ChangeEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { supabase, homePathForRole, type UserRole } from "../../lib/supabase";
import { safeRedirect } from "../../lib/navigation";

export default function SignUpPage() {
  const nav = useNavigate();
  const [params] = useSearchParams();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<UserRole>("athlete");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSignUp() {
    setError(null);
    if (!fullName.trim()) { setError("Enter your name."); return; }
    if (password.length < 8) { setError("Password must be at least 8 characters."); return; }
    setBusy(true);
    try {
      // Role + name travel in metadata; the DB trigger creates the profile.
      const { data, error: authErr } = await supabase.auth.signUp({
        email, password,
        options: { data: { full_name: fullName.trim(), role } },
      });
      if (authErr) { setError(authErr.message); return; }
      // If email confirmation is ON in Supabase, there's no session yet.
      if (!data.session) {
        setError(null);
        nav("/check-email");
        return;
      }
      nav(safeRedirect(params.get("redirect"), homePathForRole(role)));
    } catch {
      setError("Something went wrong. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="auth-layout">
      <div className="card">
        <h1 className="brand">Create your account</h1>
        <p className="muted">Coaches build the programme. Players own the progress.</p>
        <div className="field">
          <label htmlFor="name">Full name</label>
          <input id="name" autoComplete="name" value={fullName}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setFullName(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="email">Email</label>
          <input id="email" type="email" autoComplete="email" value={email}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="password">Password</label>
          <input id="password" type="password" autoComplete="new-password" value={password}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="role">I am a</label>
          <select id="role" value={role}
            onChange={(e: ChangeEvent<HTMLSelectElement>) => setRole(e.target.value as UserRole)}>
            <option value="athlete">Player</option>
            <option value="coach">Coach</option>
            <option value="parent">Parent</option>
          </select>
        </div>
        {error && <p className="error" role="alert">{error}</p>}
        <button className="btn" onClick={handleSignUp} disabled={busy}>
          {busy ? "Creating account…" : "Create account"}
        </button>
        <p className="muted">Already have an account? <Link to="/">Sign in</Link></p>
      </div>
    </main>
  );
}
