-- Create landing_testimonials table
create table if not exists public.landing_testimonials (
  id uuid primary key default gen_random_uuid(),
  product_id uuid references public.products(id) on delete cascade not null,
  name text not null,
  role text not null,
  content text not null,
  avatar_url text,
  rating integer not null default 5 check (rating >= 1 and rating <= 5),
  is_active boolean default true,
  order_position integer default 0,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Create landing_faqs table
create table if not exists public.landing_faqs (
  id uuid primary key default gen_random_uuid(),
  product_id uuid references public.products(id) on delete cascade not null,
  question text not null,
  answer text not null,
  is_active boolean default true,
  order_position integer default 0,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Enable RLS
alter table public.landing_testimonials enable row level security;
alter table public.landing_faqs enable row level security;

-- RLS Policies for landing_testimonials
create policy "Anyone can view active testimonials"
  on public.landing_testimonials for select
  using (is_active = true);

create policy "Admins can manage testimonials"
  on public.landing_testimonials for all
  using (has_role(auth.uid(), 'super_admin'::app_role));

-- RLS Policies for landing_faqs
create policy "Anyone can view active FAQs"
  on public.landing_faqs for select
  using (is_active = true);

create policy "Admins can manage FAQs"
  on public.landing_faqs for all
  using (has_role(auth.uid(), 'super_admin'::app_role));

-- Create triggers for updated_at
create trigger handle_testimonials_updated_at before update on public.landing_testimonials
  for each row execute procedure public.handle_updated_at();

create trigger handle_faqs_updated_at before update on public.landing_faqs
  for each row execute procedure public.handle_updated_at();
