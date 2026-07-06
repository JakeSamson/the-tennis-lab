import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider";
import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";
import { formatCategory } from "../../lib/format";
import { useAthletes } from "../athletes/hooks";
import {
  useProgram, useSetPublished, useAddSection, useAddItem,
  useAssignments, useAssignAthlete, useUnassign,
} from "./hooks";
import ProgramContent from "./ProgramContent";

export default function ProgramBuilderPage() {
  const { programId } = useParams<{ programId: string }>();
  const { profile } = useAuth();
  const program = useProgram(programId!);
  const publish = useSetPublished(programId!);
  const addSection = useAddSection(programId!);
  const addItem = useAddItem(programId!);
  const assignments = useAssignments(programId!);
  const assign = useAssignAthlete(programId!, profile!.id);
  const unassign = useUnassign(programId!);
  const athletes = useAthletes();

  const [sectionTitle, setSectionTitle] = useState("");
  const [item, setItem] = useState({ sectionId: "", title: "", body: "", sets: "", reps: "", durationMin: "" });
  const [assignTo, setAssignTo] = useState("");
  const [itemError, setItemError] = useState<string | null>(null);

  const p = program.data;
  const unassigned = athletes.data?.filter(
    (a) => a.athlete && !assignments.data?.some((x) => x.athlete_id === a.athlete!.id)
  ) ?? [];

  return (
    <main className="page">
      <header className="page__head">
        <h1 className="brand">{p?.title ?? "Program"}</h1>
        <Link to="/coach/programs">← Programs</Link>
      </header>
      {program.isError && <Card><p className="error" role="alert">{program.error.message}</p></Card>}
      {p && (
        <>
          <Card>
            <p className="muted">{formatCategory(p.category)}{p.description && <> · {p.description}</>}</p>
            {publish.isError && <p className="error" role="alert">{publish.error.message}</p>}
            <Button variant={p.published ? "secondary" : "primary"} disabled={publish.isPending}
              onClick={() => publish.mutate(!p.published)}>
              {p.published ? "Unpublish (hide from players)" : "Publish to assigned players"}
            </Button>
          </Card>

          <ProgramContent program={p} />

          <Card>
            <h2>Add section</h2>
            <div className="field">
              <label htmlFor="sec-title">Section title</label>
              <input id="sec-title" value={sectionTitle} placeholder="e.g. Week 1 — Foundation"
                onChange={(e) => setSectionTitle(e.target.value)} />
            </div>
            {addSection.isError && <p className="error" role="alert">{addSection.error.message}</p>}
            <Button disabled={addSection.isPending}
              onClick={() => addSection.mutate(
                { title: sectionTitle, nextOrder: (p.sections.at(-1)?.sort_order ?? 0) + 1 },
                { onSuccess: () => setSectionTitle("") })}>
              Add section
            </Button>
          </Card>

          {p.sections.length > 0 && (
            <Card>
              <h2>Add item</h2>
              <div className="field">
                <label htmlFor="item-sec">Section</label>
                <select id="item-sec" value={item.sectionId}
                  onChange={(e) => setItem({ ...item, sectionId: e.target.value })}>
                  <option value="">— choose —</option>
                  {p.sections.map((s) => <option key={s.id} value={s.id}>{s.title}</option>)}
                </select>
              </div>
              <div className="field">
                <label htmlFor="item-title">Title</label>
                <input id="item-title" value={item.title} placeholder="e.g. Split squat / Box breathing"
                  onChange={(e) => setItem({ ...item, title: e.target.value })} />
              </div>
              <div className="field">
                <label htmlFor="item-body">Instructions (optional)</label>
                <textarea id="item-body" rows={2} value={item.body}
                  onChange={(e) => setItem({ ...item, body: e.target.value })} />
              </div>
              <div className="grid3">
                <div className="field">
                  <label htmlFor="item-sets">Sets</label>
                  <input id="item-sets" inputMode="numeric" value={item.sets}
                    onChange={(e) => setItem({ ...item, sets: e.target.value })} />
                </div>
                <div className="field">
                  <label htmlFor="item-reps">Reps</label>
                  <input id="item-reps" inputMode="numeric" value={item.reps}
                    onChange={(e) => setItem({ ...item, reps: e.target.value })} />
                </div>
                <div className="field">
                  <label htmlFor="item-dur">Minutes</label>
                  <input id="item-dur" inputMode="decimal" value={item.durationMin}
                    onChange={(e) => setItem({ ...item, durationMin: e.target.value })} />
                </div>
              </div>
              {itemError && <p className="error" role="alert">{itemError}</p>}
              {addItem.isError && <p className="error" role="alert">{addItem.error.message}</p>}
              <Button disabled={addItem.isPending}
                onClick={() => {
                  const sec = p.sections.find((s) => s.id === item.sectionId);
                  if (!sec) { setItemError("Choose which section this item belongs to."); return; }
                  setItemError(null);
                  addItem.mutate(
                    { ...item, nextOrder: (sec.items.at(-1)?.sort_order ?? 0) + 1 },
                    { onSuccess: () => setItem({ ...item, title: "", body: "", sets: "", reps: "", durationMin: "" }) });
                }}
                >
                Add item
              </Button>
            </Card>
          )}

          <Card>
            <h2>Assigned players</h2>
            {assignments.isError && <p className="error" role="alert">{assignments.error.message}</p>}
            {assignments.data?.length === 0 && <p className="muted">Not assigned to anyone yet.</p>}
            <ul className="rows">
              {assignments.data?.map((a) => (
                <li key={a.id} className="row">
                  <span>{a.athlete?.full_name ?? "Player"}</span>
                  <Button variant="danger" disabled={unassign.isPending}
                    onClick={() => unassign.mutate(a.id)}>Unassign</Button>
                </li>
              ))}
            </ul>
            {unassigned.length > 0 && (
              <>
                <div className="field">
                  <label htmlFor="assign-to">Assign to</label>
                  <select id="assign-to" value={assignTo} onChange={(e) => setAssignTo(e.target.value)}>
                    <option value="">— choose player —</option>
                    {unassigned.map((a) => (
                      <option key={a.athlete!.id} value={a.athlete!.id}>{a.athlete!.full_name}</option>
                    ))}
                  </select>
                </div>
                {assign.isError && <p className="error" role="alert">{assign.error.message}</p>}
                <Button disabled={assign.isPending || !assignTo}
                  onClick={() => assign.mutate(assignTo, { onSuccess: () => setAssignTo("") })}>
                  Assign
                </Button>
              </>
            )}
            {!p.published && assignments.data && assignments.data.length > 0 && (
              <p className="muted">This program is a draft — assigned players can't see it until you publish.</p>
            )}
          </Card>
        </>
      )}
    </main>
  );
}
