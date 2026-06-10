-- ============================================
-- GenerAgent · initial schema
-- run from Supabase SQL Editor (one-shot)
-- ============================================

-- ===== Extensions =====
create extension if not exists pgcrypto;

-- ===== Profiles (mirrors auth.users) =====
create table if not exists public.profiles (
  id              uuid primary key references auth.users(id) on delete cascade,
  email           text not null,
  display_name    text,
  avatar_url      text,
  trial_started_at timestamptz not null default now(),
  custom_agents_count int not null default 0,
  plan            text not null default 'trial' check (plan in ('trial','pro','admin','expired')),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, display_name, avatar_url, plan)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email,'@',1)),
    new.raw_user_meta_data->>'avatar_url',
    case when new.email = 'roni@otegroup.co.il' then 'admin' else 'trial' end
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ===== Legal acceptances (click-wrap audit trail) =====
create table if not exists public.legal_acceptances (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  document        text not null check (document in ('terms','privacy')),
  version         text not null,
  accepted_at     timestamptz not null default now(),
  ip_address      inet,
  user_agent      text,
  document_hash   text
);
create index if not exists idx_legal_user on public.legal_acceptances(user_id);

-- ===== Consultations (bot interviews) =====
create table if not exists public.consultations (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  status          text not null default 'in_progress' check (status in ('in_progress','analyzing','completed','abandoned')),
  phase           text not null default 'discovery' check (phase in ('discovery','deep_dive','refinement','done')),
  started_at      timestamptz not null default now(),
  completed_at    timestamptz,
  question_count  int not null default 0,
  confidence      numeric(3,2) default 0,
  detected_persona text,
  source_template_id uuid,  -- nullable; set if started from template
  analysis_json   jsonb,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index if not exists idx_consultations_user on public.consultations(user_id);

-- ===== Messages (per-consultation transcript) =====
create table if not exists public.messages (
  id              uuid primary key default gen_random_uuid(),
  consultation_id uuid not null references public.consultations(id) on delete cascade,
  role            text not null check (role in ('bot','user','system')),
  content         text not null,
  question_id     text,
  micro_explanation text,
  created_at      timestamptz not null default now()
);
create index if not exists idx_messages_consultation on public.messages(consultation_id, created_at);

-- ===== Packages (generated agent installation packages) =====
create table if not exists public.packages (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  consultation_id uuid references public.consultations(id) on delete set null,
  source_template_id uuid,  -- nullable; set if cloned from template
  name            text not null,
  description     text,
  archetype       text,
  version         text not null default '1.0.0',
  target_platform text[] not null default array['claude-code'],
  manifest_json   jsonb not null default '{}'::jsonb,
  zip_storage_path text,
  install_guide_md text,
  required_connectors text[] default array[]::text[],
  is_template_clone boolean not null default false,  -- TRUE = doesn't count toward trial
  download_count  int not null default 0,
  created_at      timestamptz not null default now()
);
create index if not exists idx_packages_user on public.packages(user_id);

-- ===== Templates (community library) =====
create table if not exists public.templates (
  id              uuid primary key default gen_random_uuid(),
  author_id       uuid references auth.users(id) on delete set null,
  source_package_id uuid references public.packages(id) on delete set null,
  slug            text unique not null,
  name            text not null,
  description     text,
  tags            text[] default array[]::text[],
  persona         text,
  manifest_json   jsonb not null,
  install_count   int not null default 0,
  star_count      int not null default 0,
  published       boolean not null default true,
  created_at      timestamptz not null default now()
);
create index if not exists idx_templates_published on public.templates(published, install_count desc);

-- ===== Trial entitlement helper (read-only view) =====
create or replace view public.user_entitlement as
select
  p.id,
  p.email,
  p.plan,
  p.trial_started_at,
  p.custom_agents_count,
  (now() - p.trial_started_at) as trial_age,
  greatest(0, 14 - extract(day from (now() - p.trial_started_at))::int) as days_left,
  greatest(0, 2 - p.custom_agents_count) as agents_left,
  case
    when p.plan in ('pro','admin') then true
    when (now() - p.trial_started_at) < interval '14 days' and p.custom_agents_count < 2 then true
    else false
  end as can_create_custom_agent,
  -- Templates always allowed
  true as can_clone_template
from public.profiles p;

-- ============================================
-- Row Level Security (RLS) policies
-- ============================================

alter table public.profiles enable row level security;
alter table public.legal_acceptances enable row level security;
alter table public.consultations enable row level security;
alter table public.messages enable row level security;
alter table public.packages enable row level security;
alter table public.templates enable row level security;

-- Profiles: user reads own + admin reads all
drop policy if exists "profiles_self_read" on public.profiles;
create policy "profiles_self_read" on public.profiles for select
  using ( auth.uid() = id or exists (select 1 from public.profiles p where p.id = auth.uid() and p.plan = 'admin') );

drop policy if exists "profiles_self_update" on public.profiles;
create policy "profiles_self_update" on public.profiles for update
  using ( auth.uid() = id );

-- Legal acceptances: user writes/reads own + admin reads all
drop policy if exists "legal_self_insert" on public.legal_acceptances;
create policy "legal_self_insert" on public.legal_acceptances for insert
  with check ( auth.uid() = user_id );

drop policy if exists "legal_self_read" on public.legal_acceptances;
create policy "legal_self_read" on public.legal_acceptances for select
  using ( auth.uid() = user_id or exists (select 1 from public.profiles p where p.id = auth.uid() and p.plan = 'admin') );

-- Consultations: user owns + admin reads all
drop policy if exists "consultations_self_all" on public.consultations;
create policy "consultations_self_all" on public.consultations for all
  using ( auth.uid() = user_id )
  with check ( auth.uid() = user_id );

drop policy if exists "consultations_admin_read" on public.consultations;
create policy "consultations_admin_read" on public.consultations for select
  using ( exists (select 1 from public.profiles p where p.id = auth.uid() and p.plan = 'admin') );

-- Messages: user reads own consultation messages + admin reads all
drop policy if exists "messages_self_all" on public.messages;
create policy "messages_self_all" on public.messages for all
  using (
    exists (select 1 from public.consultations c where c.id = messages.consultation_id and c.user_id = auth.uid())
  )
  with check (
    exists (select 1 from public.consultations c where c.id = messages.consultation_id and c.user_id = auth.uid())
  );

drop policy if exists "messages_admin_read" on public.messages;
create policy "messages_admin_read" on public.messages for select
  using ( exists (select 1 from public.profiles p where p.id = auth.uid() and p.plan = 'admin') );

-- Packages: user owns + admin reads all
drop policy if exists "packages_self_all" on public.packages;
create policy "packages_self_all" on public.packages for all
  using ( auth.uid() = user_id )
  with check ( auth.uid() = user_id );

drop policy if exists "packages_admin_read" on public.packages;
create policy "packages_admin_read" on public.packages for select
  using ( exists (select 1 from public.profiles p where p.id = auth.uid() and p.plan = 'admin') );

-- Templates: read by anyone authenticated, write by author or admin
drop policy if exists "templates_read_published" on public.templates;
create policy "templates_read_published" on public.templates for select
  using ( published = true or author_id = auth.uid() or exists (select 1 from public.profiles p where p.id = auth.uid() and p.plan = 'admin') );

drop policy if exists "templates_author_write" on public.templates;
create policy "templates_author_write" on public.templates for all
  using ( author_id = auth.uid() or exists (select 1 from public.profiles p where p.id = auth.uid() and p.plan = 'admin') )
  with check ( author_id = auth.uid() or exists (select 1 from public.profiles p where p.id = auth.uid() and p.plan = 'admin') );

-- ===== Atomic counter increment for custom agents =====
create or replace function public.increment_custom_agents(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.profiles
  set custom_agents_count = custom_agents_count + 1,
      updated_at = now()
  where id = p_user_id;
end;
$$;
