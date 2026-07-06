import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { pdf } from "@react-pdf/renderer";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../auth/AuthProvider";
import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";
import { slugify } from "../../lib/format";
import { useGoals, useProgressLogs, useNotes } from "../development/hooks";
import { usePlans } from "../sessions/hooks";
import WorkbookDocument from "./WorkbookDocument";

export default function WorkbookPage() {
  const { athleteId } = useParams<{ athleteId: string }>();
  const { profile } = useAuth();

  const athlete = useQuery({
    queryKey: ["athlete-profile", athleteId],
    enabled: !!athleteId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles").select("id, full_name").eq("id", athleteId!).single();
      if (error) throw new Error("Player not found, or they are not linked to you.");
      return data;
    },
  });
  const goals = useGoals(athleteId!);
  const logs = useProgressLogs(athleteId!, 20);
  const notes = useNotes(athleteId!);
  const plans = usePlans();

  const [include, setInclude] = useState({ goals: true, progress: true, notes: true, sessions: true });
  const [building, setBuilding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loading = athlete.isLoading || goals.isLoading || logs.isLoading || notes.isLoading || plans.isLoading;

  async function download() {
    if (!athlete.data || !profile) return;
    setBuilding(true);
    setError(null);
    try {
      // PRIVACY: only notes explicitly shared with the player go into a printed workbook.
      const sharedNotes = (notes.data ?? []).filter((n) => n.visibility === "shared_with_athlete");
      const athletePlans = (plans.data ?? []).filter((p) => p.athlete_id === athleteId).slice(0, 10);
      const blob = await pdf(
        <WorkbookDocument data={{
          athleteName: athlete.data.full_name,
          coachName: profile.full_name,
          goals: goals.data ?? [],
          logs: logs.data ?? [],
          notes: sharedNotes,
          plans: athletePlans,
          include,
        }} />
      ).toBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${slugify(athlete.data.full_name)}-workbook-${new Date().toISOString().slice(0, 10)}.pdf`;
      document.body.appendChild(a); // some browsers ignore clicks on detached anchors
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000); // revoking immediately can cancel the download
    } catch (e) {
      console.error(e);
      setError("Couldn't build the PDF — try again, or check the console for details.");
    } finally {
      setBuilding(false);
    }
  }

  const toggles: Array<{ key: keyof typeof include; label: string }> = [
    { key: "goals", label: "Goals" },
    { key: "progress", label: "Progress log (last 20 entries)" },
    { key: "sessions", label: "Session history (last 10)" },
    { key: "notes", label: "Coaching notes (shared notes only — private notes are never included)" },
  ];

  return (
    <main className="page">
      <header className="page__head">
        <h1 className="brand">Workbook — {athlete.data?.full_name ?? "…"}</h1>
        <Link to={`/coach/athletes/${athleteId}`}>← Player</Link>
      </header>
      {athlete.isError && <Card><p className="error" role="alert">{athlete.error.message}</p></Card>}
      <Card>
        <p className="muted">
          Generates a printable PDF: branded cover, then the sections you choose. Ideal to
          hand to players or parents at a review.
        </p>
        {toggles.map((t) => (
          <div key={t.key} className="field field--check">
            <label>
              <input type="checkbox" className="tick" checked={include[t.key]}
                onChange={(e) => setInclude({ ...include, [t.key]: e.target.checked })} />
              {t.label}
            </label>
          </div>
        ))}
        {error && <p className="error" role="alert">{error}</p>}
        <Button onClick={download} disabled={loading || building || !athlete.data}>
          {building ? "Building PDF…" : loading ? "Loading data…" : "Download workbook PDF"}
        </Button>
      </Card>
    </main>
  );
}
