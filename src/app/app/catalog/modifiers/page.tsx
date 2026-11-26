import { ArrowLeft, Plus, Sparkles } from "lucide-react";
import { Submit } from "@/components/submit-button";
import { ButtonLink, Card, EmptyState, Field, IconTile, Notice, PageHeader, StatusChip, flash } from "@/components/ui";
import { rupiah } from "@/lib/format";
import { getContext } from "@/lib/session";
import { addModifier, setModifierActive } from "../actions";

export const metadata = { title: "Tambahan" };

type Modifier = { id: string; name: string; price: string; active: boolean };

export default async function ModifiersPage({ searchParams }: PageProps<"/app/catalog/modifiers">) {
  const ctx = await getContext();
  const { error, ok } = await flash(searchParams);
  const { data } = await ctx.supabase.from("modifiers").select("id, name, price, active").order("active", { ascending: false }).order("name");
  const modifiers = (data ?? []) as Modifier[];
  const canEdit = ctx.role !== "cashier";

  return (
    <>
      <ButtonLink href="/app/catalog" look="text" className="-ml-3 mb-2">
        <ArrowLeft className="size-4" aria-hidden /> Katalog
      </ButtonLink>
      <PageHeader title="Tambahan" description="Topping, level pedas, atau ekstra yang bisa ditambahkan ke menu. Pilih per menu di halaman detail menu." />
      <Notice error={error} ok={ok} />

      <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
        <Card className="self-start">
          {modifiers.length === 0 ? (
            <EmptyState icon={<Sparkles className="size-6" />} title="Belum ada tambahan">
              Contoh: Telur +Rp3.000, Keju +Rp5.000, Ekstra pedas gratis.
            </EmptyState>
          ) : (
            <ul className="grid gap-0.5">
              {modifiers.map((m) => (
                <li key={m.id} className="flex min-h-16 items-center gap-4 rounded-2xl px-3 py-2">
                  <IconTile icon={<Sparkles className="size-5" />} tone={m.active ? "secondary" : "surface"} />
                  <span className="min-w-0 flex-1">
                    <span className={`block font-bold ${m.active ? "" : "text-on-surface-variant"}`}>{m.name}</span>
                    {!m.active && <StatusChip>Nonaktif</StatusChip>}
                  </span>
                  <span className="num font-extrabold">+{rupiah(m.price)}</span>
                  {canEdit && (
                    <form action={setModifierActive}>
                      <input type="hidden" name="id" value={m.id} />
                      {!m.active && <input type="hidden" name="active" value="on" />}
                      <Submit look="text">{m.active ? "Nonaktifkan" : "Aktifkan"}</Submit>
                    </form>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Card>

        {canEdit && (
          <Card title="Tambahan baru" tone="secondary" className="self-start">
            <form action={addModifier} className="grid gap-3">
              <Field label="Nama" name="name" placeholder="Telur" required />
              <Field label="Harga" name="price" prefix="Rp" inputMode="numeric" placeholder="3.000" defaultValue="0" required hint="Isi 0 kalau gratis." />
              <Submit look="outlined"><Plus className="size-4" aria-hidden />Tambah</Submit>
            </form>
          </Card>
        )}
      </div>
    </>
  );
}
