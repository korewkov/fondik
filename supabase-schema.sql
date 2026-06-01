create table if not exists public.finance_app_state (
  id text primary key,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.finance_app_state enable row level security;

grant usage on schema public to anon;
grant select, insert, update on public.finance_app_state to anon;

drop policy if exists "finance_app_state_select" on public.finance_app_state;
drop policy if exists "finance_app_state_insert" on public.finance_app_state;
drop policy if exists "finance_app_state_update" on public.finance_app_state;

create policy "finance_app_state_select"
on public.finance_app_state
for select
to anon
using (id = 'personal-finance');

create policy "finance_app_state_insert"
on public.finance_app_state
for insert
to anon
with check (id = 'personal-finance');

create policy "finance_app_state_update"
on public.finance_app_state
for update
to anon
using (id = 'personal-finance')
with check (id = 'personal-finance');
