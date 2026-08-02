-- 0001_init.sql — Esquema inicial de la Liga de Pádel
-- Ejecutar en el SQL Editor de Supabase (o con `supabase db push`).

create extension if not exists pgcrypto;

-- Jugadores: titulares (los 8 fijos) y sustitutos
create table players (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  role text not null check (role in ('titular', 'sustituto')),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- Ligas: solo puede haber una activa; las finalizadas son de solo consulta
create table leagues (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  status text not null default 'active' check (status in ('active', 'finished')),
  created_at timestamptz not null default now(),
  finished_at timestamptz
);

create unique index one_active_league on leagues (status) where status = 'active';

-- Parejas: inmutables durante toda la liga
create table pairs (
  id uuid primary key default gen_random_uuid(),
  league_id uuid not null references leagues (id) on delete cascade,
  player1_id uuid not null references players (id),
  player2_id uuid not null references players (id),
  position int not null check (position between 1 and 4),
  unique (league_id, position),
  unique (league_id, player1_id),
  unique (league_id, player2_id)
);

-- Jornadas: 3 por liga (round-robin de 4 parejas)
create table rounds (
  id uuid primary key default gen_random_uuid(),
  league_id uuid not null references leagues (id) on delete cascade,
  number int not null check (number between 1 and 3),
  status text not null default 'pending' check (status in ('pending', 'current', 'finished')),
  unique (league_id, number)
);

-- Partidos: 2 por jornada; solo se registra el ganador
create table matches (
  id uuid primary key default gen_random_uuid(),
  round_id uuid not null references rounds (id) on delete cascade,
  position int not null check (position between 1 and 2),
  pair_a_id uuid not null references pairs (id),
  pair_b_id uuid not null references pairs (id),
  winner_pair_id uuid references pairs (id),
  created_at timestamptz not null default now(),
  unique (round_id, position)
);

-- Alineación real de cada partido: quién jugó cada slot de la pareja.
-- Sin ausencia, actual_player_id = titular_id. Las parejas no se tocan.
create table match_players (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references matches (id) on delete cascade,
  pair_id uuid not null references pairs (id),
  titular_id uuid not null references players (id),
  actual_player_id uuid not null references players (id),
  unique (match_id, pair_id, titular_id)
);

-- Responsable de llevar las pelotas, por partido (autoasignado y editable)
create table ball_duties (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references matches (id) on delete cascade unique,
  player_id uuid not null references players (id)
);
