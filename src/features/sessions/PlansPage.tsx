import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Link } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider";
import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";
import { formatDate } from "../../lib/format";
import { useAthletes } from "../athletes/hooks";
import { usePlans, useCreatePlan, useGeneratePlan } from "./hooks";

export default function PlansPage() {
  const { profile } = useAuth();
  const plans = usePlans();
  const create = useCreatePlan(profile!.id);
  const athletes = useAthletes();
  const [form, setForm] = useState({ title: "", planDate: "", athleteId: "" });
  const nav = useNavigate();
  const generate = useGeneratePlan();
  const [gen, setGen] = useState({ athleteId: "", focus: "", durationMin: "60" });

  return (
    <main className="page">
      <header className="page__head">
        <h1 className="brand">Session plans</h1>
        <Link to="/coach">← Home</Link>
      </header>

      <Card>
        <h2>New session plan</h2>
        <div className="field">
          <label htmlFor="pl-title">Title</label>
          <input id="pl-title" value={form.title} placeholder="e.g. Tuesday — serve + transition"
            onChange={(e) => setForm({ ...form, title: e.target.value })} />
        </div>
        <div className="field">
          <label htmlFor="pl-date">Date</label>
          <input id="pl-date" type="date" value={form.planDate}
            onChange={(e) => setForm({ ...form, planDate: e.target.value })} />
        </div>
        <div className="field">
          <label htmlFor="pl-who">Player</label>
          <select id="pl-who" value={form.athleteId}
            onChange={(e) => setForm({ ...form, athleteId: e.target.value })}>
            <option value="">Group / unassigned</option>
            {athletes.data?.map((a) => a.athlete && (
              <option key={a.athlete.id} value={a.athlete.id}>{a.athlete.full_name}</option>
            ))}
          </select>
        </div>
        {create.isError && <p className="error" role="alert">{create.error.message}</p>}
        <Button disabled={create.isPending}
          onClick={() => create.mutate({ ...form, athleteId: form.athleteId || null },
            { onSuccess: () => setForm({ title: "", planDate: "", athleteId: "" }) })}>
          {create.isPending ? "Creating…" : "Create plan"}
        </Button>
      </Card>

      <Card>
        <h2>Generate with AI</h2>
        <p className="muted">
          Builds a session from your drill library using the player's goals and your recent
          notes. You review and edit before the lesson — nothing is final until you say so.
        </p>
        <div className="field">
          <label htmlFor="gen-who">Player</label>
          <select id="gen-who" value={gen.athleteId}
            onChange={(e) => setGen({ ...gen, athleteId: e.target.value })}>
            <option value="">Group session</option>
            {athletes.data?.map((a) => a.athlete && (
              <option key={a.athlete.id} value={a.athlete.id}>{a.athlete.full_name}</option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="gen-focus">Focus (optional)</label>
          <input id="gen-focus" value={gen.focus} placeholder="e.g. second serve consistency"
            onChange={(e) => setGen({ ...gen, focus: e.target.value })} />
        </div>
        <div className="field">
          <label htmlFor="gen-dur">Session length (minutes)</label>
          <input id="gen-dur" inputMode="numeric" value={gen.durationMin}
            onChange={(e) => setGen({ ...gen, durationMin: e.target.value })} />
        </div>
        {generate.isError && <p className="error" role="alert">{generate.error.message}</p>}
        <Button disabled={generate.isPending}
          onClick={() => generate.mutate(
            { ...gen, athleteId: gen.athleteId || null },
            { onSuccess: (planId) => nav(`/coach/plans/${planId}`) })}>
          {generate.isPending ? "Generating… (10–20s)" : "Generate session plan"}
        </Button>
      </Card>

      <Card>
        <h2>My plans</h2>
        {plans.isLoading && <p className="muted" role="status">Loading…</p>}
        {plans.isError && <p className="error" role="alert">{plans.error.message}</p>}
        {plans.data?.length === 0 && <p className="muted">No session plans yet.</p>}
        <ul className="rows">
          {plans.data?.map((p) => (
            <li key={p.id} className="row">
              <span>
                <Link to={`/coach/plans/${p.id}`}>{p.title}</Link>
                {p.ai_generated && <span className="badge badge--yes"> AI</span>}
                <div className="muted">
                  {formatDate(p.plan_date)} · {p.athlete?.full_name ?? "Group / unassigned"}
                </div>
              </span>
            </li>
          ))}
        </ul>
      </Card>
    </main>
  );
}
