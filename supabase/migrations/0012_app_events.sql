-- App events: the "eyes" of the agent team.
-- Every failed route / health check / anomaly writes a row here.
-- Read by: health cron, standup digest, Yoav's daily Cowork triage task.

create table if not exists app_events (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  level text not null default 'error' check (level in ('info','warn','error')),
  source text not null,          -- e.g. 'consult.turn' | 'consult.finalize' | 'health'
  code text,                     -- e.g. 'api_error' | 'parse_failed' | 'down' | 'recovered' | 'alert_sent'
  message text,
  meta jsonb not null default '{}'::jsonb
);

create index if not exists app_events_created_idx on app_events (created_at desc);
create index if not exists app_events_source_idx on app_events (source, created_at desc);
create index if not exists app_events_code_idx on app_events (code, created_at desc);

-- Service-role access only (no anon/user policies on purpose).
alter table app_events enable row level security;
