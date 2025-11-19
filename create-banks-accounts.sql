-- Create banks table
CREATE TABLE IF NOT EXISTS public.banks (
  id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  name TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create accounts table
CREATE TABLE IF NOT EXISTS public.accounts (
  id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
  bank_id UUID REFERENCES public.banks(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  key_authorization TEXT NOT NULL,
  signing_secret TEXT NOT NULL,
  success_url TEXT,
  cancel_url TEXT,
  return_url TEXT,
  is_production BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.banks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;

-- RLS policies for banks
CREATE POLICY "Admins can manage all banks"
  ON public.banks
  FOR ALL
  USING (has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Anyone authenticated can view banks"
  ON public.banks
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- RLS policies for accounts
CREATE POLICY "Admins can manage all accounts"
  ON public.accounts
  FOR ALL
  USING (has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Anyone authenticated can view accounts"
  ON public.accounts
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- Triggers for updated_at
CREATE TRIGGER handle_updated_at_banks
  BEFORE UPDATE ON public.banks
  FOR EACH ROW
  EXECUTE FUNCTION handle_updated_at();

CREATE TRIGGER handle_updated_at_accounts
  BEFORE UPDATE ON public.accounts
  FOR EACH ROW
  EXECUTE FUNCTION handle_updated_at();

-- Indexes
CREATE INDEX idx_banks_is_active ON public.banks(is_active);
CREATE INDEX idx_accounts_product_id ON public.accounts(product_id);
CREATE INDEX idx_accounts_bank_id ON public.accounts(bank_id);
CREATE INDEX idx_accounts_is_active ON public.accounts(is_active);
CREATE INDEX idx_accounts_is_production ON public.accounts(is_production);
