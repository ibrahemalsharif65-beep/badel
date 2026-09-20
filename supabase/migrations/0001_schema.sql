-- =============================================================================
-- Badel — Phase 1 schema
-- HAVE (collection) → WANT (wishlist) → MATCH → SWAP
-- Phase 1 covers: profiles, game catalogue, collection, wishlist, search.
-- Matching / chat / ratings / notifications come in later phases.
-- =============================================================================

create extension if not exists pg_trgm  with schema extensions;
create extension if not exists unaccent with schema extensions;

-- -----------------------------------------------------------------------------
-- Enums
-- -----------------------------------------------------------------------------
create type public.console_type as enum ('ps4', 'ps5', 'xbox_one', 'xbox_series');

-- Declared best → worst so that enum ordering can be used for
-- "at least this condition" comparisons in the matching phase.
create type public.item_condition as enum ('new_sealed', 'like_new', 'good', 'fair', 'poor');

-- -----------------------------------------------------------------------------
-- Governorates (Egypt has 27). City is free text: we never store addresses.
-- -----------------------------------------------------------------------------
create table public.governorates (
  id      smallint primary key,
  name_en text not null unique,
  name_ar text not null unique
);

insert into public.governorates (id, name_en, name_ar) values
  (1,  'Cairo',           'القاهرة'),
  (2,  'Giza',            'الجيزة'),
  (3,  'Alexandria',      'الإسكندرية'),
  (4,  'Qalyubia',        'القليوبية'),
  (5,  'Port Said',       'بورسعيد'),
  (6,  'Suez',            'السويس'),
  (7,  'Dakahlia',        'الدقهلية'),
  (8,  'Sharqia',         'الشرقية'),
  (9,  'Gharbia',         'الغربية'),
  (10, 'Monufia',         'المنوفية'),
  (11, 'Beheira',         'البحيرة'),
  (12, 'Kafr El Sheikh',  'كفر الشيخ'),
  (13, 'Damietta',        'دمياط'),
  (14, 'Ismailia',        'الإسماعيلية'),
  (15, 'Faiyum',          'الفيوم'),
  (16, 'Beni Suef',       'بني سويف'),
  (17, 'Minya',           'المنيا'),
  (18, 'Asyut',           'أسيوط'),
  (19, 'Sohag',           'سوهاج'),
  (20, 'Qena',            'قنا'),
  (21, 'Luxor',           'الأقصر'),
  (22, 'Aswan',           'أسوان'),
  (23, 'Red Sea',         'البحر الأحمر'),
  (24, 'New Valley',      'الوادي الجديد'),
  (25, 'Matrouh',         'مطروح'),
  (26, 'North Sinai',     'شمال سيناء'),
  (27, 'South Sinai',     'جنوب سيناء');

-- -----------------------------------------------------------------------------
-- Shared trigger: keep updated_at fresh
-- -----------------------------------------------------------------------------
create function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- -----------------------------------------------------------------------------
-- Profiles (1:1 with auth.users). No email / phone / street address stored here.
-- -----------------------------------------------------------------------------
create table public.profiles (
  id             uuid primary key references auth.users (id) on delete cascade,
  username       text not null,
  avatar_path    text,                                   -- path inside the `avatars` bucket
  governorate_id smallint references public.governorates (id),
  city           text,                                   -- city / area only, never an address
  bio            text,
  created_at     timestamptz not null default now(),     -- "Joined date"
  updated_at     timestamptz not null default now(),
  constraint profiles_username_format check (username ~ '^[A-Za-z0-9_]{3,20}$'),
  constraint profiles_city_len        check (city is null or char_length(city) between 1 and 60),
  constraint profiles_bio_len         check (bio  is null or char_length(bio)  <= 240)
);

create unique index profiles_username_lower_key on public.profiles (lower(username));
create index profiles_governorate_idx on public.profiles (governorate_id);

create trigger profiles_touch_updated_at
  before update on public.profiles
  for each row execute function public.touch_updated_at();

-- Create a profile automatically when a user signs up. Uses the username passed
-- in signUp() metadata; falls back to a generated one and never fails the signup
-- on a username race.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  base      text := coalesce(new.raw_user_meta_data ->> 'username', '');
  candidate text;
  attempts  int  := 0;
begin
  if base !~ '^[A-Za-z0-9_]{3,20}$' then
    base := 'player_' || substr(replace(new.id::text, '-', ''), 1, 8);
  end if;
  candidate := base;

  loop
    begin
      insert into public.profiles (id, username) values (new.id, candidate);
      exit;
    exception when unique_violation then
      attempts := attempts + 1;
      if attempts > 5 then
        raise;
      end if;
      candidate := left(base, 14) || '_' || substr(md5(random()::text), 1, 5);
    end;
  end loop;

  return new;
end;
$$;

revoke execute on function public.handle_new_user() from public, anon, authenticated;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Lets the sign-up form say "username taken" before the user submits.
create function public.username_available(p_username text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select not exists (
    select 1 from public.profiles where lower(username) = lower(btrim(p_username))
  );
$$;

grant execute on function public.username_available(text) to anon, authenticated;

-- -----------------------------------------------------------------------------
-- Game catalogue
-- One row per (title, platform, edition). The same game on PS4 and PS5 — or a
-- "Standard" vs "Game of the Year" release — are different physical products,
-- so they are different rows.
-- -----------------------------------------------------------------------------

-- Normalises text for duplicate detection: lowercase, unaccented, letters/digits
-- only (Latin + Arabic). "Marvel's Spider-Man" == "marvels spiderman".
create function public.game_key(p_text text)
returns text
language sql
stable
set search_path = public, extensions
as $$
  select regexp_replace(lower(unaccent(coalesce(p_text, ''))), '[^a-z0-9\u0600-\u06ff]+', '', 'g');
$$;

create table public.games (
  id              uuid primary key default gen_random_uuid(),
  title           text not null,
  platform        public.console_type not null,
  edition         text not null default 'Standard',
  release_year    smallint,
  cover_url       text,
  search_keywords text[] not null default '{}',
  -- maintained by trigger ↓
  search_text     text not null default '',
  dedupe_key      text not null default '',
  edition_key     text not null default '',
  -- moderation hooks for later phases
  is_verified     boolean not null default false,
  created_by      uuid references auth.users (id) on delete set null,
  created_at      timestamptz not null default now(),
  constraint games_title_len    check (char_length(title)   between 1 and 120),
  constraint games_edition_len  check (char_length(edition) between 1 and 60),
  constraint games_year_range   check (release_year is null or release_year between 1990 and 2100),
  constraint games_keywords_max check (cardinality(search_keywords) <= 20)
);

-- The duplicate guard.
create unique index games_unique_release on public.games (dedupe_key, platform, edition_key);
create index games_platform_idx on public.games (platform);
create index games_search_trgm  on public.games using gin (search_text extensions.gin_trgm_ops);

create function public.games_before_write()
returns trigger
language plpgsql
set search_path = public, extensions
as $$
declare
  platform_words text;
begin
  new.title   := btrim(regexp_replace(new.title, '\s+', ' ', 'g'));
  new.edition := btrim(regexp_replace(coalesce(nullif(btrim(new.edition), ''), 'Standard'), '\s+', ' ', 'g'));

  new.dedupe_key  := public.game_key(new.title);
  new.edition_key := public.game_key(new.edition);

  platform_words := case new.platform
    when 'ps4'         then 'ps4 playstation 4'
    when 'ps5'         then 'ps5 playstation 5'
    when 'xbox_one'    then 'xbox one xone'
    when 'xbox_series' then 'xbox series xsx'
  end;

  -- Everything a user might type to find this game, in one lowercase string.
  new.search_text := lower(unaccent(
    new.title || ' ' || new.edition || ' ' || platform_words || ' ' ||
    array_to_string(new.search_keywords, ' ')
  ));
  return new;
end;
$$;

create trigger games_before_write
  before insert or update on public.games
  for each row execute function public.games_before_write();

-- Create-or-fetch. Used when a user can't find their game in the catalogue and
-- adds it: returns the existing row instead of erroring if it already exists.
create function public.upsert_game(
  p_title         text,
  p_platform      public.console_type,
  p_edition       text     default 'Standard',
  p_release_year  smallint default null,
  p_cover_url     text     default null,
  p_keywords      text[]   default '{}'
)
returns public.games
language plpgsql
security invoker
set search_path = public, extensions
as $$
declare
  g public.games;
  ed text := coalesce(nullif(btrim(p_edition), ''), 'Standard');
begin
  begin
    insert into public.games (title, platform, edition, release_year, cover_url, search_keywords, created_by)
    values (p_title, p_platform, ed, p_release_year, p_cover_url, coalesce(p_keywords, '{}'), auth.uid())
    returning * into g;
  exception when unique_violation then
    select * into g
    from public.games
    where dedupe_key  = public.game_key(p_title)
      and platform    = p_platform
      and edition_key = public.game_key(ed);
  end;
  return g;
end;
$$;

-- -----------------------------------------------------------------------------
-- My Collection — physical games a user HAS
-- Console + edition come from the linked game row (single source of truth).
-- -----------------------------------------------------------------------------
create table public.collection_items (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null references public.profiles (id) on delete cascade,
  game_id            uuid not null references public.games (id)    on delete restrict,
  condition          public.item_condition not null default 'good',
  notes              text,
  photo_paths        text[] not null default '{}',   -- paths inside `collection-photos`
  available_for_swap boolean not null default true,
  available_for_sale boolean not null default false,
  price_egp          integer,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  constraint collection_photos_max    check (cardinality(photo_paths) <= 6),
  constraint collection_notes_len     check (notes is null or char_length(notes) <= 500),
  constraint collection_price_range   check (price_egp is null or price_egp between 1 and 500000),
  constraint collection_sale_needs_price check (not available_for_sale or price_egp is not null)
);

create index collection_user_idx on public.collection_items (user_id, created_at desc);
create index collection_game_listed_idx on public.collection_items (game_id)
  where available_for_swap or available_for_sale;

-- Photos must live in the owner's own storage folder: "<user_id>/<file>".
create function public.collection_items_before_write()
returns trigger
language plpgsql
as $$
begin
  if exists (
    select 1 from unnest(new.photo_paths) p
    where p not like new.user_id::text || '/%'
  ) then
    raise exception 'photo_paths must be inside the owner''s folder' using errcode = '23514';
  end if;
  new.updated_at := now();
  return new;
end;
$$;

create trigger collection_items_before_write
  before insert or update on public.collection_items
  for each row execute function public.collection_items_before_write();

-- -----------------------------------------------------------------------------
-- Wishlist — games a user WANTS
-- -----------------------------------------------------------------------------
create table public.wishlist_items (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references public.profiles (id) on delete cascade,
  game_id             uuid not null references public.games (id)    on delete cascade,
  preferred_condition public.item_condition,          -- null = any condition; otherwise "at least this good"
  notes               text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  constraint wishlist_unique_game unique (user_id, game_id),
  constraint wishlist_notes_len   check (notes is null or char_length(notes) <= 300)
);

create index wishlist_user_idx on public.wishlist_items (user_id, created_at desc);

create trigger wishlist_touch_updated_at
  before update on public.wishlist_items
  for each row execute function public.touch_updated_at();

-- -----------------------------------------------------------------------------
-- Search
-- Global catalogue search with console / swap / sale filters. Runs as the
-- caller (security invoker) so RLS on collection_items still applies.
-- Availability counts exclude the caller's own copies.
-- -----------------------------------------------------------------------------
create function public.search_games(
  p_query    text                    default null,
  p_consoles public.console_type[]   default null,
  p_swap     boolean                 default false,
  p_sale     boolean                 default false,
  p_limit    integer                 default 24,
  p_offset   integer                 default 0
)
returns table (
  id              uuid,
  title           text,
  platform        public.console_type,
  edition         text,
  release_year    smallint,
  cover_url       text,
  search_keywords text[],
  swap_count      integer,
  sale_count      integer,
  total_count     bigint
)
language sql
stable
security invoker
set search_path = public, extensions
as $$
  with q as (
    select
      lower(unaccent(btrim(coalesce(p_query, '')))) as full_text,
      coalesce(
        array(
          select w
          from unnest(string_to_array(lower(unaccent(btrim(coalesce(p_query, '')))), ' ')) as w
          where w <> ''
        ),
        '{}'::text[]
      ) as words
  ),
  avail as (
    select
      ci.game_id,
      (count(*) filter (where ci.available_for_swap))::integer as swap_count,
      (count(*) filter (where ci.available_for_sale))::integer as sale_count
    from public.collection_items ci
    where ci.user_id <> auth.uid()
      and (ci.available_for_swap or ci.available_for_sale)
    group by ci.game_id
  )
  select
    g.id, g.title, g.platform, g.edition, g.release_year, g.cover_url, g.search_keywords,
    coalesce(a.swap_count, 0),
    coalesce(a.sale_count, 0),
    count(*) over ()
  from public.games g
  cross join q
  left join avail a on a.game_id = g.id
  where (p_consoles is null or cardinality(p_consoles) = 0 or g.platform = any (p_consoles))
    and (not p_swap or coalesce(a.swap_count, 0) > 0)
    and (not p_sale or coalesce(a.sale_count, 0) > 0)
    and not exists (
      select 1
      from unnest(q.words) w
      where g.search_text not like '%' || replace(replace(replace(w, '\', '\\'), '%', '\%'), '_', '\_') || '%'
    )
  order by
    (lower(g.title) like replace(replace(replace(q.full_text, '\', '\\'), '%', '\%'), '_', '\_') || '%') desc,
    (coalesce(a.swap_count, 0) + coalesce(a.sale_count, 0) > 0) desc,
    g.title,
    g.platform
  limit  least(greatest(coalesce(p_limit, 24), 1), 60)
  offset greatest(coalesce(p_offset, 0), 0);
$$;

-- How many OTHER players currently list each game (drives "Waiting for a match").
-- player_count counts distinct players, so one copy listed for both swap and sale is one player.
-- Games nobody lists have no row in the result.
create function public.game_availability(p_game_ids uuid[])
returns table (game_id uuid, swap_count integer, sale_count integer, player_count integer)
language sql
stable
security invoker
set search_path = public
as $$
  select
    ci.game_id,
    (count(*) filter (where ci.available_for_swap))::integer,
    (count(*) filter (where ci.available_for_sale))::integer,
    (count(distinct ci.user_id))::integer
  from public.collection_items ci
  where ci.game_id = any (p_game_ids)
    and ci.user_id <> auth.uid()
    and (ci.available_for_swap or ci.available_for_sale)
  group by ci.game_id;
$$;
