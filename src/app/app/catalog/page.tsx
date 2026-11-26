import Link from "next/link";
import { ChevronDown, ChevronRight, Plus, Sparkles, Trash2, UtensilsCrossed } from "lucide-react";
import { Submit } from "@/components/submit-button";
import { ButtonLink, Card, EmptyState, Field, Notice, PageHeader, SelectField, StatusChip, Switch, flash } from "@/components/ui";
import { rupiah } from "@/lib/format";
import { getContext } from "@/lib/session";
import { addCategory, addProduct, deleteCategory } from "./actions";

export const metadata = { title: "Katalog" };

type Category = { id: string; name: string };
type Product = { id: string; name: string; category_id: string | null; price: string; track_stock: boolean; active: boolean };

const CATEGORY_TONES = [
  "bg-primary-container text-on-primary-container",
  "bg-tertiary-container text-on-tertiary-container",
  "bg-secondary-container text-on-secondary-container",
];

export default async function CatalogPage({ searchParams }: PageProps<"/app/catalog">) {
  const ctx = await getContext();
  const sp = await searchParams;
  const { error, ok } = await flash(searchParams);
  const [{ data: catRows }, { data: productRows }] = await Promise.all([
    ctx.supabase.from("categories").select("id, name").order("sort").order("name"),
    ctx.supabase.from("products").select("id, name, category_id, price, track_stock, active").order("active", { ascending: false }).order("name"),
  ]);
  const categories = (catRows ?? []) as Category[];
  const products = (productRows ?? []) as Product[];
  const canEdit = ctx.role !== "cashier";

  const filter = typeof sp.kategori === "string" ? sp.kategori : "";
  const toneOf = new Map(categories.map((c, i) => [c.id, CATEGORY_TONES[i % CATEGORY_TONES.length]]));
  const nameOf = new Map(categories.map((c) => [c.id, c.name]));
  const shown = filter === "tanpa" ? products.filter((p) => !p.category_id) : filter ? products.filter((p) => p.category_id === filter) : products;
  const countIn = (id: string | null) => products.filter((p) => p.category_id === id).length;
  const openAdd = canEdit && (sp.tambah === "1" || products.length === 0);

  return (
    <>
      <PageHeader title="Katalog" description="Menu, harga, dan tambahan yang dipakai kasir.">
        <ButtonLink href="/app/catalog/modifiers" look="tonal"><Sparkles className="size-4" aria-hidden />Kelola tambahan</ButtonLink>
      </PageHeader>
      <Notice error={error} ok={ok} />

      {canEdit && (
        <details id="tambah-menu" open={openAdd} className="group mb-6 scroll-mt-6 rounded-(--radius-card) bg-primary-container text-on-primary-container">
          <summary className="press flex min-h-16 items-center gap-3 rounded-(--radius-card) px-5 font-display text-lg font-bold sm:px-6">
            <Plus className="size-5" aria-hidden />Tambah menu
            <ChevronDown className="ml-auto size-5 transition-transform duration-200 group-open:rotate-180" aria-hidden />
          </summary>
          <form action={addProduct} className="grid gap-4 px-5 pt-1 pb-6 sm:grid-cols-2 sm:px-6 lg:grid-cols-3">
            <Field label="Nama menu" name="name" placeholder="Nasi Ayam Bakar" required className="lg:col-span-2" />
            <SelectField label="Kategori" name="category_id" defaultValue={filter && filter !== "tanpa" ? filter : ""}>
              <option value="">Tanpa kategori</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </SelectField>
            <Field label="Harga jual" name="price" prefix="Rp" inputMode="numeric" placeholder="25.000" required />
            <Field label="Harga pokok" name="cost_price" prefix="Rp" inputMode="numeric" placeholder="12.000" hint="Opsional, untuk laba kotor." />
            <Field label="SKU" name="sku" placeholder="Opsional" />
            <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 sm:col-span-2 lg:col-span-3">
              <div className="min-w-60"><Switch label="Lacak stok menu ini" hint="Stok berkurang setiap terjual." name="track_stock" /></div>
              <Submit>Simpan menu</Submit>
            </div>
          </form>
        </details>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_19rem]">
        <Card className="self-start !p-3 sm:!p-4">
          <nav aria-label="Filter kategori" className="mb-3 flex gap-2 overflow-x-auto px-1 pb-1">
            <FilterChip href="/app/catalog" active={!filter} label="Semua" count={products.length} />
            {categories.map((c) => (
              <FilterChip key={c.id} href={`/app/catalog?kategori=${c.id}`} active={filter === c.id} label={c.name} count={countIn(c.id)} />
            ))}
            {countIn(null) > 0 && <FilterChip href="/app/catalog?kategori=tanpa" active={filter === "tanpa"} label="Tanpa kategori" count={countIn(null)} />}
          </nav>

          {shown.length === 0 ? (
            <EmptyState icon={<UtensilsCrossed className="size-6" />} title={products.length ? "Kategori ini masih kosong" : "Belum ada menu"}>
              {canEdit ? "Buka Tambah menu di atas untuk memasukkan menu pertama." : "Minta manajer atau pemilik menambahkan menu."}
            </EmptyState>
          ) : (
            <ul className="grid gap-0.5">
              {shown.map((p) => (
                <li key={p.id}>
                  <Link href={`/app/catalog/${p.id}`} className="press flex min-h-16 items-center gap-4 rounded-2xl px-3 py-2.5 hover:bg-surface-container">
                    <span
                      aria-hidden
                      className={`grid size-11 shrink-0 place-items-center rounded-2xl font-display text-lg font-extrabold ${
                        p.category_id ? toneOf.get(p.category_id) : "bg-surface-high text-on-surface-variant"
                      } ${p.active ? "" : "opacity-45"}`}
                    >
                      {p.name.charAt(0).toUpperCase()}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className={`block truncate font-bold ${p.active ? "" : "text-on-surface-variant"}`}>{p.name}</span>
                      <span className="flex flex-wrap items-center gap-1.5 text-sm text-on-surface-variant">
                        {p.category_id ? nameOf.get(p.category_id) : "Tanpa kategori"}
                        {!p.active && <StatusChip>Nonaktif</StatusChip>}
                        {p.track_stock && <StatusChip tone="tertiary">Stok dilacak</StatusChip>}
                      </span>
                    </span>
                    <span className="num text-right font-extrabold">{rupiah(p.price)}</span>
                    <ChevronRight className="size-5 text-on-surface-variant" aria-hidden />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="Kategori" tone="secondary" className="self-start">
          {categories.length === 0 ? (
            <p className="mb-4 text-sm opacity-90">Kelompokkan menu, mis. Makanan, Minuman, Camilan.</p>
          ) : (
            <ul className="mb-5 grid">
              {categories.map((c) => (
                <li key={c.id} className="flex min-h-12 items-center gap-2 border-b border-on-secondary-container/15 last:border-0">
                  <span className={`size-3 rounded-full border border-on-secondary-container/30 ${toneOf.get(c.id)}`} aria-hidden />
                  <span className="min-w-0 flex-1 truncate font-bold">{c.name}</span>
                  <span className="num text-sm opacity-80">{countIn(c.id)} menu</span>
                  {canEdit && (
                    <details className="relative">
                      <summary className="press grid size-10 place-items-center rounded-full hover:bg-on-secondary-container/10" aria-label={`Hapus kategori ${c.name}`}>
                        <Trash2 className="size-4" aria-hidden />
                      </summary>
                      <form action={deleteCategory} className="absolute right-0 z-10 mt-1 grid w-56 gap-2 rounded-2xl bg-surface-lowest p-3 text-sm text-on-surface shadow-raised">
                        <input type="hidden" name="id" value={c.id} />
                        <p>Hapus &quot;{c.name}&quot;? Menunya tetap ada, hanya jadi tanpa kategori.</p>
                        <Submit look="danger">Ya, hapus</Submit>
                      </form>
                    </details>
                  )}
                </li>
              ))}
            </ul>
          )}
          {canEdit && (
            <form action={addCategory} className="grid gap-3">
              <Field label="Kategori baru" name="name" placeholder="Minuman" required />
              <Submit look="outlined"><Plus className="size-4" aria-hidden />Tambah kategori</Submit>
            </form>
          )}
        </Card>
      </div>
    </>
  );
}

function FilterChip({ href, active, label, count }: { href: string; active: boolean; label: string; count: number }) {
  return (
    <Link
      href={href}
      aria-current={active ? "true" : undefined}
      className={`press inline-flex min-h-10 shrink-0 items-center gap-2 rounded-xl px-4 text-sm font-bold whitespace-nowrap ${
        active ? "bg-secondary-container text-on-secondary-container" : "border border-outline text-on-surface-variant hover:bg-surface-container"
      }`}
    >
      {label}
      <span className="num opacity-75">{count}</span>
    </Link>
  );
}
