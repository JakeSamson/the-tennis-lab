import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../../lib/supabase";

export const DIFFICULTIES = ["beginner", "intermediate", "advanced"] as const;
export type Difficulty = (typeof DIFFICULTIES)[number];

export interface Drill {
  id: string; coach_id: string; title: string; description: string | null;
  skill_tags: string[]; difficulty: Difficulty;
  duration_min: number | null; equipment: string | null;
}

export function useDrills(enabled = true) {
  return useQuery({
    queryKey: ["drills"],
    enabled,
    queryFn: async (): Promise<Drill[]> => {
      const { data, error } = await supabase
        .from("drills").select("*").order("created_at", { ascending: false });
      if (error) throw new Error(error.message);
      return data ?? [];
    },
  });
}

export interface NewDrill {
  title: string; description?: string; tagsCsv?: string;
  difficulty: Difficulty; durationMin?: string; equipment?: string;
}

/** "serve, footwork , Serve" -> ["serve","footwork"] (trimmed, lowercased, deduped). */
export function parseTags(csv: string | undefined): string[] {
  if (!csv) return [];
  return [...new Set(csv.split(",").map((t) => t.trim().toLowerCase()).filter(Boolean))];
}

export function useCreateDrill(coachId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: NewDrill) => {
      if (!input.title.trim()) throw new Error("Give the drill a title.");
      let duration: number | null = null;
      if (input.durationMin && input.durationMin.trim() !== "") {
        duration = Number(input.durationMin);
        if (Number.isNaN(duration) || duration <= 0) throw new Error("Duration must be a positive number.");
      }
      const { error } = await supabase.from("drills").insert({
        coach_id: coachId, title: input.title.trim(),
        description: input.description?.trim() || null,
        skill_tags: parseTags(input.tagsCsv),
        difficulty: input.difficulty,
        duration_min: duration,
        equipment: input.equipment?.trim() || null,
      });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["drills"] }),
  });
}

export function useDeleteDrill() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("drills").delete().eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["drills"] }),
  });
}
