-- Founder replies to standup decisions
alter table public.team_standups
  add column if not exists user_responses jsonb default '{}'::jsonb;
