-- Adicionar políticas RLS para permitir super_admins gerenciarem logos do sidebar

-- Política para permitir super_admins fazer upload de logos
create policy "Admins can upload sidebar logos"
on storage.objects for insert
with check (
  bucket_id = 'avatars' 
  AND (storage.foldername(name))[1] = 'logos'
  AND has_role(auth.uid(), 'super_admin'::app_role)
);

-- Política para permitir super_admins atualizar logos
create policy "Admins can update sidebar logos"
on storage.objects for update
using (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = 'logos'
  AND has_role(auth.uid(), 'super_admin'::app_role)
);

-- Política para permitir super_admins deletar logos
create policy "Admins can delete sidebar logos"
on storage.objects for delete
using (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = 'logos'
  AND has_role(auth.uid(), 'super_admin'::app_role)
);
