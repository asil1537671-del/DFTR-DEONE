-- Run this once in Supabase SQL Editor.
-- Each authenticated user can only read and change their own ledger snapshot.
create table if not exists public.user_ledgers (
  user_id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null default '{"clients":[],"profits":[],"personalWithdrawals":[],"settings":{}}'::jsonb,
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.user_ledgers enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'user_ledgers' and policyname = 'Users read only their ledger'
  ) then
    create policy "Users read only their ledger"
      on public.user_ledgers for select to authenticated
      using ((select auth.uid()) = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'user_ledgers' and policyname = 'Users insert only their ledger'
  ) then
    create policy "Users insert only their ledger"
      on public.user_ledgers for insert to authenticated
      with check ((select auth.uid()) = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'user_ledgers' and policyname = 'Users update only their ledger'
  ) then
    create policy "Users update only their ledger"
      on public.user_ledgers for update to authenticated
      using ((select auth.uid()) = user_id)
      with check ((select auth.uid()) = user_id);
  end if;
end $$;

grant select, insert, update on public.user_ledgers to authenticated;
