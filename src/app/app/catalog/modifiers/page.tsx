import Link from "next/link";
import { Card, Field, Notice, PageHeader, Submit, flash, table } from "@/components/ui";
import { rupiah } from "@/lib/format";
import { getContext } from "@/lib/session";
import { addModifier, setModifierActive } from "../actions";

type Modifier = { id: string; name: string; price: string; active: boolean };

export default async function ModifiersPage({ searchParams }: PageProps<"/app/catalog/modifiers">) {
  const ctx = await getContext();
  const { error, ok } = await flash(searchParams);
  const { data } = await ctx.supabase.from("modifiers").select("id, name, price, active").order("name");
  const modifiers = (data ?? []) as Modifier[];
  const canEdit = ctx.role !== "cashier";

  return (
    <>
      <PageHeader title="Tambahan">
        <Link href="/app/catalog" className="text-sm font-medium underline">← Katalog</Link>
      </PageHeader>
      <Notice error={error} ok={ok} />
      <Card>
        <p className="mb-3 text-sm text-mute">Dipakai lintas produk. Pilih per produk di halaman detail produk.</p>
        {modifiers.length === 0 ? (
          <p className="text-sm text-mute">Belum ada tambahan.</p>
        ) : (
          <table className={table}>
            <thead><tr><th>Nama</th><th className="text-right">Harga</th><th>Status</th></tr></thead>
            <tbody>
              {modifiers.map((m) => (
                <tr key={m.id} className={m.active ? "" : "text-mute"}>
                  <td>{m.name}</td>
                  <td className="text-right tabular-nums">+{rupiah(m.price)}</td>
                  <td>
                    {canEdit ? (
                      <form action={setModifierActive}>
                        <input type="hidden" name="id" value={m.id} />
                        {!m.active && <input type="hidden" name="active" value="on" />}
                        <button type="submit" className="text-xs underline">{m.active ? "Nonaktifkan" : "Aktifkan"}</button>
                      </form>
                    ) : m.active ? "Aktif" : "Nonaktif"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {canEdit && (
          <form action={addModifier} className="mt-4 grid gap-3 sm:grid-cols-[1fr_9rem_auto] sm:items-end">
            <Field label="Nama" name="name" placeholder="Telur" required />
            <Field label="Harga" name="price" inputMode="numeric" placeholder="3.000" defaultValue="0" required />
            <Submit tone="quiet">Tambah</Submit>
          </form>
        )}
      </Card>
    </>
  );
}
