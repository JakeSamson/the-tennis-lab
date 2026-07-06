import { Link, useParams } from "react-router-dom";
import Card from "../../components/ui/Card";
import { formatDate } from "../../lib/format";
import { useMyPlans, usePlan } from "./hooks";
import PlanContent from "./PlanContent";

export function AthletePlansPage() {
  const plans = useMyPlans();
  return (
    <main className="page">
      <header className="page__head">
        <h1 className="brand">My sessions</h1>
        <Link to="/athlete">← Home</Link>
      </header>
      {plans.isLoading && <p className="muted" role="status">Loading…</p>}
      {plans.isError && <Card><p className="error" role="alert">{plans.error.message}</p></Card>}
      {plans.data?.length === 0 && (
        <Card><p className="muted">No session plans shared with you yet.</p></Card>
      )}
      {plans.data && plans.data.length > 0 && (
        <Card>
          <ul className="rows">
            {plans.data.map((p) => (
              <li key={p.id} className="row">
                <span>
                  <Link to={`/athlete/sessions/${p.id}`}>{p.title}</Link>
                  <div className="muted">{formatDate(p.plan_date)}</div>
                </span>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </main>
  );
}

export function AthletePlanPage() {
  const { planId } = useParams<{ planId: string }>();
  const plan = usePlan(planId!);
  return (
    <main className="page">
      <header className="page__head">
        <h1 className="brand">{plan.data?.title ?? "Session"}</h1>
        <Link to="/athlete/sessions">← My sessions</Link>
      </header>
      {plan.isError && <Card><p className="error" role="alert">{plan.error.message}</p></Card>}
      {plan.data && (
        <Card>
          <p className="muted">{formatDate(plan.data.plan_date)}</p>
          {plan.data.objectives && <p>{plan.data.objectives}</p>}
          <PlanContent plan={plan.data} />
        </Card>
      )}
    </main>
  );
}
