import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../../lib/supabase";
import type { Drill } from "../drills/hooks";

export interface PlanItem {
  id: string; sort_order: number; duration_min: number | null;
  coaching_points: string | null; drill: Drill | null;
}
export interface SessionPlan {
  id: string; coach_id: string; athlete_id: string | null;
  title: string; plan_date: string; objectives: string | null; ai_generated: boolean;
  athlete: { full_name: string } | null;
}
export interface SessionPlanFull extends SessionPlan { items: PlanItem[]; }

const PLAN_COLS = "id, coach_id, athlete_id, title, plan_date, objectives, ai_generated, athlete:profiles!athlete_id(full_name)";

export function usePlans() {
  return useQuery({
    queryKey: ["plans"],
    queryFn: async (): Promise<SessionPlan[]> => {
      const { data, error } = await supabase
        .from("session_plans").select(PLAN_COLS)
        .order("plan_date", { ascending: false }).limit(50);
      if (error) throw new Error(error.message);
      return (data ?? []) as unknown as SessionPlan[];
    },
  });
}

export function usePlan(planId: string) {
  return useQuery({
    queryKey: ["plan", planId],
    queryFn: async (): Promise<SessionPlanFull> => {
      const { data, error } = await supabase
        .from("session_plans")
        .select(`${PLAN_COLS}, items:session_plan_items(id, sort_order, duration_min, coaching_points, drill:drills(*))`)
        .eq("id", planId).single();
      if (error) throw new Error("Plan not found, or you don't have access to it.");
      const plan = data as unknown as SessionPlanFull;
      plan.items.sort((a, b) => a.sort_order - b.sort_order);
      return plan;
    },
  });
}

export function useCreatePlan(coachId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { title: string; planDate: string; athleteId: string | null; objectives?: string }) => {
      if (!input.title.trim()) throw new Error("Give the session a title.");
      const { data, error } = await supabase.from("session_plans")
        .insert({ coach_id: coachId, title: input.title.trim(),
                  plan_date: input.planDate || new Date().toISOString().slice(0, 10),
                  athlete_id: input.athleteId, objectives: input.objectives?.trim() || null })
        .select("id").single();
      if (error) throw new Error(error.message);
      return data.id as string;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["plans"] }),
  });
}

export function useAddPlanItem(planId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { drillId: string; nextOrder: number; durationMin?: string; coachingPoints?: string }) => {
      if (!input.drillId) throw new Error("Choose a drill to add.");
      let duration: number | null = null;
      if (input.durationMin && input.durationMin.trim() !== "") {
        duration = Number(input.durationMin);
        if (Number.isNaN(duration) || duration <= 0) throw new Error("Duration must be a positive number.");
      }
      const { error } = await supabase.from("session_plan_items").insert({
        plan_id: planId, drill_id: input.drillId, sort_order: input.nextOrder,
        duration_min: duration, coaching_points: input.coachingPoints?.trim() || null,
      });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["plan", planId] }),
  });
}

export function useDeletePlanItem(planId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (itemId: string) => {
      const { error } = await supabase.from("session_plan_items").delete().eq("id", itemId);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["plan", planId] }),
  });
}

/** Athlete: plans booked for me. Same table; RLS scopes it. */
export function useMyPlans() {
  return useQuery({
    queryKey: ["my-plans"],
    queryFn: async (): Promise<SessionPlan[]> => {
      const { data, error } = await supabase
        .from("session_plans").select(PLAN_COLS)
        .order("plan_date", { ascending: false }).limit(50);
      if (error) throw new Error(error.message);
      return (data ?? []) as unknown as SessionPlan[];
    },
  });
}

/** Calls the generate-plan edge function; returns the new plan's id for review. */
export function useGeneratePlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { athleteId: string | null; focus: string; durationMin: string }) => {
      const { data, error } = await supabase.functions.invoke("generate-plan", {
        body: {
          athleteId: input.athleteId,
          focus: input.focus.trim() || undefined,
          durationMin: input.durationMin,
        },
      });
      if (error) {
        // Surface the function's specific message when it sent one.
        const ctx = (error as { context?: Response }).context;
        if (ctx) {
          const detail = await ctx.json().catch(() => null);
          if (detail?.error) throw new Error(detail.error);
        }
        throw new Error("Generation failed — check the edge function is deployed.");
      }
      if (data?.error) throw new Error(data.error);
      if (!data?.planId) throw new Error("Generation returned no plan.");
      return data.planId as string;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["plans"] }),
  });
}
