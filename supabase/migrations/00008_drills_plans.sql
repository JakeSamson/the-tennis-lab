-- ============================================================
-- Phase 7: drill library + session planner
-- ============================================================

create table public.drills (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references public.profiles (id) on delete cascade,
  title text not null check (length(trim(title)) > 0),
  description text,
  skill_tags text[] not null default '{}',
  difficulty text not null default 'intermediate'
    check (difficulty in ('beginner','intermediate','advanced')),
  duration_min numeric check (duration_min > 0),
  equipment text,
  created_at timestamptz not null default now()
);
create index drills_coach_idx on public.drills (coach_id);
alter table public.drills enable row level security;

create table public.session_plans (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references public.profiles (id) on delete cascade,
  athlete_id uuid references public.profiles (id) on delete set null,
  title text not null check (length(trim(title)) > 0),
  plan_date date not null default current_date,
  objectives text,
  ai_generated boolean not null default false,
  created_at timestamptz not null default now()
);
create index session_plans_coach_idx on public.session_plans (coach_id, plan_date desc);
alter table public.session_plans enable row level security;

create table public.session_plan_items (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.session_plans (id) on delete cascade,
  drill_id uuid not null references public.drills (id) on delete cascade,
  sort_order int not null,
  duration_min numeric check (duration_min > 0), -- overrides the drill default
  coaching_points text,
  unique (plan_id, sort_order)
);
alter table public.session_plan_items enable row level security;

-- ---------------- helpers ----------------
create or replace function public.is_plan_owner(pid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.session_plans p where p.id = pid and p.coach_id = auth.uid());
$$;
create or replace function public.can_view_plan(pid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.session_plans p
                 where p.id = pid and (p.coach_id = auth.uid() or p.athlete_id = auth.uid()));
$$;
revoke all on function public.is_plan_owner(uuid) from public, anon;
revoke all on function public.can_view_plan(uuid) from public, anon;
grant execute on function public.is_plan_owner(uuid) to authenticated;
grant execute on function public.can_view_plan(uuid) to authenticated;

-- ---------------- policies ----------------
-- drills: coach owns; athletes may read drills that appear in a plan booked for them
create policy "drills_coach_all" on public.drills for all
  using (coach_id = auth.uid()) with check (coach_id = auth.uid());
create policy "drills_in_my_plans_select" on public.drills for select
  using (exists (
    select 1 from public.session_plan_items i
    join public.session_plans p on p.id = i.plan_id
    where i.drill_id = drills.id and p.athlete_id = auth.uid()
  ));

-- plans: coach owns; the plan's athlete can read
create policy "plans_coach_all" on public.session_plans for all
  using (coach_id = auth.uid())
  with check (coach_id = auth.uid()
              and (athlete_id is null or public.is_coach_of(athlete_id)));
create policy "plans_athlete_select" on public.session_plans for select
  using (athlete_id = auth.uid());

-- plan items: mirror the plan
create policy "plan_items_select" on public.session_plan_items for select
  using (public.can_view_plan(plan_id));
create policy "plan_items_owner_insert" on public.session_plan_items for insert
  with check (public.is_plan_owner(plan_id));
create policy "plan_items_owner_update" on public.session_plan_items for update
  using (public.is_plan_owner(plan_id));
create policy "plan_items_owner_delete" on public.session_plan_items for delete
  using (public.is_plan_owner(plan_id));
