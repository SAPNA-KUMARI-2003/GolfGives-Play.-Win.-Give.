-- =============================================
-- Golf Charity Subscription Platform — Schema
-- Run this in your Supabase SQL editor
-- =============================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- =============================================
-- PROFILES (extends auth.users)
-- =============================================
create table public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  email text not null,
  full_name text,
  phone text,
  is_admin boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.profiles enable row level security;

create policy "Users can view own profile" on public.profiles
  for select using (auth.uid() = id);

create policy "Users can update own profile" on public.profiles
  for update using (auth.uid() = id);

create policy "Admins can view all profiles" on public.profiles
  for select using (
    exists (select 1 from public.profiles where id = auth.uid() and is_admin = true)
  );

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name');
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- =============================================
-- SUBSCRIPTIONS
-- =============================================
create table public.subscriptions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  stripe_subscription_id text unique,
  stripe_customer_id text,
  plan text check (plan in ('monthly', 'yearly')) not null,
  status text check (status in ('active', 'inactive', 'cancelled', 'past_due', 'trialing')) default 'inactive',
  amount decimal(10,2) not null,
  currency text default 'usd',
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancelled_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.subscriptions enable row level security;

create policy "Users can view own subscription" on public.subscriptions
  for select using (auth.uid() = user_id);

create policy "Service role can manage subscriptions" on public.subscriptions
  for all using (true);

-- =============================================
-- SCORES
-- =============================================
create table public.scores (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  score integer check (score >= 1 and score <= 45) not null,
  played_on date not null,
  created_at timestamptz default now()
);

alter table public.scores enable row level security;

create policy "Users can manage own scores" on public.scores
  for all using (auth.uid() = user_id);

create policy "Admins can view all scores" on public.scores
  for select using (
    exists (select 1 from public.profiles where id = auth.uid() and is_admin = true)
  );

-- =============================================
-- CHARITIES
-- =============================================
create table public.charities (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  description text,
  long_description text,
  image_url text,
  website_url text,
  category text,
  is_featured boolean default false,
  is_active boolean default true,
  total_raised decimal(10,2) default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.charities enable row level security;

create policy "Anyone can view active charities" on public.charities
  for select using (is_active = true);

create policy "Admins can manage charities" on public.charities
  for all using (
    exists (select 1 from public.profiles where id = auth.uid() and is_admin = true)
  );

-- =============================================
-- USER CHARITY SELECTIONS
-- =============================================
create table public.user_charity_selections (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade unique not null,
  charity_id uuid references public.charities(id),
  contribution_percentage decimal(5,2) default 10.0 check (contribution_percentage >= 10.0 and contribution_percentage <= 100.0),
  updated_at timestamptz default now()
);

alter table public.user_charity_selections enable row level security;

create policy "Users can manage own charity selection" on public.user_charity_selections
  for all using (auth.uid() = user_id);

-- =============================================
-- DRAWS
-- =============================================
create table public.draws (
  id uuid default gen_random_uuid() primary key,
  draw_month integer check (draw_month >= 1 and draw_month <= 12) not null,
  draw_year integer not null,
  draw_type text check (draw_type in ('random', 'algorithmic')) default 'random',
  status text check (status in ('pending', 'simulated', 'published')) default 'pending',
  winning_numbers integer[],
  jackpot_amount decimal(10,2) default 0,
  jackpot_rolled_over boolean default false,
  prize_pool_5match decimal(10,2) default 0,
  prize_pool_4match decimal(10,2) default 0,
  prize_pool_3match decimal(10,2) default 0,
  total_pool decimal(10,2) default 0,
  participant_count integer default 0,
  created_at timestamptz default now(),
  published_at timestamptz,
  unique(draw_month, draw_year)
);

alter table public.draws enable row level security;

create policy "Anyone can view published draws" on public.draws
  for select using (status = 'published');

create policy "Admins can manage draws" on public.draws
  for all using (
    exists (select 1 from public.profiles where id = auth.uid() and is_admin = true)
  );

-- =============================================
-- DRAW ENTRIES
-- =============================================
create table public.draw_entries (
  id uuid default gen_random_uuid() primary key,
  draw_id uuid references public.draws(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  entry_numbers integer[] not null,
  match_count integer default 0,
  created_at timestamptz default now(),
  unique(draw_id, user_id)
);

alter table public.draw_entries enable row level security;

create policy "Users can view own entries" on public.draw_entries
  for select using (auth.uid() = user_id);

create policy "Admins can view all entries" on public.draw_entries
  for select using (
    exists (select 1 from public.profiles where id = auth.uid() and is_admin = true)
  );

-- =============================================
-- WINNERS
-- =============================================
create table public.winners (
  id uuid default gen_random_uuid() primary key,
  draw_id uuid references public.draws(id) not null,
  user_id uuid references public.profiles(id) not null,
  match_type integer check (match_type in (3, 4, 5)) not null,
  prize_amount decimal(10,2) not null,
  payment_status text check (payment_status in ('pending', 'verified', 'paid', 'rejected')) default 'pending',
  proof_url text,
  admin_notes text,
  verified_at timestamptz,
  paid_at timestamptz,
  created_at timestamptz default now()
);

alter table public.winners enable row level security;

create policy "Users can view own winnings" on public.winners
  for select using (auth.uid() = user_id);

create policy "Users can upload proof" on public.winners
  for update using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Admins can manage winners" on public.winners
  for all using (
    exists (select 1 from public.profiles where id = auth.uid() and is_admin = true)
  );

-- =============================================
-- SEED DATA — Charities
-- =============================================
insert into public.charities (name, description, long_description, category, is_featured, image_url) values
  ('Macmillan Cancer Support', 'Supporting people living with cancer and their families through treatment and beyond.', 'Macmillan Cancer Support provides medical, emotional, practical and financial support to anyone affected by cancer.', 'Health', true, 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=400'),
  ('Age UK', 'Improving later life for older people across the UK and globally.', 'Age UK is the UK''s leading charity dedicated to helping everyone make the most of later life.', 'Social Care', false, 'https://images.unsplash.com/photo-1516997121675-4c2d1684aa3e?w=400'),
  ('RNIB — Royal National Institute of Blind People', 'Supporting blind and partially sighted people to live independently.', 'RNIB offers information, support and advice to almost two million people in the UK with sight loss.', 'Disability', false, 'https://images.unsplash.com/photo-1582213782179-e0d53f98f2ca?w=400'),
  ('British Heart Foundation', 'Funding life-saving heart research and supporting those with heart conditions.', 'The British Heart Foundation funds research into heart and circulatory diseases that affect millions.', 'Health', true, 'https://images.unsplash.com/photo-1559757175-0eb30cd8c063?w=400'),
  ('RSPCA', 'Preventing cruelty and promoting kindness to animals.', 'The RSPCA is the UK''s oldest and largest animal welfare charity, rescuing and rehoming animals since 1824.', 'Animals', false, 'https://images.unsplash.com/photo-1450778869180-41d0601e046e?w=400'),
  ('Save the Children', 'Working to give every child a healthy start and the opportunity to learn.', 'Save the Children works in over 100 countries to support children in need around the world.', 'Children', true, 'https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?w=400');

-- =============================================
-- VIEWS — Useful aggregations
-- =============================================

-- Active subscribers count
create or replace view public.active_subscriber_count as
select count(*) as count from public.subscriptions where status = 'active';

-- Total charity contributions
create or replace view public.charity_contribution_totals as
select 
  c.id,
  c.name,
  sum(s.amount * ucs.contribution_percentage / 100) as total_contributed,
  count(ucs.user_id) as supporter_count
from public.charities c
left join public.user_charity_selections ucs on c.id = ucs.charity_id
left join public.subscriptions s on s.user_id = ucs.user_id and s.status = 'active'
group by c.id, c.name;
