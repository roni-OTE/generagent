-- Direct chats with internal team agents (admin-only)

create table if not exists public.team_agent_chats (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  agent_handle  text not null,
  title         text,
  archived      boolean default false,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists idx_team_agent_chats_user_handle
  on public.team_agent_chats(user_id, agent_handle, updated_at desc);

create table if not exists public.team_agent_messages (
  id          uuid primary key default gen_random_uuid(),
  chat_id     uuid not null references public.team_agent_chats(id) on delete cascade,
  role        text not null check (role in ('user','agent','tool')),
  content     text not null,
  tool_name   text,
  tool_args   jsonb,
  tool_result jsonb,
  created_at  timestamptz not null default now()
);

create index if not exists idx_team_agent_messages_chat
  on public.team_agent_messages(chat_id, created_at);

alter table public.team_agent_chats enable row level security;
alter table public.team_agent_messages enable row level security;

drop policy if exists "team_chats_admin_all" on public.team_agent_chats;
create policy "team_chats_admin_all" on public.team_agent_chats for all
  using ( public.is_admin() )
  with check ( public.is_admin() );

drop policy if exists "team_msgs_admin_all" on public.team_agent_messages;
create policy "team_msgs_admin_all" on public.team_agent_messages for all
  using ( public.is_admin() )
  with check ( public.is_admin() );
