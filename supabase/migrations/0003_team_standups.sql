-- Team standup system: every-2-days meeting summaries

create table if not exists public.team_standups (
  id                uuid primary key default gen_random_uuid(),
  standup_date      timestamptz not null default now(),
  summary_md        text not null,
  highlights        text[] default array[]::text[],
  decisions_needed  text[] default array[]::text[],
  metrics_json      jsonb default '{}'::jsonb,
  agent_inputs      jsonb default '{}'::jsonb,
  email_sent        boolean default false,
  created_at        timestamptz not null default now()
);

create index if not exists idx_team_standups_date
  on public.team_standups(standup_date desc);

alter table public.team_standups enable row level security;

-- Only admins can read
drop policy if exists "team_standups_admin_read" on public.team_standups;
create policy "team_standups_admin_read" on public.team_standups for select
  using ( public.is_admin() );

-- service role bypasses RLS (used by cron endpoint)
