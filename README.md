# The Tennis Lab — Athlete Development Platform (Phase 0)


## What's in Phase 0
- React + TypeScript + Vite scaffold
- Three-role auth (coach / player / parent) with role selected at signup
- Role-based route guards and per-role dashboard placeholders
- SQL migration: identity tables with full RLS + anti-role-escalation trigger

## Setup
1. **Supabase**: create a project at supabase.com, open the SQL editor, and run
   `supabase/migrations/00001_identity.sql`, then `00002_invitation_claim.sql`, `00003_development.sql`, `00004_video.sql`, `00005_biomech.sql`, `00006_programs.sql`, `00007_schedule.sql`, `00008_drills_plans.sql`, `00009_billing.sql` (in order).
2. **Env**: copy `.env.example` to `.env.local`, fill in your Project URL and anon key
   (Dashboard → Settings → API).
3. **Run**: `npm install` then `npm run dev`.
4. **Test**: `npm run test`.

## Invite flow (Phase 1)
1. Coach signs in → "Invite a player" with the player's email → Copy link.
2. Coach shares the link (message/email). Player opens it, creates a player account
   with **the same email**, and is linked automatically.
3. Player appears under "My players"; player sees the coach under "My coaches".

## Phase 2: goals, progress, notes
- Players and coaches can both set goals and log progress for the player.
- Coaches write session notes with a visibility toggle: shared notes appear on the
  player's home; private notes are enforced private by RLS, not just hidden in the UI.
- Coach → tap a player's name to open their detail page.

## Phase 3: video analysis
- Player or coach uploads a clip (100MB cap; mp4/mov/webm) from the Video card.
- On the video page, pause at a key moment and "Add comment at current time".
- Tap any comment's timestamp to jump the video to that moment.
- Files live in a private bucket; playback uses signed URLs that expire hourly.

## Phase 4: biomechanics library
- "Technique library" (top of both dashboards): every stroke broken into phases with
  teaching points. Seeded by migration 00005 — edit rows in Supabase to refine wording.
- On any video, comments can be tagged to a technique phase for that shot type, and the
  page links to the full breakdown.

## Phase 5: programs (S&C / mentality / recovery)
- Coach → "Programs": create a program, add sections and items (sets/reps/minutes
  optional), assign linked players, then Publish. Drafts are invisible to players.
- Player → "Programs": assigned programs grouped by category; tick items complete.
  Coaches can see completions.

## Phase 6: schedule
- Coach → "Schedule": add lessons, matches, fitness sessions, tournaments — for one
  player or as a group event (visible to all linked players). Agenda-style list.
- Players see their upcoming events plus group events from their coaches.
- Times display in the device's timezone.

## Phase 7: drills + session plans
- Coach → "Drills": reusable drill library with skill tags (tags feed the AI in Phase 8).
- Coach → "Sessions": compose drills into an ordered plan with per-session coaching
  points and duration overrides. Assign a player and it appears in their app read-only.

## Phase 8: AI session generation
1. Deploy the edge function: `supabase functions deploy generate-plan`
2. Set the API key: `supabase secrets set ANTHROPIC_API_KEY=sk-ant-...`
   (get one at console.anthropic.com; each generation costs a fraction of a cent to a few
   cents depending on library size). Optional: `ANTHROPIC_MODEL` to override the default.
3. Coach → Sessions → "Generate with AI": pick a player, set focus + length. The AI
   composes ONLY from your drill library (hallucinated drills are rejected server-side),
   grounded in the player's goals, your notes, and recent progress. The result opens in
   the plan builder for you to review and edit — it's marked with an AI badge.

## Phase 9: PDF workbooks
- Coach → open a player → "Workbook PDF": choose sections, download a branded printable
  PDF (cover, goals, progress, sessions, shared notes).
- Private coaching notes are NEVER included — only notes shared with the player.
- Requires `npm install` after updating (new dependency: @react-pdf/renderer).

## Phase 10: billing (Stripe)
1. In Stripe: create a Product + recurring Price; add trial days on the Price
   (e.g. 14). Copy the Price ID into `.env.local` as `VITE_STRIPE_PRICE_ID`.
2. Deploy functions:
   `supabase functions deploy create-checkout`
   `supabase functions deploy stripe-webhook --no-verify-jwt`
3. Secrets: `supabase secrets set STRIPE_SECRET_KEY=sk_...`
4. In Stripe → Developers → Webhooks: add endpoint
   `https://<project-ref>.functions.supabase.co/stripe-webhook` with events
   `customer.subscription.*` and `checkout.session.completed`; copy the signing
   secret: `supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...`
5. Users without a membership see a banner (soft gate) linking to /billing; checkout
   happens on Stripe's hosted page. Webhook syncs status back — the app never trusts
   the client about payment. One-time purchases (mode=payment) are also supported for
   the possible coach lifetime option.

## Notes
- Route guards are UX only. Security is enforced by RLS in the database.
- If email confirmation is enabled in Supabase Auth settings, new users are sent to
  a "check your email" screen; with it disabled they land straight on their dashboard.
- The migration includes a trigger that blocks users changing their own role.
