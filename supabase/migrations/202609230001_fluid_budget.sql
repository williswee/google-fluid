-- Apply once to the existing Supabase Free project. No prompts or raw IPs are stored.
-- The shared $5 cap covers every deployment using this project, including previews.
begin;

create schema if not exists fluid_private;
revoke all on schema fluid_private from public, anon, authenticated;

create table if not exists fluid_private.budget (
  id text primary key check (id = 'launch'),
  enabled boolean not null default true,
  cap_nanodollars bigint not null default 5000000000 check (cap_nanodollars >= 0),
  spent_nanodollars bigint not null default 0 check (spent_nanodollars >= 0),
  reserved_nanodollars bigint not null default 0 check (reserved_nanodollars >= 0),
  check (spent_nanodollars + reserved_nanodollars <= cap_nanodollars)
);
insert into fluid_private.budget (id) values ('launch') on conflict do nothing;

create table if not exists fluid_private.attempts (
  id uuid primary key,
  created_at timestamptz not null default clock_timestamp(),
  status text not null default 'reserved' check (status in ('reserved', 'settled')),
  input_tokens integer check (input_tokens between 0 and 65536),
  check ((status = 'reserved' and input_tokens is null) or (status = 'settled' and input_tokens is not null))
);

create table if not exists fluid_private.rate_buckets (
  client_hash text not null check (client_hash ~ '^[a-f0-9]{64}$'),
  window_start timestamptz not null,
  attempts integer not null check (attempts > 0),
  primary key (client_hash, window_start)
);
create index if not exists fluid_rate_buckets_window on fluid_private.rate_buckets (window_start);

alter table fluid_private.budget enable row level security;
alter table fluid_private.attempts enable row level security;
alter table fluid_private.rate_buckets enable row level security;
revoke all on all tables in schema fluid_private from public, anon, authenticated;

create or replace function public.fluid_reserve(p_request_id uuid, p_client_hash text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_budget fluid_private.budget%rowtype;
  v_window timestamptz := date_trunc('minute', clock_timestamp());
  v_count integer;
  -- 65,536 tokens covers the documented 64k input limit, at $0.042/M tokens.
  v_reservation constant bigint := 65536::bigint * 42;
begin
  if p_request_id is null or p_client_hash is null or p_client_hash !~ '^[a-f0-9]{64}$' then
    raise exception 'Invalid reservation parameters';
  end if;

  -- All reserve and settle operations acquire this same row lock first.
  -- This makes the cap global and prevents races between serverless instances.
  select * into strict v_budget from fluid_private.budget where id = 'launch' for update;
  if not v_budget.enabled then
    return jsonb_build_object('allowed', false, 'reason', 'disabled');
  end if;
  if exists (select 1 from fluid_private.attempts where id = p_request_id) then
    return jsonb_build_object('allowed', false, 'reason', 'duplicate');
  end if;
  if v_budget.spent_nanodollars + v_budget.reserved_nanodollars + v_reservation > v_budget.cap_nanodollars then
    return jsonb_build_object('allowed', false, 'reason', 'budget_exhausted');
  end if;

  delete from fluid_private.rate_buckets where window_start < v_window - interval '2 minutes';
  insert into fluid_private.rate_buckets (client_hash, window_start, attempts)
    values (p_client_hash, v_window, 1)
    on conflict (client_hash, window_start)
    do update set attempts = fluid_private.rate_buckets.attempts + 1
    returning attempts into v_count;
  if v_count > 120 then
    return jsonb_build_object('allowed', false, 'reason', 'rate_limited');
  end if;

  insert into fluid_private.attempts (id) values (p_request_id);
  update fluid_private.budget
    set reserved_nanodollars = reserved_nanodollars + v_reservation
    where id = 'launch';
  return jsonb_build_object('allowed', true);
end;
$$;

create or replace function public.fluid_settle(p_request_id uuid, p_input_tokens integer)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_attempt fluid_private.attempts%rowtype;
  v_reservation constant bigint := 65536::bigint * 42;
begin
  if p_input_tokens is null or p_input_tokens < 0 or p_input_tokens > 65536 then
    raise exception 'Invalid token usage';
  end if;
  perform 1 from fluid_private.budget where id = 'launch' for update;
  if not found then raise exception 'Budget unavailable'; end if;
  select * into v_attempt from fluid_private.attempts where id = p_request_id for update;
  if not found then return false; end if;
  if v_attempt.status = 'settled' then return v_attempt.input_tokens = p_input_tokens; end if;

  update fluid_private.budget set
    reserved_nanodollars = reserved_nanodollars - v_reservation,
    spent_nanodollars = spent_nanodollars + p_input_tokens::bigint * 42
    where id = 'launch';
  update fluid_private.attempts set status = 'settled', input_tokens = p_input_tokens
    where id = p_request_id;
  return true;
end;
$$;

-- SECURITY DEFINER is intentional: private tables are only reachable through
-- these narrow server-only functions. Browser roles cannot call either function.
revoke all on function public.fluid_reserve(uuid, text) from public, anon, authenticated;
revoke all on function public.fluid_settle(uuid, integer) from public, anon, authenticated;
grant execute on function public.fluid_reserve(uuid, text) to service_role;
grant execute on function public.fluid_settle(uuid, integer) to service_role;

commit;
