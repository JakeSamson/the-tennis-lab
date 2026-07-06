import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../../lib/supabase";

export interface Goal {
  id: string; athlete_id: string; created_by: string;
  title: string; target_date: string | null;
  status: "active" | "achieved" | "archived"; notes: string | null;
}
export interface ProgressLog {
  id: string; athlete_id: string; author_id: string;
  log_date: string; metric: string; value: number | null; notes: string | null;
}
export interface CoachNote {
  id: string; coach_id: string; athlete_id: string;
  note_date: string; body: string; visibility: "shared_with_athlete" | "private";
}

/* ---------------- goals ---------------- */

export function useGoals(athleteId: string) {
  return useQuery({
    queryKey: ["goals", athleteId],
    queryFn: async (): Promise<Goal[]> => {
      const { data, error } = await supabase
        .from("goals").select("*").eq("athlete_id", athleteId)
        .order("status").order("target_date", { nullsFirst: false });
      if (error) throw new Error(error.message);
      return data ?? [];
    },
  });
}

export function useAddGoal(athleteId: string, userId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { title: string; target_date?: string }) => {
      if (!input.title.trim()) throw new Error("Give the goal a title.");
      const { error } = await supabase.from("goals").insert({
        athlete_id: athleteId, created_by: userId,
        title: input.title.trim(), target_date: input.target_date || null,
      });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["goals", athleteId] }),
  });
}

export function useSetGoalStatus(athleteId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; status: Goal["status"] }) => {
      const { error } = await supabase
        .from("goals").update({ status: input.status }).eq("id", input.id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["goals", athleteId] }),
  });
}

/* ---------------- progress logs ---------------- */

export function useProgressLogs(athleteId: string, limit = 15) {
  return useQuery({
    queryKey: ["progress", athleteId],
    queryFn: async (): Promise<ProgressLog[]> => {
      const { data, error } = await supabase
        .from("progress_logs").select("*").eq("athlete_id", athleteId)
        .order("log_date", { ascending: false }).limit(limit);
      if (error) throw new Error(error.message);
      return data ?? [];
    },
  });
}

export function useAddProgressLog(athleteId: string, userId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { metric: string; value?: string; notes?: string }) => {
      if (!input.metric.trim()) throw new Error("Name the metric (e.g. First serve %).");
      // value is optional; when present it must be numeric
      let value: number | null = null;
      if (input.value && input.value.trim() !== "") {
        value = Number(input.value);
        if (Number.isNaN(value)) throw new Error("Value must be a number.");
      }
      const { error } = await supabase.from("progress_logs").insert({
        athlete_id: athleteId, author_id: userId,
        metric: input.metric.trim(), value, notes: input.notes?.trim() || null,
      });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["progress", athleteId] }),
  });
}

/* ---------------- coach notes ---------------- */

export function useNotes(athleteId: string) {
  return useQuery({
    queryKey: ["notes", athleteId],
    // RLS shapes the result: coaches see all their notes, athletes only shared ones.
    queryFn: async (): Promise<CoachNote[]> => {
      const { data, error } = await supabase
        .from("coach_notes").select("*").eq("athlete_id", athleteId)
        .order("note_date", { ascending: false });
      if (error) throw new Error(error.message);
      return data ?? [];
    },
  });
}

export function useAddNote(athleteId: string, coachId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { body: string; visibility: CoachNote["visibility"] }) => {
      if (!input.body.trim()) throw new Error("Write the note first.");
      const { error } = await supabase.from("coach_notes").insert({
        athlete_id: athleteId, coach_id: coachId,
        body: input.body.trim(), visibility: input.visibility,
      });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notes", athleteId] }),
  });
}
