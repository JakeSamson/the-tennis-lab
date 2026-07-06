import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../auth/AuthProvider";
import Card from "../../components/ui/Card";
import GoalsCard from "../development/GoalsCard";
import ProgressCard from "../development/ProgressCard";
import NotesCard from "../development/NotesCard";
import VideoLibraryCard from "../video/VideoLibraryCard";

export default function AthleteDetailPage() {
  const { athleteId } = useParams<{ athleteId: string }>();
  const { profile } = useAuth();

  // Profile visibility is already scoped by RLS to linked athletes only.
  const athlete = useQuery({
    queryKey: ["athlete-profile", athleteId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles").select("id, full_name").eq("id", athleteId!).single();
      if (error) throw new Error("Player not found, or they are not linked to you.");
      return data;
    },
    enabled: !!athleteId,
  });

  if (!athleteId) return null;

  return (
    <main className="page">
      <header className="page__head">
        <h1 className="brand">{athlete.data?.full_name ?? "Player"}</h1>
        <nav className="page__nav">
          <Link to={`/coach/athletes/${athleteId}/workbook`}>Workbook PDF</Link>
          <Link to="/coach">← All players</Link>
        </nav>
      </header>
      {athlete.isError && <Card><p className="error" role="alert">{athlete.error.message}</p></Card>}
      {athlete.data && profile && (
        <>
          <GoalsCard athleteId={athleteId} userId={profile.id} />
          <ProgressCard athleteId={athleteId} userId={profile.id} />
          <NotesCard athleteId={athleteId} mode="coach" coachId={profile.id} />
          <VideoLibraryCard athleteId={athleteId} userId={profile.id} />
        </>
      )}
    </main>
  );
}
