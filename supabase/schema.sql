-- Futcards · cuentas, historial, ranking y reputación de anfitriones.
-- Pégalo entero en el editor SQL de Supabase y ejecútalo. Se puede volver a ejecutar sin perder datos.
--
-- Las tablas no admiten acceso directo (RLS sin políticas): todo pasa por las funciones de abajo,
-- que comprueban quién llama con auth.uid().

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text not null,
  created_at timestamptz not null default now(),
  games int not null default 0,
  wins int not null default 0,
  host_games int not null default 0,
  host_abandons int not null default 0,
  host_banned_until timestamptz
);
create unique index if not exists profiles_username_key on public.profiles (lower(username));

create table if not exists public.games (
  id uuid primary key default gen_random_uuid(),
  code text not null,
  host_id uuid not null references public.profiles (id) on delete cascade,
  status text not null default 'playing' check (status in ('playing', 'finished', 'abandoned')),
  season text not null,
  clubs int not null,
  -- Solo puntúan para el ranking las partidas con al menos dos usuarios registrados.
  ranked boolean not null default false,
  started_at timestamptz not null default now(),
  last_seen timestamptz not null default now(),
  ended_at timestamptz
);
create index if not exists games_host_idx on public.games (host_id, status);

create table if not exists public.game_players (
  game_id uuid not null references public.games (id) on delete cascade,
  seat int not null,
  user_id uuid references public.profiles (id) on delete set null,
  name text not null,
  is_bot boolean not null,
  points int,
  goals int,
  position int,
  primary key (game_id, seat)
);
create index if not exists game_players_user_idx on public.game_players (user_id);

create table if not exists public.host_ratings (
  game_id uuid not null references public.games (id) on delete cascade,
  rater_id uuid not null references public.profiles (id) on delete cascade,
  host_id uuid not null references public.profiles (id) on delete cascade,
  stars int not null check (stars between 1 and 5),
  created_at timestamptz not null default now(),
  primary key (game_id, rater_id)
);
create index if not exists host_ratings_host_idx on public.host_ratings (host_id, created_at desc);

alter table public.profiles enable row level security;
alter table public.games enable row level security;
alter table public.game_players enable row level security;
alter table public.host_ratings enable row level security;

-- ---------------------------------------------------------------- Alta de usuario

create or replace function public.clean_username(p text) returns text
language sql immutable as $$
  select left(btrim(regexp_replace(coalesce(p, ''), '[^[:alnum:]_ ]', '', 'g')), 16)
$$;

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  base text := clean_username(new.raw_user_meta_data ->> 'username');
  candidate text;
  n int := 0;
begin
  if length(base) < 3 then base := 'Club'; end if;
  candidate := base;
  while exists (select 1 from profiles where lower(username) = lower(candidate)) loop
    n := n + 1;
    candidate := left(base, 12) || n::text;
  end loop;
  insert into profiles (id, username) values (new.id, candidate);
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.username_available(p_username text) returns boolean
language sql stable security definer set search_path = public as $$
  select length(clean_username(p_username)) >= 3
     and clean_username(p_username) = btrim(p_username)
     and not exists (select 1 from profiles where lower(username) = lower(btrim(p_username)))
$$;

-- ---------------------------------------------------------------- Reputación del anfitrión

-- Sanción temporal: no puede crear salas hasta la fecha indicada.
--  · 2 o más partidas abandonadas en 7 días: 24 h por cada abandono a partir del segundo (máx. 7 días).
--  · Media inferior a 2,5 estrellas en sus 5 últimas valoraciones (mínimo 3): 24 h.
create or replace function public.apply_host_penalty(p_host uuid) returns void
language plpgsql security definer set search_path = public as $$
declare
  abandons int;
  avg_stars numeric;
  votes int;
  until_ts timestamptz;
begin
  select count(*) into abandons from games
   where host_id = p_host and status = 'abandoned' and ended_at > now() - interval '7 days';
  if abandons >= 2 then
    until_ts := now() + least(abandons - 1, 7) * interval '24 hours';
  end if;

  select avg(stars), count(*) into avg_stars, votes
    from (select stars from host_ratings where host_id = p_host order by created_at desc limit 5) recent;
  if votes >= 3 and avg_stars < 2.5 then
    until_ts := greatest(coalesce(until_ts, now()), now() + interval '24 hours');
  end if;

  if until_ts is not null then
    update profiles set host_banned_until = greatest(coalesce(host_banned_until, until_ts), until_ts) where id = p_host;
  end if;
end $$;

-- Da por abandonadas las partidas de un anfitrión que lleva más de 30 minutos sin dar señales.
create or replace function public.sweep_host(p_host uuid) returns void
language plpgsql security definer set search_path = public as $$
declare
  swept int;
begin
  update games set status = 'abandoned', ended_at = now()
   where host_id = p_host and status = 'playing' and last_seen < now() - interval '30 minutes';
  get diagnostics swept = row_count;
  if swept > 0 then
    update profiles set host_abandons = host_abandons + swept where id = p_host;
    perform apply_host_penalty(p_host);
  end if;
end $$;

create or replace function public.host_card(p_user uuid) returns json
language sql stable security definer set search_path = public as $$
  select json_build_object(
    'username', p.username,
    'host_games', p.host_games,
    'host_abandons', p.host_abandons,
    'stars', (select round(avg(stars), 1) from host_ratings where host_id = p.id),
    'votes', (select count(*) from host_ratings where host_id = p.id))
  from profiles p where p.id = p_user
$$;

create or replace function public.my_profile() returns json
language plpgsql security definer set search_path = public as $$
declare
  me uuid := auth.uid();
begin
  if me is null then raise exception 'Inicia sesión.'; end if;
  perform sweep_host(me);
  return (
    select json_build_object(
      'id', p.id, 'username', p.username, 'games', p.games, 'wins', p.wins,
      'host_games', p.host_games, 'host_abandons', p.host_abandons,
      'host_banned_until', case when p.host_banned_until > now() then p.host_banned_until end,
      'stars', (select round(avg(stars), 1) from host_ratings where host_id = p.id),
      'votes', (select count(*) from host_ratings where host_id = p.id))
    from profiles p where p.id = me);
end $$;

create or replace function public.set_username(p_username text) returns text
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'Inicia sesión.'; end if;
  if not username_available(p_username) then raise exception 'Ese nombre no está disponible.'; end if;
  update profiles set username = btrim(p_username) where id = auth.uid();
  return btrim(p_username);
end $$;

-- ---------------------------------------------------------------- Partidas

-- El anfitrión registra la partida al empezar. Devuelve su identificador.
create or replace function public.start_game(p_code text, p_season text, p_clubs int, p_players jsonb) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  me uuid := auth.uid();
  banned timestamptz;
  gid uuid;
begin
  if me is null then raise exception 'Solo los usuarios registrados pueden crear salas.'; end if;
  perform sweep_host(me);
  select host_banned_until into banned from profiles where id = me;
  if banned > now() then raise exception 'No puedes crear salas hasta %.', to_char(banned, 'DD/MM HH24:MI'); end if;
  if jsonb_array_length(p_players) < 2 or jsonb_array_length(p_players) > 8 then raise exception 'Número de clubes no válido.'; end if;

  insert into games (code, host_id, season, clubs) values (left(p_code, 8), me, left(p_season, 12), p_clubs) returning id into gid;
  insert into game_players (game_id, seat, user_id, name, is_bot)
    select gid, (e ->> 'seat')::int, case when (e ->> 'seat')::int = 0 then me end, left(e ->> 'name', 20), coalesce((e ->> 'is_bot')::boolean, false)
      from jsonb_array_elements(p_players) e;
  return gid;
end $$;

-- Cada invitado registrado reclama su propio asiento: nadie puede apuntar a otro en una partida.
create or replace function public.join_game(p_game uuid, p_seat int) returns boolean
language plpgsql security definer set search_path = public as $$
declare
  me uuid := auth.uid();
begin
  if me is null then return false; end if;
  if exists (select 1 from game_players where game_id = p_game and user_id = me) then return true; end if;
  update game_players gp set user_id = me
    from games g
   where g.id = p_game and g.status = 'playing' and gp.game_id = p_game and gp.seat = p_seat
     and gp.user_id is null and not gp.is_bot;
  return found;
end $$;

create or replace function public.heartbeat(p_game uuid) returns void
language sql security definer set search_path = public as $$
  update games set last_seen = now() where id = p_game and host_id = auth.uid() and status = 'playing'
$$;

-- El anfitrión cierra la partida con el resultado final: [{seat, points, goals, position}].
create or replace function public.finish_game(p_game uuid, p_results jsonb) returns boolean
language plpgsql security definer set search_path = public as $$
declare
  me uuid := auth.uid();
  is_ranked boolean;
begin
  update games set status = 'finished', ended_at = now(), last_seen = now()
   where id = p_game and host_id = me and status = 'playing';
  if not found then return false; end if;

  update game_players gp
     set points = (e ->> 'points')::int, goals = (e ->> 'goals')::int, position = (e ->> 'position')::int
    from jsonb_array_elements(p_results) e
   where gp.game_id = p_game and gp.seat = (e ->> 'seat')::int;

  select count(*) >= 2 into is_ranked from game_players where game_id = p_game and user_id is not null;
  update games set ranked = is_ranked where id = p_game;
  update profiles set host_games = host_games + 1 where id = me;
  if is_ranked then
    update profiles p
       set games = p.games + 1, wins = p.wins + case when gp.position = 1 then 1 else 0 end
      from game_players gp
     where gp.game_id = p_game and gp.user_id = p.id;
  end if;
  return is_ranked;
end $$;

-- El anfitrión cierra la sala con la partida a medias.
create or replace function public.abandon_game(p_game uuid) returns void
language plpgsql security definer set search_path = public as $$
declare
  me uuid := auth.uid();
begin
  update games set status = 'abandoned', ended_at = now() where id = p_game and host_id = me and status = 'playing';
  if found then
    update profiles set host_abandons = host_abandons + 1 where id = me;
    perform apply_host_penalty(me);
  end if;
end $$;

-- Un invitado avisa de que el anfitrión ha desaparecido. Solo cuenta si lleva 10 minutos sin señales.
create or replace function public.report_abandon(p_game uuid) returns boolean
language plpgsql security definer set search_path = public as $$
declare
  me uuid := auth.uid();
  host uuid;
begin
  if not exists (select 1 from game_players where game_id = p_game and user_id = me) then return false; end if;
  update games set status = 'abandoned', ended_at = now()
   where id = p_game and status = 'playing' and host_id <> me and last_seen < now() - interval '10 minutes'
   returning host_id into host;
  if host is null then return false; end if;
  update profiles set host_abandons = host_abandons + 1 where id = host;
  perform apply_host_penalty(host);
  return true;
end $$;

-- Valoración del anfitrión (1-5) por parte de un invitado registrado, al acabar o abandonarse la partida.
create or replace function public.rate_host(p_game uuid, p_stars int) returns void
language plpgsql security definer set search_path = public as $$
declare
  me uuid := auth.uid();
  host uuid;
begin
  select g.host_id into host from games g
    join game_players gp on gp.game_id = g.id and gp.user_id = me
   where g.id = p_game and g.status <> 'playing' and g.host_id <> me;
  if host is null then raise exception 'No puedes valorar esta partida.'; end if;
  if p_stars not between 1 and 5 then raise exception 'La valoración va de 1 a 5.'; end if;
  insert into host_ratings (game_id, rater_id, host_id, stars) values (p_game, me, host, p_stars)
    on conflict (game_id, rater_id) do update set stars = excluded.stars;
  perform apply_host_penalty(host);
end $$;

-- ---------------------------------------------------------------- Consultas

create or replace function public.ranking(p_limit int default 50) returns json
language sql stable security definer set search_path = public as $$
  select coalesce(json_agg(r), '[]'::json) from (
    select p.username, p.wins, p.games,
           (select round(avg(stars), 1) from host_ratings where host_id = p.id) as stars,
           p.host_games
      from profiles p
     where p.games > 0
     order by p.wins desc, p.games asc, p.username asc
     limit least(greatest(p_limit, 1), 100)) r
$$;

create or replace function public.my_history(p_limit int default 30) returns json
language sql stable security definer set search_path = public as $$
  select coalesce(json_agg(h), '[]'::json) from (
    select g.id, g.code, g.status, g.ranked, g.season, g.started_at,
           g.host_id = auth.uid() as i_hosted,
           (select username from profiles where id = g.host_id) as host,
           mine.position, mine.points, mine.goals,
           (select stars from host_ratings where game_id = g.id and rater_id = auth.uid()) as my_rating,
           (select json_agg(json_build_object('name', gp.name, 'position', gp.position, 'points', gp.points,
                                              'is_bot', gp.is_bot, 'registered', gp.user_id is not null) order by gp.position nulls last, gp.seat)
              from game_players gp where gp.game_id = g.id) as players
      from game_players mine
      join games g on g.id = mine.game_id
     where mine.user_id = auth.uid()
     order by g.started_at desc
     limit least(greatest(p_limit, 1), 100)) h
$$;

-- Borra la cuenta y todos sus datos.
create or replace function public.delete_my_account() returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'Inicia sesión.'; end if;
  delete from auth.users where id = auth.uid();
end $$;

-- ---------------------------------------------------------------- Permisos

revoke all on function public.apply_host_penalty(uuid), public.sweep_host(uuid), public.handle_new_user() from public, anon, authenticated;
revoke all on function public.my_profile(), public.set_username(text), public.start_game(text, text, int, jsonb), public.join_game(uuid, int),
  public.heartbeat(uuid), public.finish_game(uuid, jsonb), public.abandon_game(uuid), public.report_abandon(uuid),
  public.rate_host(uuid, int), public.my_history(int), public.delete_my_account() from public, anon;
grant execute on function public.my_profile(), public.set_username(text), public.start_game(text, text, int, jsonb), public.join_game(uuid, int),
  public.heartbeat(uuid), public.finish_game(uuid, jsonb), public.abandon_game(uuid), public.report_abandon(uuid),
  public.rate_host(uuid, int), public.my_history(int), public.delete_my_account() to authenticated;
grant execute on function public.username_available(text), public.host_card(uuid), public.ranking(int), public.clean_username(text) to anon, authenticated;
