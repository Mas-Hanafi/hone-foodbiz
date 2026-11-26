# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **Owner** of a small food business (warung, rumah makan, small restaurant) in Indonesia. Sets up outlets, staff, menu and prices; reviews sales. Uses a phone and a laptop about equally.
- **Manager** of one outlet: maintains the menu, terminals and stock for that outlet.
- **Cashier**: rings up sales on a phone or tablet during service (POS screen, milestone M2). Sees the admin screens read-only.

## Product Purpose

Open-source point of sale and bookkeeping for food businesses from a warung to a restaurant: cash sales that keep working offline, receipts (58 mm, 80 mm, A4 PDF), shifts and cash, expenses, simple stock. Success: a cashier finishes a 3-item cash sale in 6 taps; the owner trusts the numbers.

It is also a portfolio project for its author, so the interface should show deliberate visual craft, not only function.

## Positioning

Free, self-hostable, MIT-licensed, data owned by the business, built on Supabase with row-level security per outlet. Most local competitors (Moka, Majoo, Pawoon, Qasir) are closed SaaS.

## Operating Context

- Indonesian food service: rupiah without decimals (Rp25.000), PB1 restaurant tax around 10%, service charge, cash rounding to Rp100/500/1.000, dine-in vs takeaway.
- Interface language: Indonesian. Docs and code: English.
- Demo business is fictional: "Dapur Senja", outlets Jakarta (JKT) and Yogyakarta (YOG).

## Capabilities and Constraints

- Built: sign-in/sign-up, onboarding (business + first outlet), outlets with tax/service/receipt settings and terminals, staff (owner creates accounts), catalog with categories, products, variants and add-ons (modifiers).
- Next: POS screen, payments, shifts, receipts (M2); expenses, stock, reports (M3); offline sync (M4).
- Stack: Next.js 16 App Router, Tailwind v4, Supabase. Server actions without client JS for admin forms.
- Roles: owner (all outlets), manager (one outlet), cashier (one outlet).

## Brand Commitments

- Name: "H One FoodBiz", part of the author's "H One" repo family.
- Visual style requested by the author: Material You (Material Design 3), colorful tonal palette, not basic.

## Evidence on Hand

- No real customers, testimonials or usage data. Do not invent any.
- No logo or photography yet.

## Product Principles

1. Speed at the counter beats everything else on POS screens.
2. Money numbers must be unambiguous: rupiah formatting, clear totals, no hidden math.
3. Plain Indonesian an owner without IT background understands.
4. Every destructive or money-moving action is explicit and reversible where the data model allows.

## Accessibility & Inclusion

WCAG 2.2 AA. No further product-specific requirement established.
