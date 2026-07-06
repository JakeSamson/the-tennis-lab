import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider";
import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";
import { formatDateTime, formatTime, formatEventType } from "../../lib/format";
import { useAthletes } from "../athletes/hooks";
import { useUpcomingEvents, useCreateEvent, useDeleteEvent, EVENT_TYPES, type EventType, type ScheduleEvent } from "./hooks";

/** Shared by both roles: coaches get the create form + delete; players get their agenda. */
export default function SchedulePage() {
  const { profile } = useAuth();
  const isCoach = profile?.role === "coach";
  const events = useUpcomingEvents();
  const createEvent = useCreateEvent(profile!.id);
  const deleteEvent = useDeleteEvent();
  const athletes = useAthletes(isCoach);

  const [form, setForm] = useState({
    title: "", eventType: "lesson" as EventType, athleteId: "",
    startLocal: "", durationMin: "60", location: "", notes: "",
  });

  function whoLabel(e: ScheduleEvent): string {
    if (isCoach) return e.athlete_id ? (e.athlete?.full_name ?? "Player") : "All players (group)";
    return e.coach?.full_name ? `with ${e.coach.full_name}` : "";
  }

  // Group events by calendar day for an agenda-style list.
  const byDay = new Map<string, ScheduleEvent[]>();
  events.data?.forEach((e) => {
    const day = new Date(e.start_at).toDateString();
    byDay.set(day, [...(byDay.get(day) ?? []), e]);
  });

  return (
    <main className="page">
      <header className="page__head">
        <h1 className="brand">Schedule</h1>
        <Link to={isCoach ? "/coach" : "/athlete"}>← Home</Link>
      </header>

      {isCoach && (
        <Card>
          <h2>New event</h2>
          <div className="field">
            <label htmlFor="ev-title">Title</label>
            <input id="ev-title" value={form.title} placeholder="e.g. Serve technique lesson"
              onChange={(e) => setForm({ ...form, title: e.target.value })} />
          </div>
          <div className="field">
            <label htmlFor="ev-type">Type</label>
            <select id="ev-type" value={form.eventType}
              onChange={(e) => setForm({ ...form, eventType: e.target.value as EventType })}>
              {EVENT_TYPES.map((t) => <option key={t} value={t}>{formatEventType(t)}</option>)}
            </select>
          </div>
          <div className="field">
            <label htmlFor="ev-who">Player</label>
            <select id="ev-who" value={form.athleteId}
              onChange={(e) => setForm({ ...form, athleteId: e.target.value })}>
              <option value="">All players (group event)</option>
              {athletes.data?.map((a) => a.athlete && (
                <option key={a.athlete.id} value={a.athlete.id}>{a.athlete.full_name}</option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="ev-start">Starts</label>
            <input id="ev-start" type="datetime-local" value={form.startLocal}
              onChange={(e) => setForm({ ...form, startLocal: e.target.value })} />
          </div>
          <div className="field">
            <label htmlFor="ev-dur">Duration (minutes)</label>
            <input id="ev-dur" inputMode="numeric" value={form.durationMin}
              onChange={(e) => setForm({ ...form, durationMin: e.target.value })} />
          </div>
          <div className="field">
            <label htmlFor="ev-loc">Location (optional)</label>
            <input id="ev-loc" value={form.location}
              onChange={(e) => setForm({ ...form, location: e.target.value })} />
          </div>
          {createEvent.isError && <p className="error" role="alert">{createEvent.error.message}</p>}
          <Button disabled={createEvent.isPending}
            onClick={() => createEvent.mutate(
              { ...form, athleteId: form.athleteId || null },
              { onSuccess: () => setForm({ ...form, title: "", startLocal: "" }) })}>
            {createEvent.isPending ? "Creating…" : "Add to schedule"}
          </Button>
        </Card>
      )}

      <Card>
        <h2>Upcoming</h2>
        {events.isLoading && <p className="muted" role="status">Loading…</p>}
        {events.isError && <p className="error" role="alert">{events.error.message}</p>}
        {events.data?.length === 0 && (
          <p className="muted">
            {isCoach ? "Nothing scheduled — add your first event above." : "Nothing scheduled yet."}
          </p>
        )}
        {[...byDay.entries()].map(([day, dayEvents]) => (
          <div key={day}>
            <h3 className="day-head">{day}</h3>
            <ul className="rows">
              {dayEvents.map((e) => (
                <li key={e.id} className="row">
                  <span>
                    <strong>{e.title}</strong>
                    <span className="badge badge--muted"> {formatEventType(e.event_type)}</span>
                    <div className="muted">
                      {formatDateTime(e.start_at)}–{formatTime(e.end_at)} · {whoLabel(e)}
                      {e.location && <> · {e.location}</>}
                    </div>
                    {e.notes && <div className="muted">{e.notes}</div>}
                  </span>
                  {isCoach && (
                    <Button variant="danger" disabled={deleteEvent.isPending}
                      onClick={() => {
                        if (window.confirm("Delete this event?")) deleteEvent.mutate(e.id);
                      }}>
                      Delete
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </Card>
    </main>
  );
}
