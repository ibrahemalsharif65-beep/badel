-- Minimal stand-ins for the parts of Supabase our migrations depend on.
-- ONLY for running the test-suite against a vanilla local Postgres.
-- Never run this against a real Supabase project.

create role anon          nologin;
create role authenticated nologin;
create role service_role  nologin bypassrls;

create schema if not exists auth;
create schema if not exists extensions;
create schema if not exists storage;

grant usage on schema public, auth, extensions, storage to anon, authenticated, service_role;

create table auth.users (
  id                 uuid primary key default gen_random_uuid(),
  email              text,
  raw_user_meta_data jsonb not null default '{}'::jsonb
);

-- Same contract as Supabase: reads the JWT subject claim set per request.
create function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
$$;

create table storage.buckets (
  id text primary key, name text not null, public boolean default false,
  file_size_limit bigint, allowed_mime_types text[]
);
create table storage.objects (
  id uuid primary key default gen_random_uuid(),
  bucket_id text references storage.buckets (id),
  name text, owner uuid
);
alter table storage.objects enable row level security;
grant select, insert, update, delete on storage.objects to authenticated;

create function storage.foldername(name text) returns text[] language sql immutable as $$
  select (string_to_array(name, '/'))[1:greatest(array_length(string_to_array(name, '/'), 1) - 1, 0)]
$$;
