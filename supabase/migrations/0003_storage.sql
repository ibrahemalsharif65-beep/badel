-- =============================================================================
-- Badel — Storage buckets + policies
--
-- Buckets (public-read so <img src> works and the CDN can cache; writes are
-- locked down by RLS):
--   avatars            profile photos           2 MB
--   collection-photos  photos of owned discs    5 MB
--   game-covers        cover art for games      5 MB
--
-- Path convention:  <bucket>/<auth.uid()>/<filename>
-- A user may only create / replace / delete objects inside their own folder.
-- =============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('avatars',           'avatars',           true, 2097152, array['image/jpeg', 'image/png', 'image/webp']),
  ('collection-photos', 'collection-photos', true, 5242880, array['image/jpeg', 'image/png', 'image/webp']),
  ('game-covers',       'game-covers',       true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set
  public             = excluded.public,
  file_size_limit    = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "badel: upload into own folder"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id in ('avatars', 'collection-photos', 'game-covers')
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "badel: list own files"
  on storage.objects for select
  to authenticated
  using (
    bucket_id in ('avatars', 'collection-photos', 'game-covers')
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "badel: replace own files"
  on storage.objects for update
  to authenticated
  using (
    bucket_id in ('avatars', 'collection-photos', 'game-covers')
    and (storage.foldername(name))[1] = (select auth.uid())::text
  )
  with check (
    bucket_id in ('avatars', 'collection-photos', 'game-covers')
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "badel: delete own files"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id in ('avatars', 'collection-photos', 'game-covers')
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
