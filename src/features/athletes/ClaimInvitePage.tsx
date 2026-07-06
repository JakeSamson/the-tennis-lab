import { useEffect } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider";
import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";
import { useClaimInvitation } from "./hooks";

/** Landing page for /claim/:token — the link a coach shares with a player. */
export default function ClaimInvitePage() {
  const { token } = useParams<{ token: string }>();
  const { session, loading } = useAuth();
  const claim = useClaimInvitation();
  const nav = useNavigate();

  // Attempt the claim once we know the user is signed in.
  useEffect(() => {
    if (!loading && session && token && claim.isIdle) claim.mutate(token);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, session, token]);

  if (loading) {
    return <main className="auth-layout"><p className="muted" role="status">Loading…</p></main>;
  }

  // Not signed in: send them to auth and bring them back here afterwards.
  if (!session) {
    const redirect = encodeURIComponent(`/claim/${token}`);
    return (
      <main className="auth-layout">
        <Card>
          <h1 className="brand">You're invited</h1>
          <p className="muted">
            Your coach invited you to The Tennis Lab. Create a player account (or sign in)
            with the same email your coach used.
          </p>
          <Link to={`/signup?redirect=${redirect}`}><Button>Create account</Button></Link>
          <p className="muted">Already have an account? <Link to={`/?redirect=${redirect}`}>Sign in</Link></p>
        </Card>
      </main>
    );
  }

  return (
    <main className="auth-layout">
      <Card>
        <h1 className="brand">
          {claim.isPending && "Linking you to your coach…"}
          {claim.isSuccess && "You're connected"}
          {claim.isError && "Invitation problem"}
        </h1>
        {claim.isError && <p className="error" role="alert">{claim.error.message}</p>}
        {claim.isSuccess && (
          <>
            <p className="muted">Your coach can now see your profile and progress.</p>
            <Button onClick={() => nav("/athlete")}>Go to my dashboard</Button>
          </>
        )}
      </Card>
    </main>
  );
}
