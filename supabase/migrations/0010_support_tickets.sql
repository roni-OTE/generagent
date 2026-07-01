-- Support ticketing. User fills a form → Dana AI auto-replies via email.
-- No live chat UI (deliberate — Roni doesn't want token drain from open conversations).

create table if not exists support_tickets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  email text not null,
  name text,
  subject text,
  category text,                                    -- 'install' | 'bug' | 'billing' | 'how_to' | 'other'
  status text not null default 'open',              -- 'open' | 'answered' | 'escalated' | 'closed'
  escalated boolean not null default false,
  first_message_id uuid,
  last_message_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists support_tickets_email_idx on support_tickets (lower(email), created_at desc);
create index if not exists support_tickets_status_idx on support_tickets (status, last_message_at desc);
create index if not exists support_tickets_escalated_idx on support_tickets (escalated) where escalated = true;

create table if not exists support_messages (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references support_tickets(id) on delete cascade,
  direction text not null,                          -- 'inbound' (from user) | 'outbound' (from Dana/admin)
  from_role text not null,                          -- 'user' | 'dana' | 'admin'
  content text not null,
  metadata jsonb,                                   -- e.g. { tokens_used, escalation_reason }
  created_at timestamptz not null default now()
);

create index if not exists support_messages_ticket_idx on support_messages (ticket_id, created_at asc);

-- RLS: admin-only reads. Public insert into tickets/messages via API only.
alter table support_tickets enable row level security;
alter table support_messages enable row level security;

drop policy if exists "admin read support_tickets" on support_tickets;
create policy "admin read support_tickets"
  on support_tickets for select
  using (exists (select 1 from profiles where profiles.id = auth.uid() and profiles.plan = 'admin'));

drop policy if exists "admin read support_messages" on support_messages;
create policy "admin read support_messages"
  on support_messages for select
  using (exists (select 1 from profiles where profiles.id = auth.uid() and profiles.plan = 'admin'));

-- User may see their own tickets if signed in
drop policy if exists "user read own tickets" on support_tickets;
create policy "user read own tickets"
  on support_tickets for select
  using (user_id = auth.uid());

drop policy if exists "user read own messages" on support_messages;
create policy "user read own messages"
  on support_messages for select
  using (
    exists (
      select 1 from support_tickets t
      where t.id = ticket_id and t.user_id = auth.uid()
    )
  );
