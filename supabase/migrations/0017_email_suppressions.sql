-- Email suppression list — recipients who opted out of lifecycle/marketing mail.
-- Required for Amendment 40 (Israeli anti-spam law) compliance: every mailing must
-- honor unsubscribe requests. Checked before every send in the lifecycle cron.
--
-- Emails are stored lowercased. Upsert on unsubscribe; presence = suppressed.

create table if not exists public.email_suppressions (
  email      text primary key,
  reason     text not null default 'unsubscribe',
  source     text,
  created_at timestamptz not null default now()
);

create index if not exists idx_email_suppressions_created
  on public.email_suppressions(created_at);

-- Service-role code (lifecycle cron, unsubscribe route) bypasses RLS.
-- Enable RLS with no public policies so the anon/user client cannot read the list.
alter table public.email_suppressions enable row level security;
