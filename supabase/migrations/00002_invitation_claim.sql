-- ============================================================
-- Phase 1: invitation claiming via SECURITY DEFINER function.
-- RLS blocks invitees from reading coach invitations, so the
-- claim runs through this controlled, transactional path.
-- ============================================================

create index if not exists invitations_token_idx on public.invitations (token);

create or replace function public.claim_invitation(invite_token uuid)
returns json
language plpgsql security definer set search_path = public as $$
declare
  inv record;
  claimer_role public.user_role;
  claimer_email text;
begin
  if auth.uid() is null then
    raise exception 'You must be signed in to accept an invitation.';
  end if;

  select * into inv from public.invitations
    where token = invite_token and status = 'pending';
  if not found then
    raise exception 'This invitation is invalid or has already been used.';
  end if;

  select role into claimer_role from public.profiles where id = auth.uid();
  select lower(email) into claimer_email from auth.users where id = auth.uid();

  -- The invite is bound to the email the coach entered.
  if claimer_email is distinct from lower(inv.email) then
    raise exception 'This invitation was sent to a different email address.';
  end if;

  if inv.role = 'athlete' then
    if claimer_role <> 'athlete' then
      raise exception 'This invitation is for a player account.';
    end if;
    insert into public.coach_athletes (coach_id, athlete_profile_id, status)
    values (inv.coach_id, auth.uid(), 'active')
    on conflict (coach_id, athlete_profile_id) do update set status = 'active';
  else
    -- Parent/guardian invitations land in a later phase.
    raise exception 'Only player invitations are supported right now.';
  end if;

  update public.invitations set status = 'accepted' where id = inv.id;
  return json_build_object('coach_id', inv.coach_id);
end $$;

-- Locked down: only signed-in users may call it.
revoke all on function public.claim_invitation(uuid) from public, anon;
grant execute on function public.claim_invitation(uuid) to authenticated;
