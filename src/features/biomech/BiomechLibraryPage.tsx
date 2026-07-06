import { Link } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider";
import Card from "../../components/ui/Card";
import { useBiomechLibrary } from "./hooks";

/**
 * Read-only technique reference, shared by coaches and players.
 * Uses native <details> for accessible, zero-JS accordions.
 */
export default function BiomechLibraryPage() {
  const { profile } = useAuth();
  const library = useBiomechLibrary();
  const backPath = profile?.role === "coach" ? "/coach" : "/athlete";

  return (
    <main className="page">
      <header className="page__head">
        <h1 className="brand">Biomechanics library</h1>
        <Link to={backPath}>← Home</Link>
      </header>
      {library.isLoading && <p className="muted" role="status">Loading…</p>}
      {library.isError && <Card><p className="error" role="alert">{library.error.message}</p></Card>}
      {library.data?.map((shot) => (
        <Card key={shot.id}>
          <h2>{shot.title}</h2>
          <p className="muted">{shot.overview}</p>
          {shot.phases.map((phase, i) => (
            <details key={phase.id} className="phase">
              <summary>
                <span className="phase__num">{i + 1}</span> {phase.name}
              </summary>
              <p>{phase.teaching_points}</p>
            </details>
          ))}
        </Card>
      ))}
      {library.data && library.data.length === 0 && (
        <Card><p className="muted">
          Library is empty — run migration 00005_biomech.sql to seed the technique content.
        </p></Card>
      )}
    </main>
  );
}
