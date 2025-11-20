-- Create storage bucket for avatars
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- RLS Policies for avatars bucket
create policy "Public Access"
on storage.objects for select
using ( bucket_id = 'avatars' );

create policy "Admins can upload avatars"
on storage.objects for insert
with check (
  bucket_id = 'avatars' 
  AND (storage.foldername(name))[1] = 'testimonials'
  AND has_role(auth.uid(), 'super_admin'::app_role)
);

create policy "Admins can update avatars"
on storage.objects for update
using (
  bucket_id = 'avatars'
  AND has_role(auth.uid(), 'super_admin'::app_role)
);

create policy "Admins can delete avatars"
on storage.objects for delete
using (
  bucket_id = 'avatars'
  AND has_role(auth.uid(), 'super_admin'::app_role)
);
