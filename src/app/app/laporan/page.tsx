import Link from "next/link";
import { Download, Wallet } from "lucide-react";
import { ButtonLink, Card, Notice, PageHeader } from "@/components/ui";
import { rupiah } from "@/lib/format";
import { businessDate } from "@/lib/pos-math";
import { METHOD_LABEL } from "@/lib/sale-status";
import { getContext } from "@/lib/session";

export const metadata = { title: "Laporan" };

type Report = {
  count: number; voided: number; gross: number; refunds: number; discounts: number; service: number; tax: number; expenses: number;
  costed_revenue: number; cogs: number; uncosted_revenue: number;
  by_day: { date: string; net: number; count: number }[];
  by_method: { method: string; amount: number }[];
  top_products: { name: string; qty: number; revenue: number }[];
};
type Outlet = { id: string; code: string; name: string; timezone: string };

const DAY = 86_400_000;
const isoDate = /^\d{4}-\d{2}-\d{2}$/;
const shift = (date: string, days: number) => new Date(Date.parse(`${date}T00:00:00Z`) + days * DAY).toISOString().slice(0, 10);
const dayLabel = (date: string, opts: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat("id-ID", { ...opts, timeZone: "UTC" }).format(new Date(`${date}T00:00:00Z`));

export default async function LaporanPage({ searchParams }: PageProps<"/app/laporan">) {
  const ctx = await getContext();
  if (ctx.role === "cashier") return (<><PageHeader title="Laporan" /><Notice error="forbidden" /></>);
  const sp = await searchParams;
  const { data: outletRows } = await ctx.supabase.from("outlets").select("id, code, name, timezone").order("code");
  const outlets = (outletRows ?? []) as Outlet[];
  const today = businessDate(new Date(), outlets[0]?.timezone ?? "Asia/Jakarta");
  const to = typeof sp.sampai === "string" && isoDate.test(sp.sampai) ? sp.sampai : today;
  const from = typeof sp.dari === "string" && isoDate.test(sp.dari) && sp.dari <= to ? sp.dari : shift(to, -6);
  const outletId = typeof sp.outlet === "string" && outlets.some((o) => o.id === sp.outlet) ? sp.outlet : "";

  const { data, error } = await ctx.supabase.rpc("sales_report", { p_from: from, p_to: to, p_outlet: outletId || null });
  const r = (data ?? {}) as Report;
  const n = (v: unknown) => Number(v ?? 0);
  const net = n(r.gross) - n(r.refunds);
  const grossProfit = n(r.costed_revenue) - n(r.cogs);
  const costCoverage = n(r.costed_revenue) + n(r.uncosted_revenue) > 0 ? n(r.costed_revenue) / (n(r.costed_revenue) + n(r.uncosted_revenue)) : 0;

  // One bar per day in range (zero days included) when the range is chart-sized.
  const span = Math.round((Date.parse(to) - Date.parse(from)) / DAY) + 1;
  const byDay = new Map((r.by_day ?? []).map((d) => [d.date, d]));
  const days = span <= 62 ? Array.from({ length: span }, (_, i) => shift(from, i)) : [];
  const maxDay = Math.max(1, ...days.map((d) => n(byDay.get(d)?.net)));
  const maxMethod = Math.max(1, ...(r.by_method ?? []).map((m) => n(m.amount)));
  const maxProduct = Math.max(1, ...(r.top_products ?? []).map((p) => n(p.revenue)));
  const query = new URLSearchParams({ dari: from, sampai: to, ...(outletId ? { outlet: outletId } : {}) }).toString();

  return (
    <>
      <PageHeader title="Laporan" description={`${dayLabel(from, { day: "numeric", month: "short" })} sampai ${dayLabel(to, { day: "numeric", month: "short", year: "numeric" })}`}>
        <ButtonLink href="/app/pengeluaran" look="tonal"><Wallet className="size-4" aria-hidden />Pengeluaran</ButtonLink>
        <ButtonLink href={`/app/laporan/csv?${query}`} look="outlined" prefetch={false}><Download className="size-4" aria-hidden />Unduh CSV</ButtonLink>
      </PageHeader>
      {error && <Notice error="generic" />}

      <form className="mb-6 flex flex-wrap items-end gap-3" aria-label="Rentang laporan">
        <DateField label="Dari" name="dari" value={from} max={today} />
        <DateField label="Sampai" name="sampai" value={to} max={today} />
        {outlets.length > 1 && (
          <label className="grid gap-1.5 text-sm">
            <span className="font-bold">Outlet</span>
            <select name="outlet" defaultValue={outletId} className="min-h-12 rounded-(--radius-field) border border-outline bg-surface-lowest px-4 text-base">
              <option value="">Semua outlet</option>
              {outlets.map((o) => <option key={o.id} value={o.id}>{o.code} · {o.name}</option>)}
            </select>
          </label>
        )}
        <button type="submit" className="press min-h-12 rounded-full bg-secondary-container px-6 font-bold text-on-secondary-container">Tampilkan</button>
        <span className="flex gap-2 text-sm font-bold">
          <Link className="rounded-lg px-2 py-1 text-primary hover:bg-primary/8" href={`/app/laporan?dari=${today}&sampai=${today}`}>Hari ini</Link>
          <Link className="rounded-lg px-2 py-1 text-primary hover:bg-primary/8" href={`/app/laporan?dari=${shift(today, -6)}&sampai=${today}`}>7 hari</Link>
          <Link className="rounded-lg px-2 py-1 text-primary hover:bg-primary/8" href={`/app/laporan?dari=${today.slice(0, 8)}01&sampai=${today}`}>Bulan ini</Link>
        </span>
      </form>

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Tile label="Omzet bersih" value={rupiah(net)} note={n(r.refunds) ? `setelah refund ${rupiah(n(r.refunds))}` : undefined} tone="primary" />
        <Tile label="Transaksi" value={String(n(r.count))} note={n(r.voided) ? `${n(r.voided)} void tidak dihitung` : undefined} tone="secondary" />
        <Tile
          label="Laba kotor"
          value={n(r.costed_revenue) ? rupiah(grossProfit) : "—"}
          note={n(r.costed_revenue) ? `dari ${Math.round(costCoverage * 100)}% penjualan yang punya harga pokok` : "isi harga pokok menu"}
          tone="tertiary"
        />
        <Tile label="Pengeluaran" value={rupiah(n(r.expenses))} note={n(r.count) ? `rata-rata transaksi ${rupiah(Math.round(net / n(r.count)))}` : undefined} tone="surface" />
      </div>

      {days.length > 0 && (
        <Card title="Omzet bersih per hari" className="mb-6">
          <div className="flex h-56 items-end gap-[2px] border-b border-outline-variant" role="img" aria-label={`Grafik omzet bersih harian, tertinggi ${rupiah(maxDay)}`}>
            {days.map((d) => {
              const v = n(byDay.get(d)?.net);
              const c = n(byDay.get(d)?.count);
              return (
                <div key={d} tabIndex={0} className="group relative flex h-full min-w-0 flex-1 items-end outline-none" aria-label={`${dayLabel(d, { day: "numeric", month: "short" })}: ${rupiah(v)}, ${c} transaksi`}>
                  <div
                    className="w-full rounded-t-[4px] bg-primary transition-opacity group-hover:opacity-80 group-focus-visible:opacity-80"
                    style={{ height: v > 0 ? `max(${(v / maxDay) * 100}%, 3px)` : "0" }}
                  />
                  <div className="pointer-events-none invisible absolute bottom-full left-1/2 z-10 mb-2 -translate-x-1/2 rounded-xl bg-on-surface px-3 py-2 text-xs whitespace-nowrap text-surface shadow-raised group-hover:visible group-focus-visible:visible">
                    <span className="block font-bold">{dayLabel(d, { weekday: "short", day: "numeric", month: "short" })}</span>
                    <span className="num block">{rupiah(v)} · {c} transaksi</span>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-2 flex justify-between text-xs text-on-surface-variant">
            <span>{dayLabel(days[0], { day: "numeric", month: "short" })}</span>
            <span className="num">tertinggi {rupiah(maxDay)}</span>
            <span>{dayLabel(days[days.length - 1], { day: "numeric", month: "short" })}</span>
          </div>
          <details className="mt-4 text-sm">
            <summary className="font-bold text-primary">Lihat sebagai tabel</summary>
            <table className="num mt-2 w-full text-left">
              <thead><tr className="text-on-surface-variant"><th className="py-1 font-semibold">Tanggal</th><th className="font-semibold">Transaksi</th><th className="text-right font-semibold">Omzet bersih</th></tr></thead>
              <tbody>
                {days.map((d) => (
                  <tr key={d} className="border-t border-outline-variant/60">
                    <td className="py-1.5">{dayLabel(d, { weekday: "short", day: "numeric", month: "short" })}</td>
                    <td>{n(byDay.get(d)?.count)}</td>
                    <td className="text-right">{rupiah(n(byDay.get(d)?.net))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </details>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Metode bayar" className="self-start">
          {(r.by_method ?? []).length === 0 ? <Empty /> : (
            <ul className="grid gap-3">
              {r.by_method.map((m) => <BarRow key={m.method} label={METHOD_LABEL[m.method] ?? m.method} value={rupiah(n(m.amount))} share={n(m.amount) / maxMethod} />)}
            </ul>
          )}
          <dl className="num mt-5 grid gap-1 border-t border-outline-variant pt-3 text-sm text-on-surface-variant">
            <Line label="Diskon diberikan" value={rupiah(n(r.discounts))} />
            <Line label="Service terkumpul" value={rupiah(n(r.service))} />
            <Line label="PB1 terkumpul" value={rupiah(n(r.tax))} />
          </dl>
        </Card>

        <Card title="Menu terlaris" className="self-start">
          {(r.top_products ?? []).length === 0 ? <Empty /> : (
            <ul className="grid gap-3">
              {r.top_products.map((p) => (
                <BarRow key={p.name} label={`${p.name} · ${new Intl.NumberFormat("id-ID").format(n(p.qty))} porsi`} value={rupiah(n(p.revenue))} share={n(p.revenue) / maxProduct} />
              ))}
            </ul>
          )}
        </Card>
      </div>
    </>
  );
}

function DateField({ label, name, value, max }: { label: string; name: string; value: string; max: string }) {
  return (
    <label className="grid gap-1.5 text-sm">
      <span className="font-bold">{label}</span>
      <input type="date" name={name} defaultValue={value} max={max} className="min-h-12 rounded-(--radius-field) border border-outline bg-surface-lowest px-4 text-base" />
    </label>
  );
}

function Tile({ label, value, note, tone }: { label: string; value: string; note?: string; tone: "primary" | "secondary" | "tertiary" | "surface" }) {
  const look = {
    primary: "bg-primary-container text-on-primary-container",
    secondary: "bg-secondary-container text-on-secondary-container",
    tertiary: "bg-tertiary-container text-on-tertiary-container",
    surface: "bg-surface-lowest text-on-surface shadow-card",
  }[tone];
  return (
    <div className={`rounded-(--radius-card) p-5 ${look}`}>
      <p className="text-sm font-bold">{label}</p>
      <p className="num mt-1 font-display text-2xl font-extrabold sm:text-3xl">{value}</p>
      {note && <p className="mt-1 text-xs opacity-85">{note}</p>}
    </div>
  );
}

function BarRow({ label, value, share }: { label: string; value: string; share: number }) {
  return (
    <li className="grid gap-1">
      <span className="flex justify-between gap-3 text-sm">
        <span className="truncate font-bold">{label}</span>
        <span className="num shrink-0 font-bold">{value}</span>
      </span>
      <span className="block h-2.5 rounded-full bg-surface-container">
        <span className="block h-full rounded-full bg-primary" style={{ width: `${Math.max(share * 100, 1)}%` }} />
      </span>
    </li>
  );
}

function Line({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3">
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

function Empty() {
  return <p className="text-sm text-on-surface-variant">Belum ada penjualan di rentang ini.</p>;
}
