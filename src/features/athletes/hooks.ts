import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../../lib/supabase";

export interface AthleteLink {
  id: string;
  status: string;
  athlete: { id: string; full_name: string } | null;
}
export interface CoachLink {
  id: string;
  coach: { id: string; full_name: string } | null;
}
export interface Invitation {
  id: string;
  email: string;
  token: string;
  status: string;
  created_at: string;
}

/** Coach view: linked athletes. Disambiguated join (two FKs point at profiles). */
export function useAthletes(enabled = true) {
  return useQuery({
    queryKey: ["athletes"],
    enabled,
    queryFn: async (): Promise<AthleteLink[]> => {
      const { data, error } = await supabase
        .from("coach_athletes")
        .select("id, status, athlete:profiles!athlete_profile_id(id, full_name)")
        .order("created_at");
      if (error) throw new Error(error.message);
      return (data ?? []) as unknown as AthleteLink[];
    },
  });
}

/** Athlete view: linked coaches. */
export function useCoaches() {
  return useQuery({
    queryKey: ["coaches"],
    queryFn: async (): Promise<CoachLink[]> => {
      const { data, error } = await supabase
        .from("coach_athletes")
        .select("id, coach:profiles!coach_id(id, full_name)")
        .eq("status", "active")
        .order("created_at");
      if (error) throw new Error(error.message);
      return (data ?? []) as unknown as CoachLink[];
    },
  });
}

export function usePendingInvitations() {
  return useQuery({
    queryKey: ["invitations"],
    queryFn: async (): Promise<Invitation[]> => {
      const { data, error } = await supabase
        .from("invitations")
        .select("id, email, token, status, created_at")
        .eq("status", "pending")
        .order("created_at", { ascending: false });
      if (error) throw new Error(error.message);
      return data ?? [];
    },
  });
}

export function useCreateInvitation(coachId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (email: string): Promise<Invitation> => {
      const cleaned = email.trim().toLowerCase();
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(cleaned)) {
        throw new Error("Enter a valid email address.");
      }
      const { data, error } = await supabase
        .from("invitations")
        .insert({ coach_id: coachId, email: cleaned, role: "athlete" })
        .select("id, email, token, status, created_at")
        .single();
      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["invitations"] }),
  });
}

export function useRevokeInvitation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("invitations").update({ status: "revoked" }).eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["invitations"] }),
  });
}

export function useRemoveAthlete() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (linkId: string) => {
      const { error } = await supabase.from("coach_athletes").delete().eq("id", linkId);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["athletes"] }),
  });
}

export function useClaimInvitation() {
  return useMutation({
    mutationFn: async (token: string) => {
      const { data, error } = await supabase.rpc("claim_invitation", { invite_token: token });
      if (error) throw new Error(error.message);
      return data as { coach_id: string };
    },
  });
}
