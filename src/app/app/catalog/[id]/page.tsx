import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Layers, Plus, Sparkles, X } from "lucide-react";
import { Submit } from "@/components/submit-button";
import { ButtonLink, Card, ChipCheck, Field, Notice, PageHeader, SelectField, StatusChip, Switch, flash } from "@/components/ui";
import { rupiah } from "@/lib/format";
import { getContext } from "@/lib/session";
import { addVariant, deleteVariant, setProductModifiers, updateProduct } from "../actions";

export const metadata = { title: "Detail menu" };

type Product = {
  id: string; name: string; category_id: string | null; price: string; cost_price: string | null;
  sku: string | null; track_stock: boolean; active: boolean;
};
type Named = { id: string; name: string };
type Priced = Named & { price: string };
type Modifier = Priced & { active: boolean };

const plain = (v: string | null) => (v === null ? "" : new Intl.NumberFormat("id-ID").format(Number(v)));

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
  const margin = p.cost_price !== null ? Number(p.price) - Number(p.cost_price) : null;

  return (
    <>
      <ButtonLink href="/app/catalog" look="text" className="-ml-3 mb-2">
        <ArrowLeft className="size-4" aria-hidden /> Katalog
      </ButtonLink>
      <PageHeader title={p.name}>
        {!p.active && <StatusChip>Nonaktif, tidak tampil di kasir</StatusChip>}
        {margin !== null && <StatusChip tone="tertiary">Laba kotor {rupiah(margin)}</StatusChip>}
      </PageHeader>
      <Notice error={error} ok={ok} />

      <Card>
        <form action={updateProduct} className="grid gap-5">
          <input type="hidden" name="id" value={p.id} />
          <fieldset disabled={!canEdit} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="Nama menu" name="name" defaultValue={p.name} required className="lg:col-span-2" />
            <SelectField label="Kategori" name="category_id" defaultValue={p.category_id ?? ""}>
              <option value="">Tanpa kategori</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </SelectField>
            <Field label="Harga jual" name="price" prefix="Rp" inputMode="numeric" defaultValue={plain(p.price)} required />
            <Field label="Harga pokok" name="cost_price" prefix="Rp" inputMode="numeric" defaultValue={plain(p.cost_price)} hint="Opsional, untuk laba kotor." />
            <Field label="SKU" name="sku" defaultValue={p.sku ?? ""} />
            <div className="grid gap-x-10 sm:col-span-2 sm:grid-cols-2 lg:col-span-3 lg:max-w-2xl">
              <Switch label="Aktif" hint="Tampil di layar kasir." name="active" defaultChecked={p.active} />
              <Switch label="Lacak stok" hint="Stok berkurang setiap terjual." name="track_stock" defaultChecked={p.track_stock} />
            </div>
          </fieldset>
          {canEdit && <div className="flex justify-end border-t border-outline-variant pt-5"><Submit>Simpan perubahan</Submit></div>}
        </form>
      </Card>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card title="Varian" tone="tertiary" className="self-start" action={<Layers className="size-5 opacity-70" aria-hidden />}>
          <p className="mb-4 text-sm opacity-90">Ukuran dengan harga sendiri, mis. Biasa dan Jumbo. Kosongkan kalau tidak ada.</p>
          {variants.length > 0 && (
            <ul className="mb-5 grid">
              {variants.map((v) => (
                <li key={v.id} className="flex min-h-12 items-center gap-3 border-b border-on-tertiary-container/15 last:border-0">
                  <span className="flex-1 font-bold">{v.name}</span>
                  <span className="num font-extrabold">{rupiah(v.price)}</span>
                  {canEdit && (
                    <form action={deleteVariant}>
                      <input type="hidden" name="id" value={v.id} />
                      <input type="hidden" name="product_id" value={p.id} />
                      <button type="submit" aria-label={`Hapus varian ${v.name}`} className="press grid size-10 place-items-center rounded-full hover:bg-error-container hover:text-on-error-container">
                        <X className="size-4" aria-hidden />
                      </button>
                    </form>
                  )}
                </li>
              ))}
            </ul>
          )}
          {canEdit && (
            <form action={addVariant} className="grid gap-3">
              <input type="hidden" name="product_id" value={p.id} />
              <div className="grid grid-cols-[1fr_9rem] gap-3">
                <Field label="Nama varian" name="name" placeholder="Jumbo" required />
                <Field label="Harga" name="price" prefix="Rp" inputMode="numeric" placeholder="30.000" required />
              </div>
              <Submit look="outlined"><Plus className="size-4" aria-hidden />Tambah varian</Submit>
            </form>
          )}
        </Card>

        <Card title="Tambahan" tone="secondary" className="self-start" action={<Sparkles className="size-5 opacity-70" aria-hidden />}>
          {modifiers.length === 0 ? (
            <p className="text-sm opacity-90">
              Belum ada tambahan. <Link href="/app/catalog/modifiers" className="font-bold underline">Buat dulu</Link>, mis. Telur +Rp3.000.
            </p>
          ) : (
            <form action={setProductModifiers} className="grid gap-4">
              <input type="hidden" name="product_id" value={p.id} />
              <p className="text-sm opacity-90">Pilih tambahan yang bisa dipesan untuk menu ini.</p>
              <fieldset disabled={!canEdit} className="flex flex-wrap gap-2">
                <legend className="sr-only">Tambahan untuk {p.name}</legend>
                {modifiers.map((m) => (
                  <ChipCheck
                    key={m.id}
                    name="modifier_ids"
                    value={m.id}
                    defaultChecked={linked.has(m.id)}
                    label={`${m.name} +${rupiah(m.price)}${m.active ? "" : " (nonaktif)"}`}
                  />
                ))}
              </fieldset>
              {canEdit && <Submit look="outlined">Simpan tambahan</Submit>}
            </form>
          )}
        </Card>
      </div>
    </>
  );
}
