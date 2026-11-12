# Nitumee

Book a trusted runner to do your shopping in Nairobi. Pick an area, a day and a
time slot, send your list and a budget — a runner shops and delivers. Pay by
M-Pesa after you receive the receipt.

Built with Next.js (App Router), Prisma and PostgreSQL.

## What works today

- Email + password sign-in, plus passkeys on supported devices
- Customer or runner sign-up; runner applications submit their phone, national
  ID, vehicle and number plate so an admin can vet them
- Booking form with Nairobi areas, daily 3-hour slots and a KES budget
- Customers can pick a vetted runner who serves their area and is free in that
  slot; the runner has ten minutes to accept before the run returns to the open
  queue
- Runner queue: accept or decline offers, take open runs, then mark shopping and
  delivered
- Admin dashboard (`/admin`) to approve or reject runner applications and watch
  bookings, with the national ID visible only to admins
- Booking detail shows the runner's plate and a "Vetted by Nitumee" note once
  they accept
- Payment records modelled for a future M-Pesa STK push

Set `ADMIN_EMAILS` (comma-separated) to make those accounts admins on sign-up or
sign-in; they land on `/admin`.

## Local development

```bash
pnpm install
cp .env.example .env        # point DATABASE_URL at your local Postgres
pnpm db                     # optional: start the bundled PGlite server on :55432
pnpm db:deploy              # apply migrations
pnpm dev:webpack            # or `pnpm dev` with a stock Next.js setup
```

The bundled PGlite server (`scripts/pglite-server.cjs`) serves a Postgres wire
protocol endpoint on `127.0.0.1:55432` using
`postgresql://postgres:postgres@127.0.0.1:55432/postgres`. Data lives in
`.pgdata/`.

## Deploying to Vercel

1. Create a database on [Neon](https://neon.tech) (the free tier does not pause
   during active months) and copy its pooled connection string.
2. In the Vercel project settings add `DATABASE_URL` with that string, and make
   sure `sslmode=require` is present.
3. Apply the schema once from your machine (Vercel builds also run
   `prisma db migrate`, so this is only the first bootstrap):

   ```bash
   DATABASE_URL="<neon-url>" pnpm db:deploy
   ```

4. Deploy. `postinstall` emits the Prisma contract; Next.js is built with
   Turbopack, which the repo is configured for.

## Tests

There is no automated test suite yet. The main flows (sign-in, booking,
cancellation, runner queue) have been exercised manually in a headless browser.
