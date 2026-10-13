# ScholarHub payments setup

## Current status

A draft pull request adds an RLS-protected `public.payments` ledger and an explicit checkout status in the student UI. No real checkout request is sent, no money is collected, and no subscription is activated yet.

## What Cashia's public documentation confirms

Cashia's public developer page describes hosted checkout/payment sessions, sandbox keys, payment-status tracking, and webhooks. Its business page specifically describes Cashia Checkout as accepting **cards and M-Pesa**. Public pages do not confirm that Airtel Money is enabled for this merchant account, so ScholarHub must not show it as available until Cashia confirms it.

Official links:
- Hosted checkout: https://developer.cashia.com/docs/payment-gateway/hosted-checkout
- API references: https://developer.cashia.com/docs/payment-gateway/api-references
- Developer overview and sandbox entry: https://www.cashia.com/developers/
- Cashia business checkout description: https://www.cashia.com/businesses/
- Support: support@cashia.com or 0709 200 900

## Cashia hosted checkout contract — documented facts

The hosted-checkout documentation shows:
- Create a hosted checkout with `POST /v1/hosted-checkout`.
- The example request includes `requestId`, `amount`, `currency`, `successRedirectUrl`, `errorRedirectUrl`, `webhookUrl`, `orderDetails`, and `deliveryDetails`.
- The example response includes `sessionId`, `url`, `amount`, `currency`, and `requestId`. The browser should be redirected only to the checkout `url` returned by Cashia after the server validates the response.
- Documented headers are `X-Cashia-Key-ID`, `X-Cashia-Timestamp` (Unix seconds), `X-Cashia-Nonce` (unique random string), `X-Cashia-Signature` (HMAC-SHA256 of the signing string), `X-Cashia-Hash` (HMAC-SHA256 hash of the request body for POST/PUT/PATCH), and `Content-Type: application/json`.
- The displayed signing-string format is `https://host + method + timestamp + nonce + keyId`, with no separators or additional characters between components. Implement this only after confirming the exact host representation (host alone versus scheme/host) and the provider's canonicalization details from its full docs or support.
- The docs' Postman header section lists variables `key_id`, `timestamp`, `nonce`, `signature`, and `body_hash`, but that alone does not specify the exact byte-level input and output encoding for `body_hash`.

## Cashia transaction-status contract — documented facts

The API References page documents `GET /v1/transactions/:transactionId` and a required `transactionId`. Its example identifier is shaped like `transaction/<id>`. The response example has a top-level `process` object containing:
- `id`, `type`, `createdAt`, `updatedAt`
- `status` (example value: `limited`)
- `requestIdentifier` and `requestStatus` (example value: `pending`)
- `externalProcessId`, amount fields, source/destination currency objects, and other provider metadata

These examples are schemas, not proof of a paid transaction. Do not treat `limited`, `pending`, an HTTP 200 response, a redirect, or a mere transaction ID as successful payment. Cashia's exact terminal success value, transaction ID to persist, amount-field mapping, and currency-field mapping must be confirmed before activation logic is written. Match the verified provider transaction to the server-generated ScholarHub merchant reference, exact expected amount, and KES currency.

The documentation screenshot shows the test environment host as `https://staging.cashia.com/` while the live environment is marked TBD. The final API base URL and any required path prefix must be verified before making requests. Do not infer a production host.

## How to locate checkout settings safely

1. Open the official developer portal: https://developer.cashia.com/ and choose **Go to Docs**. If it redirects or you cannot see API reference material, use the developer overview above and the merchant dashboard linked there.
2. In the Cashia merchant/developer dashboard, look for **API Settings**, **Developer**, **API keys**, **Sandbox**, **Checkout**, **Payment Links**, or **Webhooks**. Cashia's merchant terms describe API keys under an **API Settings** tab for verified merchants; the exact dashboard labels may vary.
3. Generate/use **sandbox** credentials only. Do not paste them into chat or commit them to GitHub. Do not add production credentials to Render yet.
4. Confirm whether the merchant account has hosted checkout/payment-session creation, an API reference for the exact request and response fields, and a webhook configuration page.
5. Ask Cashia support to confirm whether Airtel Money collections are supported and enabled for this exact merchant account, and whether webhooks are signed. The public checkout page confirms card and M-Pesa, but does not establish Airtel support.
6. Ask Cashia to confirm: exact sandbox API base URL and path prefix; live base URL; signature host canonicalization; exact HMAC body-hash input/encoding; which field is the transaction ID; the definitive successful final status and amount/currency fields; webhook signature/verification and retry behavior; and a sample successful sandbox response with sensitive values removed.

## Recommended implementation once the provider contract is confirmed

1. The server authenticates the student and loads package price and duration from `public.packages`. Never accept an amount, package duration, user ID, or paid status from the browser as authoritative.
2. Create a pending `public.payments` row with a server-generated unique `merchant_reference`, then request a Cashia sandbox checkout session.
3. Return only the hosted checkout URL and ScholarHub payment ID to the browser. Do not collect mobile-money PINs or card details in ScholarHub.
4. A browser redirect is not proof of payment. Verify the provider webhook signature/authentication, and query the provider's status endpoint if available. Check merchant reference, provider transaction ID, exact amount, currency, and successful final status.
5. Process provider events idempotently. In a trusted server-side operation, mark the payment paid and create/extend the subscription using the package duration. Duplicate events must not extend a subscription twice.
6. Failed, cancelled, pending, malformed, or unverified events must never grant premium access.
7. Test successful, declined, cancelled, delayed, duplicate, malformed, and mismatched-amount events in sandbox before considering production credentials.

## Supabase migration

The draft PR contains `supabase/migrations/20261013_payment_foundation.sql`. Review the SQL and run it in Supabase SQL Editor when ready. It creates the payment ledger with RLS; authenticated browser clients cannot insert or change payment status.

## Personal mobile numbers

Your personal M-Pesa and Airtel Money numbers are not a safe basis for automated subscription activation. Manual transfers may be possible under the applicable account terms, but screenshots or SMS messages are not reliable proof. Prefer Cashia-hosted checkout for M-Pesa. If Airtel Money is not supported by Cashia for your account, obtain the appropriate Airtel merchant/API access before integrating it directly.

Never share API keys, client secrets, webhook secrets, passwords, mobile-money PINs, or full payment credentials in chat or source control.
