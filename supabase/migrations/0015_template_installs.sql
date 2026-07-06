-- Marketplace: install counter for published templates.
-- Called (best-effort) from the public install endpoint when a template is fetched.

create or replace function public.increment_template_installs(p_template_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update public.templates
    set install_count = install_count + 1
  where id = p_template_id and published = true;
$$;

grant execute on function public.increment_template_installs(uuid) to anon, authenticated;
