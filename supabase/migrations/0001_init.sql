create table if not exists public.call_sessions (
  id               uuid primary key default gen_random_uuid(),
  created_at       timestamptz not null default now(),
  scenario_id      text not null,
  scenario_version integer not null default 1,
  client_id        text,
  group_code       text,
  duration_ms      integer not null,
  transcript       jsonb not null,
  events           jsonb not null,
  state_history    jsonb not null,
  final_facts      jsonb not null,
  analysis         jsonb,
  score            integer,
  outcome          text check (outcome in ('good','delayed','bad'))
);

create index if not exists call_sessions_created_idx on public.call_sessions (created_at desc);
create index if not exists call_sessions_group_idx   on public.call_sessions (group_code, created_at desc);
create index if not exists call_sessions_client_idx  on public.call_sessions (client_id, created_at desc);

-- RLS on sees ja poliitikaid ei ole: brauser andmebaasi ei pääse.
-- Kõik päringud käivad API marsruutide kaudu service role võtmega.
alter table public.call_sessions enable row level security;
