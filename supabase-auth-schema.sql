create table if not exists public.finance_user_state (
  user_id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.finance_user_state enable row level security;

grant usage on schema public to authenticated;
grant select, insert, update on public.finance_user_state to authenticated;

drop policy if exists "finance_user_state_select_own" on public.finance_user_state;
drop policy if exists "finance_user_state_insert_own" on public.finance_user_state;
drop policy if exists "finance_user_state_update_own" on public.finance_user_state;

create policy "finance_user_state_select_own"
on public.finance_user_state
for select
to authenticated
using (auth.uid() = user_id);

create policy "finance_user_state_insert_own"
on public.finance_user_state
for insert
to authenticated
with check (auth.uid() = user_id);

create policy "finance_user_state_update_own"
on public.finance_user_state
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
