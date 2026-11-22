-- ScholarHub notification read tracking and academic referrals
alter table public.profiles add column if not exists referral_code text unique;
create table if not exists public.notification_reads (
 user_id uuid not null references auth.users(id) on delete cascade,
 notification_id uuid not null references public.notifications(id) on delete cascade,
 read_at timestamptz not null default now(),
 primary key(user_id,notification_id)
);
create table if not exists public.referrals (
 id uuid primary key default gen_random_uuid(),
 referrer_id uuid not null references auth.users(id) on delete cascade,
 referred_user_id uuid not null unique references auth.users(id) on delete cascade,
 created_at timestamptz not null default now(),
 check(referrer_id <> referred_user_id)
);
alter table public.notification_reads enable row level security;
alter table public.referrals enable row level security;
create policy "Users manage own notification reads" on public.notification_reads for all to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());
create policy "Users read own referrals" on public.referrals for select to authenticated using(referrer_id=auth.uid());
create policy "Users record own referral" on public.referrals for insert to authenticated with check(referred_user_id=auth.uid());
grant select,insert,update,delete on public.notification_reads to authenticated;
grant select,insert on public.referrals to authenticated;
