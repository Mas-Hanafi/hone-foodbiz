import Link from "next/link";
import { Boxes } from "lucide-react";
import { Submit } from "@/components/submit-button";
import { Card, EmptyState, Field, Notice, PageHeader, SelectField, StatusChip, flash } from "@/components/ui";
import { getContext } from "@/lib/session";
import { moveStock } from "./actions";

export const metadata = { title: "Stok" };

const LOW = 5;
const KIND: Record<string, string> = { sale: "Terjual", void: "Void", restock: "Restock", adjustment: "Opname" };

type Outlet = { id: string; code: string; name: string; timezone: string };
type Product = { id: string; name: string; active: boolean };
type Move = { id: string; product_id: string; qty_delta: string; kind: string; note: string | null; created_at: string };

const qty = (v: number) => new Intl.NumberFormat("id-ID", { maximumFractionDigits: 3 }).format(v);

export default async function StokPage({ searchParams }: PageProps<"/app/stok">) {
  const ctx = await getContext();
  const sp = await searchParams;
  const { error, ok } = await flash(searchParams);
  const { data: outletRows } = await ctx.supabase.from("outlets").select("id, code, name, timezone").order("code");
  const outlets = (outletRows ?? []) as Outlet[];
  const outlet = outlets.find((o) => o.id === sp.outlet) ?? outlets[0];
  const canEdit = ctx.role !== "cashier";

  if (!outlet) return (<><PageHeader title="Stok" /><EmptyState icon={<Boxes className="size-6" />} title="Belum ada outlet" /></>);

  const [{ data: productRows }, { data: balanceRows }, { data: moveRows }] = await Promise.all([
    ctx.supabase.from("products").select("id, name, active").eq("track_stock", true).order("name"),
    ctx.supabase.from("stock_balances").select("product_id, qty").eq("outlet_id", outlet.id),
    ctx.supabase.from("stock_movements").select("id, product_id, qty_delta, kind, note, created_at").eq("outlet_id", outlet.id).order("created_at", { ascending: false }).limit(30),
  ]);
  const products = (productRows ?? []) as Product[];
  const balance = new Map(((balanceRows ?? []) as { product_id: string; qty: string }[]).map((b) => [b.product_id, Number(b.qty)]));
  const moves = (moveRows ?? []) as Move[];
  const nameOf = new Map(products.map((p) => [p.id, p.name]));
  const fmtTime = (iso: string) => new Intl.DateTimeFormat("id-ID", { dateStyle: "short", timeStyle: "short", timeZone: outlet.timezone }).format(new Date(iso));

  return (
    <>
      <PageHeader title="Stok" description="Hanya menu yang dilacak stoknya. Penjualan mengurangi otomatis; restock dan opname dicatat di sini." />
      <Notice error={error} ok={ok} />

      {outlets.length > 1 && (
        <nav aria-label="Pilih outlet" className="mb-5 flex flex-wrap gap-2">
          {outlets.map((o) => (
            <Link
              key={o.id}
              href={`/app/stok?outlet=${o.id}`}
              aria-current={o.id === outlet.id ? "true" : undefined}
              className={`press inline-flex min-h-10 items-center rounded-xl px-4 text-sm font-bold ${o.id === outlet.id ? "bg-secondary-container text-on-secondary-container" : "border border-outline text-on-surface-variant"}`}
            >
              {o.code} · {o.name}
            </Link>
          ))}
        </nav>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
        <div className="grid content-start gap-6">
          <Card title={`Saldo stok · ${outlet.name}`}>
            {products.length === 0 ? (
              <EmptyState icon={<Boxes className="size-6" />} title="Belum ada menu yang dilacak">
                Nyalakan &quot;Lacak stok&quot; di detail menu pada <Link href="/app/catalog" className="font-bold text-primary underline">Katalog</Link>.
              </EmptyState>
            ) : (
              <ul className="grid">
                {products.map((p) => {
                  const q = balance.get(p.id) ?? 0;
                  const tone = q < 0 ? "error" : q <= LOW ? "secondary" : "tertiary";
                  const label = q < 0 ? "Minus, cek fisik" : q <= LOW ? "Menipis" : "Aman";
                  return (
                    <li key={p.id} className="flex min-h-14 items-center gap-3 border-b border-outline-variant/60 last:border-0">
                      <span className={`flex-1 font-bold ${p.active ? "" : "text-on-surface-variant"}`}>{p.name}</span>
                      <StatusChip tone={tone}>{label}</StatusChip>
                      <span className={`num w-20 text-right font-display text-xl font-extrabold ${q < 0 ? "text-error" : ""}`}>{qty(q)}</span>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>

          <Card title="Riwayat mutasi">
            {moves.length === 0 ? (
              <p className="text-sm text-on-surface-variant">Belum ada mutasi di outlet ini.</p>
            ) : (
              <ul className="grid">
                {moves.map((m) => {
                  const d = Number(m.qty_delta);
                  return (
                    <li key={m.id} className="flex min-h-12 items-center gap-3 border-b border-outline-variant/60 text-sm last:border-0">
                      <span className="num w-28 shrink-0 text-on-surface-variant">{fmtTime(m.created_at)}</span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-bold">{nameOf.get(m.product_id) ?? "Menu dihapus"}</span>
                        {m.note && <span className="block truncate text-xs text-on-surface-variant">{m.note}</span>}
                      </span>
                      <StatusChip>{KIND[m.kind] ?? m.kind}</StatusChip>
                      <span className={`num w-16 text-right font-extrabold ${d < 0 ? "text-error" : "text-tertiary"}`}>{d > 0 ? "+" : "−"}{qty(Math.abs(d))}</span>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>
        </div>

        {canEdit && products.length > 0 && (
          <Card title="Catat stok" tone="tertiary" className="self-start">
            <form action={moveStock} className="grid gap-3">
              <input type="hidden" name="outlet_id" value={outlet.id} />
              <SelectField label="Menu" name="product_id" required>
                {products.map((p) => <option key={p.id} value={p.id}>{p.name} (sekarang {qty(balance.get(p.id) ?? 0)})</option>)}
              </SelectField>
              <SelectField label="Jenis" name="mode" defaultValue="restock">
                <option value="restock">Restock: tambah jumlah masuk</option>
                <option value="opname">Opname: isi jumlah fisik sekarang</option>
              </SelectField>
              <Field label="Jumlah" name="qty" inputMode="decimal" required hint="Restock = yang masuk. Opname = hasil hitung fisik; selisihnya dicatat otomatis." />
              <Field label="Catatan" name="note" placeholder="Opsional, mis. dari supplier A" />
              <Submit>Simpan</Submit>
            </form>
          </Card>
        )}
      </div>
    </>
  );
}
