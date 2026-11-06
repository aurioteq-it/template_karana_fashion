# Karana Fashion single-product COD store

This repository contains a mobile-first Bangla storefront, a staff/admin dashboard, and a Supabase backend for one product. The original supplied requirements are preserved in [`prd.md`](./prd.md). The supplied PRD ends at customer journey step 7; the code uses the requirements that were actually provided. The user confirmed that this is the complete supplied text and that the deployment brand is **Karana Fashion**.

## Current state

- The storefront, policy pages, order success page, and dashboard run locally.
- Without Supabase environment variables, the storefront shows clearly labeled demo content and disables checkout.
- The seed data is also marked `is_demo = true`; the database order function refuses orders for demo products.
- No real customer orders or production deployment exist yet. Do not publish the demo product, prices, policies, or delivery claims as real business information.

## Local development

Requirements: Node.js 20.19+ or 22.12+ and npm.

```powershell
npm.cmd install
Copy-Item .env.example .env
npm.cmd run dev
```

Open the Local URL printed by Vite. With no `.env`, demo mode works without a backend. `npm.cmd run build` creates `dist/`. `npm.cmd run typecheck` checks TypeScript.

After setting `.env`, run `npm.cmd run check:supabase`. This read-only check reports whether the public tables, private-table permissions, and Edge Functions are available. It does not print the anon key or any customer records. If schema setup is incomplete, the storefront stays in a labeled demo preview with checkout disabled.

## Dedicated Supabase project setup

Use a **separate Supabase project for each client**. Never put the service-role key in `.env`, Vite configuration, source code, or chat. `VITE_*` variables are public in the browser bundle.

1. Create the Supabase project. In Authentication settings, disable public sign-ups. Configure the intended Site URL and redirect URLs for staff invitation emails.
2. Run [`supabase/schema.sql`](./supabase/schema.sql) in the Supabase SQL Editor, then run [`supabase/seed.sql`](./supabase/seed.sql). The seed is demo data and checkout remains disabled.
3. Create the first admin user through the Supabase Auth dashboard. Do not enable public self-registration. Then run the following SQL in the SQL Editor with the real admin email:

   ```sql
   insert into public.profiles(id, email, role, active)
   select id, email, 'admin', true
   from auth.users where email = 'ADMIN_EMAIL_HERE';
   ```

4. Copy `.env.example` to `.env` and set the project URL and **public anon key**. Restart Vite. Do not use the service-role key in a `VITE_` variable.
5. The official Supabase CLI is installed as a project dev dependency. Sign in and link this repository to this client's project if it is not already linked. Set a `PUBLIC_SITE_URL` function secret to the exact HTTPS origin of the final storefront (or the local development origin for testing); it is used only to send staff invitations to `/admin/accept-invite`. Add that redirect URL to Supabase Auth's redirect allowlist. Deploy the functions:

   ```powershell
   npx.cmd supabase secrets set PUBLIC_SITE_URL=https://YOUR_DOMAIN
   npx.cmd supabase functions deploy place-order --no-verify-jwt --use-api
   npx.cmd supabase functions deploy invite-staff --use-api
   ```

   `place-order` is a public COD endpoint, while its server-side database call uses the Supabase-managed `SUPABASE_SERVICE_ROLE_KEY`. `invite-staff` checks the caller's authenticated admin role before inviting anyone. Verify both functions in the target project before accepting orders.

   For reliable production invitations, configure an approved SMTP provider in Supabase Auth. Its default mailer is intended for testing and has strict limits.

6. Sign in at `/admin/login`. Replace the demo product, image URLs, variants, price, stock, contact details, delivery fees, and policies. Set **Demo product (orders disabled)** to off only after the content has been checked and approved.

## What the backend enforces

- Anonymous visitors can read active catalog data and public business settings. They cannot select orders, profiles, or event records directly.
- Staff can view orders and customer shipping details, update only order status and internal notes, and look up customers from orders. Admins can also edit catalog data and settings, view reports, export CSV, and invite/deactivate staff.
- The order function checks Bangladesh phone format, required fields, active product and zone, quantity, and stock. It calculates price, delivery fee, and total from the database. A transaction lock makes repeated submissions with the same key return the existing reference without another order or stock decrement.
- The success page displays only a public-safe reference; it does not query private order details.

## Static hosting

Run `npm.cmd run build` and upload the **contents** of `dist/` to the hosting web root. Cloudflare Pages uses `dist` as its output directory; [`public/_redirects`](./public/_redirects) provides SPA route fallback. For Apache/cPanel, [`public/.htaccess`](./public/.htaccess) is copied into `dist` and provides the same fallback. Test direct navigation and refresh for `/`, `/order-success`, `/policy/privacy`, `/admin/login`, and `/admin/orders` on the actual host.

Set the hosting environment's `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` at **build time**. Point Supabase Auth's Site URL and redirect allowlist to the final domain. Use HTTPS.

The repository includes a GitHub Actions build workflow. A GitHub remote has not been created because no repository/account was provided.

## Release checks before taking live orders

- Replace all demo text, prices, specs, images, stock, support details, delivery wording, and policies with owner-approved information. Add verified reviews only if permission is documented.
- Use a dedicated production Supabase project. Confirm public sign-up is disabled and the first admin and staff roles work. Confirm staff cannot edit prices or settings and anonymous API access to private tables is denied.
- Make one real test COD order. Verify its product and variant snapshots, unit price, delivery fee, total, address, status, and stock decrement in the dashboard.
- Repeat the exact same `submission_key` through the `place-order` endpoint and confirm the same reference and no new row or stock change. Test out-of-stock, invalid phone, bad zone, and missing fields.
- Test order status updates, customer lookup, report totals, CSV download, staff invitations, and staff deactivation. Check the full site on a phone and all direct route refreshes on the chosen host.
- Consider abuse protection for the public order endpoint (such as rate limits or CAPTCHA) before opening a high-traffic campaign. Configure tracking only after valid IDs, a consent decision, and end-to-end verification are available.

## Inputs still required for launch

Brand logo and contact number; actual product name, specifications, original images, variants, accurate prices and stock; approved delivery zones, fees and COD wording; approved return/refund, privacy and terms text; hosting/domain and dedicated Supabase project access; and the initial admin email. Do not send passwords or service-role keys in chat.
