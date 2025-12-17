-- Create login_attempts table for rate limiting
CREATE TABLE public.login_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  ip_address TEXT,
  failed_count INTEGER DEFAULT 0,
  last_failed_at TIMESTAMPTZ,
  locked_until TIMESTAMPTZ,
  is_permanently_blocked BOOLEAN DEFAULT FALSE,
  block_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT login_attempts_email_unique UNIQUE (email)
);

-- Indexes for performance
CREATE INDEX idx_login_attempts_email ON public.login_attempts(email);
CREATE INDEX idx_login_attempts_locked_until ON public.login_attempts(locked_until);
CREATE INDEX idx_login_attempts_is_blocked ON public.login_attempts(is_permanently_blocked);

-- Enable RLS
ALTER TABLE public.login_attempts ENABLE ROW LEVEL SECURITY;

-- Allow anonymous access for login checks (before authentication)
CREATE POLICY "Allow anonymous insert for login tracking"
ON public.login_attempts FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "Allow anonymous select for login checks"
ON public.login_attempts FOR SELECT TO anon USING (true);

CREATE POLICY "Allow anonymous update for login tracking"
ON public.login_attempts FOR UPDATE TO anon USING (true) WITH CHECK (true);

-- Allow authenticated users and admins full access
CREATE POLICY "Allow authenticated select"
ON public.login_attempts FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated update"
ON public.login_attempts FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow super_admin delete"
ON public.login_attempts FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'::app_role));

-- Function to calculate lockout duration based on failed attempts
CREATE OR REPLACE FUNCTION public.calculate_lockout_duration(p_failed_count INTEGER)
RETURNS INTERVAL
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN CASE
    WHEN p_failed_count >= 20 THEN NULL -- Permanent block
    WHEN p_failed_count >= 15 THEN INTERVAL '1 hour'
    WHEN p_failed_count >= 11 THEN INTERVAL '30 minutes'
    WHEN p_failed_count >= 8 THEN INTERVAL '15 minutes'
    WHEN p_failed_count >= 5 THEN INTERVAL '5 minutes'
    ELSE INTERVAL '0 seconds'
  END;
END;
$$;

-- RPC function to check if login is allowed
CREATE OR REPLACE FUNCTION public.check_login_allowed(p_email TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_record RECORD;
  v_remaining_attempts INTEGER;
  v_next_threshold INTEGER;
BEGIN
  -- Get the login attempts record
  SELECT * INTO v_record
  FROM public.login_attempts
  WHERE LOWER(email) = LOWER(p_email);
  
  -- If no record exists, login is allowed
  IF v_record IS NULL THEN
    RETURN jsonb_build_object(
      'allowed', true,
      'failed_count', 0,
      'remaining_attempts', 5,
      'requires_captcha', false,
      'is_blocked', false,
      'locked_until', null
    );
  END IF;
  
  -- Check if permanently blocked
  IF v_record.is_permanently_blocked THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'failed_count', v_record.failed_count,
      'remaining_attempts', 0,
      'requires_captcha', true,
      'is_blocked', true,
      'locked_until', null,
      'block_reason', v_record.block_reason
    );
  END IF;
  
  -- Check if currently locked
  IF v_record.locked_until IS NOT NULL AND v_record.locked_until > NOW() THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'failed_count', v_record.failed_count,
      'remaining_attempts', 0,
      'requires_captcha', true,
      'is_blocked', false,
      'locked_until', v_record.locked_until
    );
  END IF;
  
  -- Calculate remaining attempts until next lockout
  v_next_threshold := CASE
    WHEN v_record.failed_count < 5 THEN 5
    WHEN v_record.failed_count < 8 THEN 8
    WHEN v_record.failed_count < 11 THEN 11
    WHEN v_record.failed_count < 15 THEN 15
    WHEN v_record.failed_count < 20 THEN 20
    ELSE 20
  END;
  v_remaining_attempts := v_next_threshold - v_record.failed_count;
  
  RETURN jsonb_build_object(
    'allowed', true,
    'failed_count', v_record.failed_count,
    'remaining_attempts', v_remaining_attempts,
    'requires_captcha', v_record.failed_count >= 3,
    'is_blocked', false,
    'locked_until', null
  );
END;
$$;

-- RPC function to record failed login attempt
CREATE OR REPLACE FUNCTION public.record_failed_login(p_email TEXT, p_ip_address TEXT DEFAULT NULL)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_record RECORD;
  v_new_count INTEGER;
  v_lockout_duration INTERVAL;
  v_locked_until TIMESTAMPTZ;
  v_is_blocked BOOLEAN := FALSE;
  v_should_notify BOOLEAN := FALSE;
BEGIN
  -- Get or create record
  INSERT INTO public.login_attempts (email, ip_address, failed_count, last_failed_at)
  VALUES (LOWER(p_email), p_ip_address, 1, NOW())
  ON CONFLICT (email) DO UPDATE SET
    failed_count = login_attempts.failed_count + 1,
    last_failed_at = NOW(),
    ip_address = COALESCE(p_ip_address, login_attempts.ip_address),
    updated_at = NOW()
  RETURNING * INTO v_record;
  
  v_new_count := v_record.failed_count;
  
  -- Calculate lockout duration
  v_lockout_duration := calculate_lockout_duration(v_new_count);
  
  -- Apply lockout or permanent block
  IF v_new_count >= 20 THEN
    v_is_blocked := TRUE;
    v_should_notify := TRUE;
    UPDATE public.login_attempts
    SET is_permanently_blocked = TRUE,
        block_reason = 'Bloqueado automaticamente após 20 tentativas de login falhas',
        updated_at = NOW()
    WHERE id = v_record.id;
  ELSIF v_lockout_duration IS NOT NULL AND v_lockout_duration > INTERVAL '0 seconds' THEN
    v_locked_until := NOW() + v_lockout_duration;
    v_should_notify := v_new_count >= 8; -- Notify after 8 failed attempts
    UPDATE public.login_attempts
    SET locked_until = v_locked_until,
        updated_at = NOW()
    WHERE id = v_record.id;
  END IF;
  
  RETURN jsonb_build_object(
    'failed_count', v_new_count,
    'is_blocked', v_is_blocked,
    'locked_until', v_locked_until,
    'should_notify', v_should_notify,
    'requires_captcha', v_new_count >= 3
  );
END;
$$;

-- RPC function to reset login attempts after successful login
CREATE OR REPLACE FUNCTION public.reset_login_attempts(p_email TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.login_attempts
  SET failed_count = 0,
      locked_until = NULL,
      updated_at = NOW()
  WHERE LOWER(email) = LOWER(p_email)
    AND is_permanently_blocked = FALSE;
  
  RETURN TRUE;
END;
$$;

-- RPC function for admin to unblock account
CREATE OR REPLACE FUNCTION public.admin_unblock_login_account(p_email TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if caller is super_admin
  IF NOT public.has_role(auth.uid(), 'super_admin'::app_role) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  
  UPDATE public.login_attempts
  SET failed_count = 0,
      locked_until = NULL,
      is_permanently_blocked = FALSE,
      block_reason = NULL,
      updated_at = NOW()
  WHERE LOWER(email) = LOWER(p_email);
  
  RETURN TRUE;
END;
$$;

-- Trigger to update updated_at
CREATE TRIGGER update_login_attempts_updated_at
BEFORE UPDATE ON public.login_attempts
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();