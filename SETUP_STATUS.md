# Karana Fashion setup status — 9 November 2026

## Completed

- `.env` has a working project URL and public anon key. Secret values are not recorded here.
- The linked Supabase project is `Karana fashion landing page` (`aabgtfvqndcphffnkwsg`).
- The schema and demo seed are available. One active admin profile exists; no customer orders existed at the last count check.
- `place-order` and `invite-staff` Edge Functions were deployed to the linked project.
- Public catalog reads work. Anonymous API reads of `orders` and `profiles` return HTTP 401.
- The order function rejects an invalid request with HTTP 400; the staff function rejects an unauthenticated invitation with HTTP 401.
- The storefront build passes. The latest public API check shows the active product has `is_demo = false`, one shared image, and three active variants with images. Checkout can accept orders if the remaining server-side checks pass.

## Outstanding before a real launch

- The new category field, local product image uploader, team-only login, and Facebook/Google tracking configuration UI are implemented locally. The public shopper login and account routes were removed. The database migration and order function are deployed; the new frontend is **not yet deployed** to live hosting.
- The supplied KF logo is installed locally. Color/design variants now support individual uploaded photos, additional design rows, and synchronized storefront selection. The owner applied `20261106010000_variant_images.sql` to production after a dry run listed only that migration. `npm run check:supabase` confirms `product_variants.image_url` is available, and anonymous reads of orders and profiles remain blocked. The storefront uses the shared product photo when a variant has no separate image.
- The Customers dashboard now checks for new orders every 15 seconds while its tab is visible and offers manual refresh. It groups by phone using each customer's latest order, with counts based on the most recent 500 orders. The new frontend is still local; this behavior will be available after deployment.
- Admin/staff password recovery pages are implemented locally. Supabase Auth must allow `http://127.0.0.1:5173/team/reset-password` as an exact redirect URL before testing email delivery; no reset email has been sent yet. The hosted frontend and SMTP delivery remain unverified.
- Admin weekly/monthly sales reports and the four-step order-history cleanup page are implemented locally. Reports read orders for the selected period. The owner dry-ran and applied `20261109000000_admin_order_cleanup.sql`, then deployed `clear-order-history` with JWT verification enabled. `npm.cmd run smoke:cleanup` passed: unauthenticated function request HTTP 401 and direct anonymous cleanup RPC HTTP 401. No valid admin deletion has been run, and no order or customer history has been deleted by this work. The frontend is still local.
- The Orders dashboard now shows the product photo/name/design in its list and details panel and supports server-side start/end date filtering. The owner reported that `20261106020000_order_image_snapshot.sql` applied successfully to production. It saves an image URL on new orders; the trigger cannot be independently exercised through anonymous access while order data is private. Existing orders without a saved photo show a placeholder. The frontend remains local.
- After the migration report, `npm.cmd run check:supabase`, `npm.cmd run check:auth`, and `npm.cmd run typecheck` passed. The smoke test passed on retry: invalid order HTTP 400, fake shopper session HTTP 401, and unauthenticated staff invite HTTP 401. The first smoke run timed out on the invite request after the first two checks passed. No test order was created, so the photo snapshot trigger and date filter have not been verified with a real order.
- On 6 November, the category/tracking migration was applied. A past read found a demo product with no images and `is_demo = false`; the owner restored demo mode at that time. The latest read shows `is_demo = false` again with product and variant images present. The local product editor blocks saving a non-demo product without images, but that frontend guard is not yet deployed.
- The migration was applied successfully by the owner from an authenticated CMD session. It added the category field, non-secret tracking fields, shopper-order owner link with RLS, image upload limits, and a new two-argument order function.
- The owner deployed the updated `place-order` function. `npm run smoke:functions` passed: malformed order HTTP 400, fake shopper bearer token HTTP 401, and unauthenticated staff invite HTTP 401. `npm run check:supabase` passes; anonymous order reads, profile reads, and direct execution of the new shopper-order RPC all return HTTP 401.
- The owner completed Supabase CLI login successfully in CMD, but this Codex shell still receives `AccessTokenRequiredError`; its isolated shell cannot use that saved credential. Function deployment must therefore occur from the owner's authenticated CMD session unless the CLI authentication becomes available here.
- The production HTTPS domain is not chosen. The local origin is fixed at `http://127.0.0.1:5173`; allow its `/admin/accept-invite` URL in Supabase Auth for staff invitations.
- On 6 November, the owner disabled production public sign-up. A fresh `npm.cmd run check:auth` returned exit code 0 with `Public signup enabled: no` and `Google provider enabled: no`. Team authentication is now limited to existing accounts and admin-issued invitations; dashboard access still requires an active admin or staff profile.

- For local invitation testing, set `PUBLIC_SITE_URL` to `http://127.0.0.1:5173` and allow `http://127.0.0.1:5173/admin/accept-invite` in Supabase Auth. When a real HTTPS domain is chosen, update both to its exact origin. The secret name exists, but its current value is intentionally not readable here.
- Confirm that the current product, images, prices, stock, delivery details, contact number, and policies are approved. If not, turn **Demo product (orders disabled)** back on before exposing checkout.
- Deploy the static frontend to the chosen HTTPS host and verify direct route refreshes.
- Complete a real COD test order, idempotency test, staff permissions test, and mobile browser review after the approved product data is added.
