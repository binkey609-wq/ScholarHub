-- ScholarHub initial database schema
create extension if not exists "pgcrypto";

create table if not exists public.courses (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text,
  created_at timestamptz not null default now()
);

create table if not exists public.combinations (
  id uuid primary key default gen_random_uuid(),
  course_id uuid references public.courses(id) on delete cascade,
  name text not null,
  description text,
  created_at timestamptz not null default now()
);

create table if not exists public.units (
  id uuid primary key default gen_random_uuid(),
  course_id uuid references public.courses(id) on delete cascade,
  code text,
  name text not null,
  description text,
  created_at timestamptz not null default now()
);

create table if not exists public.combination_units (
  combination_id uuid references public.combinations(id) on delete cascade,
  unit_id uuid references public.units(id) on delete cascade,
  primary key (combination_id, unit_id)
);

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  phone text,
  email text,
  profile_image text,
  course_id uuid references public.courses(id),
  year_of_study integer,
  combination_id uuid references public.combinations(id),
  role text not null default 'student' check (role in ('student','staff','admin')),
  created_at timestamptz not null default now()
);

create table if not exists public.materials (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  unit_id uuid references public.units(id) on delete set null,
  file_path text not null,
  is_paid boolean not null default false,
  uploaded_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.packages (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  duration_days integer not null check (duration_days > 0),
  price numeric(12,2) not null check (price >= 0),
  description text,
  created_at timestamptz not null default now()
);

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  package_id uuid not null references public.packages(id),
  start_date timestamptz not null default now(),
  expiry_date timestamptz not null,
  status text not null default 'active' check (status in ('active','expired','cancelled')),
  created_at timestamptz not null default now()
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  message text not null,
  target_course_id uuid references public.courses(id) on delete set null,
  target_year integer,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

-- Storage bucket for academic materials. Keep the bucket private in production.
insert into storage.buckets (id, name, public)
values ('materials', 'materials', false)
on conflict (id) do nothing;

-- Starter package catalog.
insert into public.packages (name, duration_days, price, description) values
  ('Daily', 1, 50, '24-hour access to premium materials'),
  ('Weekly', 7, 250, '7-day access to premium materials'),
  ('Monthly', 30, 700, '30-day access to premium materials'),
  ('Yearly', 365, 5000, '365-day access to premium materials')
on conflict (name) do nothing;
