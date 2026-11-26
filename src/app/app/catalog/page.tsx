import Link from "next/link";
import { Card, Check, Field, Notice, PageHeader, SelectField, Submit, flash, table } from "@/components/ui";
import { rupiah } from "@/lib/format";
import { getContext } from "@/lib/session";
import { addCategory, addProduct, deleteCategory } from "./actions";

type Category = { id: string; name: string };
type Product = { id: string; name: string; category_id: string | null; price: string; track_stock: boolean; active: boolean };

export default async function CatalogPage({ searchParams }: PageProps<"/app/catalog">) {
  const ctx = await getContext();
  const { error, ok } = await flash(searchParams);
  const [{ data: catRows }, { data: productRows }] = await Promise.all([
    ctx.supabase.from("categories").select("id, name").order("sort").order("name"),
    ctx.supabase.from("products").select("id, name, category_id, price, track_stock, active").order("name"),
  ]);
  const categories = (catRows ?? []) as Category[];
  const products = (productRows ?? []) as Product[];
  const categoryName = new Map(categories.map((c) => [c.id, c.name]));
  const canEdit = ctx.role !== "cashier";

  return (
    <>
      <PageHeader title="Katalog">
        <Link href="/app/catalog/modifiers" className="text-sm font-medium underline">Kelola tambahan (topping, level pedas)</Link>
      </PageHeader>
      <Notice error={error} ok={ok} />

      <div className="grid gap-6 lg:grid-cols-[1fr_18rem]">
        <Card title={`Produk (${products.length})`}>
          {products.length === 0 ? (
            <p className="text-sm text-mute">Belum ada produk. Tambahkan menu pertamamu di bawah.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className={table}>
                <thead><tr><th>Nama</th><th>Kategori</th><th className="text-right">Harga</th><th>Stok</th></tr></thead>
                <tbody>
                  {products.map((p) => (
                    <tr key={p.id} className={p.active ? "" : "text-mute"}>
                      <td>
                        <Link href={`/app/catalog/${p.id}`} className="font-medium underline">{p.name}</Link>
                        {!p.active && <span className="ml-2 text-xs">nonaktif</span>}
                      </td>
                      <td>{p.category_id ? categoryName.get(p.category_id) : "—"}</td>
                      <td className="text-right tabular-nums">{rupiah(p.price)}</td>
                      <td>{p.track_stock ? "Dilacak" : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <Card title="Kategori">
          <ul className="grid gap-1 text-sm">
            {categories.map((c) => (
              <li key={c.id} className="flex items-center justify-between gap-2 border-b border-line py-1.5 last:border-0">
                {c.name}
                {canEdit && (
                  <form action={deleteCategory}>
                    <input type="hidden" name="id" value={c.id} />
                    <button type="submit" className="text-xs text-accent underline">Hapus</button>
                  </form>
                )}
              </li>
            ))}
            {categories.length === 0 && <li className="text-mute">Belum ada kategori.</li>}
          </ul>
          {canEdit && (
            <form action={addCategory} className="mt-4 grid gap-2">
              <Field label="Kategori baru" name="name" placeholder="Minuman" required />
              <Submit tone="quiet">Tambah</Submit>
            </form>
          )}
        </Card>
      </div>

      {canEdit && (
        <Card title="Tambah produk" className="mt-6">
          <form action={addProduct} className="grid gap-4 sm:grid-cols-2">
            <Field label="Nama" name="name" placeholder="Nasi Ayam" required />
            <SelectField label="Kategori" name="category_id" defaultValue="">
              <option value="">Tanpa kategori</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </SelectField>
            <Field label="Harga jual" name="price" inputMode="numeric" placeholder="25.000" required />
            <Field label="Harga pokok (opsional)" name="cost_price" inputMode="numeric" placeholder="12.000" hint="Untuk laporan laba kotor." />
            <Field label="SKU (opsional)" name="sku" />
            <Check label="Lacak stok produk ini" name="track_stock" />
            <div className="sm:col-span-2"><Submit>Tambah produk</Submit></div>
          </form>
        </Card>
      )}
    </>
  );
}
