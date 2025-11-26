-- Add RLS policies for users to manage their own profile avatars

-- Allow authenticated users to upload their own profile avatars
create policy "Users can upload own profile avatars"
on storage.objects for insert
with check (
  bucket_id = 'avatars' 
  AND (storage.foldername(name))[1] = 'profiles'
  AND (storage.filename(name)) LIKE auth.uid()::text || '%'
);

-- Allow authenticated users to update their own profile avatars
create policy "Users can update own profile avatars"
on storage.objects for update
using (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = 'profiles'
  AND (storage.filename(name)) LIKE auth.uid()::text || '%'
);

-- Allow authenticated users to delete their own profile avatars
create policy "Users can delete own profile avatars"
on storage.objects for delete
using (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = 'profiles'
  AND (storage.filename(name)) LIKE auth.uid()::text || '%'
);
