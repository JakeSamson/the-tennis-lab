import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";
import { formatDate, formatShotType } from "../../lib/format";
import { useVideos, useUploadVideo, useDeleteVideo, SHOT_TYPES, type ShotType } from "./hooks";

/** Shared by the player home page and the coach's athlete detail page. */
export default function VideoLibraryCard({ athleteId, userId }: { athleteId: string; userId: string }) {
  const videos = useVideos(athleteId);
  const upload = useUploadVideo(athleteId, userId);
  const del = useDeleteVideo(athleteId);
  const fileRef = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState("");
  const [shotType, setShotType] = useState<ShotType>("serve");
  const [localError, setLocalError] = useState<string | null>(null);

  function handleUpload() {
    const file = fileRef.current?.files?.[0];
    if (!file) { setLocalError("Choose a video file first."); return; }
    setLocalError(null);
    upload.mutate({ file, title, shotType }, {
      onSuccess: () => {
        setTitle("");
        if (fileRef.current) fileRef.current.value = "";
      },
    });
  }

  return (
    <Card>
      <h2>Video</h2>
      <p className="muted">Short clips work best — one serve, one rally. 100MB max (mp4, mov, webm).</p>
      <div className="field">
        <label htmlFor={`vid-file-${athleteId}`}>Video file</label>
        <input id={`vid-file-${athleteId}`} ref={fileRef} type="file"
          accept="video/mp4,video/quicktime,video/webm" />
      </div>
      <div className="field">
        <label htmlFor={`vid-title-${athleteId}`}>Title</label>
        <input id={`vid-title-${athleteId}`} value={title} placeholder="e.g. Second serve, side view"
          onChange={(e) => setTitle(e.target.value)} />
      </div>
      <div className="field">
        <label htmlFor={`vid-shot-${athleteId}`}>Shot type</label>
        <select id={`vid-shot-${athleteId}`} value={shotType}
          onChange={(e) => setShotType(e.target.value as ShotType)}>
          {SHOT_TYPES.map((s) => (
            <option key={s} value={s}>{formatShotType(s)}</option>
          ))}
        </select>
      </div>
      {localError && <p className="error" role="alert">{localError}</p>}
      {upload.isError && <p className="error" role="alert">{upload.error.message}</p>}
      <Button onClick={handleUpload} disabled={upload.isPending}>
        {upload.isPending ? "Uploading… (keep this page open)" : "Upload video"}
      </Button>

      {videos.isLoading && <p className="muted" role="status">Loading…</p>}
      {videos.isError && <p className="error" role="alert">{videos.error.message}</p>}
      {videos.data?.length === 0 && <p className="muted">No videos yet.</p>}
      <ul className="rows">
        {videos.data?.map((v) => (
          <li key={v.id} className="row">
            <span>
              <Link to={`/videos/${v.id}`}>{v.title}</Link>
              <div className="muted">{formatShotType(v.shot_type)} · {formatDate(v.recorded_at)}</div>
            </span>
            <Button variant="danger" disabled={del.isPending}
              onClick={() => {
                if (window.confirm("Delete this video and its comments? This can't be undone.")) {
                  del.mutate(v);
                }
              }}>
              Delete
            </Button>
          </li>
        ))}
      </ul>
    </Card>
  );
}
