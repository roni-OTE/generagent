-- Invite-only signup gate: 40 unique codes (20 מחדשין + 20 LinkedIn).
-- Anyone else lands in a waitlist, admin approves → auto-emailed a fresh code.

create table if not exists invite_codes (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  source text not null,                             -- 'mechadshin' | 'linkedin' | 'waitlist_approval' | 'admin_manual'
  used_by_user_id uuid references auth.users(id) on delete set null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists invite_codes_source_idx on invite_codes (source);
create index if not exists invite_codes_used_idx on invite_codes (used_at);

create table if not exists waitlist (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  name text,
  note text,
  source_hint text,                                 -- 'mechadshin' | 'linkedin' | 'other' — how they heard
  status text not null default 'pending',           -- 'pending' | 'approved' | 'rejected'
  approved_at timestamptz,
  approved_by uuid references auth.users(id) on delete set null,
  invite_code_id uuid references invite_codes(id) on delete set null,
  created_at timestamptz not null default now()
);

create unique index if not exists waitlist_email_unique_idx on waitlist (lower(email));
create index if not exists waitlist_status_idx on waitlist (status, created_at desc);

-- RLS: admin-only reads. Public insert into waitlist only.
alter table invite_codes enable row level security;
alter table waitlist enable row level security;

drop policy if exists "admin read invite_codes" on invite_codes;
create policy "admin read invite_codes"
  on invite_codes for select
  using (
    exists (
      select 1 from profiles
      where profiles.id = auth.uid()
        and profiles.plan = 'admin'
    )
  );

drop policy if exists "admin read waitlist" on waitlist;
create policy "admin read waitlist"
  on waitlist for select
  using (
    exists (
      select 1 from profiles
      where profiles.id = auth.uid()
        and profiles.plan = 'admin'
    )
  );

drop policy if exists "public insert waitlist" on waitlist;
create policy "public insert waitlist"
  on waitlist for insert
  with check (true);

-- Seed 40 codes (deterministic; only inserted if not already present)
insert into invite_codes (code, source) values
('MECH-SAKH', 'mechadshin'),
('MECH-ERC3', 'mechadshin'),
('MECH-SRLJ', 'mechadshin'),
('MECH-9N4Q', 'mechadshin'),
('MECH-8L7S', 'mechadshin'),
('MECH-E4CM', 'mechadshin'),
('MECH-EUKM', 'mechadshin'),
('MECH-RKJA', 'mechadshin'),
('MECH-LAZE', 'mechadshin'),
('MECH-ERMF', 'mechadshin'),
('MECH-W62M', 'mechadshin'),
('MECH-QCF8', 'mechadshin'),
('MECH-GYPC', 'mechadshin'),
('MECH-QUC6', 'mechadshin'),
('MECH-2NT4', 'mechadshin'),
('MECH-KGA7', 'mechadshin'),
('MECH-BBVZ', 'mechadshin'),
('MECH-VPMW', 'mechadshin'),
('MECH-PVG3', 'mechadshin'),
('MECH-N5FL', 'mechadshin'),
('LINK-PKRU', 'linkedin'),
('LINK-VHN3', 'linkedin'),
('LINK-JW5K', 'linkedin'),
('LINK-XJXP', 'linkedin'),
('LINK-Y6C6', 'linkedin'),
('LINK-V6DU', 'linkedin'),
('LINK-4TQN', 'linkedin'),
('LINK-QN8N', 'linkedin'),
('LINK-MTBG', 'linkedin'),
('LINK-FBDQ', 'linkedin'),
('LINK-7L2C', 'linkedin'),
('LINK-LCZ5', 'linkedin'),
('LINK-X8BD', 'linkedin'),
('LINK-WQF4', 'linkedin'),
('LINK-6GR2', 'linkedin'),
('LINK-F7ND', 'linkedin'),
('LINK-6AW7', 'linkedin'),
('LINK-E8B4', 'linkedin'),
('LINK-3HRS', 'linkedin'),
('LINK-GCVK', 'linkedin')
on conflict (code) do nothing;

-- SECURITY DEFINER helper: consume a code atomically at signup time.
-- Returns true if the code was unused and is now claimed by user_id.
create or replace function claim_invite_code(p_code text, p_user_id uuid)
returns boolean
language plpgsql
security definer
as $$
declare
  v_rows int;
begin
  update invite_codes
     set used_by_user_id = p_user_id,
         used_at = now()
   where code = p_code
     and used_by_user_id is null;
  get diagnostics v_rows = row_count;
  return v_rows > 0;
end;
$$;

grant execute on function claim_invite_code(text, uuid) to authenticated;
grant execute on function claim_invite_code(text, uuid) to anon;

-- SECURITY DEFINER helper: mint a fresh code when admin approves a waitlist entry.
-- Uses a short random component; ensures uniqueness.
create or replace function mint_waitlist_code(p_prefix text default 'WAIT')
returns text
language plpgsql
security definer
as $$
declare
  v_chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  v_code text;
  v_ok boolean := false;
  v_try int := 0;
begin
  while not v_ok and v_try < 20 loop
    v_code := p_prefix || '-' ||
              substr(v_chars, 1 + floor(random() * 32)::int, 1) ||
              substr(v_chars, 1 + floor(random() * 32)::int, 1) ||
              substr(v_chars, 1 + floor(random() * 32)::int, 1) ||
              substr(v_chars, 1 + floor(random() * 32)::int, 1);
    begin
      insert into invite_codes (code, source) values (v_code, 'waitlist_approval');
      v_ok := true;
    exception when unique_violation then
      v_try := v_try + 1;
    end;
  end loop;
  if not v_ok then
    raise exception 'failed to mint unique waitlist code';
  end if;
  return v_code;
end;
$$;

grant execute on function mint_waitlist_code(text) to authenticated;
