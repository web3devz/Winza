create table if not exists public.rounds (
  id bigint not null,
  chain text not null check (chain in ('btc','eth')),
  status text not null,
  resolution_price numeric,
  closing_price numeric,
  up_bets integer not null default 0,
  down_bets integer not null default 0,
  result text,
  prize_pool numeric not null default 0,
  up_bets_pool numeric not null default 0,
  down_bets_pool numeric not null default 0,
  created_at timestamptz not null,
  resolved_at timestamptz,
  closed_at timestamptz,
  primary key (chain, id)
);

create index if not exists rounds_chain_status_idx on public.rounds (chain, status);
create index if not exists rounds_created_at_idx on public.rounds (created_at);

alter table public.rounds enable row level security;

create policy if not exists rounds_select_anon on public.rounds
for select
to anon
using (true);
