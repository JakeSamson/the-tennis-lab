import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../../lib/supabase";

export const SHOT_TYPES = [
  "serve","forehand","backhand","volley","smash","return","movement","match_play","other",
] as const;
export type ShotType = (typeof SHOT_TYPES)[number];

export interface Video {
  id: string; athlete_id: string; uploader_id: string;
  storage_path: string; title: string; shot_type: ShotType; recorded_at: string;
}
export interface VideoComment {
  id: string; video_id: string; author_id: string;
  timestamp_sec: number; body: string;
  author: { full_name: string } | null;
  phase: { name: string } | null;
}

const MAX_BYTES = 100 * 1024 * 1024; // mirrors the bucket cap
const ALLOWED = ["video/mp4", "video/quicktime", "video/webm"];

export function useVideos(athleteId: string) {
  return useQuery({
    queryKey: ["videos", athleteId],
    queryFn: async (): Promise<Video[]> => {
      const { data, error } = await supabase
        .from("videos").select("*").eq("athlete_id", athleteId)
        .order("created_at", { ascending: false });
      if (error) throw new Error(error.message);
      return data ?? [];
    },
  });
}

export function useVideo(videoId: string) {
  return useQuery({
    queryKey: ["video", videoId],
    queryFn: async (): Promise<Video> => {
      const { data, error } = await supabase
        .from("videos").select("*").eq("id", videoId).single();
      if (error) throw new Error("Video not found, or you don't have access to it.");
      return data;
    },
  });
}

/** Private bucket → playback via short-lived signed URL, auto-refreshed by staleTime. */
export function useSignedVideoUrl(storagePath: string | undefined) {
  return useQuery({
    queryKey: ["video-url", storagePath],
    enabled: !!storagePath,
    staleTime: 45 * 60 * 1000, // refresh before the 60-minute expiry
    refetchOnWindowFocus: false, // a new URL would change the src and restart playback
    queryFn: async (): Promise<string> => {
      const { data, error } = await supabase.storage
        .from("videos").createSignedUrl(storagePath!, 60 * 60);
      if (error) throw new Error(error.message);
      return data.signedUrl;
    },
  });
}

export function useUploadVideo(athleteId: string, uploaderId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { file: File; title: string; shotType: ShotType }) => {
      if (!input.title.trim()) throw new Error("Give the video a title.");
      if (!ALLOWED.includes(input.file.type)) {
        throw new Error("Use an mp4, mov, or webm video file.");
      }
      if (input.file.size > MAX_BYTES) {
        throw new Error("Videos are capped at 100MB — trim the clip and try again.");
      }
      const ext = input.file.name.split(".").pop() || "mp4";
      const path = `${athleteId}/${crypto.randomUUID()}.${ext}`;

      const { error: upErr } = await supabase.storage
        .from("videos").upload(path, input.file, { contentType: input.file.type });
      if (upErr) throw new Error(upErr.message);

      const { error: rowErr } = await supabase.from("videos").insert({
        athlete_id: athleteId, uploader_id: uploaderId,
        storage_path: path, title: input.title.trim(), shot_type: input.shotType,
      });
      if (rowErr) {
        // Don't strand an orphaned file if the metadata insert fails.
        await supabase.storage.from("videos").remove([path]);
        throw new Error(rowErr.message);
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["videos", athleteId] }),
  });
}

export function useDeleteVideo(athleteId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (video: Video) => {
      // Storage first; if that fails we keep the row so the file isn't orphaned.
      const { error: sErr } = await supabase.storage.from("videos").remove([video.storage_path]);
      if (sErr) throw new Error(sErr.message);
      const { error } = await supabase.from("videos").delete().eq("id", video.id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["videos", athleteId] }),
  });
}

export function useComments(videoId: string) {
  return useQuery({
    queryKey: ["video-comments", videoId],
    queryFn: async (): Promise<VideoComment[]> => {
      const { data, error } = await supabase
        .from("video_comments")
        .select("id, video_id, author_id, timestamp_sec, body, author:profiles!author_id(full_name), phase:biomech_phases(name)")
        .eq("video_id", videoId)
        .order("timestamp_sec");
      if (error) throw new Error(error.message);
      return (data ?? []) as unknown as VideoComment[];
    },
  });
}

export function useAddComment(videoId: string, authorId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { body: string; timestampSec: number; biomechPhaseId?: string }) => {
      if (!input.body.trim()) throw new Error("Write the comment first.");
      const { error } = await supabase.from("video_comments").insert({
        video_id: videoId, author_id: authorId,
        body: input.body.trim(),
        timestamp_sec: Math.max(0, Math.round(input.timestampSec * 10) / 10),
        biomech_phase_id: input.biomechPhaseId ?? null,
      });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["video-comments", videoId] }),
  });
}
