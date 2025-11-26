-- Add email column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS email text;

-- Update existing profiles with emails from auth.users
UPDATE public.profiles p
SET email = au.email
FROM auth.users au
WHERE p.id = au.id AND p.email IS NULL;

-- Update the handle_new_user function to include email
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
begin
  insert into public.profiles (id, name, username, affiliate_code, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    lower(replace(coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)), ' ', '_')) || '_' || substr(new.id::text, 1, 6),
    upper(substr(md5(new.id::text), 1, 8)),
    new.email
  );
  
  -- Assign default role as 'afiliado'
  insert into public.user_roles (user_id, role)
  values (new.id, 'afiliado');
  
  return new;
end;
$function$;
