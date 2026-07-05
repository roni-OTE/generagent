-- User feedback — collected from lifecycle emails (abandonment / follow-up) and the site.
-- Inserted via API route with the service client; RLS locked, no public policies.

create table if not exists feedback_responses (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  user_id uuid references auth.users(id) on delete set null,
  email text,
  rating int check (rating between 1 and 5),
  what_worked text,
  what_missing text,
  source text not null default 'site'  -- 'abandoned_email' | 'followup_email' | 'site'
);

create index if not exists feedback_created_idx on feedback_responses (created_at desc);

alter table feedback_responses enable row level security;
