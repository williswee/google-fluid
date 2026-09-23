# Launch operations

Use the existing Supabase Free project and Vercel Hobby account. This demo must not upgrade either plan, create paid integrations, or introduce automatic credit refills.

## Connect live inference

1. Apply `supabase/migrations/202609230001_fluid_budget.sql` in the existing project's SQL editor. It creates an isolated budget schema and narrowly scoped RPC functions, without changing venture board data. Read [the ledger documentation](../supabase/README.md) before operating it.
2. Add `TYPESAFE_API_KEY`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, and a random `RATE_LIMIT_SECRET` of at least 32 characters to the server environment. Do not expose these through `NEXT_PUBLIC_` or browser code.
3. Use that same Supabase project for local live tests, evaluation, previews, and production. They share the one launch allowance. Keep provider-side automatic refill disabled.
4. Set `LIVE_INFERENCE_ENABLED=true` only when the migration and credentials are in place. Redeploy or restart after environment changes.

`GET /api/status` confirms configuration readiness only. The first protected request verifies the actual database and provider path. There is no unmetered health-check call to Jev.

## Verify before release

- Run `npm test` and `npm run build`; run the browser checks against the reviewed build.
- With inference disabled, confirm the UI clearly labels example behavior, still permits manual exploration, and never claims a live prediction.
- With live inference configured, run the development evaluation through the protected application endpoint. Review failures and the measured report; run the held-out set only after the route criteria are settled. Do not invent results while connection is pending.
- Check desktop, narrow mobile, keyboard navigation, reduced motion, rapid prompt edits, manual override, and failed inference. A stale prediction must not replace a newer prompt's mode.
- Confirm the submitted route preview explicitly says this is a UI demonstration and no tool is running. Search and research previews must not invent citations or imply actual browsing.
- Deploy to the selected Vercel project, assign the requested `chatgptfluid.vercel.app` address if available, and verify the live public URL before advertising it. Record the reviewed commit and deployment URL in delivery notes.

Do not test budget exhaustion by spending the remaining allowance. Use the unit/integration tests for that condition. Do not reset or increase the ledger to make an evaluation pass.

## Pause and inspect

The ledger documentation includes a read-only SQL query for confirmed and reserved spend. Failed or uncertain upstream requests retain their maximum reservation because they may have incurred a charge; do not automatically refund them. The ledger is an application-level guard for the pinned model price and documented input limit, not a provider-account-wide billing cap.

For an immediate pause without waiting for deployment, an operator can run:

```sql
update fluid_private.budget set enabled = false where id = 'launch';
```

This stops new reservations. Requests already reserved may finish within their accounted allowance. Keep the application in labeled example mode until the cause is understood. Resuming a pause must not alter the cap, clear reservations, or reset confirmed usage.

## Repository and recording

Keep the repository private at first. Before public release, inspect the full Git history and published assets for credentials, personal data, and browser recordings. Environment files containing values and temporary `artifacts/` stay out of Git. Public evaluation reports may contain only authored cases and measured nonsecret routing data.

Capture the [video storyboard](VIDEO.md) from the actual reviewed build. If the live provider is unavailable, label any substitute throughout as an example walkthrough and leave the live recording unfinished; never use fixtures as evidence of real Jev inference.
