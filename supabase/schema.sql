-- R_Golf: jaetut kierrokset. Aja Supabasen SQL Editorissa kerran.

create table if not exists games (
  id text primary key,
  code text unique not null,          -- liittymiskoodi, esim. K7M4QX
  game text not null default 'points',
  date date,
  course jsonb not null,              -- kenttä väylineen ja tiin tiedot kopioituna
  tee jsonb,
  players jsonb not null,             -- [{ id, name, hcp, flight }]
  t bigint not null default 0,        -- viimeisimmän muutoksen aikaleima (ms)
  created_at timestamptz not null default now()
);

create table if not exists entries (
  game_id text not null references games(id) on delete cascade,
  player_id text not null,
  hole int not null,                  -- väylän indeksi 0–17
  strokes int,
  fairway boolean not null default false,
  green boolean not null default false,
  t bigint not null,                  -- muokkaushetki puhelimessa (ms)
  primary key (game_id, player_id, hole)
);

-- Uusin muutos voittaa: offline-tilassa tehty vanhempi muutos ei kirjoita uudemman päälle.
create or replace function keep_newest() returns trigger language plpgsql as $$
begin
  if new.t < old.t then return null; end if;
  return new;
end $$;

drop trigger if exists entries_keep_newest on entries;
create trigger entries_keep_newest before update on entries
  for each row execute function keep_newest();

drop trigger if exists games_keep_newest on games;
create trigger games_keep_newest before update on games
  for each row execute function keep_newest();

-- Ei kirjautumista: kierroksen näkee ja sitä voi muokata, kun tietää sen tunnisteen tai koodin.
alter table games enable row level security;
alter table entries enable row level security;

drop policy if exists games_rw on games;
create policy games_rw on games for all to anon using (true) with check (true);
drop policy if exists entries_rw on entries;
create policy entries_rw on entries for all to anon using (true) with check (true);

revoke delete on games, entries from anon;
