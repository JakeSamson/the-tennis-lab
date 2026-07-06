import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";
import { formatDate } from "../../lib/format";
import { useDrills } from "../drills/hooks";
import { usePlan, useAddPlanItem, useDeletePlanItem } from "./hooks";
import PlanContent from "./PlanContent";

export default function PlanBuilderPage() {
  const { planId } = useParams<{ planId: string }>();
  const plan = usePlan(planId!);
  const drills = useDrills();
  const addItem = useAddPlanItem(planId!);
  const removeItem = useDeletePlanItem(planId!);
  const [form, setForm] = useState({ drillId: "", durationMin: "", coachingPoints: "" });

  const p = plan.data;

  return (
    <main className="page">
      <header className="page__head">
        <h1 className="brand">{p?.title ?? "Session plan"}</h1>
        <Link to="/coach/plans">← Plans</Link>
      </header>
      {plan.isError && <Card><p className="error" role="alert">{plan.error.message}</p></Card>}
      {p && (
        <>
          <Card>
            <p className="muted">
              {formatDate(p.plan_date)} · {p.athlete?.full_name ?? "Group / unassigned"}
              {p.athlete_id && <> — this player can see this plan in their app</>}
            </p>
            {p.objectives && <p>{p.objectives}</p>}
            <PlanContent plan={p} onRemoveItem={(id) => removeItem.mutate(id)} />
            {removeItem.isError && <p className="error" role="alert">{removeItem.error.message}</p>}
          </Card>

          <Card>
            <h2>Add drill to session</h2>
            {drills.data?.length === 0 && (
              <p className="muted">Your drill library is empty — <Link to="/coach/drills">add drills</Link> first.</p>
            )}
            <div className="field">
              <label htmlFor="pi-drill">Drill</label>
              <select id="pi-drill" value={form.drillId}
                onChange={(e) => setForm({ ...form, drillId: e.target.value })}>
                <option value="">— choose drill —</option>
                {drills.data?.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.title}{d.duration_min ? ` (${d.duration_min} min)` : ""}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="pi-dur">Duration override, minutes (optional)</label>
              <input id="pi-dur" inputMode="decimal" value={form.durationMin}
                onChange={(e) => setForm({ ...form, durationMin: e.target.value })} />
            </div>
            <div className="field">
              <label htmlFor="pi-points">Coaching points for this session (optional)</label>
              <textarea id="pi-points" rows={2} value={form.coachingPoints}
                onChange={(e) => setForm({ ...form, coachingPoints: e.target.value })} />
            </div>
            {addItem.isError && <p className="error" role="alert">{addItem.error.message}</p>}
            <Button disabled={addItem.isPending}
              onClick={() => addItem.mutate(
                { ...form, nextOrder: (p.items.at(-1)?.sort_order ?? 0) + 1 },
                { onSuccess: () => setForm({ drillId: "", durationMin: "", coachingPoints: "" }) })}>
              {addItem.isPending ? "Adding…" : "Add to session"}
            </Button>
          </Card>
        </>
      )}
    </main>
  );
}
