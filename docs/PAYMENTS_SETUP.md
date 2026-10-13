# ScholarHub payments setup

## Current status

The payment foundation migration creates an auditable `public.payments` table. It does not charge customers or activate subscriptions. Do not advertise checkout as live until the provider adapter and verified callback are implemented and tested.

## Recommended rollout

1. In Cashia's merchant/developer dashboard, confirm that the account is approved for hosted checkout and that **M-Pesa and Airtel Money** are enabled for Kenyan collections.
2. Start with Cashia sandbox credentials and the provider's official Node.js/REST documentation. Confirm the exact create-checkout request, response fields, webhook signature/authentication, payment-status lookup endpoint, and refund process.
3. Add credentials only to Render Environment settings, never to GitHub or browser JavaScript. Use separate sandbox and production credentials. The expected application environment variables should be documented after the official API contract is confirmed; do not guess their names or values.
4. The server must load package price and duration from `public.packages`, create a pending `public.payments` row with a server-generated unique `merchant_reference`, then request a hosted checkout session.
5. Return only the provider checkout URL and ScholarHub payment ID to the browser. Never accept the amount, user ID, package duration, or a paid status from the browser as authoritative.
6. A provider redirect to the success page is **not** proof of payment. Verify the webhook signature or authenticate the callback, then query Cashia's status API where available. Check merchant reference, provider transaction ID, exact amount, currency, and successful final status. Make processing idempotent so duplicate callbacks cannot extend a subscription twice.
7. In one trusted server-side operation, mark the payment paid and create/extend the subscription from the package duration. Failed, cancelled, pending, and unverified events must never grant premium access.
8. Test successful, declined, cancelled, delayed, duplicate, malformed, and mismatched-amount callbacks in sandbox before switching to production.

## Supabase migration

Run `supabase/migrations/20261013_payment_foundation.sql` in the Supabase SQL Editor. It adds the payment ledger with row-level security. Students can read their own payment rows, but authenticated browser clients cannot insert or change payment status.

## Personal mobile numbers

A personal M-Pesa or Airtel Money number can be used for manual transfers only if your provider/account terms allow it; that is not an automated integration. Do not unlock packages based on a screenshot, SMS pasted by a student, or a success redirect. Prefer Cashia-hosted checkout if your merchant account supports both wallets. Otherwise obtain the relevant merchant collection/API access before direct integrations.

## Cashia details needed before implementing its adapter

From the official Cashia developer dashboard/docs (not your secret keys), confirm:
- Node.js SDK package and version or REST API base URL
- Checkout/session creation endpoint and required request fields
- Checkout URL and merchant-reference fields returned in the response
- Webhook signature/authentication scheme and event payload
- Payment status lookup endpoint
- Whether M-Pesa and Airtel Money are enabled on your merchant account

Never paste API keys, client secrets, webhook secrets, or passwords into a chat or commit them to the repository. Set them directly in Render after the adapter specifies the exact variable names.
