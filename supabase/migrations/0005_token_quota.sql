-- Token quota per user (rolling 30-day period)
alter table public.profiles
  add column if not exists tokens_used_period bigint not null default 0,
  add column if not exists tokens_period_started_at timestamptz not null default now(),
  add column if not exists tokens_lifetime bigint not null default 0;

-- Atomic helper to add tokens to a user's counters (bypasses RLS via SECURITY DEFINER)
create or replace function public.add_user_tokens(p_user_id uuid, p_tokens bigint)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Reset period if older than 30 days
  update public.profiles
  set tokens_used_period = 0,
      tokens_period_started_at = now()
  where id = p_user_id
    and tokens_period_started_at < now() - interval '30 days';

  update public.profiles
  set tokens_used_period = tokens_used_period + greatest(p_tokens, 0),
      tokens_lifetime    = tokens_lifetime + greatest(p_tokens, 0),
      updated_at         = now()
  where id = p_user_id;
end;
$$;
