-- Add a custom title to consultations so chats are scannable in the sidebar
alter table public.consultations add column if not exists title text;

create index if not exists idx_consultations_user_created
  on public.consultations(user_id, created_at desc);

create index if not exists idx_packages_user_created
  on public.packages(user_id, created_at desc);
