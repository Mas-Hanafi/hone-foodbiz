import Link from "next/link";
import { ChevronRight, ReceiptText } from "lucide-react";
import { Card, EmptyState, PageHeader, StatusChip } from "@/components/ui";
import { rupiah } from "@/lib/format";
import { businessDate } from "@/lib/pos-math";
import { SALE_STATUS } from "@/lib/sale-status";
import { getContext } from "@/lib/session";

export const metadata = { title: "Transaksi" };

type SaleRow = {
  id: string; receipt_no: string; outlet_id: string; total: string; refunded_amount: string; status: string;
  created_at: string; order_type: string;
};
type Outlet = { id: string; code: string; name: string; timezone: string };

export default async function TransaksiPage({ searchParams }: PageProps<"/app/transaksi">) {
  const ctx = await getContext();
  const sp = await searchParams;
  const { data: outletRows } = await ctx.supabase.from("outlets").select("id, code, name, timezone").order("code");
  const outlets = (outletRows ?? []) as Outlet[];
  const outletFilter = typeof sp.outlet === "string" && outlets.some((o) => o.id === sp.outlet) ? sp.outlet : "";
  const today = businessDate(new Date(), outlets[0]?.timezone ?? "Asia/Jakarta");
  const date = typeof sp.tanggal === "string" && /^\d{4}-\d{2}-\d{2}$/.test(sp.tanggal) ? sp.tanggal : today;

  let query = ctx.supabase
    .from("sales_with_status")
    .select("id, receipt_no, outlet_id, total, refunded_amount, status, created_at, order_type")
    .eq("business_date", date)
    .order("created_at", { ascending: false })
    .limit(300);
  if (outletFilter) query = query.eq("outlet_id", outletFilter);
  const { data } = await query;
  const sales = (data ?? []) as SaleRow[];

  const live = sales.filter((s) => s.status !== "voided");
  const net = live.reduce((sum, s) => sum + Number(s.total) - Number(s.refunded_amount), 0);
  const outletOf = new Map(outlets.map((o) => [o.id, o]));

  return (
    <>
      <PageHeader title="Transaksi" description="Semua penjualan per hari bisnis. Buka satu transaksi untuk mencetak ulang, void, atau refund." />

      <form className="mb-5 flex flex-wrap items-end gap-3" aria-label="Filter transaksi">
        <label className="grid gap-1.5 text-sm">
          <span className="font-bold">Tanggal</span>
          <input type="date" name="tanggal" defaultValue={date} max={today} className="min-h-12 rounded-(--radius-field) border border-outline bg-surface-lowest px-4 text-base" />
        </label>
        {outlets.length > 1 && (
          <label className="grid gap-1.5 text-sm">
            <span className="font-bold">Outlet</span>
            <select name="outlet" defaultValue={outletFilter} className="min-h-12 rounded-(--radius-field) border border-outline bg-surface-lowest px-4 text-base">
              <option value="">Semua outlet</option>
              {outlets.map((o) => <option key={o.id} value={o.id}>{o.code} · {o.name}</option>)}
            </select>
          </label>
        )}
        <button type="submit" className="press min-h-12 rounded-full bg-secondary-container px-6 font-bold text-on-secondary-container">Tampilkan</button>
      </form>

      <div className="mb-5 grid grid-cols-2 gap-4 sm:max-w-xl">
        <div className="rounded-(--radius-card) bg-secondary-container p-5 text-on-secondary-container">
          <p className="text-sm font-bold">Transaksi</p>
          <p className="num font-display text-3xl font-extrabold">{live.length}</p>
        </div>
        <div className="rounded-(--radius-card) bg-tertiary-container p-5 text-on-tertiary-container">
          <p className="text-sm font-bold">Omzet bersih</p>
          <p className="num font-display text-3xl font-extrabold">{rupiah(net)}</p>
        </div>
      </div>

      <Card className="!p-2 sm:!p-3">
        {sales.length === 0 ? (
          <EmptyState icon={<ReceiptText className="size-6" />} title="Belum ada transaksi">Tidak ada penjualan pada tanggal ini.</EmptyState>
        ) : (
          <ul className="grid gap-0.5">
            {sales.map((s) => {
              const o = outletOf.get(s.outlet_id);
              const time = new Intl.DateTimeFormat("id-ID", { timeStyle: "short", timeZone: o?.timezone ?? "Asia/Jakarta" }).format(new Date(s.created_at));
              const st = SALE_STATUS[s.status] ?? SALE_STATUS.paid;
              return (
                <li key={s.id}>
                  <Link href={`/app/transaksi/${s.id}`} className="press flex min-h-16 items-center gap-4 rounded-2xl px-3 py-2 hover:bg-surface-container">
                    <span className="num w-12 shrink-0 font-bold text-on-surface-variant">{time}</span>
                    <span className="min-w-0 flex-1">
                      <span className="num block truncate font-bold">{s.receipt_no}</span>
                      <span className="block text-sm text-on-surface-variant">{o?.name} · {s.order_type === "dine_in" ? "Makan di sini" : "Bungkus"}</span>
                    </span>
                    <StatusChip tone={st.tone}>{st.label}</StatusChip>
                    <span className={`num w-24 text-right font-extrabold ${s.status === "voided" ? "text-on-surface-variant line-through" : ""}`}>{rupiah(s.total)}</span>
                    <ChevronRight className="size-5 text-on-surface-variant" aria-hidden />
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </>
  );
}
