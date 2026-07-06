import { Link } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider";
import BillingBanner from "../billing/BillingBanner";
import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";
import GoalsCard from "../development/GoalsCard";
import ProgressCard from "../development/ProgressCard";
import NotesCard from "../development/NotesCard";
import VideoLibraryCard from "../video/VideoLibraryCard";
import { useCoaches } from "./hooks";

export default function MyCoachesPage() {
  const { profile, signOut } = useAuth();
  const coaches = useCoaches();
  if (!profile) return null;

  return (
    <main className="page">
      <header className="page__head">
        <h1 className="brand">The Tennis Lab</h1>
        <nav className="page__nav">
          <Link to="/athlete/sessions">Sessions</Link>
          <Link to="/athlete/programs">Programs</Link>
          <Link to="/schedule">Schedule</Link>
          <Link to="/biomech">Technique library</Link>
          <Button variant="secondary" onClick={signOut}>Sign out</Button>
        </nav>
      </header>
      <BillingBanner />

      <GoalsCard athleteId={profile.id} userId={profile.id} />
      <ProgressCard athleteId={profile.id} userId={profile.id} />
      <NotesCard athleteId={profile.id} mode="athlete" />
      <VideoLibraryCard athleteId={profile.id} userId={profile.id} />

      <Card>
        <h2>My coaches</h2>
        {coaches.isLoading && <p className="muted" role="status">Loading…</p>}
        {coaches.isError && <p className="error" role="alert">{coaches.error.message}</p>}
        {coaches.data?.length === 0 && (
          <p className="muted">No coach linked yet. Ask your coach for an invite link.</p>
        )}
        <ul className="rows">
          {coaches.data?.map((link) => (
            <li key={link.id} className="row"><span>{link.coach?.full_name ?? "Coach"}</span></li>
          ))}
        </ul>
      </Card>
    </main>
  );
}
