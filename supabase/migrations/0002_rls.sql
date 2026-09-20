-- =============================================================================
-- Badel — Row Level Security + least-privilege grants
--
-- Principles
--   * RLS is ON for every table in `public`.
--   * Users can only write their own profile / collection / wishlist rows.
--   * Column-level grants stop users from touching server-owned columns
--     (is_verified, created_at, search index columns, …).
--   * Wishlists are private. Collection items are visible to other signed-in
--     players only while they are listed for swap or sale.
-- =============================================================================

alter table public.governorates      enable row level security;
alter table public.profiles          enable row level security;
alter table public.games             enable row level security;
alter table public.collection_items  enable row level security;
alter table public.wishlist_items    enable row level security;

-- Start from zero, then grant only what the app needs.
revoke all on public.governorates, public.profiles, public.games,
              public.collection_items, public.wishlist_items
  from anon, authenticated;

-- -----------------------------------------------------------------------------
-- governorates — public reference data
-- -----------------------------------------------------------------------------
grant select on public.governorates to anon, authenticated;

create policy "governorates are readable by everyone"
  on public.governorates for select
  to anon, authenticated
  using (true);

-- -----------------------------------------------------------------------------
-- profiles
--   read   : any signed-in user (username / avatar / governorate / city / bio)
--   insert : nobody from the client — the signup trigger creates the row
--   update : only your own row, and only the columns below
--   delete : nobody from the client (removed with the auth user)
-- -----------------------------------------------------------------------------
grant select on public.profiles to authenticated;
grant update (username, avatar_path, governorate_id, city, bio) on public.profiles to authenticated;

create policy "profiles are readable by signed-in users"
  on public.profiles for select
  to authenticated
  using (true);

create policy "users update only their own profile"
  on public.profiles for update
  to authenticated
  using      (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- -----------------------------------------------------------------------------
-- games — shared catalogue
--   read   : everyone
--   insert : signed-in users may add a missing game (unverified; the unique
--            index blocks duplicates). is_verified is not grantable.
--   update / delete : nobody from the client (curate via dashboard / service role)
-- -----------------------------------------------------------------------------
grant select on public.games to anon, authenticated;
grant insert (title, platform, edition, release_year, cover_url, search_keywords, created_by)
  on public.games to authenticated;

create policy "games are readable by everyone"
  on public.games for select
  to anon, authenticated
  using (true);

create policy "signed-in users can add unverified games"
  on public.games for insert
  to authenticated
  with check (created_by = (select auth.uid()) and is_verified = false);

-- -----------------------------------------------------------------------------
-- collection_items
--   read   : your own items, plus anyone's items that are listed
--   write  : only your own rows
-- -----------------------------------------------------------------------------
grant select, insert, delete on public.collection_items to authenticated;
grant update (game_id, condition, notes, photo_paths,
              available_for_swap, available_for_sale, price_egp)
  on public.collection_items to authenticated;

create policy "read own items or listed items"
  on public.collection_items for select
  to authenticated
  using (
    user_id = (select auth.uid())
    or available_for_swap
    or available_for_sale
  );

create policy "insert own items"
  on public.collection_items for insert
  to authenticated
  with check (user_id = (select auth.uid()));

create policy "update own items"
  on public.collection_items for update
  to authenticated
  using      (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "delete own items"
  on public.collection_items for delete
  to authenticated
  using (user_id = (select auth.uid()));

-- -----------------------------------------------------------------------------
-- wishlist_items — private to the owner
-- -----------------------------------------------------------------------------
grant select, insert, delete on public.wishlist_items to authenticated;
grant update (preferred_condition, notes) on public.wishlist_items to authenticated;

create policy "read own wishlist"
  on public.wishlist_items for select
  to authenticated
  using (user_id = (select auth.uid()));

create policy "insert own wishlist"
  on public.wishlist_items for insert
  to authenticated
  with check (user_id = (select auth.uid()));

create policy "update own wishlist"
  on public.wishlist_items for update
  to authenticated
  using      (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "delete own wishlist"
  on public.wishlist_items for delete
  to authenticated
  using (user_id = (select auth.uid()));

-- -----------------------------------------------------------------------------
-- RPC execute permissions (functions default to PUBLIC; make it explicit)
-- -----------------------------------------------------------------------------
revoke execute on function public.upsert_game(text, public.console_type, text, smallint, text, text[]) from public, anon;
revoke execute on function public.search_games(text, public.console_type[], boolean, boolean, integer, integer) from public, anon;
revoke execute on function public.game_availability(uuid[]) from public, anon;

grant execute on function public.upsert_game(text, public.console_type, text, smallint, text, text[]) to authenticated;
grant execute on function public.search_games(text, public.console_type[], boolean, boolean, integer, integer) to authenticated;
grant execute on function public.game_availability(uuid[]) to authenticated;
