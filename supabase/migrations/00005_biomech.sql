-- ============================================================
-- Phase 4: biomechanics reference library + comment tagging
-- Platform-authored, read-only content. Seeded below.
-- ============================================================

create table public.biomech_shots (
  id uuid primary key default gen_random_uuid(),
  shot_type text not null unique check (shot_type in
    ('serve','forehand','backhand','volley','smash','return','movement','match_play','other')),
  title text not null,
  overview text not null
);
alter table public.biomech_shots enable row level security;
create policy "biomech_shots_read" on public.biomech_shots
  for select to authenticated using (true);

create table public.biomech_phases (
  id uuid primary key default gen_random_uuid(),
  shot_id uuid not null references public.biomech_shots (id) on delete cascade,
  sort_order int not null,
  name text not null,
  teaching_points text not null,
  unique (shot_id, sort_order)
);
alter table public.biomech_phases enable row level security;
create policy "biomech_phases_read" on public.biomech_phases
  for select to authenticated using (true);

-- Video comments can now tag a technique phase.
alter table public.video_comments
  add column biomech_phase_id uuid references public.biomech_phases (id) on delete set null;

-- ---------------- seed content ----------------
do $$
declare sid uuid;
begin
  insert into public.biomech_shots (shot_type, title, overview) values ('serve', 'The Serve',
    'The only shot fully under the player''s control. Power comes from the ground up: legs, trunk rotation, then arm — a kinetic chain, not an arm swing.')
    returning id into sid;
  insert into public.biomech_phases (shot_id, sort_order, name, teaching_points) values
    (sid, 1, 'Stance & grip', 'Continental grip. Platform or pinpoint stance, front foot angled to the net post. Relaxed hands — tension kills racquet speed.'),
    (sid, 2, 'Ball toss', 'Lift, don''t throw: ball leaves the fingertips at eye height, peak just above contact point, slightly into the court for first serves.'),
    (sid, 3, 'Loading (trophy position)', 'Knees flex as the tossing arm extends. Hitting elbow roughly shoulder height, racquet edge-on. Weight coils into the back leg and hip.'),
    (sid, 4, 'Racquet drop', 'As the legs drive up, the racquet falls behind the back — the deeper and looser the drop, the more whip available. Elbow leads before the hand.'),
    (sid, 5, 'Acceleration & contact', 'Contact at full stretch, slightly in front. Forearm pronates through the ball. Eyes stay up at contact.'),
    (sid, 6, 'Follow-through & landing', 'Land inside the baseline on the front foot, back leg kicking back for balance. Racquet finishes across the body, ready to split-step.');

  insert into public.biomech_shots (shot_type, title, overview) values ('forehand', 'The Forehand',
    'Usually the primary weapon. Modern forehands rotate around a stable base — the hips and trunk do the work while the arm stays relaxed.')
    returning id into sid;
  insert into public.biomech_phases (shot_id, sort_order, name, teaching_points) values
    (sid, 1, 'Ready & unit turn', 'Split step on the opponent''s contact. Turn shoulders and hips together immediately — the racquet goes back because the body turns, not the arm.'),
    (sid, 2, 'Backswing & loop', 'Non-dominant hand on the throat sets the turn, then tracks the ball. Compact loop; racquet head above the hand at the top.'),
    (sid, 3, 'Drop & lag', 'Racquet drops below ball height; butt cap points at the ball. Wrist stays laid back — this lag is stored racquet speed.'),
    (sid, 4, 'Forward swing & contact', 'Drive from the legs, rotate the hips first. Contact out in front of the body, low-to-high through the ball for topspin.'),
    (sid, 5, 'Extension & finish', 'Extend through the target line before wrapping. Finish over the shoulder (or lasso on high balls). Head still at contact.'),
    (sid, 6, 'Recovery', 'Push back toward the middle of the likely reply angle. Split step before the opponent strikes.');

  insert into public.biomech_shots (shot_type, title, overview) values ('backhand', 'The Backhand',
    'One- or two-handed, the fundamentals match: early shoulder turn, contact in front, and a stable head through the hit.')
    returning id into sid;
  insert into public.biomech_phases (shot_id, sort_order, name, teaching_points) values
    (sid, 1, 'Ready & unit turn', 'Shoulders turn early so the back faces the sideline more than on the forehand. Grip change happens during the turn, not after.'),
    (sid, 2, 'Backswing', 'Two-hander: non-dominant arm controls the take-back. One-hander: straight-ish arm, racquet set with the shoulder fully coiled.'),
    (sid, 3, 'Forward swing & contact', 'Step in when time allows. Contact further in front than the forehand. Two-hander: left hand (righties) drives through. One-hander: keep the chest sideways.'),
    (sid, 4, 'Extension & finish', 'Extend long through the target. One-hander finishes high with the off-arm balancing behind; two-hander wraps over the shoulder.'),
    (sid, 5, 'Recovery', 'First step back toward position comes out of the finish — no admiring the shot.');

  insert into public.biomech_shots (shot_type, title, overview) values ('volley', 'The Volley',
    'A block, not a swing. Time at the net is measured in tenths of a second — preparation and footwork decide the volley before contact.')
    returning id into sid;
  insert into public.biomech_phases (shot_id, sort_order, name, teaching_points) values
    (sid, 1, 'Ready & split step', 'Continental grip, racquet head up at chest height, elbows in front of the body. Split step as the passer swings.'),
    (sid, 2, 'Turn & set', 'Turn the shoulders — do not take the racquet back past them. The racquet face is set behind the incoming ball line.'),
    (sid, 3, 'Contact (punch)', 'Meet the ball in front with a firm wrist. Step across with the opposite foot when time allows. High-to-low path adds slice and control.'),
    (sid, 4, 'Recovery', 'Recover the racquet to ready immediately — the next volley comes faster than the first.');

  insert into public.biomech_shots (shot_type, title, overview) values ('return', 'The Return of Serve',
    'Half reaction, half anticipation. The return is a compact adaptation of the groundstrokes under extreme time pressure.')
    returning id into sid;
  insert into public.biomech_phases (shot_id, sort_order, name, teaching_points) values
    (sid, 1, 'Ready & split step', 'Split step timed to the server''s contact — land as the ball is struck. Weight on the balls of the feet, slightly forward.'),
    (sid, 2, 'Compact turn', 'Shoulder turn only — there is no time for a full backswing. Against big serves, think block and redirect.'),
    (sid, 3, 'Contact', 'Out in front, using the server''s pace. Aim big targets: deep middle neutralises most serves.'),
    (sid, 4, 'First step & recovery', 'Explode out of the contact into court position — the return and the first recovery step are one movement.');

  insert into public.biomech_shots (shot_type, title, overview) values ('smash', 'The Smash',
    'A serve hit on the move. The hard part is not the swing — it is tracking the lob and positioning the body underneath it.')
    returning id into sid;
  insert into public.biomech_phases (shot_id, sort_order, name, teaching_points) values
    (sid, 1, 'Turn & track', 'Turn sideways instantly and point the non-hitting hand at the ball. Move with crossover steps, never backpedal square-on.'),
    (sid, 2, 'Load (trophy)', 'Racquet up into the trophy position early — arrive set, don''t swing on the run unless forced.'),
    (sid, 3, 'Contact', 'Contact high and slightly in front, as in the serve. Snap the wrist through; pick a side, don''t guide it.'),
    (sid, 4, 'Landing & reset', 'Land balanced, split step — expect the ball to come back until the point is over.');

  insert into public.biomech_shots (shot_type, title, overview) values ('movement', 'Court Movement',
    'Every shot begins and ends with movement. Great movers are made by the split step, the first step, and the discipline of recovery.')
    returning id into sid;
  insert into public.biomech_phases (shot_id, sort_order, name, teaching_points) values
    (sid, 1, 'Split step', 'A small hop landing exactly as the opponent strikes, feet outside the hips — this loads the legs for the first step in any direction.'),
    (sid, 2, 'First step & acceleration', 'The first step is explosive and directional. To wide balls, the outside leg drives; keep the chest tall.'),
    (sid, 3, 'Adjustment steps', 'Small, quick steps in the final metre set the hitting stance. Most mishits are spacing errors, not swing errors.'),
    (sid, 4, 'Recovery', 'Recover to the middle of the opponent''s possible angles — not the centre mark. Side-skip while watching, split step, repeat.');
end $$;
