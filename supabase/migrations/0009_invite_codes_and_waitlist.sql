-- Invite-only signup gate.
-- 2 shared campaign codes (MECHADSHIN + LINKEDIN), each with max_uses=20.
-- Waitlist approvals get personal codes with max_uses=1.

create table if not exists invite_codes (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  source text not null,                             -- 'mechadshin' | 'linkedin' | 'waitlist_approval' | 'admin_manual'
  max_uses int not null default 1,
  use_count int not null default 0,
  disabled_at timestamptz,                          -- non-null → code inactive regardless of counter
  created_at timestamptz not null default now()
);

create index if not exists invite_codes_source_idx on invite_codes (source);
create index if not exists invite_codes_active_idx on invite_codes (disabled_at) where disabled_at is null;

-- Track who used which code (for audit + user_id foreign key)
create table if not exists invite_code_uses (
  id uuid primary key default gen_random_uuid(),
  invite_code_id uuid not null references invite_codes(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  used_at timestamptz not null default now()
);

create index if not exists invite_code_uses_code_idx on invite_code_uses (invite_code_id, used_at desc);
create index if not exists invite_code_uses_user_idx on invite_code_uses (user_id);

create table if not exists waitlist (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  name text,
  note text,
  source_hint text,
  status text not null default 'pending',           -- 'pending' | 'approved' | 'rejected'
  approved_at timestamptz,
  approved_by uuid references auth.users(id) on delete set null,
  invite_code_id uuid references invite_codes(id) on delete set null,
  created_at timestamptz not null default now()
);

create unique index if not exists waitlist_email_unique_idx on waitlist (lower(email));
create index if not exists waitlist_status_idx on waitlist (status, created_at desc);

-- RLS
alter table invite_codes enable row level security;
alter table invite_code_uses enable row level security;
alter table waitlist enable row level security;

drop policy if exists "admin read invite_codes" on invite_codes;
create policy "admin read invite_codes"
  on invite_codes for select
  using (
    exists (
      select 1 from profiles where profiles.id = auth.uid() and profiles.plan = 'admin'
    )
  );

drop policy if exists "admin read invite_code_uses" on invite_code_uses;
create policy "admin read invite_code_uses"
  on invite_code_uses for select
  using (
    exists (
      select 1 from profiles where profiles.id = auth.uid() and profiles.plan = 'admin'
    )
  );

drop policy if exists "admin read waitlist" on waitlist;
create policy "admin read waitlist"
  on waitlist for select
  using (
    exists (
      select 1 from profiles where profiles.id = auth.uid() and profiles.plan = 'admin'
    )
  );

drop policy if exists "public insert waitlist" on waitlist;
create policy "public insert waitlist"
  on waitlist for insert
  with check (true);

-- Seed the 2 campaign codes
insert into invite_codes (code, source, max_uses) values
  ('MECHADSHIN', 'mechadshin', 20),
  ('LINKEDIN', 'linkedin', 20)
on conflict (code) do nothing;

-- Atomic claim: bump use_count if still under max_uses and not disabled.
-- Returns the invite_code.id when successful, null when not.
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

  return v_id;
end;
$$;

grant execute on function claim_invite_code(text, uuid) to authenticated;
grant execute on function claim_invite_code(text, uuid) to anon;

-- Mint a personal waitlist-approval code (max_uses=1). Returns the code text.
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
      insert into invite_codes (code, source, max_uses) values (v_code, 'waitlist_approval', 1);
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
