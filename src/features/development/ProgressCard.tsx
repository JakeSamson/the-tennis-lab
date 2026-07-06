import { useState } from "react";
import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";
import { formatDate } from "../../lib/format";
import { useProgressLogs, useAddProgressLog } from "./hooks";

export default function ProgressCard({ athleteId, userId }: { athleteId: string; userId: string }) {
  const logs = useProgressLogs(athleteId);
  const addLog = useAddProgressLog(athleteId, userId);
  const [metric, setMetric] = useState("");
  const [value, setValue] = useState("");
  const [notes, setNotes] = useState("");

  return (
    <Card>
      <h2>Progress</h2>
      <p className="muted">Log anything measurable — serve %, sprint times, session RPE. Charts arrive in a later phase.</p>
      <div className="field">
        <label htmlFor={`metric-${athleteId}`}>Metric</label>
        <input id={`metric-${athleteId}`} value={metric} placeholder="e.g. First serve %"
          onChange={(e) => setMetric(e.target.value)} />
      </div>
      <div className="field">
        <label htmlFor={`value-${athleteId}`}>Value (optional, numeric)</label>
        <input id={`value-${athleteId}`} inputMode="decimal" value={value}
          onChange={(e) => setValue(e.target.value)} />
      </div>
      <div className="field">
        <label htmlFor={`log-notes-${athleteId}`}>Notes (optional)</label>
        <input id={`log-notes-${athleteId}`} value={notes}
          onChange={(e) => setNotes(e.target.value)} />
      </div>
      {addLog.isError && <p className="error" role="alert">{addLog.error.message}</p>}
      <Button disabled={addLog.isPending}
        onClick={() => addLog.mutate({ metric, value, notes },
          { onSuccess: () => { setMetric(""); setValue(""); setNotes(""); } })}>
        {addLog.isPending ? "Logging…" : "Log progress"}
      </Button>

      {logs.isLoading && <p className="muted" role="status">Loading…</p>}
      {logs.isError && <p className="error" role="alert">{logs.error.message}</p>}
      <ul className="rows">
        {logs.data?.map((l) => (
          <li key={l.id} className="row">
            <span>
              <strong>{l.metric}</strong>{l.value !== null && <> — {l.value}</>}
              <span className="muted"> · {formatDate(l.log_date)}</span>
              {l.notes && <div className="muted">{l.notes}</div>}
            </span>
          </li>
        ))}
      </ul>
    </Card>
  );
}
