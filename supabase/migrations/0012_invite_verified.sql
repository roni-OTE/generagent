-- Track whether a user has redeemed a valid invite. This is the *source of truth*
-- for who's allowed into the app. Previous logic used a fragile 60-second
-- profile-age heuristic that broke on DB migrations and edge cases.
--
-- Once invite_verified = true, the user is "in" forever (until we intentionally
-- revoke them). The auth callback checks this column, not profile age.

alter table public.profiles
  add column if not exists invite_verified boolean not null default false;

-- Admins are always considered verified — belt-and-suspenders.
update public.profiles set invite_verified = true where plan = 'admin';

-- Update claim_invite_code to flip the flag when a code is consumed.
create or replace function claim_invite_code(p_code text, p_user_id uuid)
returns uuid
language plpgsql
security definer
as $$
declare
  v_id uuid;
begin
  update invite_codes
     set use_count = use_count + 1
   where upper(code) = upper(p_code)
     and disabled_at is null
     and use_count < max_uses
  returning id into v_id;

  if v_id is null then
    return null;
  end if;

  insert into invite_code_uses (invite_code_id, user_id)
    values (v_id, p_user_id);

  -- Mark the user as verified so future logins skip the gate.
  update public.profiles
     set invite_verified = true,
         updated_at = now()
   where id = p_user_id;

  return v_id;
end;
$$;

grant execute on function claim_invite_code(text, uuid) to authenticated;
grant execute on function claim_invite_code(text, uuid) to anon;
