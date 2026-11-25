-- Imitación mínima de lo que Supabase ya trae (roles, auth.users y auth.uid()),
-- para poder probar schema.sql en un PostgreSQL local. NO ejecutar en Supabase.
do $$ begin
  if not exists (select from pg_roles where rolname = 'anon') then create role anon nologin; end if;
  if not exists (select from pg_roles where rolname = 'authenticated') then create role authenticated nologin; end if;
end $$;
create schema if not exists auth;
create table if not exists auth.users (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  password text,
  raw_user_meta_data jsonb not null default '{}'
);
create or replace function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
$$;
grant usage on schema public, auth to anon, authenticated;

-- pg_net (llamadas HTTP desde SQL): aquí solo se apuntan, para comprobar qué se enviaría.
create schema if not exists net;
create table if not exists net.sent (id bigserial primary key, url text, body jsonb, headers jsonb);
create or replace function net.http_post(url text, body jsonb default '{}', params jsonb default '{}', headers jsonb default '{}', timeout_milliseconds int default 5000)
returns bigint language sql as $$
  insert into net.sent (url, body, headers) values (url, body, headers) returning id
$$;
