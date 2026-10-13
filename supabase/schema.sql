-- ScholarHub schema and access policies.
-- Run this script in Supabase SQL Editor. Safe to re-run for existing installations.
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
  course_name text,
  year_of_study integer,
  combination_id uuid references public.combinations(id),
  role text not null default 'student' check (role in ('student','staff','admin')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.profiles add column if not exists course_name text;
alter table public.profiles add column if not exists updated_at timestamptz not null default now();

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

-- Automatically create one profile per Supabase Auth user. The auth UUID is the profile ID.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_email text := lower(coalesce(new.email, ''));
begin
  insert into public.profiles (id, full_name, email, course_name, year_of_study, role)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data ->> 'full_name', ''), v_email, 'Student'),
    v_email,
    nullif(new.raw_user_meta_data ->> 'course', ''),
    case
      when coalesce(new.raw_user_meta_data ->> 'year_of_study', '') ~ '^[0-9]+$'
        then (new.raw_user_meta_data ->> 'year_of_study')::integer
      when coalesce(new.raw_user_meta_data ->> 'year_of_study', '') ~* '^year [0-9]+$'
        then substring(new.raw_user_meta_data ->> 'year_of_study' from '[0-9]+')::integer
      else null
    end,
    case when v_email = 'ebeitimothy19@gmail.com' then 'admin' else 'student' end
  )
  on conflict (id) do update set email = excluded.email;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

-- Backfill accounts created before this trigger was installed.
insert into public.profiles (id, full_name, email, course_name, year_of_study, role)
select
  u.id,
  coalesce(nullif(u.raw_user_meta_data ->> 'full_name', ''), lower(coalesce(u.email, '')), 'Student'),
  lower(coalesce(u.email, '')),
  nullif(u.raw_user_meta_data ->> 'course', ''),
  case
    when coalesce(u.raw_user_meta_data ->> 'year_of_study', '') ~ '^[0-9]+
create or replace function public.is_scholarhub_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select lower(coalesce(auth.jwt() ->> 'email', '')) = 'ebeitimothy19@gmail.com'
$$;

alter table public.profiles enable row level security;
alter table public.courses enable row level security;
alter table public.combinations enable row level security;
alter table public.units enable row level security;
alter table public.combination_units enable row level security;
alter table public.materials enable row level security;
alter table public.packages enable row level security;
alter table public.subscriptions enable row level security;
alter table public.notifications enable row level security;

drop policy if exists "Users read own profile" on public.profiles;
create policy "Users read own profile" on public.profiles for select to authenticated
using (id = auth.uid() or public.is_scholarhub_admin());
drop policy if exists "Users update own student profile" on public.profiles;
create policy "Users update own student profile" on public.profiles for update to authenticated
using (id = auth.uid() and role = 'student')
with check (id = auth.uid() and role = 'student');
drop policy if exists "Admin manages profiles" on public.profiles;
create policy "Admin manages profiles" on public.profiles for all to authenticated
using (public.is_scholarhub_admin()) with check (public.is_scholarhub_admin());

drop policy if exists "Authenticated read courses" on public.courses;
create policy "Authenticated read courses" on public.courses for select to authenticated using (true);
drop policy if exists "Admin manages courses" on public.courses;
create policy "Admin manages courses" on public.courses for all to authenticated using (public.is_scholarhub_admin()) with check (public.is_scholarhub_admin());

drop policy if exists "Authenticated read combinations" on public.combinations;
create policy "Authenticated read combinations" on public.combinations for select to authenticated using (true);
drop policy if exists "Admin manages combinations" on public.combinations;
create policy "Admin manages combinations" on public.combinations for all to authenticated using (public.is_scholarhub_admin()) with check (public.is_scholarhub_admin());

drop policy if exists "Authenticated read units" on public.units;
create policy "Authenticated read units" on public.units for select to authenticated using (true);
drop policy if exists "Admin manages units" on public.units;
create policy "Admin manages units" on public.units for all to authenticated using (public.is_scholarhub_admin()) with check (public.is_scholarhub_admin());

drop policy if exists "Authenticated read combination units" on public.combination_units;
create policy "Authenticated read combination units" on public.combination_units for select to authenticated using (true);
drop policy if exists "Admin manages combination units" on public.combination_units;
create policy "Admin manages combination units" on public.combination_units for all to authenticated using (public.is_scholarhub_admin()) with check (public.is_scholarhub_admin());

drop policy if exists "Authenticated read materials" on public.materials;
create policy "Authenticated read materials" on public.materials for select to authenticated using (true);
drop policy if exists "Admin manages materials" on public.materials;
create policy "Admin manages materials" on public.materials for all to authenticated using (public.is_scholarhub_admin()) with check (public.is_scholarhub_admin());

drop policy if exists "Authenticated read packages" on public.packages;
create policy "Authenticated read packages" on public.packages for select to authenticated using (true);
drop policy if exists "Admin manages packages" on public.packages;
create policy "Admin manages packages" on public.packages for all to authenticated using (public.is_scholarhub_admin()) with check (public.is_scholarhub_admin());

drop policy if exists "Users read own subscriptions" on public.subscriptions;
create policy "Users read own subscriptions" on public.subscriptions for select to authenticated using (user_id = auth.uid() or public.is_scholarhub_admin());
drop policy if exists "Admin manages subscriptions" on public.subscriptions;
create policy "Admin manages subscriptions" on public.subscriptions for all to authenticated using (public.is_scholarhub_admin()) with check (public.is_scholarhub_admin());

drop policy if exists "Authenticated read notifications" on public.notifications;
create policy "Authenticated read notifications" on public.notifications for select to authenticated using (true);
drop policy if exists "Admin manages notifications" on public.notifications;
create policy "Admin manages notifications" on public.notifications for all to authenticated using (public.is_scholarhub_admin()) with check (public.is_scholarhub_admin());

-- Private bucket for lecture notes and revision materials.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('materials', 'materials', false, 20971520,
  array['application/pdf','application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document','application/vnd.ms-powerpoint','application/vnd.openxmlformats-officedocument.presentationml.presentation','text/plain','image/jpeg','image/png'])
on conflict (id) do update set public = false, file_size_limit = 20971520, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Admin uploads materials" on storage.objects;
create policy "Admin uploads materials" on storage.objects for insert to authenticated
with check (bucket_id = 'materials' and public.is_scholarhub_admin());
drop policy if exists "Admin updates materials files" on storage.objects;
create policy "Admin updates materials files" on storage.objects for update to authenticated
using (bucket_id = 'materials' and public.is_scholarhub_admin())
with check (bucket_id = 'materials' and public.is_scholarhub_admin());
drop policy if exists "Admin deletes materials files" on storage.objects;
create policy "Admin deletes materials files" on storage.objects for delete to authenticated
using (bucket_id = 'materials' and public.is_scholarhub_admin());
drop policy if exists "Authenticated read materials files" on storage.objects;
create policy "Authenticated read materials files" on storage.objects for select to authenticated
using (bucket_id = 'materials');

insert into public.packages (name, duration_days, price, description) values
  ('Daily', 1, 50, '24-hour access to premium materials'),
  ('Weekly', 7, 250, '7-day access to premium materials'),
  ('Monthly', 30, 700, '30-day access to premium materials'),
  ('Yearly', 365, 5000, '365-day access to premium materials')
on conflict (name) do nothing;

      then (u.raw_user_meta_data ->> 'year_of_study')::integer
    when coalesce(u.raw_user_meta_data ->> 'year_of_study', '') ~* '^year [0-9]+
create or replace function public.is_scholarhub_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select lower(coalesce(auth.jwt() ->> 'email', '')) = 'ebeitimothy19@gmail.com'
$$;

alter table public.profiles enable row level security;
alter table public.courses enable row level security;
alter table public.combinations enable row level security;
alter table public.units enable row level security;
alter table public.combination_units enable row level security;
alter table public.materials enable row level security;
alter table public.packages enable row level security;
alter table public.subscriptions enable row level security;
alter table public.notifications enable row level security;

drop policy if exists "Users read own profile" on public.profiles;
create policy "Users read own profile" on public.profiles for select to authenticated
using (id = auth.uid() or public.is_scholarhub_admin());
drop policy if exists "Users update own student profile" on public.profiles;
create policy "Users update own student profile" on public.profiles for update to authenticated
using (id = auth.uid() and role = 'student')
with check (id = auth.uid() and role = 'student');
drop policy if exists "Admin manages profiles" on public.profiles;
create policy "Admin manages profiles" on public.profiles for all to authenticated
using (public.is_scholarhub_admin()) with check (public.is_scholarhub_admin());

drop policy if exists "Authenticated read courses" on public.courses;
create policy "Authenticated read courses" on public.courses for select to authenticated using (true);
drop policy if exists "Admin manages courses" on public.courses;
create policy "Admin manages courses" on public.courses for all to authenticated using (public.is_scholarhub_admin()) with check (public.is_scholarhub_admin());

drop policy if exists "Authenticated read combinations" on public.combinations;
create policy "Authenticated read combinations" on public.combinations for select to authenticated using (true);
drop policy if exists "Admin manages combinations" on public.combinations;
create policy "Admin manages combinations" on public.combinations for all to authenticated using (public.is_scholarhub_admin()) with check (public.is_scholarhub_admin());

drop policy if exists "Authenticated read units" on public.units;
create policy "Authenticated read units" on public.units for select to authenticated using (true);
drop policy if exists "Admin manages units" on public.units;
create policy "Admin manages units" on public.units for all to authenticated using (public.is_scholarhub_admin()) with check (public.is_scholarhub_admin());

drop policy if exists "Authenticated read combination units" on public.combination_units;
create policy "Authenticated read combination units" on public.combination_units for select to authenticated using (true);
drop policy if exists "Admin manages combination units" on public.combination_units;
create policy "Admin manages combination units" on public.combination_units for all to authenticated using (public.is_scholarhub_admin()) with check (public.is_scholarhub_admin());

drop policy if exists "Authenticated read materials" on public.materials;
create policy "Authenticated read materials" on public.materials for select to authenticated using (true);
drop policy if exists "Admin manages materials" on public.materials;
create policy "Admin manages materials" on public.materials for all to authenticated using (public.is_scholarhub_admin()) with check (public.is_scholarhub_admin());

drop policy if exists "Authenticated read packages" on public.packages;
create policy "Authenticated read packages" on public.packages for select to authenticated using (true);
drop policy if exists "Admin manages packages" on public.packages;
create policy "Admin manages packages" on public.packages for all to authenticated using (public.is_scholarhub_admin()) with check (public.is_scholarhub_admin());

drop policy if exists "Users read own subscriptions" on public.subscriptions;
create policy "Users read own subscriptions" on public.subscriptions for select to authenticated using (user_id = auth.uid() or public.is_scholarhub_admin());
drop policy if exists "Admin manages subscriptions" on public.subscriptions;
create policy "Admin manages subscriptions" on public.subscriptions for all to authenticated using (public.is_scholarhub_admin()) with check (public.is_scholarhub_admin());

drop policy if exists "Authenticated read notifications" on public.notifications;
create policy "Authenticated read notifications" on public.notifications for select to authenticated using (true);
drop policy if exists "Admin manages notifications" on public.notifications;
create policy "Admin manages notifications" on public.notifications for all to authenticated using (public.is_scholarhub_admin()) with check (public.is_scholarhub_admin());

-- Private bucket for lecture notes and revision materials.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('materials', 'materials', false, 20971520,
  array['application/pdf','application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document','application/vnd.ms-powerpoint','application/vnd.openxmlformats-officedocument.presentationml.presentation','text/plain','image/jpeg','image/png'])
on conflict (id) do update set public = false, file_size_limit = 20971520, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Admin uploads materials" on storage.objects;
create policy "Admin uploads materials" on storage.objects for insert to authenticated
with check (bucket_id = 'materials' and public.is_scholarhub_admin());
drop policy if exists "Admin updates materials files" on storage.objects;
create policy "Admin updates materials files" on storage.objects for update to authenticated
using (bucket_id = 'materials' and public.is_scholarhub_admin())
with check (bucket_id = 'materials' and public.is_scholarhub_admin());
drop policy if exists "Admin deletes materials files" on storage.objects;
create policy "Admin deletes materials files" on storage.objects for delete to authenticated
using (bucket_id = 'materials' and public.is_scholarhub_admin());
drop policy if exists "Authenticated read materials files" on storage.objects;
create policy "Authenticated read materials files" on storage.objects for select to authenticated
using (bucket_id = 'materials');

insert into public.packages (name, duration_days, price, description) values
  ('Daily', 1, 50, '24-hour access to premium materials'),
  ('Weekly', 7, 250, '7-day access to premium materials'),
  ('Monthly', 30, 700, '30-day access to premium materials'),
  ('Yearly', 365, 5000, '365-day access to premium materials')
on conflict (name) do nothing;

      then substring(u.raw_user_meta_data ->> 'year_of_study' from '[0-9]+')::integer
    else null
  end,
  case when lower(coalesce(u.email, '')) = 'ebeitimothy19@gmail.com' then 'admin' else 'student' end
from auth.users u
on conflict (id) do update set
  email = excluded.email,
  full_name = coalesce(nullif(public.profiles.full_name, ''), excluded.full_name),
  course_name = coalesce(public.profiles.course_name, excluded.course_name),
  year_of_study = coalesce(public.profiles.year_of_study, excluded.year_of_study),
  role = case when excluded.email = 'ebeitimothy19@gmail.com' then 'admin' else public.profiles.role end;

create or replace function public.is_scholarhub_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select lower(coalesce(auth.jwt() ->> 'email', '')) = 'ebeitimothy19@gmail.com'
$$;

alter table public.profiles enable row level security;
alter table public.courses enable row level security;
alter table public.combinations enable row level security;
alter table public.units enable row level security;
alter table public.combination_units enable row level security;
alter table public.materials enable row level security;
alter table public.packages enable row level security;
alter table public.subscriptions enable row level security;
alter table public.notifications enable row level security;

drop policy if exists "Users read own profile" on public.profiles;
create policy "Users read own profile" on public.profiles for select to authenticated
using (id = auth.uid() or public.is_scholarhub_admin());
drop policy if exists "Users update own student profile" on public.profiles;
create policy "Users update own student profile" on public.profiles for update to authenticated
using (id = auth.uid() and role = 'student')
with check (id = auth.uid() and role = 'student');
drop policy if exists "Admin manages profiles" on public.profiles;
create policy "Admin manages profiles" on public.profiles for all to authenticated
using (public.is_scholarhub_admin()) with check (public.is_scholarhub_admin());

drop policy if exists "Authenticated read courses" on public.courses;
create policy "Authenticated read courses" on public.courses for select to authenticated using (true);
drop policy if exists "Admin manages courses" on public.courses;
create policy "Admin manages courses" on public.courses for all to authenticated using (public.is_scholarhub_admin()) with check (public.is_scholarhub_admin());

drop policy if exists "Authenticated read combinations" on public.combinations;
create policy "Authenticated read combinations" on public.combinations for select to authenticated using (true);
drop policy if exists "Admin manages combinations" on public.combinations;
create policy "Admin manages combinations" on public.combinations for all to authenticated using (public.is_scholarhub_admin()) with check (public.is_scholarhub_admin());

drop policy if exists "Authenticated read units" on public.units;
create policy "Authenticated read units" on public.units for select to authenticated using (true);
drop policy if exists "Admin manages units" on public.units;
create policy "Admin manages units" on public.units for all to authenticated using (public.is_scholarhub_admin()) with check (public.is_scholarhub_admin());

drop policy if exists "Authenticated read combination units" on public.combination_units;
create policy "Authenticated read combination units" on public.combination_units for select to authenticated using (true);
drop policy if exists "Admin manages combination units" on public.combination_units;
create policy "Admin manages combination units" on public.combination_units for all to authenticated using (public.is_scholarhub_admin()) with check (public.is_scholarhub_admin());

drop policy if exists "Authenticated read materials" on public.materials;
create policy "Authenticated read materials" on public.materials for select to authenticated using (true);
drop policy if exists "Admin manages materials" on public.materials;
create policy "Admin manages materials" on public.materials for all to authenticated using (public.is_scholarhub_admin()) with check (public.is_scholarhub_admin());

drop policy if exists "Authenticated read packages" on public.packages;
create policy "Authenticated read packages" on public.packages for select to authenticated using (true);
drop policy if exists "Admin manages packages" on public.packages;
create policy "Admin manages packages" on public.packages for all to authenticated using (public.is_scholarhub_admin()) with check (public.is_scholarhub_admin());

drop policy if exists "Users read own subscriptions" on public.subscriptions;
create policy "Users read own subscriptions" on public.subscriptions for select to authenticated using (user_id = auth.uid() or public.is_scholarhub_admin());
drop policy if exists "Admin manages subscriptions" on public.subscriptions;
create policy "Admin manages subscriptions" on public.subscriptions for all to authenticated using (public.is_scholarhub_admin()) with check (public.is_scholarhub_admin());

drop policy if exists "Authenticated read notifications" on public.notifications;
create policy "Authenticated read notifications" on public.notifications for select to authenticated using (true);
drop policy if exists "Admin manages notifications" on public.notifications;
create policy "Admin manages notifications" on public.notifications for all to authenticated using (public.is_scholarhub_admin()) with check (public.is_scholarhub_admin());

-- Private bucket for lecture notes and revision materials.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('materials', 'materials', false, 20971520,
  array['application/pdf','application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document','application/vnd.ms-powerpoint','application/vnd.openxmlformats-officedocument.presentationml.presentation','text/plain','image/jpeg','image/png'])
on conflict (id) do update set public = false, file_size_limit = 20971520, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Admin uploads materials" on storage.objects;
create policy "Admin uploads materials" on storage.objects for insert to authenticated
with check (bucket_id = 'materials' and public.is_scholarhub_admin());
drop policy if exists "Admin updates materials files" on storage.objects;
create policy "Admin updates materials files" on storage.objects for update to authenticated
using (bucket_id = 'materials' and public.is_scholarhub_admin())
with check (bucket_id = 'materials' and public.is_scholarhub_admin());
drop policy if exists "Admin deletes materials files" on storage.objects;
create policy "Admin deletes materials files" on storage.objects for delete to authenticated
using (bucket_id = 'materials' and public.is_scholarhub_admin());
drop policy if exists "Authenticated read materials files" on storage.objects;
create policy "Authenticated read materials files" on storage.objects for select to authenticated
using (bucket_id = 'materials');

insert into public.packages (name, duration_days, price, description) values
  ('Daily', 1, 50, '24-hour access to premium materials'),
  ('Weekly', 7, 250, '7-day access to premium materials'),
  ('Monthly', 30, 700, '30-day access to premium materials'),
  ('Yearly', 365, 5000, '365-day access to premium materials')
on conflict (name) do nothing;
