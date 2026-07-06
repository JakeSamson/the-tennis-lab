import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider";
import BillingBanner from "../billing/BillingBanner";
import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";
import { buildClaimUrl } from "../../lib/navigation";
import {
  useAthletes, usePendingInvitations, useCreateInvitation,
  useRevokeInvitation, useRemoveAthlete,
} from "./hooks";

export default function CoachAthletesPage() {
  const { profile, signOut } = useAuth();
  const athletes = useAthletes();
  const invitations = usePendingInvitations();
  const createInvite = useCreateInvitation(profile!.id);
  const revokeInvite = useRevokeInvitation();
  const removeAthlete = useRemoveAthlete();

  const [email, setEmail] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  async function copyLink(id: string, token: string) {
    try {
      await navigator.clipboard.writeText(buildClaimUrl(window.location.origin, token));
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      // Clipboard can be blocked (permissions/insecure context).
      setCopiedId(null);
    }
  }

  return (
    <main className="page">
      <header className="page__head">
        <h1 className="brand">The Tennis Lab</h1>
        <nav className="page__nav">
          <Link to="/coach/plans">Sessions</Link>
          <Link to="/coach/drills">Drills</Link>
          <Link to="/coach/programs">Programs</Link>
          <Link to="/schedule">Schedule</Link>
          <Link to="/biomech">Technique library</Link>
          <Button variant="secondary" onClick={signOut}>Sign out</Button>
        </nav>
      </header>
      <BillingBanner />

      <Card>
        <h2>Invite a player</h2>
        <p className="muted">
          Enter their email, then share the invite link with them directly.
        </p>
        <div className="field">
          <label htmlFor="invite-email">Player email</label>
          <input id="invite-email" type="email" value={email}
            onChange={(e) => setEmail(e.target.value)} />
        </div>
        {createInvite.isError && (
          <p className="error" role="alert">{createInvite.error.message}</p>
        )}
        <Button
          onClick={() => createInvite.mutate(email, { onSuccess: () => setEmail("") })}
          disabled={createInvite.isPending}
        >
          {createInvite.isPending ? "Creating…" : "Create invite link"}
        </Button>
      </Card>

      <Card>
        <h2>Pending invitations</h2>
        {invitations.isLoading && <p className="muted" role="status">Loading…</p>}
        {invitations.isError && <p className="error" role="alert">{invitations.error.message}</p>}
        {invitations.data?.length === 0 && (
          <p className="muted">No pending invites. Create one above to link a player.</p>
        )}
        <ul className="rows">
          {invitations.data?.map((inv) => (
            <li key={inv.id} className="row">
              <span>{inv.email}</span>
              <span className="row__actions">
                <Button variant="secondary" onClick={() => copyLink(inv.id, inv.token)}>
                  {copiedId === inv.id ? "Copied ✓" : "Copy link"}
                </Button>
                <Button variant="danger" onClick={() => revokeInvite.mutate(inv.id)}
                  disabled={revokeInvite.isPending}>
                  Revoke
                </Button>
              </span>
            </li>
          ))}
        </ul>
      </Card>

      <Card>
        <h2>My players</h2>
        {athletes.isLoading && <p className="muted" role="status">Loading…</p>}
        {athletes.isError && <p className="error" role="alert">{athletes.error.message}</p>}
        {athletes.data?.length === 0 && (
          <p className="muted">No players linked yet — they appear here once an invite is accepted.</p>
        )}
        <ul className="rows">
          {athletes.data?.map((link) => (
            <li key={link.id} className="row">
              <Link to={`/coach/athletes/${link.athlete?.id}`}>
                {link.athlete?.full_name ?? "Unknown player"}
              </Link>
              <Button variant="danger"
                onClick={() => {
                  // Guard against accidental unlinking; the player's data is not deleted.
                  if (window.confirm("Remove this player from your list?")) {
                    removeAthlete.mutate(link.id);
                  }
                }}
                disabled={removeAthlete.isPending}>
                Remove
              </Button>
            </li>
          ))}
        </ul>
      </Card>
    </main>
  );
}
