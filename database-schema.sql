-- =====================================================
-- MULTI-TENANT AFFILIATE MANAGEMENT SYSTEM
-- Complete Database Schema
-- =====================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- =====================================================
-- ENUMS
-- =====================================================

-- User roles
create type public.app_role as enum ('super_admin', 'afiliado');

-- Coupon types
create type public.coupon_type as enum ('percentage', 'days', 'free_trial');

-- Withdrawal status
create type public.withdrawal_status as enum ('pending', 'approved', 'paid', 'rejected');

-- Commission status
create type public.commission_status as enum ('pending', 'available', 'withdrawn', 'cancelled');

-- =====================================================
-- PROFILES TABLE
-- =====================================================
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  name text not null,
  username text unique,
  phone text,
  cpf text unique,
  birth_date date,
  gender text,
  
  -- Address
  cep text,
  street text,
  number text,
  complement text,
  neighborhood text,
  city text,
  state text,
  
  -- Social Media
  instagram text,
  facebook text,
  tiktok text,
  
  -- PIX for withdrawals
  pix_key text,
  pix_type text,
  
  -- Affiliate code
  affiliate_code text unique,
  referrer_code text,
  
  avatar_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.profiles enable row level security;

-- =====================================================
-- USER ROLES TABLE (Separate for security)
-- =====================================================
create table public.user_roles (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  role app_role not null,
  created_at timestamptz default now(),
  unique(user_id, role)
);

alter table public.user_roles enable row level security;

-- =====================================================
-- PLANS TABLE
-- =====================================================
create table public.plans (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  description text,
  price decimal(10,2) not null,
  original_price decimal(10,2),
  commission_percentage integer not null default 25,
  billing_period text not null, -- 'monthly', 'yearly'
  features jsonb default '[]'::jsonb,
  is_active boolean default true,
  stripe_product_id text,
  stripe_price_id text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.plans enable row level security;

-- =====================================================
-- SUBSCRIPTIONS TABLE
-- =====================================================
create table public.subscriptions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  plan_id uuid references public.plans(id) on delete restrict not null,
  stripe_subscription_id text unique,
  status text not null, -- 'active', 'cancelled', 'past_due', 'trialing'
  current_period_start timestamptz,
  current_period_end timestamptz,
  trial_end timestamptz,
  cancel_at timestamptz,
  cancelled_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.subscriptions enable row level security;

-- =====================================================
-- COUPONS TABLE
-- =====================================================
create table public.coupons (
  id uuid primary key default uuid_generate_v4(),
  code text unique not null,
  name text not null,
  description text,
  type coupon_type not null,
  value integer not null, -- percentage or days
  valid_until timestamptz,
  max_uses integer,
  current_uses integer default 0,
  is_active boolean default true,
  created_by uuid references public.profiles(id) on delete set null,
  app_filter text[], -- which apps this coupon applies to
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.coupons enable row level security;

-- =====================================================
-- AFFILIATE COUPONS (Many-to-Many)
-- =====================================================
create table public.affiliate_coupons (
  id uuid primary key default uuid_generate_v4(),
  affiliate_id uuid references public.profiles(id) on delete cascade not null,
  coupon_id uuid references public.coupons(id) on delete cascade not null,
  created_at timestamptz default now(),
  unique(affiliate_id, coupon_id)
);

alter table public.affiliate_coupons enable row level security;

-- =====================================================
-- SUB AFFILIATES TABLE
-- =====================================================
create table public.sub_affiliates (
  id uuid primary key default uuid_generate_v4(),
  parent_affiliate_id uuid references public.profiles(id) on delete cascade not null,
  sub_affiliate_id uuid references public.profiles(id) on delete cascade not null,
  level integer not null default 1,
  created_at timestamptz default now(),
  unique(parent_affiliate_id, sub_affiliate_id),
  check (parent_affiliate_id != sub_affiliate_id)
);

alter table public.sub_affiliates enable row level security;

-- =====================================================
-- COMMISSIONS TABLE
-- =====================================================
create table public.commissions (
  id uuid primary key default uuid_generate_v4(),
  affiliate_id uuid references public.profiles(id) on delete cascade not null,
  subscription_id uuid references public.subscriptions(id) on delete set null,
  amount decimal(10,2) not null,
  percentage integer not null,
  status commission_status not null default 'pending',
  commission_type text not null, -- 'direct', 'sub_affiliate'
  payment_date timestamptz,
  available_date timestamptz, -- when commission becomes available for withdrawal
  reference_month date,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.commissions enable row level security;

-- =====================================================
-- WITHDRAWALS TABLE
-- =====================================================
create table public.withdrawals (
  id uuid primary key default uuid_generate_v4(),
  affiliate_id uuid references public.profiles(id) on delete cascade not null,
  amount decimal(10,2) not null,
  status withdrawal_status not null default 'pending',
  pix_key text not null,
  pix_type text not null,
  requested_date timestamptz default now(),
  approved_date timestamptz,
  paid_date timestamptz,
  rejected_reason text,
  approved_by uuid references public.profiles(id) on delete set null,
  commission_ids uuid[] not null, -- array of commission IDs included in this withdrawal
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.withdrawals enable row level security;

-- =====================================================
-- ACTIVITIES TABLE
-- =====================================================
create table public.activities (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  activity_type text not null, -- 'commission', 'withdrawal', 'signup', 'subscription', etc
  description text not null,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

alter table public.activities enable row level security;

-- =====================================================
-- REFERRALS TABLE (Tracking who referred whom)
-- =====================================================
create table public.referrals (
  id uuid primary key default uuid_generate_v4(),
  referrer_id uuid references public.profiles(id) on delete cascade not null,
  referred_id uuid references public.profiles(id) on delete cascade not null,
  coupon_code text,
  status text not null default 'registered', -- 'registered', 'active', 'inactive'
  conversion_date timestamptz,
  created_at timestamptz default now(),
  unique(referred_id)
);

alter table public.referrals enable row level security;

-- =====================================================
-- SEGMENTS TABLE (for app categorization)
-- =====================================================
create table public.segments (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  description text,
  icon text,
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.segments enable row level security;

-- =====================================================
-- STRIPE EVENTS TABLE (for audit trail)
-- =====================================================
create table public.stripe_events (
  id uuid primary key default uuid_generate_v4(),
  event_id text unique not null,
  event_type text not null,
  event_data jsonb not null,
  processed boolean default false,
  created_at timestamptz default now()
);

alter table public.stripe_events enable row level security;

-- =====================================================
-- SECURITY DEFINER FUNCTIONS
-- =====================================================

-- Check if user has a specific role
create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_roles
    where user_id = _user_id
      and role = _role
  )
$$;

-- Get user's role
create or replace function public.get_user_role(_user_id uuid)
returns app_role
language sql
stable
security definer
set search_path = public
as $$
  select role
  from public.user_roles
  where user_id = _user_id
  limit 1
$$;

-- =====================================================
-- TRIGGER FUNCTIONS
-- =====================================================

-- Update updated_at timestamp
create or replace function public.handle_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Create profile on user signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, name, username, affiliate_code)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    lower(replace(coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)), ' ', '_')) || '_' || substr(new.id::text, 1, 6),
    upper(substr(md5(new.id::text), 1, 8))
  );
  
  -- Assign default role as 'afiliado'
  insert into public.user_roles (user_id, role)
  values (new.id, 'afiliado');
  
  return new;
end;
$$;

-- Log activity
create or replace function public.log_activity()
returns trigger
language plpgsql
as $$
begin
  insert into public.activities (user_id, activity_type, description, metadata)
  values (
    new.affiliate_id,
    TG_TABLE_NAME,
    'New ' || TG_TABLE_NAME || ' record created',
    jsonb_build_object('id', new.id)
  );
  return new;
end;
$$;

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Trigger for new user creation
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Triggers for updated_at
create trigger handle_updated_at_profiles
  before update on public.profiles
  for each row execute function public.handle_updated_at();

create trigger handle_updated_at_plans
  before update on public.plans
  for each row execute function public.handle_updated_at();

create trigger handle_updated_at_coupons
  before update on public.coupons
  for each row execute function public.handle_updated_at();

create trigger handle_updated_at_commissions
  before update on public.commissions
  for each row execute function public.handle_updated_at();

create trigger handle_updated_at_withdrawals
  before update on public.withdrawals
  for each row execute function public.handle_updated_at();

create trigger handle_updated_at_subscriptions
  before update on public.subscriptions
  for each row execute function public.handle_updated_at();

create trigger handle_updated_at_segments
  before update on public.segments
  for each row execute function public.handle_updated_at();

-- Activity logging triggers
create trigger log_commission_activity
  after insert on public.commissions
  for each row execute function public.log_activity();

create trigger log_withdrawal_activity
  after insert on public.withdrawals
  for each row execute function public.log_activity();

-- =====================================================
-- ROW LEVEL SECURITY POLICIES
-- =====================================================

-- PROFILES POLICIES
create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

create policy "Admins can view all profiles"
  on public.profiles for select
  using (public.has_role(auth.uid(), 'super_admin'));

create policy "Admins can update all profiles"
  on public.profiles for update
  using (public.has_role(auth.uid(), 'super_admin'));

-- USER ROLES POLICIES
create policy "Users can view own roles"
  on public.user_roles for select
  using (auth.uid() = user_id);

create policy "Admins can manage all roles"
  on public.user_roles for all
  using (public.has_role(auth.uid(), 'super_admin'));

-- PLANS POLICIES
create policy "Anyone can view active plans"
  on public.plans for select
  using (is_active = true);

create policy "Admins can manage plans"
  on public.plans for all
  using (public.has_role(auth.uid(), 'super_admin'));

-- SUBSCRIPTIONS POLICIES
create policy "Users can view own subscriptions"
  on public.subscriptions for select
  using (auth.uid() = user_id);

create policy "Admins can view all subscriptions"
  on public.subscriptions for select
  using (public.has_role(auth.uid(), 'super_admin'));

-- REMOVED: Dangerous "System can manage subscriptions" policy
-- The policy "using (true)" allowed ANY authenticated user to perform ALL operations on ALL subscriptions
-- This was a critical security vulnerability that has been removed
-- For Stripe webhooks/system operations, use edge functions with service role key instead

-- COUPONS POLICIES
create policy "Affiliates can view their coupons"
  on public.coupons for select
  using (
    created_by = auth.uid() or
    exists (
      select 1 from public.affiliate_coupons
      where coupon_id = coupons.id and affiliate_id = auth.uid()
    )
  );

create policy "Admins can manage all coupons"
  on public.coupons for all
  using (public.has_role(auth.uid(), 'super_admin'));

-- AFFILIATE COUPONS POLICIES
create policy "Affiliates can view their coupon associations"
  on public.affiliate_coupons for select
  using (auth.uid() = affiliate_id);

create policy "Admins can manage affiliate coupons"
  on public.affiliate_coupons for all
  using (public.has_role(auth.uid(), 'super_admin'));

-- SUB AFFILIATES POLICIES
create policy "Affiliates can view their sub-affiliates"
  on public.sub_affiliates for select
  using (auth.uid() = parent_affiliate_id);

create policy "Admins can view all sub-affiliates"
  on public.sub_affiliates for select
  using (public.has_role(auth.uid(), 'super_admin'));

-- COMMISSIONS POLICIES
create policy "Affiliates can view own commissions"
  on public.commissions for select
  using (auth.uid() = affiliate_id);

create policy "Admins can view all commissions"
  on public.commissions for select
  using (public.has_role(auth.uid(), 'super_admin'));

create policy "Admins can manage commissions"
  on public.commissions for all
  using (public.has_role(auth.uid(), 'super_admin'));

-- WITHDRAWALS POLICIES
create policy "Affiliates can view own withdrawals"
  on public.withdrawals for select
  using (auth.uid() = affiliate_id);

create policy "Affiliates can create withdrawals"
  on public.withdrawals for insert
  with check (auth.uid() = affiliate_id);

create policy "Admins can manage all withdrawals"
  on public.withdrawals for all
  using (public.has_role(auth.uid(), 'super_admin'));

-- ACTIVITIES POLICIES
create policy "Users can view own activities"
  on public.activities for select
  using (auth.uid() = user_id);

create policy "Admins can view all activities"
  on public.activities for select
  using (public.has_role(auth.uid(), 'super_admin'));

-- REFERRALS POLICIES
create policy "Referrers can view their referrals"
  on public.referrals for select
  using (auth.uid() = referrer_id);

create policy "Admins can view all referrals"
  on public.referrals for select
  using (public.has_role(auth.uid(), 'super_admin'));

-- SEGMENTS POLICIES
create policy "Anyone authenticated can view segments"
  on public.segments for select
  using (auth.role() = 'authenticated');

create policy "Admins can manage segments"
  on public.segments for all
  using (public.has_role(auth.uid(), 'super_admin'));

-- STRIPE EVENTS POLICIES
create policy "Only admins can view stripe events"
  on public.stripe_events for select
  using (public.has_role(auth.uid(), 'super_admin'));

create policy "System can create stripe events"
  on public.stripe_events for insert
  with check (true);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

create index idx_profiles_affiliate_code on public.profiles(affiliate_code);
create index idx_profiles_referrer_code on public.profiles(referrer_code);
create index idx_user_roles_user_id on public.user_roles(user_id);
create index idx_user_roles_role on public.user_roles(role);
create index idx_subscriptions_user_id on public.subscriptions(user_id);
create index idx_subscriptions_status on public.subscriptions(status);
create index idx_coupons_code on public.coupons(code);
create index idx_affiliate_coupons_affiliate_id on public.affiliate_coupons(affiliate_id);
create index idx_sub_affiliates_parent on public.sub_affiliates(parent_affiliate_id);
create index idx_sub_affiliates_sub on public.sub_affiliates(sub_affiliate_id);
create index idx_commissions_affiliate_id on public.commissions(affiliate_id);
create index idx_commissions_status on public.commissions(status);
create index idx_commissions_reference_month on public.commissions(reference_month);
create index idx_withdrawals_affiliate_id on public.withdrawals(affiliate_id);
create index idx_withdrawals_status on public.withdrawals(status);
create index idx_activities_user_id on public.activities(user_id);
create index idx_activities_created_at on public.activities(created_at desc);
create index idx_referrals_referrer_id on public.referrals(referrer_id);
create index idx_stripe_events_event_id on public.stripe_events(event_id);
create index idx_stripe_events_processed on public.stripe_events(processed);

-- =====================================================
-- INITIAL DATA
-- =====================================================

-- Insert default plans
insert into public.plans (name, description, price, original_price, commission_percentage, billing_period, features)
values 
  (
    'Afiliação FREE',
    'Para conhecer',
    0.00,
    0.00,
    25,
    'monthly',
    '["Treinamento", "Comissão Reduzida (25%)", "Suporte", "Ferramentas de divulgação"]'::jsonb
  ),
  (
    'Afiliação PRO',
    'Mais lucrativo',
    49.90,
    59.90,
    40,
    'monthly',
    '["Treinamento", "Comissão 40%", "Suporte", "Ferramentas de divulgação"]'::jsonb
  );

-- Insert default segments
insert into public.segments (name, description)
values 
  ('Agenda Super', 'Aplicativo de agendamentos'),
  ('APP Financeiro', 'Gestão financeira'),
  ('APP Ofertas', 'Sistema de ofertas e promoções'),
  ('APP Renda recorrente', 'Sistema de afiliados');
