// Stripe webhook: the ONLY writer of billing state. Signature-verified.
// Deploy:  supabase functions deploy stripe-webhook --no-verify-jwt
// Secrets: STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET (from the Stripe endpoint config)
import Stripe from "npm:stripe@17";
import { createClient } from "npm:@supabase/supabase-js@2";

const cryptoProvider = Stripe.createSubtleCryptoProvider();

Deno.serve(async (req) => {
  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
  if (!stripeKey || !webhookSecret) return new Response("Billing secrets not set", { status: 500 });
  const stripe = new Stripe(stripeKey);

  // Verify this genuinely came from Stripe — reject forgeries.
  const signature = req.headers.get("stripe-signature");
  const body = await req.text();
  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(
      body, signature ?? "", webhookSecret, undefined, cryptoProvider);
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return new Response("Invalid signature", { status: 400 });
  }

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  async function profileIdForCustomer(customerId: string): Promise<string | null> {
    const { data } = await admin.from("billing_customers")
      .select("profile_id").eq("stripe_customer_id", customerId).maybeSingle();
    return data?.profile_id ?? null;
  }

  async function upsertSubscription(sub: Stripe.Subscription) {
    const profileId = await profileIdForCustomer(String(sub.customer));
    if (!profileId) { console.error("No profile for customer", sub.customer); return; }
    // current_period_end moved from Subscription (API <=2024) to items (2025+ "basil");
    // read whichever the account's API version provides.
    const rawPeriodEnd =
      (sub as unknown as { current_period_end?: number }).current_period_end
      ?? (sub.items?.data?.[0] as unknown as { current_period_end?: number })?.current_period_end
      ?? null;
    await admin.from("subscriptions").upsert({
      id: sub.id,
      profile_id: profileId,
      price_id: sub.items.data[0]?.price.id ?? "",
      status: sub.status,
      trial_ends_at: sub.trial_end ? new Date(sub.trial_end * 1000).toISOString() : null,
      current_period_end: rawPeriodEnd ? new Date(rawPeriodEnd * 1000).toISOString() : null,
      updated_at: new Date().toISOString(),
    });
  }

  try {
    switch (event.type) {
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted":
        await upsertSubscription(event.data.object as Stripe.Subscription);
        break;
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        // One-time purchases (mode=payment) are recorded here; subscriptions
        // arrive via their own subscription.* events.
        if (session.mode === "payment" && session.payment_intent) {
          const profileId = session.metadata?.profile_id
            ?? (session.customer ? await profileIdForCustomer(String(session.customer)) : null);
          if (profileId) {
            await admin.from("purchases").upsert({
              id: String(session.payment_intent),
              profile_id: profileId,
              product: session.metadata?.product ?? "one_time",
              amount: session.amount_total ?? 0,
            });
          }
        }
        break;
      }
      default:
        // Unhandled event types are fine — acknowledge them.
        break;
    }
    return new Response(JSON.stringify({ received: true }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Webhook handling error:", e);
    return new Response("Handler error", { status: 500 });
  }
});
