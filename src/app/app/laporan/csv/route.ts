import { NextResponse, type NextRequest } from "next/server";
import { getContext } from "@/lib/session";

const isoDate = /^\d{4}-\d{2}-\d{2}$/;

const cell = (v: unknown) => {
  const s = v === null || v === undefined ? "" : String(v);
  // Quote everything that could break a row, and neutralise spreadsheet formula injection.
  const safe = /^[=+\-@]/.test(s) && Number.isNaN(Number(s)) ? `'${s}` : s;
  return /[",\n]/.test(safe) ? `"${safe.replaceAll('"', '""')}"` : safe;
};

/** Sales in a date range as CSV, one row per sale. RLS limits rows to what the caller may see. */
export async function GET(request: NextRequest) {
  const ctx = await getContext();
  if (ctx.role === "cashier") return new NextResponse("Forbidden", { status: 403 });
  const sp = request.nextUrl.searchParams;
  const from = sp.get("dari") ?? "";
  const to = sp.get("sampai") ?? "";
  if (!isoDate.test(from) || !isoDate.test(to) || from > to) return new NextResponse("Invalid range", { status: 400 });
  const outlet = sp.get("outlet");

  let query = ctx.supabase
    .from("sales_with_status")
    .select("id, receipt_no, business_date, created_at, outlet_id, status, order_type, table_label, subtotal, discount_total, service_total, tax_total, rounding, total, refunded_amount")
    .gte("business_date", from)
    .lte("business_date", to)
    .order("created_at")
    .limit(10_000);
  if (outlet) query = query.eq("outlet_id", outlet);
  const [{ data: sales, error }, { data: outlets }] = await Promise.all([
    query,
    ctx.supabase.from("outlets").select("id, code"),
  ]);
  if (error) return new NextResponse("Query failed", { status: 500 });
  const ids = (sales ?? []).map((s) => s.id as string);
  const methods = new Map<string, string[]>();
  for (let i = 0; i < ids.length; i += 200) {
    const { data: pays } = await ctx.supabase.from("payments").select("sale_id, method, amount").in("sale_id", ids.slice(i, i + 200));
    (pays ?? []).forEach((p) => methods.set(p.sale_id as string, [...(methods.get(p.sale_id as string) ?? []), `${p.method}:${Number(p.amount)}`]));
  }
  const codeOf = new Map((outlets ?? []).map((o) => [o.id as string, o.code as string]));

  const header = ["receipt_no", "business_date", "created_at", "outlet", "status", "order_type", "table", "subtotal", "discount", "service", "tax", "rounding", "total", "refunded", "payments"];
  const rows = (sales ?? []).map((s) => [
    s.receipt_no, s.business_date, s.created_at, codeOf.get(s.outlet_id as string), s.status, s.order_type, s.table_label,
    Number(s.subtotal), Number(s.discount_total), Number(s.service_total), Number(s.tax_total), Number(s.rounding), Number(s.total), Number(s.refunded_amount),
    (methods.get(s.id as string) ?? []).join(" "),
  ]);
  const csv = [header, ...rows].map((r) => r.map(cell).join(",")).join("\n");
  return new NextResponse(`﻿${csv}\n`, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="penjualan-${from}-${to}.csv"`,
      "cache-control": "private, no-store",
    },
  });
}
