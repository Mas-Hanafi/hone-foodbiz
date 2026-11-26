import { Wallet } from "lucide-react";
import { Submit } from "@/components/submit-button";
import { Card, EmptyState, Field, Notice, PageHeader, SelectField, StatusChip, Switch, flash } from "@/components/ui";
import { rupiah } from "@/lib/format";
import { businessDate } from "@/lib/pos-math";
import { getContext } from "@/lib/session";
import { addExpense } from "./actions";

export const metadata = { title: "Pengeluaran" };

const CATEGORIES = ["Bahan baku", "Gas dan bahan bakar", "Listrik dan air", "Gaji dan upah", "Sewa", "Kebersihan", "Kemasan", "Lainnya"];

type Expense = { id: string; outlet_id: string; shift_id: string | null; category: string; amount: string; note: string | null; spent_on: string };
type Outlet = { id: string; code: string; name: string; timezone: string };

export default async function PengeluaranPage({ searchParams }: PageProps<"/app/pengeluaran">) {
  const ctx = await getContext();
  const sp = await searchParams;
  const { error, ok } = await flash(searchParams);
  const { data: outletRows } = await ctx.supabase.from("outlets").select("id, code, name, timezone").order("code");
  const outlets = (outletRows ?? []) as Outlet[];
  const today = businessDate(new Date(), outlets[0]?.timezone ?? "Asia/Jakarta");
  const month = typeof sp.bulan === "string" && /^\d{4}-\d{2}$/.test(sp.bulan) ? sp.bulan : today.slice(0, 7);
  const [y, m] = month.split("-").map(Number);
  const lastDay = new Date(Date.UTC(y, m, 0)).getUTCDate();

  const { data } = await ctx.supabase
    .from("expenses")
    .select("id, outlet_id, shift_id, category, amount, note, spent_on")
    .gte("spent_on", `${month}-01`)
    .lte("spent_on", `${month}-${String(lastDay).padStart(2, "0")}`)
    .order("spent_on", { ascending: false })
    .order("created_at", { ascending: false });
  const expenses = (data ?? []) as Expense[];
  const total = expenses.reduce((s, e) => s + Number(e.amount), 0);
  const byCategory = [...expenses.reduce((map, e) => map.set(e.category, (map.get(e.category) ?? 0) + Number(e.amount)), new Map<string, number>())]
    .sort((a, b) => b[1] - a[1]);
  const outletOf = new Map(outlets.map((o) => [o.id, o]));
  const monthLabel = new Intl.DateTimeFormat("id-ID", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(Date.UTC(y, m - 1, 1)));

  return (
    <>
      <PageHeader title="Pengeluaran" description="Belanja dan biaya operasional. Yang dibayar dari laci ikut mengurangi uang seharusnya di shift." />
      <Notice error={error} ok={ok} />

      <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
        <div className="grid content-start gap-5">
          <form className="flex flex-wrap items-end gap-3" aria-label="Pilih bulan">
            <label className="grid gap-1.5 text-sm">
              <span className="font-bold">Bulan</span>
              <input type="month" name="bulan" defaultValue={month} className="min-h-12 rounded-(--radius-field) border border-outline bg-surface-lowest px-4 text-base" />
            </label>
            <button type="submit" className="press min-h-12 rounded-full bg-secondary-container px-6 font-bold text-on-secondary-container">Tampilkan</button>
          </form>

          <div className="rounded-(--radius-card) bg-secondary-container p-5 text-on-secondary-container">
            <p className="text-sm font-bold">Total {monthLabel}</p>
            <p className="num font-display text-4xl font-extrabold">{rupiah(total)}</p>
            {byCategory.length > 0 && (
              <ul className="mt-3 flex flex-wrap gap-2 text-sm">
                {byCategory.map(([cat, amt]) => (
                  <li key={cat} className="num rounded-lg bg-surface-lowest/60 px-2.5 py-1 font-bold">{cat} {rupiah(amt)}</li>
                ))}
              </ul>
            )}
          </div>

          <Card className="!p-2 sm:!p-3">
            {expenses.length === 0 ? (
              <EmptyState icon={<Wallet className="size-6" />} title="Belum ada pengeluaran">Catat belanja bahan, gas, atau biaya lain di form samping.</EmptyState>
            ) : (
              <ul className="grid gap-0.5">
                {expenses.map((e) => (
                  <li key={e.id} className="flex min-h-16 items-center gap-4 rounded-2xl px-3 py-2">
                    <span className="num w-14 shrink-0 text-sm font-bold text-on-surface-variant">
                      {new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", timeZone: "UTC" }).format(new Date(`${e.spent_on}T00:00:00Z`))}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-bold">{e.category}</span>
                      <span className="block truncate text-sm text-on-surface-variant">
                        {outletOf.get(e.outlet_id)?.name}{e.note ? ` · ${e.note}` : ""}
                      </span>
                    </span>
                    {e.shift_id && <StatusChip tone="secondary">Dari laci</StatusChip>}
                    <span className="num font-extrabold">{rupiah(e.amount)}</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        <Card title="Catat pengeluaran" tone="secondary" className="self-start">
          <form action={addExpense} className="grid gap-3">
            <SelectField label="Outlet" name="outlet_id" required>
              {outlets.map((o) => <option key={o.id} value={o.id}>{o.code} · {o.name}</option>)}
            </SelectField>
            <Field label="Kategori" name="category" list="kategori-pengeluaran" placeholder="Bahan baku" required />
            <datalist id="kategori-pengeluaran">{CATEGORIES.map((c) => <option key={c} value={c} />)}</datalist>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Jumlah" name="amount" prefix="Rp" inputMode="numeric" required />
              <Field label="Tanggal" name="spent_on" type="date" defaultValue={today} max={today} required />
            </div>
            <Field label="Catatan" name="note" placeholder="Opsional, mis. beli di pasar" />
            <Switch label="Dibayar dari laci kasir" hint="Mengurangi uang seharusnya di shift yang buka di perangkat ini." name="from_drawer" />
            <Submit>Simpan</Submit>
          </form>
        </Card>
      </div>
    </>
  );
}
