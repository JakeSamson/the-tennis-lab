# PROJECT.md — The Tennis Lab (Project Memory)

> Single source of truth. Update whenever architecture, conventions, or roadmap change.
> Paste this file into any new Claude conversation to restore full project context.

## 1. Product Overview
Platform bridging tennis coaches and players. Athletes are ACTIVE users: they track
progress, set goals, follow strength & conditioning programs, upload and study video,
and access biomechanics, mentality/psychology, and rest/recovery content.
Coaches organise their players, write coaching notes and goals, manage schedules,
and (later) build drills and session plans.

**Roles:**
- coach — full CRUD on own athletes, notes, schedules, programs, video comments
- athlete — owns their goals, progress logs, video uploads, program completion
- parent — read-only via athlete_guardians link

## 2. Stack
- **Frontend:** React 18 + TypeScript + Vite · React Router · TanStack Query
- **Backend:** Supabase — Auth, Postgres (RLS on every table), Storage (video/media), Edge Functions
- **PDF:** @react-pdf/renderer (client-side) · **AI:** Edge Function → Anthropic API
- **Billing:** Stripe Billing (NOT Connect — money flows user→platform only). Webhook edge
  function syncs subscription/purchase status to Postgres; app gates on entitlement check.
- Video: Supabase Storage with size limits; HTML5 playback; timestamped comments (no ML analysis in v1)

## 3. Brand
| Token | Value | Use |
|---|---|---|
| --court-green | #2D6A4F | Primary actions, headers |
| --clay-orange | #E76F51 | Accents, highlights |
| --line-white | #FAFAFA | Backgrounds |
| --net-charcoal | #264653 | Text, dark UI |
| --ball-yellow | #E9C46A | Badges, progress indicators |

Typography: TBD (suggest Inter). Logo: TBD.

## 4. Data Model (Postgres)
**Identity & links**
- `profiles` — id (auth.users FK), role, full_name, avatar_url
- `coach_athletes` — coach_id, athlete_profile_id, status (invited/active)
- `athlete_guardians` — athlete_profile_id, guardian_profile_id
- `invitations` — coach_id, email, role, token, status

**Development**
- `goals` — athlete_id, created_by (coach or athlete), title, target_date, status, notes
- `progress_logs` — athlete_id, date, metric, value, notes
- `coach_notes` — coach_id, athlete_id, date, body, visibility ('shared_with_athlete' | 'private');
  athletes/parents can SELECT shared notes via RLS
- `assessments` — athlete_id, coach_id, date, skill, rating, notes

**Video & biomechanics**
- `videos` — athlete_id, uploader_id, storage_path, shot_type, recorded_at, duration
- `video_comments` — video_id, author_id, timestamp_sec, body, biomech_checkpoint_id (nullable)
- `biomech_shots` — shot type (serve, forehand...), overview
- `biomech_phases` — shot_id, sort_order, name (e.g. loading, contact, follow-through), teaching_points

**Content engine (shared by S&C, mentality, recovery)**
- `programs` — author_id, category (strength|mentality|recovery), title, description, published
- `program_sections` — program_id, sort_order, title
- `program_items` — section_id, sort_order, title, body, sets int, reps int, duration_min numeric (explicit columns chosen over jsonb for cleaner UI/queries)
- `program_assignments` — program_id, athlete_id, assigned_by
- `item_completions` — item_id, athlete_id, completed_at, notes

**Billing (Stripe)**
- `billing_customers` — profile_id, stripe_customer_id
- `subscriptions` — profile_id, stripe_subscription_id, price_id, status, trial_ends_at, current_period_end
- `purchases` — profile_id, stripe_payment_intent_id, product (e.g. coach_lifetime), amount, purchased_at
- Entitlement = active/trialing subscription OR qualifying one-time purchase

**Scheduling**
- `schedule_events` — coach_id, athlete_id (nullable for group), start_at, end_at, type, location, notes

**Coaching tools (later phases)**
- `drills`, `session_plans`, `session_plan_items`, `workbooks` — as previously specced

**RLS pattern:** per-feature ownership. Coaches: rows where coach_id = auth.uid() or via
coach_athletes link. Athletes: full CRUD on their own goals/logs/videos/completions;
SELECT on assigned programs, schedules, shared notes. Parents: SELECT via guardians join.
No table ships without policies.

## 5. Folder Structure
```
src/
  components/ui/          # shared primitives — REUSE FIRST
  features/
    auth/  profiles/  goals/  progress/  video/  biomech/
    programs/             # one engine: S&C, mentality, recovery
    schedule/  notes/  drills/  sessions/  workbooks/  ai-planner/
  lib/    routes/
supabase/
  migrations/  functions/
```

## 6. Conventions
- Components PascalCase · hooks useX · DB snake_case, plural tables
- Search components/ui and feature folders before creating anything new
- All mutations via TanStack Query with error handling
- Definition of done: working code, error handling, comments, responsive, accessible, tested, documented
- Workflow: approach → risks → alternatives → Build → Review → Optimise → Refactor → Test
- Bugs: root cause → three fixes → implement safest only

## 7. Roadmap
- [x] **P0** Scaffold, 3-role auth, RLS foundations
- [x] **P1** Coach↔athlete linking + invitation claim flow (parent invites + email delivery deferred)
- [x] **P2** Goals + progress + coach notes w/ visibility (shared GoalsCard/ProgressCard/NotesCard)
- [x] **P3** Video upload, playback, timestamped comments (private bucket + signed URLs)
- [x] **P4** Biomechanics library: 7 strokes seeded, phase-tagged video comments
- [x] **P5** Content engine shipped: programs/sections/items, publish, assign, completions
- [x] **P6** Scheduling: agenda list, individual + group events, per-role RLS
- [x] **P7** Drill library (tagged) + session planner; player-visible plans
- [x] **P8** AI generation: edge fn, caller-JWT RLS, drill-grounded, review-first
- [x] **P9** PDF workbooks: client-side @react-pdf/renderer, section toggles, shared-notes-only
- [x] **P10** Billing shipped: checkout + verified webhook + entitlement hook; SOFT gate v1
- [ ] Post-v1: automated video/motion analysis (ML), bookings/payments

## 8. Decisions Log
- 2026-07-05: Multi-role auth. PDF via @react-pdf/renderer. AI planning grounded in drill library.
- 2026-07-05: Vision expanded — athletes are active users. Video analysis = upload +
  timestamped comments (no ML in v1). Biomechanics = curated reference library.
  S&C/mentality/recovery share one content-engine architecture.
- 2026-07-05: Athletes can read coaching notes — coach_notes gets a visibility flag
  (shared_with_athlete default for session notes, private for coach-only observations).
- 2026-07-05: Payments = Stripe Billing, user→platform only (no Connect). Free trial then
  paid. Pricing model open (coach one-time vs discounted sub vs athlete sub) — schema
  supports both subscriptions and one-time purchases so this can be decided later.
- 2026-07-05: Product name confirmed: The Tennis Lab.
- 2026-07-05: Invitation claiming via SECURITY DEFINER RPC (claim_invitation), not an
  edge function. Claim link is copy-shared by the coach; automated email (Resend) later.
  Claim enforces email match + single use. safeRedirect guards the ?redirect= param.
- 2026-07-05: P2 shipped. is_coach_of() SECURITY DEFINER helper centralises the
  coach-of-athlete RLS check. Progress metrics are free-text until charts (P4) demand
  curated metric types.
- 2026-07-05: P3 shipped. Storage access derived from {athlete_id}/ path convention.
  100MB cap + mime allowlist enforced at bucket level. Upload rolls back the file if the
  metadata insert fails. Transcoding/streaming (Mux/CF Stream) deferred until scale demands.
- 2026-07-05: P4 shipped. Biomech content is DB-seeded platform content (read-only via
  RLS); refine wording by editing rows, no redeploy. video_comments.biomech_phase_id links
  analysis to technique phases. Coach-authored custom phases deferred.
- 2026-07-05: P5 shipped. One engine, three categories. Drafts hidden from players via
  RLS (published flag checked in is_assigned_to_program). Completions are checkbox-model
  v1; recurring-schedule completion logs deferred. media_url on items deferred.
- 2026-07-05: P6 shipped. Agenda list over calendar grid (mobile-first; grid can layer
  on later). athlete_id NULL = group event visible to all the coach's active athletes.
  Device-timezone rendering; explicit tz handling, editing, and recurring events deferred.
- 2026-07-05: P7 shipped. Plan items = drill ref + per-session coaching points +
  duration override. Athletes read drills only through their own plans (dedicated RLS
  policy). Item reordering and drill diagrams deferred.
- 2026-07-05: P8 shipped. Edge function uses the CALLER's JWT (RLS-scoped reads — no
  service role). Model string is env-configurable (ANTHROPIC_MODEL, default
  claude-sonnet-4-6). Server rejects drill IDs not in the coach's library; empty-shell
  plans rolled back on item-insert failure. Rate limiting before public launch: TODO.
- 2026-07-05: P9 shipped. Workbook = branded cover + goals/progress/sessions/notes with
  toggles. Privacy invariant: only visibility='shared_with_athlete' notes can enter a
  workbook. No workbooks table (on-demand generation); persisting PDFs deferred.
- 2026-07-05: P10 shipped — roadmap build phases COMPLETE. Billing rows are user-readable,
  service-role-writable only (webhook = single source of truth). Soft gate v1 (banner);
  hard gate is a deliberate flip later. Trial lives on the Stripe Price. Both subscription
  and one-time purchase paths supported, keeping the coach-pricing question open.
- 2026-07-05: DEPLOY.md added (Vercel/Netlify SPA configs included in repo). Go-live
  order: prod Supabase -> frontend -> smoke test -> Stripe live. Child-data privacy
  flagged as a pre-launch action item.
