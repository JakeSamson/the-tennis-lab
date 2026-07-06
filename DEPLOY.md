# The Tennis Lab — Go-Live Guide

Follow in order. Total time: roughly an hour, most of it in dashboards.
Stack: Supabase (already your backend host) + Vercel or Netlify (frontend) + Stripe.

---

## 1. Production Supabase project (~15 min)

1. Create a **new** project at supabase.com for production (keep your dev project separate).
2. SQL editor → run the migrations **in order**:
   `00001_identity.sql` → `00002_invitation_claim.sql` → `00003_development.sql` →
   `00004_video.sql` → `00005_biomech.sql` → `00006_programs.sql` →
   `00007_schedule.sql` → `00008_drills_plans.sql` → `00009_billing.sql`
3. Install the Supabase CLI locally if you haven't (`npm i -g supabase`), then:
   ```
   supabase login
   supabase link --project-ref <your-prod-project-ref>
   supabase functions deploy generate-plan
   supabase functions deploy create-checkout
   supabase functions deploy stripe-webhook --no-verify-jwt
   supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
   ```
   (Stripe secrets come in step 4.)
4. **Auth settings** (Dashboard → Authentication):
   - URL Configuration → Site URL: your production domain (set after step 2 if you
     don't have it yet — email links break if this is wrong).
   - Redirect URLs: add your domain, e.g. `https://thetennislab.app/**`
   - Email confirmation: ON for production (it was likely off in dev).

## 2. Deploy the frontend (~15 min)

1. Push the project to a GitHub repository.
2. Import it into **Vercel** (or Netlify — both configs are already in the project:
   `vercel.json` / `public/_redirects` handle deep-link refreshes).
3. Framework preset: Vite. Build command `npm run build`, output `dist` (auto-detected).
4. Environment variables:
   ```
   VITE_SUPABASE_URL=        (prod project URL)
   VITE_SUPABASE_ANON_KEY=   (prod anon key)
   VITE_STRIPE_PRICE_ID=     (from step 4 — can be added later)
   ```
5. Deploy → note your URL → put it into Supabase Auth Site URL (step 1.4).
6. Custom domain (optional now, recommended before inviting users): add in
   Vercel/Netlify → update Supabase Site URL + Redirect URLs to match.

## 3. Smoke test in production (~15 min) — do this BEFORE Stripe

With two browsers / one incognito:
- [ ] Sign up as coach → confirm email → land on coach dashboard
- [ ] Invite a player (real second email) → open claim link → sign up → linked both ways
- [ ] Player: add a goal, log progress · Coach: shared note visible to player, private note NOT
- [ ] Upload a short clip → coach comments at a timestamp → player taps it, video seeks
- [ ] Coach: add 5–6 tagged drills → "Generate with AI" → plan appears for review
- [ ] Assign the plan to the player → visible in their Sessions
- [ ] Download a workbook PDF → open it → confirm NO private notes inside
- [ ] Refresh the browser on a deep page (e.g. /coach/plans) → no 404

## 4. Stripe live mode (~15 min)

1. stripe.com → activate your account → **live mode**.
2. Product catalogue → create Product "The Tennis Lab Membership" → recurring Price
   (your price, monthly) → **add trial days on the Price** (e.g. 14).
   Copy the Price ID → set `VITE_STRIPE_PRICE_ID` in Vercel → redeploy.
3. Secrets:
   ```
   supabase secrets set STRIPE_SECRET_KEY=sk_live_...
   ```
4. Developers → Webhooks → Add endpoint:
   `https://<prod-project-ref>.functions.supabase.co/stripe-webhook`
   Events: `customer.subscription.created`, `customer.subscription.updated`,
   `customer.subscription.deleted`, `checkout.session.completed`
   Copy the signing secret →
   ```
   supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...
   ```
5. Test the money path with Stripe **test mode** first if you prefer (test keys + test
   price + card 4242 4242 4242 4242), then repeat with live keys.
6. Verify: subscribe → return to /billing → status flips to "free trial" within seconds.

## 5. Before inviting real users

- [ ] Review the biomechanics library wording (edit rows in Supabase — you're the pro)
- [ ] Seed your real drill library (the AI is only as good as your drills)
- [ ] Supabase → Storage: confirm the videos bucket shows the 100MB limit
- [ ] Backups: Supabase Pro plan enables daily backups — recommended once real
      athlete data exists (this is people's training history)
- [ ] Privacy: you're storing minors' data (names, videos). At minimum publish a
      simple privacy policy and get parental consent in your onboarding for U18s —
      worth a proper look at UK GDPR/ICO guidance for children's data. I'm not a
      lawyer, so treat this as a flag to address, not legal advice.

## Known v1 limits (logged in PROJECT.md)
No AI rate limiting yet · soft paywall (banner, not a block) · no recurring schedule
events · no video transcoding (odd phone codecs may not play) · invite redirect
doesn't survive the email-confirmation round-trip (player re-opens the link once).

When something breaks in production: root cause → three fixes → safest one. 🎾
