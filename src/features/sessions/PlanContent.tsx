import type { SessionPlanFull } from "./hooks";

/** Read view of a session plan's ordered drills — coach builder + athlete view. */
export default function PlanContent({ plan, onRemoveItem }: {
  plan: SessionPlanFull;
  onRemoveItem?: (itemId: string) => void;
}) {
  if (plan.items.length === 0) {
    return <p className="muted">No drills in this session yet.</p>;
  }
  const total = plan.items.reduce(
    (sum, i) => sum + (i.duration_min ?? i.drill?.duration_min ?? 0), 0);
  return (
    <>
      {total > 0 && <p className="muted">Total: ~{total} min</p>}
      <ol className="rows plan-list">
        {plan.items.map((item) => (
          <li key={item.id} className="row">
            <span>
              <strong>{item.drill?.title ?? "Drill removed"}</strong>
              {(item.duration_min ?? item.drill?.duration_min) && (
                <span className="muted"> · {item.duration_min ?? item.drill?.duration_min} min</span>
              )}
              {item.drill?.description && <div className="muted">{item.drill.description}</div>}
              {item.coaching_points && <div>→ {item.coaching_points}</div>}
            </span>
            {onRemoveItem && (
              <button className="timestamp" onClick={() => onRemoveItem(item.id)}
                aria-label={`Remove ${item.drill?.title ?? "item"}`}>
                Remove
              </button>
            )}
          </li>
        ))}
      </ol>
    </>
  );
}
