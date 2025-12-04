-- Add username_history JSONB column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS username_history JSONB DEFAULT '[]'::jsonb;

-- Add comment for documentation
COMMENT ON COLUMN public.profiles.username_history IS 'Array of objects with username and date: [{username: string, changed_at: timestamp}]';

-- Create function to track username changes
CREATE OR REPLACE FUNCTION public.track_username_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Only track if username actually changed and not null
  IF OLD.username IS DISTINCT FROM NEW.username AND NEW.username IS NOT NULL THEN
    -- If old username existed, add it to history
    IF OLD.username IS NOT NULL THEN
      NEW.username_history = COALESCE(OLD.username_history, '[]'::jsonb) || 
        jsonb_build_object(
          'username', OLD.username,
          'changed_at', OLD.updated_at
        );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger to track username changes
DROP TRIGGER IF EXISTS on_username_change ON public.profiles;
CREATE TRIGGER on_username_change
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.track_username_change();
