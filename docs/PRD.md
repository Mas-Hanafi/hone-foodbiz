# H One FoodBiz — Product Requirements (v0.1, draft)

Status: draft · 2026-11-26 · License: MIT

## 1. What it is

Open-source point of sale and bookkeeping for small food businesses, from a roadside warung to a sit-down restaurant. A cashier rings up orders on a phone, tablet, or laptop, prints or shares a receipt (58 mm, 80 mm, or A4 PDF), and the owner sees sales, cash, expenses, and stock in one place.

It is a portfolio project. All demo data uses a fictional business, **Dapur Senja**, with two outlets.

## 2. Goals and non-goals

**Goals**
- A cashier can finish a regular cash sale in under 15 seconds.
- Cash sales keep working when the internet drops, and sync later without duplicates.
- Every receipt matches the stored transaction, even after prices change.
- Anyone can clone the repo, deploy it to Vercel + Supabase, and log in to a seeded demo in under 15 minutes.

**Non-goals (v1)**
- Multi-tenant SaaS, subscriptions, billing, platform admin panel.
- Payment gateway integration (QRIS is recorded manually).
- Full accounting (journals, ledger, balance sheet). Reports are operational, not tax filings.
- Direct ESC/POS printing (browser print only).

## 3. Users

| Role | Can do |
|---|---|
| Owner | Everything: settings, outlets, staff, products, all reports |
| Manager | Run one outlet: products, stock, shifts, approve voids/refunds, outlet reports |
| Cashier | Open/close own shift, sell, take payment, print receipts. Discount up to a per-outlet cap |

Roles are scoped per outlet. A cashier at Outlet A cannot see Outlet B.

## 4. Scope

### P0 — MVP
| Area | Requirement |
|---|---|
| Auth & staff | Email login (Supabase Auth). Owner invites staff, assigns role + outlet. Each cashier signs in with their own account; managers set a 6-digit PIN for approvals |
| Outlets | One business, one or more outlets. Per-outlet tax, service charge, receipt header/footer |
| Catalog | Categories, products, variants (size), modifiers (extra egg, less sugar), price per outlet, active/inactive, photo |
| POS | Visual grid + search, cart, qty, notes, item/order discount, dine-in/takeaway flag, hold order |
| Payment | Cash (with change), QRIS manual, transfer manual, split payment |
| Shift & cash | Open shift with float, cash in/out with reason, close shift with counted vs expected |
| Expenses | Record expense with category, amount, outlet, optional photo of the note |
| Stock (simple) | Track stock per product per outlet via a movement ledger (sale, restock, adjustment). Low-stock flag |
| Receipts | PDF 58 mm / 80 mm / A4 invoice, browser print, share link / download. Content snapshotted at sale time |
| Void / refund | Void before shift close, refund after. Both need manager PIN and reason. Never hard-delete |
| Reports | Daily/period sales, by product, by payment method, by cashier, shift recap, expenses, gross profit when cost price exists. Export CSV + PDF |
| Offline | PWA. Catalog cached. Cash sales queued in IndexedDB with client UUID, synced idempotently. Sync status visible |
| Demo | Seed script for Dapur Senja: 2 outlets, 3 staff, ~40 menu items, 30 days of sales |

### P1
Table map for dine-in, kitchen order ticket (print), Indonesian/English toggle, CSV product import, customer records.

### P2
Kitchen display (realtime), recipes and raw-material deduction, suppliers and purchasing, stock opname, direct thermal printing, multi-tenant hosted mode.

## 5. Data rules (non-negotiable)

1. **Money is `numeric(14,2)`**, never float. All money math happens in integer rupiah on the client.
2. **Sales are append-only.** Corrections are void/refund rows pointing at the original sale.
3. **Snapshot at sale time:** product name, variant, modifiers, unit price, discount, tax and service rates live on `sale_items` / `sales`, not looked up later.
4. **Stock is a ledger.** `stock_movements` is the source of truth; `stock_balances` is derived and updated in the same transaction.
5. **Receipt numbers** are generated on the terminal so they work offline: `JKT-T1-20261126-0001` (outlet, terminal, date, sequence), gap-free per terminal per day, unique per outlet in Postgres.
6. **Row-Level Security on every table**, keyed by outlet membership. Frontend filtering is never the only guard.
7. **Idempotent sync:** client-created rows use a client-generated UUID as primary key; replaying a sale is a no-op.
8. Every row carries `business_id` so a hosted multi-tenant mode can be added later without a migration.

## 6. Core entities

See [ERD.md](ERD.md): 20 tables, 5 RPCs, RLS on all of them, covered by a PGlite test suite.

## 7. Offline behaviour

| Works offline | Needs connection |
|---|---|
| Browse cached catalog, build cart, cash sale, change calculation, receipt PDF, browser print, cash in/out, expenses | Login, QRIS/transfer confirmation, void/refund (PIN checked server-side), shift close (after queue sync), reports, catalog edits |

Two offline terminals can sell the same last item. On sync, stock may go negative; the sale is kept and the movement is flagged for the manager. Offline sales older than 7 days without sync show a warning.

## 8. Stack

Matches the other H One repos.

| Layer | Choice |
|---|---|
| App | Next.js 16 (App Router), TypeScript, Tailwind v4 |
| Data / auth | Supabase: Postgres, RLS, Auth, Storage (logos, expense photos) |
| Offline | Service worker + IndexedDB |
| PDF | jsPDF (already used in hone-monitoring-app) |
| Tests | Vitest (money math, receipt numbering, sync idempotency, RLS) + Playwright for the checkout flow |
| Deploy | Vercel + Supabase, one-click deploy button in README |

## 9. Acceptance criteria (MVP done)

- [ ] Cash sale of 3 items takes ≤ 15 s and ≤ 6 taps on a mid-range Android phone.
- [ ] Kill network, make 20 cash sales, restore network: 20 sales on server, 0 duplicates.
- [ ] Change a product price; reprinting an old receipt still shows the old price.
- [ ] Two concurrent sales on the same outlet never get the same receipt number.
- [ ] Cashier at Outlet A gets zero rows when querying Outlet B directly through the Supabase API.
- [ ] Shift close shows counted vs expected cash, and the difference is stored.
- [ ] Receipt PDF renders correctly at 58 mm, 80 mm, and A4.
- [ ] Fresh clone → deploy → seeded demo login in ≤ 15 minutes following the README.

## 10. Milestones

| # | Deliverable |
|---|---|
| M0 | PRD (this), ERD + SQL migrations with RLS ✅, [POS screen wireframe](wireframes/pos.html) ✅ |
| M1 | Auth, outlets, staff, catalog ✅ (live-tested; staff creation pending service-role key). Deferred: product photos, per-outlet price UI, CSV import |
| M2 | POS, payments, receipts, shifts. **M2a ✅** (live-tested): terminal per device, open/close shift with server-computed expected cash, POS with variants and add-ons, cash/QRIS/transfer (manual), server-side price and total recompute, printable receipt 58/80 mm/A4. **M2b ✅** (live-tested): transaction history with daily filter, void/refund approved by manager PIN (list_approvers RPC), approval PIN on the account page, cash in/out per shift, order discount with server-enforced cashier cap. **M2c ✅** (live-tested): split payment up to 3 methods (server-validated, no cash rounding when split), hold order on the device with a table or customer label that is saved on the sale |
| M3 | Expenses, stock ledger, reports. **M3 ✅** (live-tested): expenses per month with "paid from drawer" tied to this device's open shift (counted in expected cash), stock balance per outlet with restock and opname (difference recorded as adjustment), owner/manager report for a date range: net revenue after refunds, gross profit from costed items, expenses, daily bar chart with table view, payment-method split, top 10 menu items, CSV export of sales |
| M4 | Offline queue + sync, demo seed, README with screenshots, deploy button |

## 11. Open questions

- Receipt language default: Indonesian only, or bilingual from v1?
- Rounding rule for cash (to nearest Rp100/Rp500) configurable per outlet?
- Is PB1 (restaurant tax) the only tax preset, or keep tax fully generic?
