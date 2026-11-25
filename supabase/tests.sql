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
select pg_temp.ok((select username from profiles where id = '00000000-0000-0000-0000-00000000000d') = 'Jugador', 'nombre no válido pasa a ser Jugador');
select pg_temp.ok((select needs_username from profiles where id = '00000000-0000-0000-0000-00000000000d'), 'sin nombre válido se le pedirá uno');
select pg_temp.ok(not (select needs_username from profiles where id = '00000000-0000-0000-0000-00000000000a'), 'quien eligió nombre al registrarse no lo repite');

-- Alta con Google o Apple: llega el nombre real, pero no se copia.
insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-00000000000e', 'g@test', '{"full_name":"Nombre Real","avatar_url":"https://x/y.png"}');
select pg_temp.ok((select username from profiles where id = '00000000-0000-0000-0000-00000000000e') = 'Jugador1', 'con Google el nombre es provisional');
select pg_temp.login('00000000-0000-0000-0000-00000000000e');
select pg_temp.ok((my_profile() ->> 'needs_username')::boolean, 'el perfil avisa de que falta el nombre');
select set_username('Goleador');
select pg_temp.ok(not (my_profile() ->> 'needs_username')::boolean and (my_profile() ->> 'username') = 'Goleador', 'al elegir nombre deja de pedirse');
select pg_temp.login(null);

-- Nombres ofensivos: los mismos ejemplos que src/engine/moderation.test.ts.
select pg_temp.ok(bool_and(is_offensive(n)), 'el filtro bloquea insultos, también disfrazados')
  from unnest(array['Culo FC', 'ElCulo', 'Real Mierdas', 'Puuuta Madre', 'GILIPOLLAS', 'gili pollas united', 'H1j0put4', 'C@br0n FC', 'Atlético Maricón', 'Hitler 88', 'Fuck You', 'Polla', 'KKK Club', 'Real XXX']) n;
select pg_temp.ok(not bool_or(is_offensive(n)), 'el filtro deja pasar nombres normales que se parecen')
  from unnest(array['Penedès FC', 'Vergara', 'Conocidos', 'Calculo', 'Disputa', 'Computadora', 'Dickens', 'Pollos Hermanos', 'Culombio', 'Atlético Ribera', 'Nazareno', 'Rapidos', 'Kofi Traoré', 'Club X']) n;
select pg_temp.ok(not username_available('Gilipollas'), 'un nombre de usuario ofensivo no está disponible');
insert into auth.users (id, email, raw_user_meta_data) values ('00000000-0000-0000-0000-00000000000f', 'f@test', '{"username":"Puta Madre"}');
select pg_temp.ok((select username from profiles where id = '00000000-0000-0000-0000-00000000000f') like 'Jugador%'
  and (select needs_username from profiles where id = '00000000-0000-0000-0000-00000000000f'), 'un alta con nombre ofensivo recibe uno provisional');
select pg_temp.login('00000000-0000-0000-0000-00000000000e');
do $$ begin
  perform set_my_club('Real Mierda', '{"shape":1,"pattern":0,"emblem":2,"primary":"#112233","secondary":"#445566"}');
  raise exception 'FALLA: aceptó un club ofensivo';
exception when others then
  if sqlerrm like 'FALLA%' then raise; end if;
  raise notice 'ok · un nombre de club ofensivo se rechaza';
end $$;

-- Reto diario: un resultado por persona y día; el ranking ordena por puntos y diferencia de goles.
select pg_temp.login('00000000-0000-0000-0000-00000000000a');
select pg_temp.ok(submit_daily(current_date, 9, 7, 3, 1), 'se guarda el resultado del reto');
select pg_temp.ok(not submit_daily(current_date, 12, 9, 1, 1), 'solo cuenta el primer intento');
select pg_temp.login('00000000-0000-0000-0000-00000000000b');
select pg_temp.ok(submit_daily(current_date, 9, 8, 2, 1), 'otra persona también envía el suyo');
do $$ begin
  perform submit_daily(current_date - 5, 9, 1, 1, 1);
  raise exception 'FALLA: aceptó un reto antiguo';
exception when others then
  if sqlerrm like 'FALLA%' then raise; end if;
  raise notice 'ok · un reto de hace días no admite resultados';
end $$;
select pg_temp.login(null);
select pg_temp.ok((daily_ranking(current_date) -> 0 ->> 'username') = 'Luis' and json_array_length(daily_ranking(current_date)) = 2, 'el ranking del día ordena por puntos y diferencia de goles');

-- Denuncias: con tres personas distintas, el nombre se retira y se pide otro.
select pg_temp.login('00000000-0000-0000-0000-00000000000a');
select pg_temp.ok(report_name('Goleador') = 'recibida', 'primera denuncia recibida');
select pg_temp.ok(report_name('Goleador') = 'recibida', 'repetir la denuncia no suma');
select pg_temp.login('00000000-0000-0000-0000-00000000000b');
select pg_temp.ok(report_name('goleador') = 'recibida', 'segunda denuncia recibida');
do $$ begin
  perform report_name('Luis');
  raise exception 'FALLA: se denunció a sí mismo';
exception when others then
  if sqlerrm like 'FALLA%' then raise; end if;
  raise notice 'ok · nadie se denuncia a sí mismo';
end $$;
select pg_temp.login('00000000-0000-0000-0000-00000000000c');
select pg_temp.ok(report_name('Goleador') = 'retirado', 'la tercera persona distinta retira el nombre');
select pg_temp.ok((select username from profiles where id = '00000000-0000-0000-0000-00000000000e') like 'Jugador%'
  and (select needs_username from profiles where id = '00000000-0000-0000-0000-00000000000e'), 'tras retirarlo, se le pide un nombre nuevo');
select pg_temp.login(null);
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

-- Avisos «Te toca».
do $$ begin
  perform set_push_token('no-es-un-token');
  raise exception 'FALLA: token no válido aceptado';
exception when raise_exception then
  if sqlerrm like 'FALLA%' then raise; end if;
  raise notice 'ok · se rechaza un identificador de avisos no válido';
end $$;
select set_push_token('ExponentPushToken[luis-movil-123456]');
select set_push_token('ExponentPushToken[luis-movil-123456]');
select pg_temp.ok((select count(*) = 1 from push_tokens where user_id = '00000000-0000-0000-0000-00000000000b'), 'el identificador de avisos se guarda una vez');
select pg_temp.ok(not notify_turn((select gid from t), 1, 'market'), 'un invitado no puede mandar avisos');
select pg_temp.login('00000000-0000-0000-0000-00000000000a');
select pg_temp.ok(notify_turn((select gid from t), 1, 'roll'), 'la anfitriona avisa al invitado registrado de que le toca');
select pg_temp.ok((select count(*) = 1 and bool_and(url like 'https://exp.host/%') and bool_and(body -> 'to' ? 'ExponentPushToken[luis-movil-123456]')
                     and bool_and(body ->> 'body' like '%Te toca tirar los dados en la sala AAAAA%') from net.sent), 'el aviso sale hacia Expo con el texto y la sala');
select pg_temp.ok(not notify_turn((select gid from t), 1, 'market'), 'no se repite el aviso en pocos segundos');
select pg_temp.ok(not notify_turn((select gid from t), 2, 'market'), 'al invitado sin cuenta no se le avisa');
select pg_temp.ok(not notify_turn((select gid from t), 3, 'market'), 'a un bot no se le avisa');
select pg_temp.ok(not notify_turn((select gid from t), 1, 'otra'), 'solo avisos conocidos');
select pg_temp.login('00000000-0000-0000-0000-00000000000b');
select clear_push_token('ExponentPushToken[luis-movil-123456]');
select pg_temp.ok(not exists (select 1 from push_tokens where user_id = '00000000-0000-0000-0000-00000000000b'), 'al cerrar sesión el móvil deja de recibir avisos');

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
select set_avatar('a7');
select pg_temp.ok((my_profile() ->> 'avatar') = 'a7', 'el avatar se guarda en el perfil');
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

-- Club e historial de temporadas.
select pg_temp.login('00000000-0000-0000-0000-00000000000a');
select pg_temp.ok((my_profile() -> 'club') is null or json_typeof(my_profile() -> 'club') = 'null', 'sin club al principio');
select set_my_club('  Atlético Ribera ', '{"shape":2,"pattern":1,"emblem":11,"primary":"#C8102E","secondary":"#F4F1E8","extra":"x"}');
select pg_temp.ok((my_profile() -> 'club' ->> 'name') = 'Atlético Ribera' and (my_profile() -> 'club' -> 'crest' ->> 'emblem')::int = 11
  and (my_profile() -> 'club' -> 'crest' -> 'extra') is null, 'el club se guarda en el perfil, limpio');
do $$ begin
  perform set_my_club('FC', '{"shape":0,"pattern":0,"emblem":0,"primary":"#000000","secondary":"#FFFFFF"}');
  raise exception 'FALLA: aceptó un nombre de club demasiado corto';
exception when others then
  if sqlerrm like 'FALLA%' then raise; end if;
  raise notice 'ok · nombre de club demasiado corto rechazado';
end $$;
do $$ begin
  perform set_my_club('Real Faro', '{"shape":9,"pattern":0,"emblem":0,"primary":"red","secondary":"#FFFFFF"}');
  raise exception 'FALLA: aceptó un escudo mal formado';
exception when others then
  if sqlerrm like 'FALLA%' then raise; end if;
  raise notice 'ok · escudo mal formado rechazado';
end $$;
select pg_temp.ok(save_seasons('[{"id":"g1","date":"2026-01-01T10:00:00Z","position":1},{"id":"g2","date":"2026-02-01T10:00:00Z","position":3}]') = 2, 'se guardan temporadas');
select pg_temp.ok(save_seasons('[{"id":"g2","date":"2026-02-01T10:00:00Z","position":3}]') = 0, 'las repetidas no se duplican');
select pg_temp.ok(json_array_length(my_seasons()) = 2 and (my_seasons() -> 0 ->> 'id') = 'g2', 'el historial sale de la más reciente a la más antigua');
select save_seasons((select jsonb_agg(jsonb_build_object('id', 'm' || n, 'date', now() - n * interval '1 day')) from generate_series(1, 100) n));
select pg_temp.ok(json_array_length(my_seasons()) = 100 and not exists (select 1 from season_history where id = 'g1'), 'se conservan las 100 más recientes');
select pg_temp.login('00000000-0000-0000-0000-00000000000b');
select pg_temp.ok(json_array_length(my_seasons()) = 0, 'cada usuario solo ve su historial');

-- Informes de error.
select pg_temp.login(null);
select log_client_error('fallo de prueba', 'pila', 'contexto');
select pg_temp.ok((select count(*) = 1 and bool_and(user_id is null) from client_errors), 'los informes de error se guardan sin cuenta');

-- Logros y álbum.
select pg_temp.login('00000000-0000-0000-0000-00000000000b');
select pg_temp.ok((my_collection() ->> 'achievements') = '{}', 'sin colección, vacía');
select save_collection('{"reto":"2026-11-21","campeon":"2026-11-22","<x>":"2026-01-01","mal":"ayer"}', '{"f1":{"date":"2026-11-20","identity":{"name":"Leo"}},"zz":{"date":"2026-11-20"}}');
select pg_temp.ok((select achievements = '{"reto":"2026-11-21","campeon":"2026-11-22"}'::jsonb and album ? 'f1' and not album ? 'zz'
                     from collections where user_id = '00000000-0000-0000-0000-00000000000b'), 'se guarda la colección, sin entradas mal formadas');
select save_collection('{"reto":"2026-11-25","campeon":"2026-11-01","goleada":"2026-11-23"}', '{"f1":{"date":"2026-12-01","identity":{"name":"Otro"}},"f2":{"date":"2026-12-01"}}');
select pg_temp.ok((my_collection()::jsonb -> 'achievements') = '{"reto":"2026-11-21","campeon":"2026-11-01","goleada":"2026-11-23"}', 'de cada logro queda la fecha más antigua');
select pg_temp.ok((my_collection()::jsonb #>> '{album,f1,identity,name}') = 'Leo' and (my_collection()::jsonb #> '{album}') ? 'f2', 'el álbum suma y no cambia lo que ya había');
do $$ begin
  perform save_collection('[]', '{}');
  raise exception 'FALLA: colección con forma no válida';
exception when raise_exception then
  if sqlerrm like 'FALLA%' then raise; end if;
  raise notice 'ok · se rechaza una colección con forma no válida';
end $$;

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
select log_client_error('fallo de prueba');
select pg_temp.ok(exists (select 1 from client_errors where user_id = '00000000-0000-0000-0000-00000000000d'), 'el informe de error guarda la cuenta');
select delete_my_account();
select pg_temp.ok(not exists (select 1 from client_errors where user_id = '00000000-0000-0000-0000-00000000000d'), 'borrar la cuenta elimina sus informes de error');
select pg_temp.ok(not exists (select 1 from profiles where id = '00000000-0000-0000-0000-00000000000d'), 'borrar la cuenta elimina el perfil');
select pg_temp.login('00000000-0000-0000-0000-00000000000a');
select delete_my_account();
select pg_temp.ok(not exists (select 1 from season_history where user_id = '00000000-0000-0000-0000-00000000000a'), 'borrar la cuenta elimina su historial de temporadas');
select pg_temp.login('00000000-0000-0000-0000-00000000000b');
select delete_my_account();
select pg_temp.ok(not exists (select 1 from collections where user_id = '00000000-0000-0000-0000-00000000000b'), 'borrar la cuenta elimina sus logros y su álbum');
\echo TODAS LAS PRUEBAS DE BASE DE DATOS PASAN
