-- ============================================================
-- Phase 6: scheduling. athlete_id NULL = group event, visible
-- to all of the coach's active athletes.
-- ============================================================

create table public.schedule_events (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references public.profiles (id) on delete cascade,
  athlete_id uuid references public.profiles (id) on delete cascade,
  event_type text not null default 'lesson' check (event_type in
    ('lesson','group_session','match','fitness','tournament','other')),
  title text not null check (length(trim(title)) > 0),
  start_at timestamptz not null,
  end_at timestamptz not null,
  location text,
  notes text,
  created_at timestamptz not null default now(),
  check (end_at > start_at)
);
create index schedule_coach_idx on public.schedule_events (coach_id, start_at);
create index schedule_athlete_idx on public.schedule_events (athlete_id, start_at);
alter table public.schedule_events enable row level security;

-- Coach: full control of own events; individual events only for linked athletes.
create policy "sched_coach_all" on public.schedule_events for all
  using (coach_id = auth.uid())
  with check (coach_id = auth.uid()
              and (athlete_id is null or public.is_coach_of(athlete_id)));

-- Athlete: own events, plus group events from any of their active coaches.
create policy "sched_athlete_select" on public.schedule_events for select
  using (
    athlete_id = auth.uid()
    or (athlete_id is null and exists (
      select 1 from public.coach_athletes ca
      where ca.athlete_profile_id = auth.uid()
        and ca.coach_id = schedule_events.coach_id
        and ca.status = 'active'
    ))
  );
