-- ============================================================
-- Phase 5: content engine — programs / sections / items /
-- assignments / completions. One architecture, three categories.
-- ============================================================

create table public.programs (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles (id) on delete cascade,
  category text not null check (category in ('strength','mentality','recovery')),
  title text not null check (length(trim(title)) > 0),
  description text,
  published boolean not null default false,
  created_at timestamptz not null default now()
);
create index programs_author_idx on public.programs (author_id, category);
alter table public.programs enable row level security;

create table public.program_sections (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references public.programs (id) on delete cascade,
  sort_order int not null,
  title text not null check (length(trim(title)) > 0),
  unique (program_id, sort_order)
);
alter table public.program_sections enable row level security;

create table public.program_items (
  id uuid primary key default gen_random_uuid(),
  section_id uuid not null references public.program_sections (id) on delete cascade,
  sort_order int not null,
  title text not null check (length(trim(title)) > 0),
  body text,
  sets int check (sets > 0),
  reps int check (reps > 0),
  duration_min numeric check (duration_min > 0),
  unique (section_id, sort_order)
);
alter table public.program_items enable row level security;

create table public.program_assignments (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references public.programs (id) on delete cascade,
  athlete_id uuid not null references public.profiles (id) on delete cascade,
  assigned_by uuid not null references public.profiles (id),
  created_at timestamptz not null default now(),
  unique (program_id, athlete_id)
);
alter table public.program_assignments enable row level security;

create table public.item_completions (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.program_items (id) on delete cascade,
  athlete_id uuid not null references public.profiles (id) on delete cascade,
  completed_at timestamptz not null default now(),
  notes text,
  unique (item_id, athlete_id) -- v1: checkbox model, one completion per item
);
alter table public.item_completions enable row level security;

-- ---------------- access helpers ----------------
create or replace function public.is_program_author(pid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.programs p where p.id = pid and p.author_id = auth.uid());
$$;
create or replace function public.is_assigned_to_program(pid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.program_assignments a
    join public.programs p on p.id = a.program_id
    where a.program_id = pid and a.athlete_id = auth.uid() and p.published
  );
$$;
revoke all on function public.is_program_author(uuid) from public, anon;
revoke all on function public.is_assigned_to_program(uuid) from public, anon;
grant execute on function public.is_program_author(uuid) to authenticated;
grant execute on function public.is_assigned_to_program(uuid) to authenticated;

-- ---------------- policies ----------------
-- programs: author full control; assigned athletes read published ones
create policy "programs_author_all" on public.programs for all
  using (author_id = auth.uid()) with check (author_id = auth.uid());
create policy "programs_assigned_select" on public.programs for select
  using (published and public.is_assigned_to_program(id));

-- sections/items: visibility mirrors the parent program
create policy "sections_select" on public.program_sections for select
  using (public.is_program_author(program_id) or public.is_assigned_to_program(program_id));
create policy "sections_author_write" on public.program_sections for insert
  with check (public.is_program_author(program_id));
create policy "sections_author_update" on public.program_sections for update
  using (public.is_program_author(program_id));
create policy "sections_author_delete" on public.program_sections for delete
  using (public.is_program_author(program_id));

create policy "items_select" on public.program_items for select
  using (exists (select 1 from public.program_sections s where s.id = section_id
                 and (public.is_program_author(s.program_id) or public.is_assigned_to_program(s.program_id))));
create policy "items_author_write" on public.program_items for insert
  with check (exists (select 1 from public.program_sections s where s.id = section_id
                      and public.is_program_author(s.program_id)));
create policy "items_author_update" on public.program_items for update
  using (exists (select 1 from public.program_sections s where s.id = section_id
                 and public.is_program_author(s.program_id)));
create policy "items_author_delete" on public.program_items for delete
  using (exists (select 1 from public.program_sections s where s.id = section_id
                 and public.is_program_author(s.program_id)));

-- assignments: program author assigns their own linked athletes; athlete reads own
create policy "assign_author_all" on public.program_assignments for all
  using (public.is_program_author(program_id))
  with check (public.is_program_author(program_id)
              and public.is_coach_of(athlete_id) and assigned_by = auth.uid());
create policy "assign_athlete_select" on public.program_assignments for select
  using (athlete_id = auth.uid());

-- completions: athlete ticks items on programs assigned to them; their coaches can read
create policy "compl_athlete_all" on public.item_completions for all
  using (athlete_id = auth.uid())
  with check (athlete_id = auth.uid()
    and exists (select 1 from public.program_items i
                join public.program_sections s on s.id = i.section_id
                where i.id = item_id and public.is_assigned_to_program(s.program_id)));
create policy "compl_coach_select" on public.item_completions for select
  using (public.is_coach_of(athlete_id));
