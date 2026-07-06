import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../../lib/supabase";

export const EVENT_TYPES = ["lesson","group_session","match","fitness","tournament","other"] as const;
export type EventType = (typeof EVENT_TYPES)[number];

export interface ScheduleEvent {
  id: string; coach_id: string; athlete_id: string | null;
  event_type: EventType; title: string;
  start_at: string; end_at: string;
  location: string | null; notes: string | null;
  athlete: { full_name: string } | null;
  coach: { full_name: string } | null;
}

/** Upcoming events; RLS scopes rows per role (coach: own; athlete: theirs + group). */
export function useUpcomingEvents() {
  return useQuery({
    queryKey: ["schedule"],
    queryFn: async (): Promise<ScheduleEvent[]> => {
      const { data, error } = await supabase
        .from("schedule_events")
        .select("*, athlete:profiles!athlete_id(full_name), coach:profiles!coach_id(full_name)")
        .gte("end_at", new Date().toISOString())
        .order("start_at")
        .limit(50);
      if (error) throw new Error(error.message);
      return (data ?? []) as unknown as ScheduleEvent[];
    },
  });
}

export interface NewEvent {
  title: string; eventType: EventType; athleteId: string | null;
  startLocal: string; durationMin: string; location?: string; notes?: string;
}

export function useCreateEvent(coachId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: NewEvent) => {
      if (!input.title.trim()) throw new Error("Give the event a title.");
      if (!input.startLocal) throw new Error("Pick a start date and time.");
      const start = new Date(input.startLocal); // datetime-local -> device timezone
      if (Number.isNaN(start.getTime())) throw new Error("Invalid start time.");
      const mins = Number(input.durationMin);
      if (Number.isNaN(mins) || mins <= 0) throw new Error("Duration must be a positive number of minutes.");
      const end = new Date(start.getTime() + mins * 60 * 1000);
      const { error } = await supabase.from("schedule_events").insert({
        coach_id: coachId, athlete_id: input.athleteId,
        event_type: input.eventType, title: input.title.trim(),
        start_at: start.toISOString(), end_at: end.toISOString(),
        location: input.location?.trim() || null, notes: input.notes?.trim() || null,
      });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["schedule"] }),
  });
}

export function useDeleteEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("schedule_events").delete().eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["schedule"] }),
  });
}
