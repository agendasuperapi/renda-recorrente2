-- Add missing updated_at column to payments table
ALTER TABLE public.payments 
ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone DEFAULT now();

-- Create index for updated_at
CREATE INDEX IF NOT EXISTS idx_payments_updated_at ON public.payments(updated_at DESC);