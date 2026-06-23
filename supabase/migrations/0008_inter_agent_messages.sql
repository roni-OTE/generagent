-- Inter-agent communication audit log.
-- Every time one team agent pings another (via ping_agent / call_team_meeting tools),
-- we record the question + response here so the founder can audit.

create table if not exists inter_agent_messages (
  id uuid primary key default gen_random_uuid(),
  from_agent text not null,            -- handle of the calling agent (e.g. 'tamar')
  to_agent text not null,              -- handle of the agent that was asked
  message text not null,               -- the question / instruction
  response text,                       -- the answering agent's reply
  meeting_id uuid,                     -- groups parallel call_team_meeting rounds
  source_chat_id uuid references team_agent_chats(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists inter_agent_messages_from_idx on inter_agent_messages (from_agent, created_at desc);
create index if not exists inter_agent_messages_to_idx on inter_agent_messages (to_agent, created_at desc);
create index if not exists inter_agent_messages_chat_idx on inter_agent_messages (source_chat_id, created_at desc);

-- RLS: only admin profiles can read this audit log
alter table inter_agent_messages enable row level security;

create policy "admin read inter_agent_messages"
  on inter_agent_messages for select
  using (
    exists (
      select 1 from profiles
      where profiles.id = auth.uid()
        and profiles.plan = 'admin'
    )
  );

-- Service role bypass (used by API routes)
-- No insert policy needed; we always write with the service client.
