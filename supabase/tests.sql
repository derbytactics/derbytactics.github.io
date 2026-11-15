-- Pruebas de schema.sql. Ejecutar con: npm run test:db  (necesita PostgreSQL local).
\set ON_ERROR_STOP on
\set QUIET on
set client_min_messages = warning;

create or replace function pg_temp.login(p uuid) returns void language sql as $$
  select set_config('request.jwt.claim.sub', coalesce(p::text, ''), false)
$$;
create or replace function pg_temp.ok(cond boolean, msg text) returns void language plpgsql as $$
begin
  if cond is not true then raise exception 'FALLA: %', msg; end if;
  raise notice 'ok · %', msg;
end $$;
set client_min_messages = notice;

insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-00000000000a', 'ana@test', '{"username":"Ana"}'),
  ('00000000-0000-0000-0000-00000000000b', 'luis@test', '{"username":"Luis"}'),
  ('00000000-0000-0000-0000-00000000000c', 'eva@test', '{"username":"ana"}'),
  ('00000000-0000-0000-0000-00000000000d', 'bad@test', '{"username":"<x>"}');

select pg_temp.ok((select count(*) from profiles) = 4, 'cada alta crea su perfil');
select pg_temp.ok((select username from profiles where id = '00000000-0000-0000-0000-00000000000c') = 'ana1', 'nombre repetido recibe sufijo');
select pg_temp.ok((select username from profiles where id = '00000000-0000-0000-0000-00000000000d') = 'Club', 'nombre no válido pasa a ser Club');
select pg_temp.ok(not username_available('ANA') and username_available('Pepe') and not username_available('ab'), 'disponibilidad de nombre');

-- Sin sesión no se puede crear partida.
select pg_temp.login(null);
do $$ begin
  perform start_game('AAAAA', 'corta', 2, '[{"seat":0,"name":"x"},{"seat":1,"name":"y"}]');
  raise exception 'FALLA: creó partida sin sesión';
exception when others then
  if sqlerrm like 'FALLA%' then raise; end if;
  raise notice 'ok · sin sesión no se crean salas';
end $$;

-- Partida completa: Ana anfitriona, Luis invitado registrado, un invitado sin cuenta y un bot.
select pg_temp.login('00000000-0000-0000-0000-00000000000a');
create temp table t as select start_game('AAAAA', 'corta', 4,
  '[{"seat":0,"name":"Ana FC"},{"seat":1,"name":"Luis City"},{"seat":2,"name":"Invitado"},{"seat":3,"name":"Bot","is_bot":true}]') as gid;

select pg_temp.login('00000000-0000-0000-0000-00000000000b');
select pg_temp.ok(not join_game((select gid from t), 3), 'no se puede ocupar el asiento de un bot');
select pg_temp.ok(not join_game((select gid from t), 0), 'no se puede ocupar el asiento del anfitrión');
select pg_temp.ok(join_game((select gid from t), 1), 'el invitado registrado reclama su asiento');
select pg_temp.ok(not finish_game((select gid from t), '[]'), 'solo el anfitrión cierra la partida');
do $$ begin
  perform rate_host((select gid from t), 5);
  raise exception 'FALLA: valoró una partida en juego';
exception when others then
  if sqlerrm like 'FALLA%' then raise; end if;
  raise notice 'ok · no se valora con la partida en juego';
end $$;

select pg_temp.login('00000000-0000-0000-0000-00000000000a');
select pg_temp.ok(finish_game((select gid from t),
  '[{"seat":0,"points":20,"goals":30,"position":2},{"seat":1,"points":25,"goals":33,"position":1},{"seat":2,"points":10,"goals":12,"position":3},{"seat":3,"points":9,"goals":11,"position":4}]'),
  'la partida con dos registrados puntúa');
select pg_temp.ok(not finish_game((select gid from t), '[]'), 'no se puede cerrar dos veces');
select pg_temp.ok((select wins = 1 and games = 1 from profiles where username = 'Luis'), 'el ganador suma victoria');
select pg_temp.ok((select wins = 0 and games = 1 and host_games = 1 from profiles where username = 'Ana'), 'la anfitriona suma partida');
select pg_temp.ok((ranking() -> 0 ->> 'username') = 'Luis', 'el ranking ordena por victorias');
select pg_temp.ok(json_array_length(my_history()) = 1 and (my_history() -> 0 ->> 'position')::int = 2, 'historial del anfitrión');

select pg_temp.login('00000000-0000-0000-0000-00000000000b');
select rate_host((select gid from t), 4);
select rate_host((select gid from t), 5);
select pg_temp.ok((host_card('00000000-0000-0000-0000-00000000000a') ->> 'stars')::numeric = 5 and (host_card('00000000-0000-0000-0000-00000000000a') ->> 'votes')::int = 1, 'una valoración por persona y partida');
select pg_temp.ok((my_history() -> 0 ->> 'my_rating')::int = 5, 'el historial recuerda tu valoración');

-- Partida contra bots: no puntúa.
select pg_temp.login('00000000-0000-0000-0000-00000000000a');
create temp table t2 as select start_game('BBBBB', 'corta', 2, '[{"seat":0,"name":"Ana FC"},{"seat":1,"name":"Bot","is_bot":true}]') as gid;
select pg_temp.ok(not finish_game((select gid from t2), '[{"seat":0,"points":9,"goals":9,"position":1},{"seat":1,"points":1,"goals":1,"position":2}]'), 'contra bots no puntúa');
select pg_temp.ok((select wins = 0 and games = 1 from profiles where username = 'Ana'), 'ni suma victorias');

-- Abandonos: el primero avisa, el segundo sanciona.
create temp table t3 as select start_game('CCCCC', 'corta', 2, '[{"seat":0,"name":"Ana FC"},{"seat":1,"name":"Luis City"}]') as gid;
select abandon_game((select gid from t3));
select pg_temp.ok((my_profile() ->> 'host_banned_until') is null and (my_profile() ->> 'host_abandons')::int = 1, 'un abandono no sanciona');
create temp table t4 as select start_game('DDDDD', 'corta', 2, '[{"seat":0,"name":"Ana FC"},{"seat":1,"name":"Luis City"}]') as gid;
select pg_temp.login('00000000-0000-0000-0000-00000000000b');
select join_game((select gid from t4), 1);
select pg_temp.ok(not report_abandon((select gid from t4)), 'no se da por abandonada si el anfitrión sigue activo');
update games set last_seen = now() - interval '11 minutes' where id = (select gid from t4);
select pg_temp.ok(report_abandon((select gid from t4)), 'tras 10 minutos sin señales, sí');
select rate_host((select gid from t4), 1);
select pg_temp.login('00000000-0000-0000-0000-00000000000a');
select pg_temp.ok((my_profile() ->> 'host_banned_until') is not null, 'el segundo abandono en 7 días sanciona');
do $$ begin
  perform start_game('EEEEE', 'corta', 2, '[{"seat":0,"name":"x"},{"seat":1,"name":"y"}]');
  raise exception 'FALLA: creó sala estando sancionada';
exception when others then
  if sqlerrm like 'FALLA%' then raise; end if;
  raise notice 'ok · sancionada no puede crear salas (%)', sqlerrm;
end $$;

-- Malas valoraciones: tres votos con media baja sancionan 24 h.
select pg_temp.login('00000000-0000-0000-0000-00000000000b');
create temp table t5 as select g.gid, n from generate_series(1, 3) n,
  lateral (select start_game('F' || n, 'corta', 2, '[{"seat":0,"name":"Luis"},{"seat":1,"name":"Eva"}]') as gid) g;
select pg_temp.login('00000000-0000-0000-0000-00000000000c');
select join_game(gid, 1) from t5;
select pg_temp.login('00000000-0000-0000-0000-00000000000b');
select finish_game(gid, '[{"seat":0,"points":1,"goals":1,"position":2},{"seat":1,"points":2,"goals":2,"position":1}]') from t5;
select pg_temp.login('00000000-0000-0000-0000-00000000000c');
select rate_host(gid, 1) from t5 where n <= 2;
select pg_temp.ok((select host_banned_until is null from profiles where username = 'Luis'), 'dos malas valoraciones aún no sancionan');
select rate_host(gid, 2) from t5 where n = 3;
select pg_temp.ok((select host_banned_until > now() + interval '23 hours' from profiles where username = 'Luis'), 'tres valoraciones con media baja sancionan 24 h');

-- Anfitrión que desaparece: se detecta al volver.
select pg_temp.login('00000000-0000-0000-0000-00000000000c');
create temp table t6 as select start_game('GGGGG', 'corta', 2, '[{"seat":0,"name":"Eva"},{"seat":1,"name":"Bot","is_bot":true}]') as gid;
update games set last_seen = now() - interval '31 minutes' where id = (select gid from t6);
select pg_temp.ok((my_profile() ->> 'host_abandons')::int = 1, 'una partida sin señales 30 min cuenta como abandonada');

-- Las tablas no son accesibles directamente.
set role authenticated;
do $$ begin
  perform count(*) from public.profiles;
  raise exception 'FALLA: lectura directa de profiles';
exception when insufficient_privilege then
  raise notice 'ok · sin acceso directo a las tablas';
end $$;
do $$ begin
  perform public.apply_host_penalty('00000000-0000-0000-0000-00000000000a');
  raise exception 'FALLA: función interna accesible';
exception when insufficient_privilege then
  raise notice 'ok · funciones internas no accesibles';
end $$;
reset role;

-- Borrado de cuenta.
select pg_temp.login('00000000-0000-0000-0000-00000000000d');
select delete_my_account();
select pg_temp.ok(not exists (select 1 from profiles where id = '00000000-0000-0000-0000-00000000000d'), 'borrar la cuenta elimina el perfil');
\echo TODAS LAS PRUEBAS DE BASE DE DATOS PASAN
