-- ============================================================
-- Phase 0: Identity, roles, coach-athlete links, invitations
-- Every table ships with RLS. Run in Supabase SQL editor.
-- ============================================================

create type public.user_role as enum ('coach', 'athlete', 'parent');

-- ---------- profiles ----------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role public.user_role not null default 'athlete',
  full_name text not null default '',
  avatar_url text,
  created_at timestamptz not null default now()
);
alter table public.profiles enable row level security;

-- Auto-create a profile when a user signs up.
-- Role/name come from signUp metadata; role is validated, defaulting to athlete.
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, role, full_name)
  values (
    new.id,
    case
      when new.raw_user_meta_data ->> 'role' in ('coach','athlete','parent')
        then (new.raw_user_meta_data ->> 'role')::public.user_role
      else 'athlete'
    end,
    coalesce(new.raw_user_meta_data ->> 'full_name', '')
  );
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Prevent role escalation: users may edit their profile but never their role.
create or replace function public.prevent_role_change()
returns trigger language plpgsql as $$
begin
  if new.role is distinct from old.role then
    raise exception 'Role cannot be changed';
  end if;
  return new;
end $$;

create trigger profiles_lock_role
  before update on public.profiles
  for each row execute function public.prevent_role_change();

-- ---------- coach_athletes ----------
create table public.coach_athletes (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references public.profiles (id) on delete cascade,
  athlete_profile_id uuid not null references public.profiles (id) on delete cascade,
  status text not null default 'active' check (status in ('invited','active')),
  created_at timestamptz not null default now(),
  unique (coach_id, athlete_profile_id)
);
alter table public.coach_athletes enable row level security;

-- ---------- athlete_guardians ----------
create table public.athlete_guardians (
  id uuid primary key default gen_random_uuid(),
  athlete_profile_id uuid not null references public.profiles (id) on delete cascade,
  guardian_profile_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (athlete_profile_id, guardian_profile_id)
);
alter table public.athlete_guardians enable row level security;

-- ---------- invitations (claim flow lands in Phase 1) ----------
create table public.invitations (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references public.profiles (id) on delete cascade,
  email text not null,
  role public.user_role not null,
  token uuid not null default gen_random_uuid(),
  status text not null default 'pending' check (status in ('pending','accepted','revoked')),
  created_at timestamptz not null default now()
);
alter table public.invitations enable row level security;

-- ============================================================
-- RLS policies
-- ============================================================

-- profiles: read own; coaches <-> athletes see each other; guardians <-> athletes see each other
create policy "profiles_select_own_or_linked" on public.profiles for select using (
  id = auth.uid()
  or exists (select 1 from public.coach_athletes ca
             where (ca.coach_id = auth.uid() and ca.athlete_profile_id = profiles.id)
                or (ca.athlete_profile_id = auth.uid() and ca.coach_id = profiles.id))
  or exists (select 1 from public.athlete_guardians ag
             where (ag.guardian_profile_id = auth.uid() and ag.athlete_profile_id = profiles.id)
                or (ag.athlete_profile_id = auth.uid() and ag.guardian_profile_id = profiles.id))
);

create policy "profiles_update_own" on public.profiles for update
  using (id = auth.uid()) with check (id = auth.uid());

-- coach_athletes: coach manages own links; athlete can see links naming them
create policy "ca_coach_all" on public.coach_athletes for all
  using (coach_id = auth.uid()) with check (coach_id = auth.uid());
create policy "ca_athlete_select" on public.coach_athletes for select
  using (athlete_profile_id = auth.uid());

-- athlete_guardians: the athlete's coach manages; athlete and guardian can view
create policy "ag_coach_manage" on public.athlete_guardians for all using (
  exists (select 1 from public.coach_athletes ca
          where ca.coach_id = auth.uid()
            and ca.athlete_profile_id = athlete_guardians.athlete_profile_id)
) with check (
  exists (select 1 from public.coach_athletes ca
          where ca.coach_id = auth.uid()
            and ca.athlete_profile_id = athlete_guardians.athlete_profile_id)
);
create policy "ag_member_select" on public.athlete_guardians for select
  using (athlete_profile_id = auth.uid() or guardian_profile_id = auth.uid());

-- invitations: coach only (claiming by invitee is a Phase 1 edge function)
create policy "inv_coach_all" on public.invitations for all
  using (coach_id = auth.uid()) with check (coach_id = auth.uid());
