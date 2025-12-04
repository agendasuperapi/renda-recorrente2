-- Add new_username column to username_history table
ALTER TABLE public.username_history 
ADD COLUMN IF NOT EXISTS new_username text;

-- Create or replace function to track username changes
CREATE OR REPLACE FUNCTION public.track_username_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Only track if username actually changed and both values exist
  IF OLD.username IS DISTINCT FROM NEW.username 
     AND OLD.username IS NOT NULL 
     AND NEW.username IS NOT NULL THEN
    INSERT INTO public.username_history (user_id, username, new_username, changed_at)
    VALUES (NEW.id, OLD.username, NEW.username, now());
  END IF;
  
  RETURN NEW;
END;
$$;

-- Drop existing trigger if exists and create new one
DROP TRIGGER IF EXISTS on_username_change ON public.profiles;
CREATE TRIGGER on_username_change
  AFTER UPDATE OF username ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.track_username_change();
