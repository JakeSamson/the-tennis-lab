import { Link } from "react-router-dom";
import { useEntitlement, BILLING_CONFIGURED } from "./hooks";

/**
 * Soft gate (v1 decision): nudges non-members toward /billing without blocking.
 * Renders nothing while loading, when entitled, or before billing is configured.
 * Flipping to a hard gate later = wrap routes with this same entitlement check.
 */
export default function BillingBanner() {
  const entitlement = useEntitlement();
  if (!BILLING_CONFIGURED || entitlement.isLoading || entitlement.isError) return null;
  if (entitlement.data?.entitled) return null;
  return (
    <div className="banner" role="status">
      Your free trial hasn't started — <Link to="/billing">activate your membership</Link>.
    </div>
  );
}
