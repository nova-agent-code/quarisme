insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'attachments',
  'attachments',
  true,
  7340032,
  array['image/jpeg','image/png','image/gif','image/webp','audio/mpeg','audio/wav','audio/ogg','audio/mp4','audio/x-m4a']
)
on conflict (id) do update
  set public = true,
      file_size_limit = 7340032,
      allowed_mime_types = array['image/jpeg','image/png','image/gif','image/webp','audio/mpeg','audio/wav','audio/ogg','audio/mp4','audio/x-m4a'];

drop policy if exists "Authenticated users can upload attachments" on storage.objects;
create policy "Authenticated users can upload attachments"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'attachments'
  and (storage.foldername(name))[1] = auth.uid()::text
);
