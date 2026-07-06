import { Link, useSearchParams } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider";
import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";
import { formatDate } from "../../lib/format";
import { useEntitlement, useStartCheckout, STRIPE_PRICE_ID, BILLING_CONFIGURED } from "./hooks";

export default function BillingPage() {
  const { profile } = useAuth();
  const [params] = useSearchParams();
  const justReturned = params.get("status");
  const entitlement = useEntitlement(justReturned === "success");
  const checkout = useStartCheckout();
  const backPath = profile?.role === "coach" ? "/coach" : "/athlete";

  return (
    <main className="page">
      <header className="page__head">
        <h1 className="brand">Membership</h1>
        <Link to={backPath}>← Home</Link>
      </header>

      {justReturned === "success" && (
        <Card><p>Payment received — your membership updates within a few seconds. Thank you!</p></Card>
      )}
      {justReturned === "cancelled" && (
        <Card><p className="muted">Checkout cancelled — no charge was made.</p></Card>
      )}

      <Card>
        <h2>Status</h2>
        {entitlement.isLoading && <p className="muted" role="status">Checking…</p>}
        {entitlement.isError && <p className="error" role="alert">{entitlement.error.message}</p>}
        {entitlement.data && (
          entitlement.data.entitled ? (
            <p>
              {entitlement.data.reason === "trial" && "You're on a free trial."}
              {entitlement.data.reason === "subscription" && "Your membership is active."}
              {entitlement.data.reason === "purchase" && "You have lifetime access."}
              {entitlement.data.periodEnd && (
                <span className="muted"> Renews / ends {formatDate(entitlement.data.periodEnd.slice(0, 10))}.</span>
              )}
            </p>
          ) : (
            <>
              <p>No active membership.</p>
              {BILLING_CONFIGURED ? (
                <>
                  {checkout.isError && <p className="error" role="alert">{checkout.error.message}</p>}
                  <Button disabled={checkout.isPending}
                    onClick={() => checkout.mutate({ priceId: STRIPE_PRICE_ID })}>
                    {checkout.isPending ? "Opening checkout…" : "Start membership (free trial included)"}
                  </Button>
                  <p className="muted">Secure payment via Stripe. Cancel any time.</p>
                </>
              ) : (
                <p className="muted">
                  Billing isn't configured yet — set VITE_STRIPE_PRICE_ID and deploy the
                  billing functions (see README).
                </p>
              )}
            </>
          )
        )}
      </Card>
    </main>
  );
}
