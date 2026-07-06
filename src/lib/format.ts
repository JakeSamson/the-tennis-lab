/** "2026-07-05" -> "5 Jul 2026". Returns a dash for missing dates. */
export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

/** 83.4 -> "1:23" — video comment timestamps. */
export function formatTimestamp(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, "0")}`;
}

/** "match_play" -> "Match play" — display label for shot types. */
export function formatShotType(shotType: string): string {
  const label = shotType.replace(/_/g, " ");
  return label.charAt(0).toUpperCase() + label.slice(1);
}

/** Program category display labels. */
export function formatCategory(category: string): string {
  switch (category) {
    case "strength": return "Strength & Conditioning";
    case "mentality": return "Mentality & Psychology";
    case "recovery": return "Rest & Recovery";
    default: return category;
  }
}

/** ISO timestamp -> "Sat 5 Jul, 14:30" in the device's timezone. */
export function formatDateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-GB", {
    weekday: "short", day: "numeric", month: "short",
    hour: "2-digit", minute: "2-digit",
  });
}

/** ISO timestamp -> "14:30" (used for event end times). */
export function formatTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

/** Event type display labels ("group_session" -> "Group session"). */
export function formatEventType(t: string): string {
  const label = t.replace(/_/g, " ");
  return label.charAt(0).toUpperCase() + label.slice(1);
}

/** "Jane O'Brien" -> "jane-o-brien" — safe filename slug. */
export function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "player";
}
