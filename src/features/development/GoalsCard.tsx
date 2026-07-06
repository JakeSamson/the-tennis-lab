import { useState } from "react";
import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";
import { formatDate } from "../../lib/format";
import { useGoals, useAddGoal, useSetGoalStatus } from "./hooks";

/** Shared by the player home page and the coach's athlete detail page. */
export default function GoalsCard({ athleteId, userId }: { athleteId: string; userId: string }) {
  const goals = useGoals(athleteId);
  const addGoal = useAddGoal(athleteId, userId);
  const setStatus = useSetGoalStatus(athleteId);
  const [title, setTitle] = useState("");
  const [targetDate, setTargetDate] = useState("");

  return (
    <Card>
      <h2>Goals</h2>
      {goals.isLoading && <p className="muted" role="status">Loading…</p>}
      {goals.isError && <p className="error" role="alert">{goals.error.message}</p>}
      {goals.data?.length === 0 && <p className="muted">No goals yet — set the first one below.</p>}
      <ul className="rows">
        {goals.data?.map((g) => (
          <li key={g.id} className="row">
            <span>
              {g.status === "achieved" ? <s>{g.title}</s> : g.title}
              {g.target_date && <span className="muted"> · by {formatDate(g.target_date)}</span>}
              {g.status === "achieved" && <span className="badge badge--yes"> Achieved</span>}
            </span>
            {g.status === "active" && (
              <Button variant="secondary" disabled={setStatus.isPending}
                onClick={() => setStatus.mutate({ id: g.id, status: "achieved" })}>
                Mark achieved
              </Button>
            )}
          </li>
        ))}
      </ul>
      <div className="field">
        <label htmlFor={`goal-title-${athleteId}`}>New goal</label>
        <input id={`goal-title-${athleteId}`} value={title} placeholder="e.g. Consistent kick serve"
          onChange={(e) => setTitle(e.target.value)} />
      </div>
      <div className="field">
        <label htmlFor={`goal-date-${athleteId}`}>Target date (optional)</label>
        <input id={`goal-date-${athleteId}`} type="date" value={targetDate}
          onChange={(e) => setTargetDate(e.target.value)} />
      </div>
      {addGoal.isError && <p className="error" role="alert">{addGoal.error.message}</p>}
      <Button disabled={addGoal.isPending}
        onClick={() => addGoal.mutate({ title, target_date: targetDate || undefined },
          { onSuccess: () => { setTitle(""); setTargetDate(""); } })}>
        {addGoal.isPending ? "Adding…" : "Add goal"}
      </Button>
    </Card>
  );
}
