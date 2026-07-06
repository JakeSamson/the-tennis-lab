-- ============================================================
-- Phase 2: goals, progress logs, coach notes (with visibility)
-- ============================================================

-- Single source of truth for "am I an active coach of this athlete?"
-- SECURITY DEFINER so policies can consult coach_athletes without
-- recursive RLS evaluation. Read-only boolean check.
create or replace function public.is_coach_of(target_athlete uuid)
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.coach_athletes ca
    where ca.coach_id = auth.uid()
      and ca.athlete_profile_id = target_athlete
      and ca.status = 'active'
  );
$$;
revoke all on function public.is_coach_of(uuid) from public, anon;
grant execute on function public.is_coach_of(uuid) to authenticated;

-- ---------- goals ----------
create table public.goals (
  id uuid primary key default gen_random_uuid(),
  athlete_id uuid not null references public.profiles (id) on delete cascade,
  created_by uuid not null references public.profiles (id),
  title text not null check (length(trim(title)) > 0),
  target_date date,
  status text not null default 'active' check (status in ('active','achieved','archived')),
  notes text,
  created_at timestamptz not null default now()
);
create index goals_athlete_idx on public.goals (athlete_id);
alter table public.goals enable row level security;

create policy "goals_athlete_or_coach_select" on public.goals for select
  using (athlete_id = auth.uid() or public.is_coach_of(athlete_id));
create policy "goals_athlete_or_coach_insert" on public.goals for insert
  with check ((athlete_id = auth.uid() or public.is_coach_of(athlete_id))
              and created_by = auth.uid());
create policy "goals_athlete_or_coach_update" on public.goals for update
  using (athlete_id = auth.uid() or public.is_coach_of(athlete_id));
create policy "goals_athlete_or_coach_delete" on public.goals for delete
  using (athlete_id = auth.uid() or public.is_coach_of(athlete_id));

-- ---------- progress_logs ----------
create table public.progress_logs (
  id uuid primary key default gen_random_uuid(),
  athlete_id uuid not null references public.profiles (id) on delete cascade,
  author_id uuid not null references public.profiles (id),
  log_date date not null default current_date,
  metric text not null check (length(trim(metric)) > 0),
  value numeric,
  notes text,
  created_at timestamptz not null default now()
);
create index progress_logs_athlete_idx on public.progress_logs (athlete_id, log_date desc);
alter table public.progress_logs enable row level security;

create policy "logs_athlete_or_coach_select" on public.progress_logs for select
  using (athlete_id = auth.uid() or public.is_coach_of(athlete_id));
create policy "logs_athlete_or_coach_insert" on public.progress_logs for insert
  with check ((athlete_id = auth.uid() or public.is_coach_of(athlete_id))
              and author_id = auth.uid());
create policy "logs_athlete_or_coach_update" on public.progress_logs for update
  using (athlete_id = auth.uid() or public.is_coach_of(athlete_id));
create policy "logs_athlete_or_coach_delete" on public.progress_logs for delete
  using (athlete_id = auth.uid() or public.is_coach_of(athlete_id));

-- ---------- coach_notes ----------
create table public.coach_notes (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references public.profiles (id) on delete cascade,
  athlete_id uuid not null references public.profiles (id) on delete cascade,
  note_date date not null default current_date,
  body text not null check (length(trim(body)) > 0),
  visibility text not null default 'shared_with_athlete'
    check (visibility in ('shared_with_athlete','private')),
  created_at timestamptz not null default now()
);
create index coach_notes_athlete_idx on public.coach_notes (athlete_id, note_date desc);
alter table public.coach_notes enable row level security;

-- Coach: full control of own notes for athletes they actively coach.
create policy "notes_coach_all" on public.coach_notes for all
  using (coach_id = auth.uid())
  with check (coach_id = auth.uid() and public.is_coach_of(athlete_id));
-- Athlete: read-only, shared notes only. Private notes never leave the coach.
create policy "notes_athlete_select_shared" on public.coach_notes for select
  using (athlete_id = auth.uid() and visibility = 'shared_with_athlete');
