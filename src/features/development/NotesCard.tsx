import { useState } from "react";
import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";
import { formatDate } from "../../lib/format";
import { useNotes, useAddNote, type CoachNote } from "./hooks";

interface Props {
  athleteId: string;
  /** coach mode shows the editor + private notes; athlete mode is read-only shared notes */
  mode: "coach" | "athlete";
  coachId?: string;
}

export default function NotesCard({ athleteId, mode, coachId }: Props) {
  const notes = useNotes(athleteId);
  const addNote = useAddNote(athleteId, coachId ?? "");
  const [body, setBody] = useState("");
  const [visibility, setVisibility] = useState<CoachNote["visibility"]>("shared_with_athlete");

  return (
    <Card>
      <h2>{mode === "coach" ? "Coaching notes" : "Notes from your coach"}</h2>
      {mode === "coach" && (
        <>
          <div className="field">
            <label htmlFor={`note-body-${athleteId}`}>New note</label>
            <textarea id={`note-body-${athleteId}`} rows={3} value={body}
              onChange={(e) => setBody(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor={`note-vis-${athleteId}`}>Visibility</label>
            <select id={`note-vis-${athleteId}`} value={visibility}
              onChange={(e) => setVisibility(e.target.value as CoachNote["visibility"])}>
              <option value="shared_with_athlete">Shared with player</option>
              <option value="private">Private (only me)</option>
            </select>
          </div>
          {addNote.isError && <p className="error" role="alert">{addNote.error.message}</p>}
          <Button disabled={addNote.isPending}
            onClick={() => addNote.mutate({ body, visibility }, { onSuccess: () => setBody("") })}>
            {addNote.isPending ? "Saving…" : "Save note"}
          </Button>
        </>
      )}
      {notes.isLoading && <p className="muted" role="status">Loading…</p>}
      {notes.isError && <p className="error" role="alert">{notes.error.message}</p>}
      {notes.data?.length === 0 && (
        <p className="muted">
          {mode === "coach" ? "No notes yet." : "Nothing shared yet — notes from sessions will appear here."}
        </p>
      )}
      <ul className="rows">
        {notes.data?.map((n) => (
          <li key={n.id} className="row">
            <span>
              {n.body}
              <div className="muted">
                {formatDate(n.note_date)}
                {mode === "coach" && n.visibility === "private" && (
                  <span className="badge badge--muted"> Private</span>
                )}
              </div>
            </span>
          </li>
        ))}
      </ul>
    </Card>
  );
}
