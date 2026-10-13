-- ScholarHub payment foundation.
-- This migration intentionally does NOT enable live charging or activate subscriptions.
-- Provider-specific checkout and verified webhook handling must be implemented before launch.

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  package_id uuid not null references public.packages(id),
  provider text not null check (provider in ('cashia', 'mpesa', 'airtel_money')),
  amount numeric(12,2) not null check (amount > 0),
  currency text not null default 'KES' check (currency = 'KES'),
  status text not null default 'pending'
    check (status in ('pending', 'paid', 'failed', 'cancelled', 'expired', 'refunded')),
  merchant_reference text not null unique,
  provider_reference text,
  checkout_url text,
  provider_status text,
  paid_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb
);

create unique index if not exists payments_provider_reference_unique
  on public.payments(provider, provider_reference)
  where provider_reference is not null;

create index if not exists payments_user_created_idx
  on public.payments(user_id, created_at desc);

create index if not exists payments_status_created_idx
  on public.payments(status, created_at);

alter table public.payments enable row level security;

drop policy if exists "Users read own payments" on public.payments;
create policy "Users read own payments" on public.payments
  for select to authenticated
  using (user_id = auth.uid() or public.is_scholarhub_admin());

drop policy if exists "Admin reads all payments" on public.payments;
-- The user-owned policy above already includes the authorized administrator.

-- No authenticated insert/update/delete policy is created intentionally.
-- Only a trusted server-side service-role client should create or update payment
-- records, and only verified provider callbacks/status checks may mark them paid.

grant usage on schema public to authenticated;
grant select on public.payments to authenticated;

comment on table public.payments is
  'Payment audit trail. Paid status must only be set by trusted server-side verified provider events.';
comment on column public.payments.merchant_reference is
  'ScholarHub-generated unique reference sent to the payment provider; never trust a browser-supplied amount.';
comment on column public.payments.metadata is
  'Non-sensitive provider metadata only. Never store API secrets, PINs, or full payment credentials.';
