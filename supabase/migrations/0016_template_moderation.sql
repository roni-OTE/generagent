-- Marketplace moderation: let an admin permanently take a template down.
-- `admin_blocked = true` hides it AND prevents the author from re-publishing.

alter table public.templates
  add column if not exists admin_blocked boolean not null default false;

create index if not exists idx_templates_blocked on public.templates(admin_blocked) where admin_blocked = true;
