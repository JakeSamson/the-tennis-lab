import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider";
import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";
import { formatCategory } from "../../lib/format";
import { useMyPrograms, useCreateProgram, CATEGORIES, type Category } from "./hooks";

export default function CoachProgramsPage() {
  const { profile } = useAuth();
  const programs = useMyPrograms();
  const create = useCreateProgram(profile!.id);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<Category>("strength");

  return (
    <main className="page">
      <header className="page__head">
        <h1 className="brand">Programs</h1>
        <Link to="/coach">← Home</Link>
      </header>

      <Card>
        <h2>New program</h2>
        <div className="field">
          <label htmlFor="prog-title">Title</label>
          <input id="prog-title" value={title} placeholder="e.g. Pre-season strength block"
            onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="prog-cat">Category</label>
          <select id="prog-cat" value={category}
            onChange={(e) => setCategory(e.target.value as Category)}>
            {CATEGORIES.map((c) => <option key={c} value={c}>{formatCategory(c)}</option>)}
          </select>
        </div>
        {create.isError && <p className="error" role="alert">{create.error.message}</p>}
        <Button disabled={create.isPending}
          onClick={() => create.mutate({ title, category }, { onSuccess: () => setTitle("") })}>
          {create.isPending ? "Creating…" : "Create program"}
        </Button>
      </Card>

      {CATEGORIES.map((cat) => {
        const inCat = programs.data?.filter((p) => p.category === cat) ?? [];
        return (
          <Card key={cat}>
            <h2>{formatCategory(cat)}</h2>
            {programs.isLoading && <p className="muted" role="status">Loading…</p>}
            {programs.isError && <p className="error" role="alert">{programs.error.message}</p>}
            {!programs.isLoading && inCat.length === 0 && <p className="muted">None yet.</p>}
            <ul className="rows">
              {inCat.map((p) => (
                <li key={p.id} className="row">
                  <span>
                    <Link to={`/coach/programs/${p.id}`}>{p.title}</Link>{" "}
                    {p.published
                      ? <span className="badge badge--yes">Published</span>
                      : <span className="badge badge--muted">Draft</span>}
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
