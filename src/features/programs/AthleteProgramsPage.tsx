import { Link } from "react-router-dom";
import Card from "../../components/ui/Card";
import { formatCategory } from "../../lib/format";
import { useAssignedPrograms, CATEGORIES } from "./hooks";

export default function AthleteProgramsPage() {
  const programs = useAssignedPrograms();
  return (
    <main className="page">
      <header className="page__head">
        <h1 className="brand">My programs</h1>
        <Link to="/athlete">← Home</Link>
      </header>
      {programs.isLoading && <p className="muted" role="status">Loading…</p>}
      {programs.isError && <Card><p className="error" role="alert">{programs.error.message}</p></Card>}
      {programs.data?.length === 0 && (
        <Card><p className="muted">Nothing assigned yet — your coach will assign programs here.</p></Card>
      )}
      {CATEGORIES.map((cat) => {
        const inCat = programs.data?.filter((p) => p.category === cat) ?? [];
        if (inCat.length === 0) return null;
        return (
          <Card key={cat}>
            <h2>{formatCategory(cat)}</h2>
            <ul className="rows">
              {inCat.map((p) => (
                <li key={p.id} className="row">
                  <span>
                    <Link to={`/athlete/programs/${p.id}`}>{p.title}</Link>
                    {p.description && <div className="muted">{p.description}</div>}
                  </span>
                </li>
              ))}
            </ul>
          </Card>
        );
      })}
    </main>
  );
}
