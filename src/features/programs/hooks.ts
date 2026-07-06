import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../../lib/supabase";

export const CATEGORIES = ["strength", "mentality", "recovery"] as const;
export type Category = (typeof CATEGORIES)[number];

export interface ProgramItem {
  id: string; sort_order: number; title: string; body: string | null;
  sets: number | null; reps: number | null; duration_min: number | null;
}
export interface ProgramSection {
  id: string; sort_order: number; title: string; items: ProgramItem[];
}
export interface Program {
  id: string; author_id: string; category: Category;
  title: string; description: string | null; published: boolean;
}
export interface ProgramFull extends Program { sections: ProgramSection[]; }

const NESTED = "id, author_id, category, title, description, published, sections:program_sections(id, sort_order, title, items:program_items(id, sort_order, title, body, sets, reps, duration_min))";

function sortNested(p: ProgramFull): ProgramFull {
  p.sections.sort((a, b) => a.sort_order - b.sort_order);
  p.sections.forEach((s) => s.items.sort((a, b) => a.sort_order - b.sort_order));
  return p;
}

/* -------- coach: my programs -------- */

export function useMyPrograms() {
  return useQuery({
    queryKey: ["my-programs"],
    queryFn: async (): Promise<Program[]> => {
      const { data, error } = await supabase
        .from("programs")
        .select("id, author_id, category, title, description, published")
        .order("category").order("created_at", { ascending: false });
      if (error) throw new Error(error.message);
      return data ?? [];
    },
  });
}

export function useCreateProgram(authorId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { title: string; category: Category; description?: string }) => {
      if (!input.title.trim()) throw new Error("Give the program a title.");
      const { data, error } = await supabase.from("programs")
        .insert({ author_id: authorId, title: input.title.trim(),
                  category: input.category, description: input.description?.trim() || null })
        .select("id").single();
      if (error) throw new Error(error.message);
      return data.id as string;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["my-programs"] }),
  });
}

export function useSetPublished(programId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (published: boolean) => {
      const { error } = await supabase.from("programs")
        .update({ published }).eq("id", programId);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["program", programId] });
      qc.invalidateQueries({ queryKey: ["my-programs"] });
    },
  });
}

/* -------- shared: one program with content -------- */

export function useProgram(programId: string) {
  return useQuery({
    queryKey: ["program", programId],
    queryFn: async (): Promise<ProgramFull> => {
      const { data, error } = await supabase
        .from("programs").select(NESTED).eq("id", programId).single();
      if (error) throw new Error("Program not found, or you don't have access to it.");
      return sortNested(data as unknown as ProgramFull);
    },
  });
}

/* -------- coach: builder mutations -------- */

export function useAddSection(programId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { title: string; nextOrder: number }) => {
      if (!input.title.trim()) throw new Error("Give the section a title.");
      const { error } = await supabase.from("program_sections")
        .insert({ program_id: programId, title: input.title.trim(), sort_order: input.nextOrder });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["program", programId] }),
  });
}

export interface NewItem {
  sectionId: string; nextOrder: number; title: string; body?: string;
  sets?: string; reps?: string; durationMin?: string;
}
export function useAddItem(programId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: NewItem) => {
      if (!input.title.trim()) throw new Error("Give the item a title.");
      const num = (v?: string) => {
        if (!v || v.trim() === "") return null;
        const n = Number(v);
        if (Number.isNaN(n) || n <= 0) throw new Error("Sets, reps, and duration must be positive numbers.");
        return n;
      };
      const { error } = await supabase.from("program_items").insert({
        section_id: input.sectionId, sort_order: input.nextOrder,
        title: input.title.trim(), body: input.body?.trim() || null,
        sets: num(input.sets), reps: num(input.reps), duration_min: num(input.durationMin),
      });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["program", programId] }),
  });
}

/* -------- coach: assignments -------- */

export interface Assignment { id: string; athlete_id: string; athlete: { full_name: string } | null; }

export function useAssignments(programId: string) {
  return useQuery({
    queryKey: ["assignments", programId],
    queryFn: async (): Promise<Assignment[]> => {
      const { data, error } = await supabase
        .from("program_assignments")
        .select("id, athlete_id, athlete:profiles!athlete_id(full_name)")
        .eq("program_id", programId);
      if (error) throw new Error(error.message);
      return (data ?? []) as unknown as Assignment[];
    },
  });
}

export function useAssignAthlete(programId: string, coachId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (athleteId: string) => {
      const { error } = await supabase.from("program_assignments")
        .insert({ program_id: programId, athlete_id: athleteId, assigned_by: coachId });
      if (error) {
        throw new Error(error.code === "23505"
          ? "Already assigned to this player." : error.message);
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["assignments", programId] }),
  });
}

export function useUnassign(programId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (assignmentId: string) => {
      const { error } = await supabase.from("program_assignments")
        .delete().eq("id", assignmentId);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["assignments", programId] }),
  });
}

/* -------- athlete: assigned programs + completions -------- */

export function useAssignedPrograms() {
  return useQuery({
    queryKey: ["assigned-programs"],
    queryFn: async (): Promise<Program[]> => {
      const { data, error } = await supabase
        .from("program_assignments")
        .select("program:programs(id, author_id, category, title, description, published)");
      if (error) throw new Error(error.message);
      return (data ?? [])
        .map((r) => (r as unknown as { program: Program }).program)
        .filter((p): p is Program => !!p); // drafts are filtered out by RLS
    },
  });
}

export function useMyCompletions(itemIds: string[]) {
  return useQuery({
    queryKey: ["completions", itemIds.slice().sort().join(",")],
    enabled: itemIds.length > 0,
    queryFn: async (): Promise<Set<string>> => {
      const { data, error } = await supabase
        .from("item_completions").select("item_id").in("item_id", itemIds);
      if (error) throw new Error(error.message);
      return new Set((data ?? []).map((r) => r.item_id as string));
    },
  });
}

export function useToggleCompletion(athleteId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { itemId: string; done: boolean }) => {
      if (input.done) {
        const { error } = await supabase.from("item_completions")
          .insert({ item_id: input.itemId, athlete_id: athleteId });
        if (error && error.code !== "23505") throw new Error(error.message);
      } else {
        const { error } = await supabase.from("item_completions")
          .delete().eq("item_id", input.itemId).eq("athlete_id", athleteId);
        if (error) throw new Error(error.message);
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["completions"] }),
  });
}
