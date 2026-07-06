import { useQuery } from "@tanstack/react-query";
import { supabase } from "../../lib/supabase";

export interface BiomechPhase {
  id: string; sort_order: number; name: string; teaching_points: string;
}
export interface BiomechShot {
  id: string; shot_type: string; title: string; overview: string;
  phases: BiomechPhase[];
}

/** Reference content changes rarely — cache aggressively. */
const STALE = 60 * 60 * 1000;

export function useBiomechLibrary() {
  return useQuery({
    queryKey: ["biomech-library"],
    staleTime: STALE,
    queryFn: async (): Promise<BiomechShot[]> => {
      const { data, error } = await supabase
        .from("biomech_shots")
        .select("id, shot_type, title, overview, phases:biomech_phases(id, sort_order, name, teaching_points)")
        .order("shot_type");
      if (error) throw new Error(error.message);
      const shots = (data ?? []) as unknown as BiomechShot[];
      // Order phases in-memory; nested order() support varies.
      shots.forEach((s) => s.phases.sort((a, b) => a.sort_order - b.sort_order));
      return shots;
    },
  });
}

/** Phases for one shot type — used by the video page's phase tagger. */
export function useShotPhases(shotType: string | undefined) {
  const lib = useBiomechLibrary();
  const shot = lib.data?.find((s) => s.shot_type === shotType);
  return { ...lib, shot, phases: shot?.phases ?? [] };
}
