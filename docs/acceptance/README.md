# Acceptance checks

Run on 26 Nov 2026 against a production build (`next build && next start`) and a live Supabase project, using the demo business from `supabase/seed.sql` unless noted. They map to section 9 of the [PRD](../PRD.md).

| # | Criterion | Result | Evidence |
|---|---|---|---|
| 1 | 3-item cash sale ≤ 15 s, ≤ 6 taps on a mid-range Android phone | Not measured yet | Needs a real phone |
| 2 | 20 offline sales, 0 duplicates | Pass. 20 sales queued with no connection, plus one whose reply was lost after the server saved it: 21 on the server, 21 distinct ids, receipt numbers in sequence. Repeated with the server process stopped: the cashier screen opened from the service worker and 2 sales synced on restart | Database counts before and after |
| 3 | Old receipt keeps its price after a price change | Pass. Kopi Susu changed from 15.000 to 18.000 in the catalog form; the receipt from 24 Nov still reads `2 x 15.000`. Price set back afterwards | Line items store name and price at sale time |
| 4 | Concurrent sales never share a receipt number | Pass. Five browser tabs on the same terminal pressed Selesai at the same moment and got 0015 to 0019. No duplicate receipt numbers anywhere in the database | `receipt_no` is unique; the server retries with the next number |
| 5 | Cashier at outlet A sees zero rows of outlet B through the Supabase API | Pass. A cashier limited to JKT signed in with the publishable key: rows from JKT in every table, 0 rows from YOG in 12 tables and views, insert and `record_sale` on YOG refused with `42501`, `sales_report` for YOG empty. The test cashier was deleted afterwards | Row-Level Security |
| 6 | Shift close shows counted vs expected, difference stored | Pass. Closed with Rp100.000 counted: the screen showed expected Rp847.000 and a Rp747.000 shortfall, and both values are stored on the shift | [shift-closed.png](shift-closed.png) |
| 7 | Receipt prints correctly at 58 mm, 80 mm and A4 | Pass. PDFs are one page at 58.3 mm, 80.1 mm and 210 × 297 mm; nothing overflows the receipt, no buttons print, page background is white. On A4 the receipt is a centred 120 mm column | [58 mm](receipt-58mm.pdf) · [80 mm](receipt-80mm.pdf) · [A4](receipt-a4.pdf) · print views: [58 mm](print-58mm.png), [80 mm](print-80mm.png), [A4](print-a4.png) |
| 8 | Fresh clone → deploy → demo login in ≤ 15 minutes | Not measured yet | Needs a deploy on a fresh Vercel project |

## Noted, not blocking

- `sales_report` can be called by a cashier through the API for their own outlet. The reports screen is limited to owners and managers, but the totals themselves are not hidden from cashiers at the database level.
