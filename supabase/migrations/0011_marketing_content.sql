-- Shira's marketing output archive.
-- Every time we ask Shira for content, we store it here so Roni can copy/paste later.

create table if not exists marketing_content (
  id uuid primary key default gen_random_uuid(),
  format text not null,                             -- 'whatsapp' | 'linkedin' | 'blog' | 'landing_hero' | 'email_teaser'
  topic text,                                       -- what Shira was asked to write about
  title text,                                       -- short title/hook
  body text not null,                               -- the full content, ready to copy
  hook text,                                        -- shorter version / opening line (for status/teaser)
  metadata jsonb,                                   -- e.g. { model, tokens, params_used }
  created_by uuid references auth.users(id) on delete set null,
  used_at timestamptz,                              -- Roni can mark as "used"
  created_at timestamptz not null default now()
);

create index if not exists marketing_content_format_idx on marketing_content (format, created_at desc);
create index if not exists marketing_content_created_idx on marketing_content (created_at desc);

alter table marketing_content enable row level security;

drop policy if exists "admin read marketing_content" on marketing_content;
create policy "admin read marketing_content"
  on marketing_content for select
  using (exists (select 1 from profiles where profiles.id = auth.uid() and profiles.plan = 'admin'));

drop policy if exists "admin update marketing_content" on marketing_content;
create policy "admin update marketing_content"
  on marketing_content for update
  using (exists (select 1 from profiles where profiles.id = auth.uid() and profiles.plan = 'admin'));

drop policy if exists "admin delete marketing_content" on marketing_content;
create policy "admin delete marketing_content"
  on marketing_content for delete
  using (exists (select 1 from profiles where profiles.id = auth.uid() and profiles.plan = 'admin'));
