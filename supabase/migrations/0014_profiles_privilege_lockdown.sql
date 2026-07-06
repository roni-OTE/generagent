-- SECURITY FIX (critical): privilege-escalation via profiles UPDATE.
--
-- The RLS policy `profiles_self_update` used `using (auth.uid() = id)` with NO
-- `with check`, so a logged-in user could update ANY column of their own row
-- using the public anon key directly from the browser console:
--     supabase.from('profiles').update({ plan: 'admin' }).eq('id', myId)
-- → self-promote to admin, zero their token quota, reset trial, flip invite_verified.
--
-- Fix: column-level UPDATE privileges. RLS still restricts WHICH row (own row);
-- these GRANTs restrict WHICH columns. Sensitive columns become unwritable by
-- the `authenticated`/`anon` roles entirely. Server code that must change them
-- uses the service-role key, which bypasses these grants.

-- Revoke blanket UPDATE, then grant back only the user-safe columns.
revoke update on public.profiles from authenticated;
revoke update on public.profiles from anon;

grant update (display_name, avatar_url, updated_at) on public.profiles to authenticated;

-- Belt-and-suspenders: add a WITH CHECK so the row still belongs to the user
-- after update (prevents re-parenting the row id).
drop policy if exists "profiles_self_update" on public.profiles;
create policy "profiles_self_update" on public.profiles for update
  using ( auth.uid() = id )
  with check ( auth.uid() = id );
