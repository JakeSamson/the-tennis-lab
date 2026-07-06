// Creates a Stripe Checkout session for the signed-in user.
// Deploy:  supabase functions deploy create-checkout
// Secrets: supabase secrets set STRIPE_SECRET_KEY=sk_...
import Stripe from "npm:stripe@17";
import { createClient } from "npm:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) return json({ error: "STRIPE_SECRET_KEY is not set." }, 500);
    const stripe = new Stripe(stripeKey);

    // Identify the caller via their JWT.
    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } } });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return json({ error: "Not signed in." }, 401);

    const { priceId, mode } = await req.json().catch(() => ({}));
    if (!priceId) return json({ error: "priceId is required." }, 400);
    const checkoutMode = mode === "payment" ? "payment" : "subscription";

    // Billing tables are service-role-only by design.
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // Reuse or create the Stripe customer for this profile.
    let customerId: string;
    const { data: existing } = await admin.from("billing_customers")
      .select("stripe_customer_id").eq("profile_id", user.id).maybeSingle();
    if (existing) {
      customerId = existing.stripe_customer_id;
    } else {
      const customer = await stripe.customers.create({
        email: user.email ?? undefined,
        metadata: { profile_id: user.id },
      });
      customerId = customer.id;
      const { error } = await admin.from("billing_customers")
        .insert({ profile_id: user.id, stripe_customer_id: customerId });
      if (error) return json({ error: error.message }, 500);
    }

    const origin = req.headers.get("origin") ?? "http://localhost:5173";
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: checkoutMode,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${origin}/billing?status=success`,
      cancel_url: `${origin}/billing?status=cancelled`,
      metadata: { profile_id: user.id },
      ...(checkoutMode === "payment" ? { payment_intent_data: { metadata: { profile_id: user.id } } } : {}),
    });
    return json({ url: session.url });
  } catch (e) {
    console.error(e);
    return json({ error: "Couldn't start checkout." }, 500);
  }
});
