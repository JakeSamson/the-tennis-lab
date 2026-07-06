import { useMutation, useQuery } from "@tanstack/react-query";
import { supabase } from "../../lib/supabase";

export interface Entitlement {
  entitled: boolean;
  reason: "subscription" | "trial" | "purchase" | "none";
  periodEnd: string | null;
}

/** One question: does this user currently have access? (sub, trial, or one-time purchase) */
export function useEntitlement(pollWhilePending = false) {
  return useQuery({
    queryKey: ["entitlement"],
    staleTime: 5 * 60 * 1000,
    // After checkout, the webhook lands within seconds — poll until it does.
    refetchInterval: (query) =>
      pollWhilePending && !query.state.data?.entitled ? 3000 : false,
    queryFn: async (): Promise<Entitlement> => {
      const [subsRes, purchRes] = await Promise.all([
        supabase.from("subscriptions").select("status, current_period_end, trial_ends_at"),
        supabase.from("purchases").select("id").limit(1),
      ]);
      if (subsRes.error) throw new Error(subsRes.error.message);
      if (purchRes.error) throw new Error(purchRes.error.message);

      const live = (subsRes.data ?? []).find(
        (s) => (s.status === "active" || s.status === "trialing")
          && (!s.current_period_end || new Date(s.current_period_end) > new Date()));
      if (live) {
        return {
          entitled: true,
          reason: live.status === "trialing" ? "trial" : "subscription",
          periodEnd: live.current_period_end,
        };
      }
      if ((purchRes.data ?? []).length > 0) {
        return { entitled: true, reason: "purchase", periodEnd: null };
      }
      return { entitled: false, reason: "none", periodEnd: null };
    },
  });
}

/** Starts Stripe Checkout and redirects to Stripe's hosted payment page. */
export function useStartCheckout() {
  return useMutation({
    mutationFn: async (input: { priceId: string; mode?: "subscription" | "payment" }) => {
      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: { priceId: input.priceId, mode: input.mode ?? "subscription" },
      });
      if (error) {
        const ctx = (error as { context?: Response }).context;
        if (ctx) {
          const detail = await ctx.json().catch(() => null);
          if (detail?.error) throw new Error(detail.error);
        }
        throw new Error("Checkout failed — is the create-checkout function deployed?");
      }
      if (data?.error) throw new Error(data.error);
      if (!data?.url) throw new Error("Checkout returned no URL.");
      window.location.assign(data.url as string);
    },
  });
}

/** Price configured in Stripe; set VITE_STRIPE_PRICE_ID in .env.local. */
export const STRIPE_PRICE_ID: string = import.meta.env.VITE_STRIPE_PRICE_ID ?? "";
export const BILLING_CONFIGURED = STRIPE_PRICE_ID !== "";
