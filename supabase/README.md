# Live routing allowance

Apply `migrations/202609230001_fluid_budget.sql` through the existing Supabase
project's SQL editor before enabling live inference. It creates an isolated
`fluid_private` schema and two service-role-only RPCs in `public`. It does not
touch venture board tables. Do not expose the service role key in browser code.

The one shared launch allowance is **US$5 of Jev input usage**, at the pinned
`jev-1.13.0` rate of 42 nanodollars per token ($0.042/million). It does not reset
daily, monthly, or on deployment. All environments connected to this database
share that allowance. There is no automatic top-up.

Every upstream attempt first reserves 65,536 input tokens ($0.002752512).
Successful responses settle against their actual input-token usage, once.
Timeouts, cancellations, crashes, invalid responses, and failed settlement
retain the full reservation. Do not clear those reservations automatically:
the upstream request may already have been billed. SDK retries are disabled.
When the budget check fails or Supabase is unavailable, no Jev call is made.

The same transaction enforces 120 accepted attempts per IP hash per minute.
Only a keyed, daily HMAC of the trusted Vercel IP is sent to the database.
Non-Vercel development requests share one local bucket; forwarded headers are
ignored there. Old minute buckets are pruned during reservation. The database
stores no prompts, raw IP addresses, API keys, or inference responses.

Required server environment variables:

- `LIVE_INFERENCE_ENABLED=true` (keep false until setup is verified)
- `TYPESAFE_API_KEY`
- `SUPABASE_URL` (HTTPS)
- `SUPABASE_SERVICE_ROLE_KEY`
- `RATE_LIMIT_SECRET` (random string, at least 32 characters)

`GET /api/status` checks configuration only; it does not call Jev or test the
database. To pause immediately without deploying, set `enabled=false` on the
single budget row. To inspect accounting, select that row using the SQL editor:

```sql
select enabled,
       cap_nanodollars / 1000000000.0 as cap_usd,
       spent_nanodollars / 1000000000.0 as confirmed_usd,
       reserved_nanodollars / 1000000000.0 as reserved_usd
from fluid_private.budget where id = 'launch';
```

The cap controls calls routed through this application at the verified model
price and context limit. It does not cover unrelated account usage or taxes.
Verify the current TypeSafe price before changing the pinned model. Keep any
provider automatic credit refill disabled unless separately authorized.

Vercel Hobby's included WAF rate-limit rule can additionally limit
`POST /api/intent` to 120 requests/minute/IP. Its counters are regional, so it
does not replace this durable global ledger.
