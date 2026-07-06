import { useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider";
import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";
import { formatTimestamp } from "../../lib/format";
import { useVideo, useSignedVideoUrl, useComments, useAddComment } from "./hooks";
import { useShotPhases } from "../biomech/hooks";
import { formatShotType } from "../../lib/format";

/** Shared player/coach page: watch, comment at the current time, tap to seek. */
export default function VideoPage() {
  const { videoId } = useParams<{ videoId: string }>();
  const { profile } = useAuth();
  const video = useVideo(videoId!);
  const url = useSignedVideoUrl(video.data?.storage_path);
  const comments = useComments(videoId!);
  const addComment = useAddComment(videoId!, profile?.id ?? "");

  const playerRef = useRef<HTMLVideoElement>(null);
  const [body, setBody] = useState("");
  const [phaseId, setPhaseId] = useState("");
  const { phases } = useShotPhases(video.data?.shot_type);

  const backPath = profile?.role === "coach"
    ? (video.data ? `/coach/athletes/${video.data.athlete_id}` : "/coach")
    : "/athlete";

  function commentAtCurrentTime() {
    const t = playerRef.current?.currentTime ?? 0;
    addComment.mutate({ body, timestampSec: t, biomechPhaseId: phaseId || undefined },
      { onSuccess: () => { setBody(""); setPhaseId(""); } });
  }

  function seekTo(sec: number) {
    if (playerRef.current) {
      playerRef.current.currentTime = sec;
      playerRef.current.play().catch(() => {/* autoplay may be blocked; user can press play */});
    }
  }

  return (
    <main className="page">
      <header className="page__head">
        <h1 className="brand">{video.data?.title ?? "Video"}</h1>
        <Link to={backPath}>← Back</Link>
      </header>

      {video.data && (
        <p className="muted">
          <Link to="/biomech">View the {formatShotType(video.data.shot_type).toLowerCase()} technique breakdown →</Link>
        </p>
      )}
      {video.isError && <Card><p className="error" role="alert">{video.error.message}</p></Card>}
      {url.isError && <Card><p className="error" role="alert">{url.error.message}</p></Card>}

      {url.data && (
        <Card>
          {/* Captions aren't applicable to raw training footage; comments below serve as analysis */}
          <video ref={playerRef} className="player" src={url.data} controls playsInline preload="metadata" />
        </Card>
      )}

      <Card>
        <h2>Analysis</h2>
        <div className="field">
          <label htmlFor="comment-body">Comment at the current video time</label>
          <textarea id="comment-body" rows={2} value={body}
            placeholder="e.g. Racquet drop is late here — let the elbow lead"
            onChange={(e) => setBody(e.target.value)} />
        </div>
        {phases.length > 0 && (
          <div className="field">
            <label htmlFor="comment-phase">Technique phase (optional)</label>
            <select id="comment-phase" value={phaseId} onChange={(e) => setPhaseId(e.target.value)}>
              <option value="">— none —</option>
              {phases.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
        )}
        {addComment.isError && <p className="error" role="alert">{addComment.error.message}</p>}
        <Button onClick={commentAtCurrentTime} disabled={addComment.isPending}>
          {addComment.isPending ? "Saving…" : "Add comment at current time"}
        </Button>

        {comments.isLoading && <p className="muted" role="status">Loading…</p>}
        {comments.isError && <p className="error" role="alert">{comments.error.message}</p>}
        {comments.data?.length === 0 && (
          <p className="muted">No analysis yet — pause the video at a key moment and comment.</p>
        )}
        <ul className="rows">
          {comments.data?.map((c) => (
            <li key={c.id} className="row">
              <span>
                <button className="timestamp" onClick={() => seekTo(c.timestamp_sec)}
                  aria-label={`Jump to ${formatTimestamp(c.timestamp_sec)}`}>
                  {formatTimestamp(c.timestamp_sec)}
                </button>{" "}
                {c.phase && <span className="badge badge--yes">{c.phase.name}</span>} {c.body}
                <div className="muted">{c.author?.full_name ?? "Unknown"}</div>
              </span>
            </li>
          ))}
        </ul>
      </Card>
    </main>
  );
}
