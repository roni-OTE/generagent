-- Persistent learnings per team agent (so they improve across sessions)
create table if not exists public.agent_memory (
  id            uuid primary key default gen_random_uuid(),
  agent_handle  text not null,
  memory_type   text not null check (memory_type in ('learning','preference','context','decision')),
  content       text not null,
  importance    int not null default 5 check (importance between 1 and 10),
  source_chat_id uuid references public.team_agent_chats(id) on delete set null,
  created_at    timestamptz not null default now(),
  last_used_at  timestamptz
);

create index if not exists idx_agent_memory_handle_importance
  on public.agent_memory(agent_handle, importance desc, created_at desc);

alter table public.agent_memory enable row level security;

drop policy if exists "agent_memory_admin_all" on public.agent_memory;
create policy "agent_memory_admin_all" on public.agent_memory for all
  using ( public.is_admin() )
  with check ( public.is_admin() );
