import Link from "next/link";
import { notFound } from "next/navigation";
import { Card, Check, Field, Notice, PageHeader, SelectField, Submit, flash, table } from "@/components/ui";
import { rupiah } from "@/lib/format";
import { getContext } from "@/lib/session";
import { addVariant, deleteVariant, setProductModifiers, updateProduct } from "../actions";

type Product = {
  id: string; name: string; category_id: string | null; price: string; cost_price: string | null;
  sku: string | null; track_stock: boolean; active: boolean;
};
type Named = { id: string; name: string };
type Priced = Named & { price: string };
type Modifier = Priced & { active: boolean };

export default async function ProductPage({ params, searchParams }: PageProps<"/app/catalog/[id]">) {
  const { id } = await params;
  const ctx = await getContext();
  const { error, ok } = await flash(searchParams);
  const [{ data: product }, { data: cats }, { data: variantRows }, { data: modRows }, { data: linkRows }] = await Promise.all([
    ctx.supabase.from("products").select("id, name, category_id, price, cost_price, sku, track_stock, active").eq("id", id).maybeSingle(),
    ctx.supabase.from("categories").select("id, name").order("name"),
    ctx.supabase.from("product_variants").select("id, name, price").eq("product_id", id).order("sort").order("price"),
    ctx.supabase.from("modifiers").select("id, name, price, active").order("name"),
    ctx.supabase.from("product_modifiers").select("modifier_id").eq("product_id", id),
  ]);
  if (!product) notFound();
  const p = product as Product;
  const categories = (cats ?? []) as Named[];
  const variants = (variantRows ?? []) as Priced[];
  const modifiers = (modRows ?? []) as Modifier[];
  const linked = new Set(((linkRows ?? []) as { modifier_id: string }[]).map((l) => l.modifier_id));
  const canEdit = ctx.role !== "cashier";
  const price = (v: string | null) => (v === null ? "" : String(Number(v)));

  return (
    <>
      <PageHeader title={p.name}>
        <Link href="/app/catalog" className="text-sm font-medium underline">← Katalog</Link>
      </PageHeader>
      <Notice error={error} ok={ok} />

      <Card title="Detail">
        <form action={updateProduct} className="grid gap-4">
          <input type="hidden" name="id" value={p.id} />
          <fieldset disabled={!canEdit} className="grid gap-4 sm:grid-cols-2">
            <Field label="Nama" name="name" defaultValue={p.name} required />
            <SelectField label="Kategori" name="category_id" defaultValue={p.category_id ?? ""}>
              <option value="">Tanpa kategori</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </SelectField>
            <Field label="Harga jual" name="price" inputMode="numeric" defaultValue={price(p.price)} required />
            <Field label="Harga pokok" name="cost_price" inputMode="numeric" defaultValue={price(p.cost_price)} />
            <Field label="SKU" name="sku" defaultValue={p.sku ?? ""} />
            <div>
              <Check label="Lacak stok" name="track_stock" defaultChecked={p.track_stock} />
              <Check label="Aktif (tampil di kasir)" name="active" defaultChecked={p.active} />
            </div>
          </fieldset>
          {canEdit && <div><Submit>Simpan</Submit></div>}
        </form>
      </Card>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card title="Varian">
          <p className="mb-3 text-sm text-mute">Ukuran atau pilihan dengan harga sendiri, mis. Biasa / Jumbo. Kosongkan kalau tidak ada.</p>
          {variants.length > 0 && (
            <table className={table}>
              <tbody>
                {variants.map((v) => (
                  <tr key={v.id}>
                    <td>{v.name}</td>
                    <td className="text-right tabular-nums">{rupiah(v.price)}</td>
                    <td className="w-0">
                      {canEdit && (
                        <form action={deleteVariant}>
                          <input type="hidden" name="id" value={v.id} />
                          <input type="hidden" name="product_id" value={p.id} />
                          <button type="submit" className="text-xs text-accent underline">Hapus</button>
                        </form>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {canEdit && (
            <form action={addVariant} className="mt-4 grid grid-cols-[1fr_8rem] gap-3">
              <input type="hidden" name="product_id" value={p.id} />
              <Field label="Nama varian" name="name" placeholder="Jumbo" required />
              <Field label="Harga" name="price" inputMode="numeric" placeholder="26.000" required />
              <div className="col-span-2"><Submit tone="quiet">Tambah varian</Submit></div>
            </form>
          )}
        </Card>

        <Card title="Tambahan">
          {modifiers.length === 0 ? (
            <p className="text-sm text-mute">
              Belum ada tambahan. <Link href="/app/catalog/modifiers" className="underline">Buat dulu</Link>, mis. Telur +3.000.
            </p>
          ) : (
            <form action={setProductModifiers} className="grid gap-1">
              <input type="hidden" name="product_id" value={p.id} />
              <fieldset disabled={!canEdit}>
                {modifiers.map((m) => (
                  <Check
                    key={m.id}
                    name="modifier_ids"
                    value={m.id}
                    defaultChecked={linked.has(m.id)}
                    label={`${m.name} (+${rupiah(m.price)})${m.active ? "" : " · nonaktif"}`}
                  />
                ))}
              </fieldset>
              {canEdit && <div className="mt-3"><Submit tone="quiet">Simpan tambahan</Submit></div>}
            </form>
          )}
        </Card>
      </div>
    </>
  );
}
