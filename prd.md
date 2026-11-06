# Nexova TEQ — Single Product E-commerce System

**Product Requirements Document (PRD)**  
**Version:** 1.0  
**Target market:** Bangladesh  
**Primary language:** Bangla  
**Currency:** BDT (৳)  
**Release target:** A working, production-ready single-product COD storefront with an admin dashboard  
**Implementation stack:** React, TypeScript, Vite, Tailwind CSS, Supabase, GitHub, and static frontend hosting (DoHost cPanel or Cloudflare Pages)

---

## 1. Product summary

Build a reusable system for a business to sell one primary product through a mobile-first landing page. Customers can view the product, select a variation and quantity, and place a cash-on-delivery (COD) order. Authorized staff can sign in to manage products, inventory, customers, orders, and reports.

The first release is a single business and single product deployment. The codebase must be reusable for another client, but each client deployment must use its own Supabase project, hosting configuration, secrets, and admin users. Do not implement shared multi-tenant data in version 1.

“AI-powered” describes the use of Codex to build the system. No customer-facing AI feature is required in version 1.

## 2. Goals and success criteria

### Goals

1. A customer can complete a COD order on a phone without creating an account.
2. The server validates the order, calculates the final amount, and saves it exactly once.
3. Admins and authorized staff can process orders without exposing customer data publicly.
4. Product information and business settings can be updated from the dashboard.
5. The system can be deployed as a static frontend with Supabase as the backend.

### Release success criteria

- A valid test order appears in the dashboard with the correct product, variation, price snapshot, delivery fee, total, and shipping details.
- Repeating the same submission key returns the same order instead of creating another order.
- A customer cannot read orders, customer records, staff profiles, or private settings through the public API.
- Staff and admin permissions work as specified in this PRD.
- Direct navigation and browser refresh work on every public and admin route in the chosen hosting environment.
- All critical automated checks and the manual release checklist pass. Any unmet item is reported explicitly.

## 3. Scope

### In scope for version 1

- One active product per deployment, with optional variations and multiple images.
- Bangla product landing page and policy pages.
- COD order form and success page.
- Supabase database, authentication, storage, server-side order function, and row level security (RLS).
- Admin dashboard, order management, customer lookup, product/stock editing, settings, reports, and CSV export.
- Optional GTM, GA4, Meta Pixel, and Meta Conversions API integration, activated only when valid IDs and consent requirements are provided and tested.
- GitHub repository, configuration examples, deployment instructions, and release tests.

### Out of scope for version 1

- Online payment, bKash, Nagad, courier APIs, SMS, WhatsApp automation, invoices, abandoned checkout, customer accounts, multi-product carts, and shared multi-tenant databases.
- Automatically generated customer reviews, product claims, discounts, scarcity messages, or legal policies.
- Customer-facing AI chat or recommendations.

## 4. Inputs the business owner must provide

Use clearly labeled demo content during development. Do not publish placeholder content as real business information.

| Input | Required for launch |
| --- | --- |
| Business/brand name, logo, contact number, support hours | Yes |
| Product name, accurate description, specifications, benefits, and original images | Yes |
| Regular price, offer price if applicable, variation labels, and starting stock | Yes |
| Delivery zones and charges, expected delivery wording, COD rules | Yes |
| Return/refund terms, privacy policy, and terms approved by the business owner | Yes |
| Domain and hosting access or deployment details | Yes |
| Supabase project and initial admin email | Yes |
| Verified customer reviews and permission to display them | Only if reviews are shown |
| GTM, GA4, Meta identifiers, and conversion API credentials | Only for enabled tracking |

Never ask the owner to paste service-role keys, passwords, or API secrets into source code or chat. Provide secure setup instructions for secret storage.

## 5. Users and permissions

| Role | Access |
| --- | --- |
| Visitor | Read the published product and public policies; submit an order through the order function. No direct access to private tables. |
| Staff | View orders and customer shipping details, search/filter orders, add internal notes, and change order status. Cannot manage users, product prices, inventory settings, tracking secrets, or business settings. No bulk CSV export by default. |
| Admin | All staff functions plus product and inventory editing, settings, reports, CSV export, and staff administration. |

Public self-registration must be disabled. An admin creates staff accounts through a controlled procedure. Authorization must be enforced by the backend and database, not only by hiding UI controls.

## 6. User journeys

### Customer order journey

1. Open `/` and see the product name, images, price, offer details, delivery information, and primary CTA.
2. Select a variation if one is available and choose a quantity.
3. Review an estimated order summary.
4. Enter name, Bangladesh mobile number, district, area, and full address; choose COD.
5. Submit once. Show loading feedback and prevent repeat clicks while the request is pending.
6. The server validates inputs, calculates prices and delivery charge from trusted data, checks availability, and writes the order atomically.
7. Redirect to `/order-success` with a public-safe order reference. The success page shows an acknowledgment and order reference, but does not fetch or expose private order details without a secure verification mechanism.