create table if not exists public.lottery_rounds (
  id bigint primary key,
  status text not null,
  ticket_price numeric not null,
  total_tickets_sold bigint not null,
  prize_pool numeric not null,
  created_at timestamptz,
  closed_at timestamptz
);

create table if not exists public.lottery_winners (
  id bigserial primary key,
  round_id bigint not null,
  ticket_number bigint not null,
  source_chain_id text not null,
  prize_amount numeric not null,
  created_at timestamptz not null default now(),
  unique (round_id, ticket_number, source_chain_id)
);

create index if not exists lottery_winners_created_at_idx on public.lottery_winners (created_at desc);

create or replace function public.prune_lottery_winners()
returns trigger
language plpgsql
as $$
begin
  delete from public.lottery_winners
  where id not in (
    select id from public.lottery_winners order by created_at desc limit 20
  );
  return null;
end;
$$;

drop trigger if exists lottery_winners_prune_trigger on public.lottery_winners;
create trigger lottery_winners_prune_trigger
after insert on public.lottery_winners
for each statement execute function public.prune_lottery_winners();

create or replace view public.lottery_winners_latest as
select * from public.lottery_winners order by created_at desc limit 20;