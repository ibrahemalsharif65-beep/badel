-- Run with:  psql -v ON_ERROR_STOP=1 -f 10_rls_and_behaviour.sql
-- Every check either prints PASS or aborts the run with a FAIL exception.
\set A '00000000-0000-0000-0000-00000000000a'
\set B '00000000-0000-0000-0000-00000000000b'
\set C '00000000-0000-0000-0000-00000000000c'

\echo === 1. Signup trigger creates profiles ===
insert into auth.users (id, email, raw_user_meta_data) values
  (:'A', 'a@test.eg', '{"username":"Ahmed_G"}'),
  (:'B', 'b@test.eg', '{"username":"ahmed_g"}'),   -- same name, different case
  (:'C', 'c@test.eg', '{"username":"x"}');          -- invalid → generated

do $$
declare n int; u text;
begin
  select count(*) into n from public.profiles;
  if n <> 3 then raise exception 'FAIL: expected 3 profiles, got %', n; end if;

  select username into u from public.profiles where id = '00000000-0000-0000-0000-00000000000a';
  if u <> 'Ahmed_G' then raise exception 'FAIL: A username %', u; end if;

  select username into u from public.profiles where id = '00000000-0000-0000-0000-00000000000b';
  if lower(u) = 'ahmed_g' or u !~ '^ahmed_g_' then raise exception 'FAIL: B should get suffixed username, got %', u; end if;

  select username into u from public.profiles where id = '00000000-0000-0000-0000-00000000000c';
  if u !~ '^player_[0-9a-f]{8}$' then raise exception 'FAIL: C should get generated username, got %', u; end if;

  raise notice 'PASS: profiles auto-created; case-insensitive collision + invalid names handled';
end $$;

\echo === 2. Seed catalogue + duplicate protection (as postgres) ===
\i ../seed.sql

do $$
declare n int; d int;
begin
  select count(*) into n from public.games;
  if n < 150 then raise exception 'FAIL: seed produced only % rows', n; end if;
  raise notice 'PASS: seed loaded (% games)', n;
end $$;

-- re-running the seed must not create duplicates
select count(*) as before_reseed from public.games \gset
\i ../seed.sql
select count(*) as after_reseed from public.games \gset
select 1 / (case when :before_reseed = :after_reseed then 1 else 0 end) as reseed_created_no_duplicates;
\echo PASS: re-running seed is idempotent

-- punctuation / case / spacing variants collapse to the same record
do $$
begin
  begin
    insert into public.games (title, platform, edition) values ('  marvels   SPIDER-man ', 'ps4', 'standard');
    raise exception 'FAIL: near-duplicate title was inserted';
  exception when unique_violation then
    raise notice 'PASS: near-duplicate (punctuation/case/spacing) blocked by unique index';
  end;
end $$;

-- same title on a different platform / edition is allowed
insert into public.games (title, platform, edition) values ('Marvel''s Spider-Man', 'ps5', 'Standard');
do $$ begin raise notice 'PASS: same title on another platform is a separate record'; end $$;

\echo === 3. Games permissions (as authenticated user A) ===
set role authenticated;
select set_config('request.jwt.claim.sub', :'A', false);

do $$
declare g public.games; g2 public.games; before_n int; after_n int;
begin
  -- upsert returns the EXISTING row for a duplicate
  select count(*) into before_n from public.games;
  g := public.upsert_game('Marvels Spider Man', 'ps4', 'Standard');
  select count(*) into after_n from public.games;
  if before_n <> after_n then raise exception 'FAIL: upsert_game created a duplicate'; end if;
  if g.title <> 'Marvel''s Spider-Man' then raise exception 'FAIL: upsert_game returned wrong row: %', g.title; end if;
  raise notice 'PASS: upsert_game returns existing record instead of duplicating';

  -- brand new game is created unverified and attributed to the caller
  g2 := public.upsert_game('  Some   Indie Game ', 'xbox_one', null, 2024::smallint, null, array['indie']);
  if g2.is_verified or g2.created_by <> '00000000-0000-0000-0000-00000000000a' or g2.title <> 'Some Indie Game' or g2.edition <> 'Standard' then
    raise exception 'FAIL: new game not normalised / unverified: %', g2;
  end if;
  raise notice 'PASS: user-added game is normalised, unverified and attributed';

  -- cannot self-verify
  begin
    insert into public.games (title, platform, is_verified, created_by)
    values ('Fake Verified', 'ps5', true, '00000000-0000-0000-0000-00000000000a');
    raise exception 'FAIL: user set is_verified';
  exception when insufficient_privilege then raise notice 'PASS: users cannot set is_verified'; end;

  -- cannot attribute a game to somebody else
  begin
    insert into public.games (title, platform, created_by)
    values ('Spoofed Author', 'ps5', '00000000-0000-0000-0000-00000000000b');
    raise exception 'FAIL: spoofed created_by accepted';
  exception when insufficient_privilege then raise notice 'PASS: created_by must be the caller'; end;

  -- cannot edit or delete catalogue rows
  begin
    update public.games set title = 'Hacked' where id = g.id;
    get diagnostics before_n = row_count;
    raise exception 'FAIL: user could update games';
  exception when insufficient_privilege then raise notice 'PASS: users cannot update games'; end;
  begin
    delete from public.games where id = g.id;
    raise exception 'FAIL: user could delete games';
  exception when insufficient_privilege then raise notice 'PASS: users cannot delete games'; end;
end $$;

\echo === 4. Profiles ===
do $$
declare n int;
begin
  update public.profiles set governorate_id = 1, city = 'Nasr City', bio = 'PS5 collector'
   where id = '00000000-0000-0000-0000-00000000000a';
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'FAIL: could not update own profile'; end if;
  raise notice 'PASS: user can update own profile';

  update public.profiles set bio = 'pwned' where id = '00000000-0000-0000-0000-00000000000b';
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'FAIL: updated someone else''s profile'; end if;
  raise notice 'PASS: user cannot update another profile (0 rows)';

  begin
    update public.profiles set created_at = now() - interval '5 years'
     where id = '00000000-0000-0000-0000-00000000000a';
    raise exception 'FAIL: user changed joined date';
  exception when insufficient_privilege then raise notice 'PASS: joined date (created_at) is not writable'; end;

  begin
    insert into public.profiles (id, username) values (gen_random_uuid(), 'sneaky_user');
    raise exception 'FAIL: client inserted a profile';
  exception when insufficient_privilege then raise notice 'PASS: profiles cannot be inserted from the client'; end;

  begin
    update public.profiles set city = repeat('x', 100) where id = '00000000-0000-0000-0000-00000000000a';
    raise exception 'FAIL: overlong city accepted';
  exception when check_violation then raise notice 'PASS: city length constraint'; end;

  select count(*) into n from public.profiles;
  if n <> 3 then raise exception 'FAIL: signed-in users should read all profiles'; end if;
  raise notice 'PASS: signed-in users can read profiles';
end $$;

\echo === 5. Collection ===
do $$
declare
  a_game uuid; b_game uuid; ok_item uuid; n int;
begin
  select id into a_game from public.games where title = 'Elden Ring' and platform = 'ps5';

  insert into public.collection_items (user_id, game_id, condition, available_for_swap, available_for_sale, price_egp, photo_paths)
  values ('00000000-0000-0000-0000-00000000000a', a_game, 'like_new', true, true, 1200,
          array['00000000-0000-0000-0000-00000000000a/one.jpg'])
  returning id into ok_item;
  raise notice 'PASS: user can add to own collection';

  begin
    insert into public.collection_items (user_id, game_id) values ('00000000-0000-0000-0000-00000000000b', a_game);
    raise exception 'FAIL: inserted item for another user';
  exception when insufficient_privilege then raise notice 'PASS: cannot insert on behalf of another user'; end;

  begin
    insert into public.collection_items (user_id, game_id, photo_paths)
    values ('00000000-0000-0000-0000-00000000000a', a_game, array['00000000-0000-0000-0000-00000000000b/steal.jpg']);
    raise exception 'FAIL: foreign photo path accepted';
  exception when check_violation then raise notice 'PASS: photo paths must be inside own folder'; end;

  begin
    insert into public.collection_items (user_id, game_id, available_for_sale)
    values ('00000000-0000-0000-0000-00000000000a', a_game, true);
    raise exception 'FAIL: sale listing without price accepted';
  exception when check_violation then raise notice 'PASS: sale listing requires a price'; end;

  begin
    insert into public.collection_items (user_id, game_id, photo_paths)
    values ('00000000-0000-0000-0000-00000000000a', a_game,
            array_fill('00000000-0000-0000-0000-00000000000a/x.jpg'::text, array[7]));
    raise exception 'FAIL: 7 photos accepted';
  exception when check_violation then raise notice 'PASS: max 6 photos'; end;

  -- an unlisted item that only A can see
  insert into public.collection_items (user_id, game_id, available_for_swap, available_for_sale)
  select '00000000-0000-0000-0000-00000000000a', id, false, false from public.games where title = 'God of War' and platform = 'ps4';

  update public.collection_items set available_for_swap = false, available_for_sale = false, price_egp = null
   where id = ok_item;
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'FAIL: could not change availability'; end if;
  update public.collection_items set available_for_swap = true where id = ok_item;
  raise notice 'PASS: owner can change availability';
end $$;

-- switch to user B
select set_config('request.jwt.claim.sub', :'B', false);
do $$
declare n int; a_item uuid;
begin
  -- A has 2 items; 1 listed for swap (Elden Ring), 1 unlisted (God of War)
  select count(*) into n from public.collection_items;
  if n <> 1 then raise exception 'FAIL: B should see exactly 1 listed item of A, saw %', n; end if;
  raise notice 'PASS: other players see listed items only (unlisted stays private)';

  select id into a_item from public.collection_items limit 1;
  update public.collection_items set condition = 'poor' where id = a_item;
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'FAIL: B edited A''s item'; end if;
  delete from public.collection_items where id = a_item;
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'FAIL: B deleted A''s item'; end if;
  raise notice 'PASS: cannot update or delete another user''s item';

  -- B cannot hijack ownership by moving an own item to A
  insert into public.collection_items (user_id, game_id)
  select '00000000-0000-0000-0000-00000000000b', id from public.games where title = 'Halo Infinite' and platform = 'xbox_series';
  begin
    update public.collection_items set user_id = '00000000-0000-0000-0000-00000000000a'
     where user_id = '00000000-0000-0000-0000-00000000000b';
    raise exception 'FAIL: user_id was updatable';
  exception when insufficient_privilege then raise notice 'PASS: user_id is immutable from the client'; end;
end $$;

\echo === 6. Wishlist ===
select set_config('request.jwt.claim.sub', :'A', false);
do $$
declare n int; g uuid;
begin
  select id into g from public.games where title = 'Halo Infinite' and platform = 'xbox_series';
  insert into public.wishlist_items (user_id, game_id, preferred_condition, notes)
  values ('00000000-0000-0000-0000-00000000000a', g, 'good', 'Cairo pickup preferred');
  raise notice 'PASS: user can add to own wishlist';

  begin
    insert into public.wishlist_items (user_id, game_id) values ('00000000-0000-0000-0000-00000000000a', g);
    raise exception 'FAIL: duplicate wishlist row';
  exception when unique_violation then raise notice 'PASS: no duplicate wishlist entries'; end;

  begin
    insert into public.wishlist_items (user_id, game_id) values ('00000000-0000-0000-0000-00000000000b', g);
    raise exception 'FAIL: wishlist row for another user';
  exception when insufficient_privilege then raise notice 'PASS: cannot write to another user''s wishlist'; end;
end $$;

select set_config('request.jwt.claim.sub', :'B', false);
do $$
declare n int;
begin
  select count(*) into n from public.wishlist_items;
  if n <> 0 then raise exception 'FAIL: B can see A''s wishlist (% rows)', n; end if;
  delete from public.wishlist_items;
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'FAIL: B deleted A''s wishlist'; end if;
  raise notice 'PASS: wishlists are private and cannot be modified by others';
end $$;

\echo === 7. Search ===
select set_config('request.jwt.claim.sub', :'B', false);
do $$
declare n int; r record;
begin
  select count(*) into n from public.search_games('spider');
  if n < 5 then raise exception 'FAIL: "spider" found % games', n; end if;
  raise notice 'PASS: title search ("spider" → % results)', n;

  select count(*) into n from public.search_games('فيفا');
  if n < 4 then raise exception 'FAIL: Arabic keyword search found % rows', n; end if;
  raise notice 'PASS: Arabic keyword search (فيفا → % results)', n;

  select count(*) into n from public.search_games('elden ps5');
  if n <> 1 then raise exception 'FAIL: multi-word "elden ps5" gave %', n; end if;
  raise notice 'PASS: multi-word query incl. console name';

  select count(*) into n from public.search_games('fifa', array['ps5']::public.console_type[]);
  if n <> 4 then raise exception 'FAIL: console filter gave % (expected FC25, FC24, FIFA23, FIFA22)', n; end if;
  raise notice 'PASS: console filter (fifa on ps5 → % results)', n;

  select count(*) into n from public.search_games(null, array['xbox_one','xbox_series']::public.console_type[]);
  raise notice 'PASS: platform-family filter runs (% xbox results)', n;

  -- swap availability: A's Elden Ring PS5 is listed for swap; B (not the owner) should see it
  select * into r from public.search_games(null, null, true, false);
  if r.title <> 'Elden Ring' or r.swap_count <> 1 then raise exception 'FAIL: swap filter → %', r; end if;
  raise notice 'PASS: swap-availability filter finds A''s listed game';

  -- sale availability: A's item is swap-only now (sale flag was switched off) → none
  select count(*) into n from public.search_games(null, null, false, true);
  if n <> 0 then raise exception 'FAIL: sale filter returned % rows', n; end if;
  raise notice 'PASS: sale-availability filter';

  -- LIKE wildcards in user input must be treated literally
  select count(*) into n from public.search_games('%');
  if n <> 0 then raise exception 'FAIL: "%%" matched % rows', n; end if;
  select count(*) into n from public.search_games('_');
  if n <> 0 then raise exception 'FAIL: "_" matched % rows', n; end if;
  raise notice 'PASS: wildcard characters are escaped';
end $$;

-- the owner should not see their own copy counted as "available from others"
select set_config('request.jwt.claim.sub', :'A', false);
do $$
declare n int;
begin
  select count(*) into n from public.search_games('elden', null, true, false);
  if n <> 0 then raise exception 'FAIL: A sees own Elden Ring listing as available from others'; end if;
  select count(*) into n from public.search_games('halo infinite', null, true, false);
  if n <> 1 then raise exception 'FAIL: A should see B''s listed Halo copy, got %', n; end if;
  select count(*) into n from public.game_availability(array(select id from public.games));
  if n <> 1 then raise exception 'FAIL: game_availability for A expected 1 game (B''s Halo), got %', n; end if;
  raise notice 'PASS: own listings are excluded; other players'' listings are counted';
end $$;

-- Regression: two copies from ONE player (one listed for both swap and sale) must count as ONE player.
reset role;
set role authenticated;
select set_config('request.jwt.claim.sub', :'B', false);
insert into public.collection_items (user_id, game_id, available_for_swap, available_for_sale, price_egp)
select '00000000-0000-0000-0000-00000000000b', id, true, true, 900
from public.games where title = 'Halo Infinite' and platform = 'xbox_series';

select set_config('request.jwt.claim.sub', :'A', false);
do $$
declare r record;
begin
  select * into r from public.game_availability(array(select id from public.games where title = 'Halo Infinite' and platform = 'xbox_series'));
  if r.swap_count <> 2 or r.sale_count <> 1 or r.player_count <> 1 then
    raise exception 'FAIL: expected swap=2 sale=1 players=1, got %', r;
  end if;
  raise notice 'PASS: player_count counts distinct players (2 copies from 1 player = 1)';
end $$;

\echo === 8. Anonymous access ===
reset role;
set role anon;
select set_config('request.jwt.claim.sub', '', false);
do $$
declare n int;
begin
  select count(*) into n from public.games;
  if n < 150 then raise exception 'FAIL: anon cannot read games'; end if;
  select count(*) into n from public.governorates;
  if n <> 27 then raise exception 'FAIL: expected 27 governorates, got %', n; end if;
  raise notice 'PASS: anon can read catalogue + governorates';

  begin perform count(*) from public.collection_items; raise exception 'FAIL: anon read collection';
  exception when insufficient_privilege then raise notice 'PASS: anon cannot read collection'; end;
  begin perform count(*) from public.wishlist_items; raise exception 'FAIL: anon read wishlist';
  exception when insufficient_privilege then raise notice 'PASS: anon cannot read wishlist'; end;
  begin perform count(*) from public.profiles; raise exception 'FAIL: anon read profiles';
  exception when insufficient_privilege then raise notice 'PASS: anon cannot read profiles'; end;
  begin perform public.search_games('x'); raise exception 'FAIL: anon ran search_games';
  exception when insufficient_privilege then raise notice 'PASS: anon cannot run search RPC'; end;
  if public.username_available('Ahmed_G') then raise exception 'FAIL: username_available true for taken name'; end if;
  if not public.username_available('brand_new_name') then raise exception 'FAIL: username_available false for free name'; end if;
  raise notice 'PASS: username_available works for anon (pre-signup)';
end $$;

\echo === 9. Storage policies ===
reset role;
set role authenticated;
select set_config('request.jwt.claim.sub', :'A', false);
do $$
declare n int;
begin
  insert into storage.objects (bucket_id, name) values ('avatars', '00000000-0000-0000-0000-00000000000a/me.jpg');
  raise notice 'PASS: upload into own folder';

  begin
    insert into storage.objects (bucket_id, name) values ('avatars', '00000000-0000-0000-0000-00000000000b/me.jpg');
    raise exception 'FAIL: uploaded into another user''s folder';
  exception when insufficient_privilege then raise notice 'PASS: cannot upload into another user''s folder'; end;

  begin
    insert into storage.objects (bucket_id, name) values ('some-other-bucket', '00000000-0000-0000-0000-00000000000a/x.jpg');
    raise exception 'FAIL: upload into unmanaged bucket';
  exception when insufficient_privilege or foreign_key_violation then raise notice 'PASS: unmanaged buckets are not writable'; end;
end $$;

reset role;
insert into storage.objects (bucket_id, name) values ('collection-photos', '00000000-0000-0000-0000-00000000000b/b-photo.jpg');
set role authenticated;
select set_config('request.jwt.claim.sub', :'A', false);
do $$
declare n int;
begin
  delete from storage.objects where name like '%b-photo.jpg';
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'FAIL: A deleted B''s photo'; end if;
  update storage.objects set name = '00000000-0000-0000-0000-00000000000a/stolen.jpg' where name like '%b-photo.jpg';
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'FAIL: A modified B''s photo'; end if;
  delete from storage.objects where name = '00000000-0000-0000-0000-00000000000a/me.jpg';
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'FAIL: A could not delete own file'; end if;
  raise notice 'PASS: users can delete only their own uploaded images';
end $$;

reset role;
\echo
\echo ALL CHECKS PASSED
