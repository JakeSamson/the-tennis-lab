import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider";
import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";
import { useDrills, useCreateDrill, useDeleteDrill, DIFFICULTIES, type Difficulty } from "./hooks";

export default function DrillsPage() {
  const { profile } = useAuth();
  const drills = useDrills();
  const create = useCreateDrill(profile!.id);
  const del = useDeleteDrill();
  const [form, setForm] = useState({
    title: "", description: "", tagsCsv: "",
    difficulty: "intermediate" as Difficulty, durationMin: "", equipment: "",
  });

  return (
    <main className="page">
      <header className="page__head">
        <h1 className="brand">Drill library</h1>
        <Link to="/coach">← Home</Link>
      </header>

      <Card>
        <h2>New drill</h2>
        <div className="field">
          <label htmlFor="dr-title">Title</label>
          <input id="dr-title" value={form.title} placeholder="e.g. Figure-8 volleys"
            onChange={(e) => setForm({ ...form, title: e.target.value })} />
        </div>
        <div className="field">
          <label htmlFor="dr-desc">Description</label>
          <textarea id="dr-desc" rows={2} value={form.description}
            placeholder="Setup, execution, progressions…"
            onChange={(e) => setForm({ ...form, description: e.target.value })} />
        </div>
        <div className="field">
          <label htmlFor="dr-tags">Skill tags (comma-separated)</label>
          <input id="dr-tags" value={form.tagsCsv} placeholder="e.g. volley, footwork, reaction"
            onChange={(e) => setForm({ ...form, tagsCsv: e.target.value })} />
        </div>
        <div className="grid3">
          <div className="field">
            <label htmlFor="dr-diff">Difficulty</label>
            <select id="dr-diff" value={form.difficulty}
              onChange={(e) => setForm({ ...form, difficulty: e.target.value as Difficulty })}>
              {DIFFICULTIES.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          <div className="field">
            <label htmlFor="dr-dur">Minutes</label>
            <input id="dr-dur" inputMode="decimal" value={form.durationMin}
              onChange={(e) => setForm({ ...form, durationMin: e.target.value })} />
          </div>
          <div className="field">
            <label htmlFor="dr-equip">Equipment</label>
            <input id="dr-equip" value={form.equipment} placeholder="cones, basket"
              onChange={(e) => setForm({ ...form, equipment: e.target.value })} />
          </div>
        </div>
        {create.isError && <p className="error" role="alert">{create.error.message}</p>}
        <Button disabled={create.isPending}
          onClick={() => create.mutate(form,
            { onSuccess: () => setForm({ ...form, title: "", description: "", tagsCsv: "" }) })}>
          {create.isPending ? "Saving…" : "Add drill"}
        </Button>
      </Card>

      <Card>
        <h2>My drills</h2>
        {drills.isLoading && <p className="muted" role="status">Loading…</p>}
        {drills.isError && <p className="error" role="alert">{drills.error.message}</p>}
        {drills.data?.length === 0 && (
          <p className="muted">No drills yet — this library powers session plans and, soon, AI-generated sessions.</p>
        )}
        <ul className="rows">
          {drills.data?.map((d) => (
            <li key={d.id} className="row">
              <span>
                <strong>{d.title}</strong>
                <span className="muted"> · {d.difficulty}{d.duration_min && <> · {d.duration_min} min</>}</span>
                {d.skill_tags.length > 0 && (
                  <div>{d.skill_tags.map((t) => <span key={t} className="badge badge--muted">{t} </span>)}</div>
                )}
                {d.description && <div className="muted">{d.description}</div>}
              </span>
              <Button variant="danger" disabled={del.isPending}
                onClick={() => {
                  if (window.confirm("Delete this drill? It will also be removed from any session plans using it.")) {
                    del.mutate(d.id);
                  }
                }}>
                Delete
              </Button>
            </li>
          ))}
        </ul>
      </Card>
    </main>
  );
}
