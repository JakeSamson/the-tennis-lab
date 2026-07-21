# PROJECT.md — The Tennis Lab (Project Memory)

> Single source of truth. Update whenever architecture, conventions, or roadmap change.Paste this file into any new Claude conversation to restore full project context.

## 1. Product Overview

Platform bridging tennis coaches and players. Athletes are ACTIVE users: they trackprogress, set goals, follow strength & conditioning programs, upload and study video,and access biomechanics, mentality/psychology, and rest/recovery content.Coaches organise their players, write coaching notes and goals, manage schedules,and (later) build drills and session plans.

**Roles:**

* coach — full CRUD on own athletes, notes, schedules, programs, video comments
* athlete — owns their goals, progress logs, video uploads, program completion
* parent — read-only via athlete_guardians link

## 2. Stack

* **Frontend:** React 18 + TypeScript + Vite · React Router · TanStack Query
* **Backend:** Supabase — Auth, Postgres (RLS on every table), Storage (video/media), Edge Functions
* **PDF:** @react-pdf/renderer (client-side) · **AI:** Edge Function → Anthropic API
* **Billing:** Stripe Billing (NOT Connect — money flows user→platform only). Webhook edgefunction syncs subscription/purchase status to Postgres; app gates on entitlement check.
* Video: Supabase Storage with size limits; HTML5 playback; timestamped comments (no ML analysis in v1)

## 3. Brand

| Token | Value | Use |
| --- | --- | --- |
| --court-green | #2D6A4F | Primary actions, headers |
| --clay-orange | #E76F51 | Accents, highlights |
| --line-white | #FAFAFA | Backgrounds |
| --net-charcoal | #264653 | Text, dark UI |
| --ball-yellow | #E9C46A | Badges, progress indicators |

Typography: TBD (suggest Inter). Logo: TBD.

## 4. Data Model (Postgres)

**Identity & links**

* `profiles` — id (auth.users FK), role, full_name, avatar_url
* `coach_athletes` — coach_id, athlete_profile_id, status (invited/active)
* `athlete_guardians` — athlete_profile_id, guardian_profile_id
* `invitations` — coach_id, email, role, token, status

**Development**

* `goals` — athlete_id, created_by (coach or athlete), title, target_date, status, notes
* `progress_logs` — athlete_id, date, metric, value, notes
* `coach_notes` — coach_id, athlete_id, date, body, visibility ('shared_with_athlete' | 'private');athletes/parents can SELECT shared notes via RLS
* `assessments` — athlete_id, coach_id, date, skill, rating, notes

**Video & biomechanics**

* `videos` — athlete_id, uploader_id, storage_path, shot_type, recorded_at, duration
* `video_comments` — video_id, author_id, timestamp_sec, body, biomech_checkpoint_id (nullable)
* `biomech_shots` — shot type (serve, forehand...), overview
* `biomech_phases` — shot_id, sort_order, name (e.g. loading, contact, follow-through), teaching_points

**Content engine (shared by S&C, mentality, recovery)**

* `programs` — author_id, category (strength|mentality|recovery), title, description, published
* `program_sections` — program_id, sort_order, title
* `program_items` — section_id, sort_order, title, body, sets int, reps int, duration_min numeric (explicit columns chosen over jsonb for cleaner UI/queries)
* `program_assignments` — program_id, athlete_id, assigned_by
* `item_completions` — item_id, athlete_id, completed_at, notes

**Billing (Stripe)**

* `billing_customers` — profile_id, stripe_customer_id
* `subscriptions` — profile_id, stripe_subscription_id, price_id, status, trial_ends_at, current_period_end
* `purchases` — profile_id, stripe_payment_intent_id, product (e.g. coach_lifetime), amount, purchased_at
* Entitlement = active/trialing subscription OR qualifying one-time purchase

**Scheduling**

* `schedule_events` — coach_id, athlete_id (nullable for group), start_at, end_at, type, location, notes

**Coaching tools (later phases)**

* `drills`, `session_plans`, `session_plan_items`, `workbooks` — as previously specced

**RLS pattern:** per-feature ownership. Coaches: rows where coach_id = auth.uid() or viacoach_athletes link. Athletes: full CRUD on their own goals/logs/videos/completions;SELECT on assigned programs, schedules, shared notes. Parents: SELECT via guardians join.No table ships without policies.

## 5. Folder Structure

    src/
      components/ui/          # shared primitives — REUSE FIRST
      features/
        auth/  profiles/  goals/  progress/  video/  biomech/
        programs/             # one engine: S&C, mentality, recovery
        schedule/  notes/  drills/  sessions/  workbooks/  ai-planner/
      lib/    routes/
    supabase/
      migrations/  functions/

## 6. Conventions

* Components PascalCase · hooks useX · DB snake_case, plural tables
* Search components/ui and feature folders before creating anything new
* All mutations via TanStack Query with error handling
* Definition of done: working code, error handling, comments, responsive, accessible, tested, documented
* Workflow: approach → risks → alternatives → Build → Review → Optimise → Refactor → Test
* Bugs: root cause → three fixes → implement safest only

## 7. Roadmap

* [x] **P0** Scaffold, 3-role auth, RLS foundations
* [x] **P1** Coach↔athlete linking + invitation claim flow (parent invites + email delivery deferred)
* [x] **P2** Goals + progress + coach notes w/ visibility (shared GoalsCard/ProgressCard/NotesCard)
* [x] **P3** Video upload, playback, timestamped comments (private bucket + signed URLs)
* [x] **P4** Biomechanics library: 7 strokes seeded, phase-tagged video comments
* [x] **P5** Content engine shipped: programs/sections/items, publish, assign, completions
* [x] **P6** Scheduling: agenda list, individual + group events, per-role RLS
* [x] **P7** Drill library (tagged) + session planner; player-visible plans
* [x] **P8** AI generation: edge fn, caller-JWT RLS, drill-grounded, review-first
* [x] **P9** PDF workbooks: client-side @react-pdf/renderer, section toggles, shared-notes-only
* [x] **P10** Billing shipped: checkout + verified webhook + entitlement hook; SOFT gate v1
* [ ] Post-v1: automated video/motion analysis (ML), bookings/payments

## 8. Decisions Log

* 2026-07-05: Multi-role auth. PDF via @react-pdf/renderer. AI planning grounded in drill library.
  
* 2026-07-05: Vision expanded — athletes are active users. Video analysis = upload +timestamped comments (no ML in v1). Biomechanics = curated reference library.S&C/mentality/recovery share one content-engine architecture.
  
* 2026-07-05: Athletes can read coaching notes — coach_notes gets a visibility flag(shared_with_athlete default for session notes, private for coach-only observations).
  
* 2026-07-05: Payments = Stripe Billing, user→platform only (no Connect). Free trial thenpaid. Pricing model open (coach one-time vs discounted sub vs athlete sub) — schemasupports both subscriptions and one-time purchases so this can be decided later.
  
* 2026-07-05: Product name confirmed: The Tennis Lab.
  
* 2026-07-05: Invitation claiming via SECURITY DEFINER RPC (claim_invitation), not anedge function. Claim link is copy-shared by the coach; automated email (Resend) later.Claim enforces email match + single use. safeRedirect guards the ?redirect= param.
  
* 2026-07-05: P2 shipped. is_coach_of() SECURITY DEFINER helper centralises thecoach-of-athlete RLS check. Progress metrics are free-text until charts (P4) demandcurated metric types.
  
* 2026-07-05: P3 shipped. Storage access derived from {athlete_id}/ path convention.100MB cap + mime allowlist enforced at bucket level. Upload rolls back the file if themetadata insert fails. Transcoding/streaming (Mux/CF Stream) deferred until scale demands.
  
* 2026-07-05: P4 shipped. Biomech content is DB-seeded platform content (read-only viaRLS); refine wording by editing rows, no redeploy. video_comments.biomech_phase_id linksanalysis to technique phases. Coach-authored custom phases deferred.
  
* 2026-07-05: P5 shipped. One engine, three categories. Drafts hidden from players viaRLS (published flag checked in is_assigned_to_program). Completions are checkbox-modelv1; recurring-schedule completion logs deferred. media_url on items deferred.
  
* 2026-07-05: P6 shipped. Agenda list over calendar grid (mobile-first; grid can layeron later). athlete_id NULL = group event visible to all the coach's active athletes.Device-timezone rendering; explicit tz handling, editing, and recurring events deferred.
  
* 2026-07-05: P7 shipped. Plan items = drill ref + per-session coaching points +duration override. Athletes read drills only through their own plans (dedicated RLSpolicy). Item reordering and drill diagrams deferred.
  
* 2026-07-05: P8 shipped. Edge function uses the CALLER's JWT (RLS-scoped reads — noservice role). Model string is env-configurable (ANTHROPIC_MODEL, defaultclaude-sonnet-4-6). Server rejects drill IDs not in the coach's library; empty-shellplans rolled back on item-insert failure. Rate limiting before public launch: TODO.
  
* 2026-07-05: P9 shipped. Workbook = branded cover + goals/progress/sessions/notes withtoggles. Privacy invariant: only visibility='shared_with_athlete' notes can enter aworkbook. No workbooks table (on-demand generation); persisting PDFs deferred.
  
* 2026-07-05: P10 shipped — roadmap build phases COMPLETE. Billing rows are user-readable,service-role-writable only (webhook = single source of truth). Soft gate v1 (banner);hard gate is a deliberate flip later. Trial lives on the Stripe Price. Both subscriptionand one-time purchase paths supported, keeping the coach-pricing question open.
  
* 2026-07-05: DEPLOY.md added (Vercel/Netlify SPA configs included in repo). Go-liveorder: prod Supabase -> frontend -> smoke test -> Stripe live. Child-data privacyflagged as a pre-launch action item.
  
* 2026-07-05: Vision logged — AI video technique analysis. Agreed ladder: (v2) framesampling -> vision AI drafts phase-mapped observations using the biomech library asrubric, COACH reviews/edits before player sees anything; (v3) pose-estimation overlays
  
  * side-by-side vs reference footage; (north star) automated advisory feedback, onlyonce coach-corrected data validates quality. Principle: AI proposes, coach decides —never auto-coach juniors directly. Full auto "compare to pros" rejected as unreliable(pro technique varies; bad advice liability).
* 2026-07-08: Company vision expanded to three layers: (1) player development (built),(2) coaching tools (built), (3) CLUB OPERATIONS (next): program admin (Hot Shots,juniors, cardio, social), court hire, attendance, tournaments, game generation. Plusperformance report cards (technical/tactical/physical/mental/tournament vs goals).Business model: player subs + coach subs + club SaaS (anchor) + booking fees. Pitchdoc + company mind map created. Pre-pitch TODOs: competitor landscape scan, final name.
  
* 2026-07-16: STRATEGY PIVOT — primary client = tennis clubs (not individual coaches).Incumbent to displace: "TennisBiz" (does invoicing + scheduling, clunky). Wedgestrategy: DO NOT lead by rebuilding TennisBiz admin; lead with the coaching/playerlayer (which TennisBiz can't build), run alongside TennisBiz initially, then absorbadmin functions until TennisBiz is redundant. Pilot club = founder's own (hundreds ofmembers) but must scale to all club sizes. Club value props: efficient client/invoice/schedule admin + coaching quality that drives member acquisition & retention. Invoicing:integrate (Stripe or Xero/MYOB), do NOT build from scratch. Build order: club+members ->court scheduling -> programs+attendance -> invoicing integration -> nest existingcoach/player layers under club. Architecture shift: CLUB becomes top-level entity.Open pre-build Qs for club director/ops manager captured in strategy notes.
  
* 2026-07-16: Strategy RESOLVED after discovery — TennisBiz is "clunky but tolerated"(pain not unbearable) => replace-first REJECTED (would yield only marginal improvement,not switch-worthy). CONFIRMED path: lead with coaching/player layer, run ALONGSIDETennisBiz (tiny low-risk yes, nothing to migrate), embed + prove member value, THENabsorb admin pulled by the club. Next build = club container + members + nest existingplayer/coach layers under it. Invoicing/scheduling replacement deferred until club-pulled.
  
* 2026-07-16: Pilot club = Royal South Yarra Lawn Tennis Club (RSYLTC), Toorak VIC —founded 1884, ~44 courts (grass/all-weather/Har Tru), hundreds of members, premierhistoric club. Validates members!=players model (social/court-hire/swim/coached allcoexist) and makes court-based scheduling central. "Spotless" bar is real: demo carriesfounder's professional reputation at a prestigious club. Multi-tenancy isolation must beprovably airtight. Club rebuild = multi-tenant-from-day-one (one club now, scale tohundreds). Roles combinable (club_admin + coach can be same person for small clubs).Members added by admin/staff. Non-destructive migration: preserve test data under theclub (rehearses the real upgrade path). PRIVACY: get club consent before real memberdata enters a deployed prototype.
  
* 2026-07-16: Club rebuild phase plan — C1 club foundation + multi-tenancy RLS + isolationtest; C2 club admin dashboard (member directory, types, staff); C3 nest coaching/playerlayers under club; C4 court-based scheduling; C5 programs+attendance; C6+ invoicingintegration (Stripe or Xero/MYOB) when club-pulled. Lead with coaching alongsideTennisBiz; absorb admin later.
  
* 2026-07-16: SECOND PILOT — Dendy Park (recently taken over by Royal South Yarra, separatesite). Confirmed model: ORGANISATION -> SITES -> people. Org = Royal South Yarra (billing/oversight); sites = RSY Toorak + Dendy Park; members belong to a site; cross-site staff(director, head coaches) belong to the ORG and see all its sites; no one sees another org.This SUPERSEDES the flat C1 "club" model. New helpers: my_org_id(), sites_i_can_access()(site memberships UNION org's sites), can_access_site(), is_site_admin(). Existing tablesgain site_id (backfilled to RSY Toorak). Migration file: CLUB_V2_org_sites.sql (built,not yet run — user's DB had no clubs table, clean slate). Review found + fixed: profilesneeded site-isolation restrictive policy. Review flagged for C3: frontend MUST send site_idon every insert (WITH CHECK enforces it; app must supply it). Live-session isolation teststill required before real member data. Decision: build org->site correctly now over fasterdemo — club is warm, real structure sells better than caveated simple version.
  
* 2026-07-16: C3 keystone built (SiteContext.tsx + SiteSwitcher.tsx) — self-containedsite context/switcher, safe to write without live repo access. SiteProvider loadsaccessible sites (RLS-scoped), tracks active site; useActiveSiteId() stamps site_idonto inserts (satisfies WITH CHECK); SiteSwitcher shows only for cross-site staff.BLOCKER for rest of C3: needs the LIVE frontend repo to wire site_id into each feature'sexisting hooks — recommended Claude Code (reads real repo) rather than pasting/guessing.Correct order reaffirmed: (1) run CLUB_V2_org_sites.sql + verify, (2) get repo access,(3) wire C3 against real code, (4) live isolation test, (5) C2 dashboard. Do NOT buildC3 feature-wiring blind — reputation-critical, must match live code.
