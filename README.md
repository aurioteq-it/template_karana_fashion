# Karana Fashion single-product COD store

This repository contains a mobile-first Bangla storefront, a staff/admin dashboard, and a Supabase backend for one product. The original supplied requirements are preserved in [`prd.md`](./prd.md). The supplied PRD ends at customer journey step 7; the code uses the requirements that were actually provided. The user confirmed that this is the complete supplied text and that the deployment brand is **Karana Fashion**.

## Current state

- The storefront, policy pages, order success page, and dashboard run locally.
- Without Supabase environment variables, the storefront shows clearly labeled demo content and disables checkout.
- The seed file marks its product `is_demo = true`; the database order function refuses orders for demo products. The current linked product is `is_demo = false`, so confirm that its content and checkout are approved.
- The Karana Fashion Supabase project has the schema and demo seed installed, and both Edge Functions have been deployed. The static frontend has not been published. The last verified count found no real customer orders; a new count has not been checked. Do not publish unapproved product, price, policy, or delivery claims.
- Current project-specific progress and launch gaps are recorded in [`SETUP_STATUS.md`](./SETUP_STATUS.md). Production public sign-up is disabled for team-only authentication.

## Local development

Requirements: Node.js 20.19+ or 22.12+ and npm.

```powershell
npm.cmd install
Copy-Item .env.example .env
npm.cmd run dev
```

Open `http://127.0.0.1:5173`. Vite is pinned to this origin and will report an error if the port is busy instead of changing ports. With no `.env`, demo mode works without a backend. `npm.cmd run build` creates `dist/`. `npm.cmd run typecheck` checks TypeScript.

After setting `.env`, run `npm.cmd run check:supabase`. This read-only check reports whether the public tables, private-table permissions, and Edge Functions are available. It does not print the anon key or any customer records. If schema setup is incomplete, the storefront stays in a labeled demo preview with checkout disabled.

Run `npm.cmd run check:auth` to verify that public sign-up is disabled. `npm.cmd run smoke:functions` sends an empty invalid order and an unauthenticated staff invitation request; both must be rejected without creating records.

## Dedicated Supabase project setup

Use a **separate Supabase project for each client**. Never put the service-role key in `.env`, Vite configuration, source code, or chat. `VITE_*` variables are public in the browser bundle.

1. Create the Supabase project. Disable **Allow new users to sign up** in Authentication settings. For local work, set the Auth Site URL to `http://127.0.0.1:5173` and allow `http://127.0.0.1:5173/admin/accept-invite` and `http://127.0.0.1:5173/team/reset-password` as exact redirect URLs. Dashboard access requires an active `admin` or `staff` profile. Google sign-in is not needed for this team-only flow.
2. Run [`supabase/schema.sql`](./supabase/schema.sql) in the Supabase SQL Editor, then run [`supabase/seed.sql`](./supabase/seed.sql). The seed is demo data and checkout remains disabled.
3. Create the first admin user through the Supabase Auth dashboard. Then run the following SQL in the SQL Editor with the real admin email:

   ```sql
   insert into public.profiles(id, email, role, active)
   select id, email, 'admin', true
   from auth.users where email = 'ADMIN_EMAIL_HERE';
   ```

4. Copy `.env.example` to `.env` and set the project URL and **public anon key**. Restart Vite. Do not use the service-role key in a `VITE_` variable.
5. The official Supabase CLI is installed as a project dev dependency. Sign in and link this repository to this client's project if it is not already linked. Set the `PUBLIC_SITE_URL` function secret to the local origin while testing; it is used only to send staff invitations to `/admin/accept-invite`. Add that redirect URL to Supabase Auth's redirect allowlist. Deploy the functions:

   ```powershell
   npx.cmd supabase secrets set PUBLIC_SITE_URL=http://127.0.0.1:5173
   npx.cmd supabase functions deploy place-order --no-verify-jwt --use-api
   npx.cmd supabase functions deploy invite-staff --use-api
   ```

   `place-order` is a public COD endpoint, while its server-side database call uses the Supabase-managed `SUPABASE_SERVICE_ROLE_KEY`. `invite-staff` checks the caller's authenticated admin role before inviting anyone. Verify both functions in the target project before accepting orders.

   For reliable production invitations and password recovery, configure an approved SMTP provider in Supabase Auth. Its default mailer is intended for testing and has strict limits.

6. Sign in at the unlinked team URL `/team/access`. Replace the demo product, upload product images, set the category label, variants, price, stock, contact details, delivery fees, and policies. Set **Demo product (orders disabled)** to off only after the content has been checked and approved.

## What the backend enforces

- Anonymous visitors can read active catalog data and public business settings. They cannot select orders, profiles, or event records directly.
- Staff can view orders and customer shipping details, update only order status and internal notes, and look up customers from orders. Admins can also edit catalog data and settings, view reports, export CSV, and invite/deactivate staff.
- The Customers page groups recent orders by phone number. While open in a visible tab, it checks for new orders every 15 seconds; a manual refresh is also available. The current dashboard query covers the latest 500 orders, and the displayed count is explicitly a recent-order count.
- The Orders page shows each order's product name, selected design, quantity, and saved product photo in the list and details panel. Its start/end date inputs filter the database by the browser's local calendar days, including the entire end date. The list shows up to 500 matching orders. The owner applied [`supabase/migrations/20261106020000_order_image_snapshot.sql`](./supabase/migrations/20261106020000_order_image_snapshot.sql); it adds an image URL column and an insert trigger that copies the selected variant photo or first product photo at order time. Existing orders without a saved photo keep an empty image field. A real order photo has not yet been verified end to end.
- Admins can choose a week or month in Reports. The page reads all orders created in that period, shows order count, delivered count, delivered sales, cancelled/returned count, units, average delivered order, delivery rate, and a period trend. CSV export contains the selected period's aggregate rows. Delivered sales are attributed to the order creation date using the order's current status.
- The admin-only Data Cleanup page has four steps: inspect the order count and paused checkout, download a JSON backup of orders and status events, type `DELETE ORDERS` and acknowledge permanent deletion, then re-enter the admin password. The server verifies the signed-in admin and password before a service-role-only database function deletes orders; related order events cascade, which also empties the order-derived customer list. Products, images, settings, team accounts, stock, and a minimal purge audit record remain. Cleanup is rejected while an active product is not in demo mode. **Do not run the cleanup flow until you intend to permanently erase the history.**
- Cleanup is available in the linked Supabase project: the owner dry-ran and applied [`supabase/migrations/20261109000000_admin_order_cleanup.sql`](./supabase/migrations/20261109000000_admin_order_cleanup.sql), then deployed the authenticated `clear-order-history` Edge Function with JWT verification enabled. `npm.cmd run smoke:cleanup` confirmed that an unauthenticated function call and direct anonymous cleanup RPC both return HTTP 401. The migration and checks did not delete any orders. A valid admin password deletion has intentionally not been exercised.
- The order function checks Bangladesh phone format, required fields, active product and zone, quantity, and stock. It calculates price, delivery fee, and total from the database. A transaction lock makes repeated submissions with the same key return the existing reference without another order or stock decrement.
- The success page displays only a public-safe reference; it does not query private order details.

## Static hosting

Run `npm.cmd run build` and upload the **contents** of `dist/` to the hosting web root. Cloudflare Pages uses `dist` as its output directory; [`public/_redirects`](./public/_redirects) provides SPA route fallback. For Apache/cPanel, [`public/.htaccess`](./public/.htaccess) is copied into `dist` and provides the same fallback. Test direct navigation and refresh for `/`, `/order-success`, `/policy/privacy`, `/team/access`, `/team/reset-password`, and `/admin/orders` on the actual host.

Set the hosting environment's `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` at **build time**. When the real HTTPS domain is chosen, update Supabase Auth's Site URL and add the hosted `/admin/accept-invite` and `/team/reset-password` redirect URLs, then set the `PUBLIC_SITE_URL` Edge Function secret to that exact origin. No production domain is hardcoded in the frontend.

The repository includes a GitHub Actions build workflow. A GitHub remote has not been created because no repository/account was provided.

## Release checks before taking live orders

- Replace all demo text, prices, specs, images, stock, support details, delivery wording, and policies with owner-approved information. Add verified reviews only if permission is documented.
- Use a dedicated production Supabase project. Confirm the first admin and staff roles work, and that shopper accounts cannot access dashboard data. Confirm staff cannot edit prices or settings and anonymous API access to private tables is denied.
- Make one real test COD order. Verify its product and variant snapshots, unit price, delivery fee, total, address, status, and stock decrement in the dashboard.
- Repeat the exact same `submission_key` through the `place-order` endpoint and confirm the same reference and no new row or stock change. Test out-of-stock, invalid phone, bad zone, and missing fields.
- Test order status updates, customer lookup, report totals, CSV download, staff invitations, and staff deactivation. Check the full site on a phone and all direct route refreshes on the chosen host.
- Consider abuse protection for the public order endpoint (such as rate limits or CAPTCHA) before opening a high-traffic campaign. Configure tracking only after valid IDs, a consent decision, and end-to-end verification are available.

## Inputs still required for launch

Brand logo and contact number; actual product name, specifications, original images, variants, accurate prices and stock; approved delivery zones, fees and COD wording; approved return/refund, privacy and terms text; hosting/domain and dedicated Supabase project access; and the initial admin email. Do not send passwords or service-role keys in chat.

## Category, local images, team login, and tracking settings

- [`supabase/migrations/20261106000000_category_and_shopper_orders.sql`](./supabase/migrations/20261106000000_category_and_shopper_orders.sql) was applied to the existing project. Its category and tracking fields remain in use. Its shopper-order ownership columns and policies remain in the database for compatibility but are not exposed by the current frontend. The updated `place-order` function was deployed. Do not run the seed file again on the production project.
- The product editor now accepts local JPG, PNG, WebP, and AVIF files (up to 5 MB each). Images upload to Supabase Storage's `product-images` bucket. Use **Save** to publish the updated image order. Removing an image from the list does not delete its Storage object.
- The supplied KF logo is stored at `public/karana-logo.jpg` and appears in the storefront header/footer, team login, dashboard, and favicon.
- For multiple colors or designs of this one product, [`supabase/migrations/20261106010000_variant_images.sql`](./supabase/migrations/20261106010000_variant_images.sql) is applied to the linked project. The admin can add a design, set its label/SKU/price/stock, upload one local photo for it, and save. On the storefront, its thumbnail selects the design and changes the main photo, price, stock, and checkout selection together. The product gallery can hold additional photos shared across all designs.
- `/team/access` is the unlinked email/password sign-in page for admins and staff. The public storefront has no login link, sign-up form, Google button, or shopper account route. Staff invitations create team accounts; customers continue to order as guests. The route's lack of a public link is for presentation only: Supabase Auth, active role checks, and RLS enforce access.
- Staff invitations stay **pending** until the recipient opens the invitation and creates a password. `20261109010000_staff_invitation_acceptance.sql` is applied in the linked Supabase project. The dashboard refreshes staff status every 15 seconds while visible. The acceptance page calls `complete_staff_invitation` after the password is saved; pending accounts cannot access orders. An admin may resend to a pending staff member from the staff list or by entering the same email again. Accepted staff members cannot be invited again. For an unopened invite, Supabase sends a fresh invite; if the first link was opened but setup was not finished, it sends a recovery link to the same setup page. Auth email rate limits still apply. Deploy the updated `invite-staff` Edge Function with `npx.cmd supabase functions deploy invite-staff --use-api` from the authenticated CLI session.
- If resending shows **email rate limit exceeded**, Supabase Auth has refused the email; the account remains pending. The built-in Supabase email provider currently allows only 2 Auth emails per hour across the project, and recovery emails also have a per-user cooldown. Check the project's **Authentication → SMTP Settings** and **Authentication → Rate Limits**. For repeated invitations in production, configure your own SMTP provider, then set an appropriate Auth email limit. Do not put SMTP credentials in the frontend or chat.
- The team login links to `/team/forgot-password`. Supabase sends a recovery email to an existing account and redirects to `/team/reset-password`; that page requires an active admin/staff profile, saves a password of at least 12 characters, and signs out so the user logs in again. The request page gives the same success message whether or not the email belongs to an account. Add the exact reset URL to the hosted Supabase Auth redirect allowlist and verify the Reset password email template uses its redirect URL. No reset email has been sent in development.
- The Settings page has Facebook Pixel, GA4, GTM, and domain-verification fields. Enter IDs or verification content, not arbitrary script tags. The `tracking_enabled` switch defaults off. When enabled, analytics scripts load only after a visitor accepts the consent prompt. Use either GTM or direct GA4 on this site to avoid duplicate page views.
- Domain verification may require a static `<meta>` tag in the deployed HTML or a DNS record. Dashboard-saved verification values are added by JavaScript and may not be seen by every verifier. Confirm verification on the final domain using the provider's tool.
- The public “স্টাফ লগইন” footer link and shopper login header link have been removed. Security depends on Supabase Auth, RLS, and server-side role checks.
