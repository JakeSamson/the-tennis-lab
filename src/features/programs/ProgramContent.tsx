import type { ProgramFull, ProgramItem } from "./hooks";

/** Renders sets/reps/duration compactly, e.g. "3 × 8 · 5 min". */
export function prescription(item: ProgramItem): string {
  const parts: string[] = [];
  if (item.sets && item.reps) parts.push(`${item.sets} × ${item.reps}`);
  else if (item.sets) parts.push(`${item.sets} sets`);
  else if (item.reps) parts.push(`${item.reps} reps`);
  if (item.duration_min) parts.push(`${item.duration_min} min`);
  return parts.join(" · ");
}

interface Props {
  program: ProgramFull;
  /** When provided, items render with completion checkboxes (athlete view). */
  completion?: {
    done: Set<string>;
    onToggle: (itemId: string, done: boolean) => void;
    busy: boolean;
  };
}

/** Shared read view of a program's sections and items — coach builder preview + athlete view. */
export default function ProgramContent({ program, completion }: Props) {
  if (program.sections.length === 0) {
    return <p className="muted">No content yet{completion ? "." : " — add a section below."}</p>;
  }
  return (
    <>
      {program.sections.map((section) => (
        <div key={section.id} className="card">
          <h2>{section.title}</h2>
          {section.items.length === 0 && <p className="muted">No items in this section yet.</p>}
          <ul className="rows">
            {section.items.map((item) => (
              <li key={item.id} className="row">
                <span className={completion?.done.has(item.id) ? "done" : undefined}>
                  {completion && (
                    <input type="checkbox" className="tick"
                      checked={completion.done.has(item.id)}
                      disabled={completion.busy}
                      onChange={(e) => completion.onToggle(item.id, e.target.checked)}
                      aria-label={`Mark "${item.title}" ${completion.done.has(item.id) ? "incomplete" : "complete"}`} />
                  )}
                  <strong>{item.title}</strong>
                  {prescription(item) && <span className="muted"> · {prescription(item)}</span>}
                  {item.body && <div className="muted">{item.body}</div>}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </>
  );
}
