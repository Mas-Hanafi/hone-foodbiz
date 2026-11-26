import { notFound } from "next/navigation";
import { Card, Check, Field, Notice, PageHeader, SelectField, Submit, TextArea, flash, table } from "@/components/ui";
import { getContext } from "@/lib/session";
import { addTerminal, updateOutlet } from "../actions";

type Outlet = {
  id: string; code: string; name: string; address: string | null; phone: string | null;
  tax_rate: string; tax_inclusive: boolean; service_rate: string; max_cashier_discount_pct: string;
  cash_rounding: number; paper_size: string; receipt_header: string | null; receipt_footer: string | null;
};
type Terminal = { id: string; code: string; name: string };

export default async function OutletPage({ params, searchParams }: PageProps<"/app/outlets/[id]">) {
  const { id } = await params;
  const ctx = await getContext();
  const { error, ok } = await flash(searchParams);
  const [{ data: outlet }, { data: terminalRows }] = await Promise.all([
    ctx.supabase.from("outlets").select("*").eq("id", id).maybeSingle(),
    ctx.supabase.from("terminals").select("id, code, name").eq("outlet_id", id).order("code"),
  ]);
  if (!outlet) notFound();
  const o = outlet as Outlet;
  const terminals = (terminalRows ?? []) as Terminal[];
  const isOwner = ctx.role === "owner";
  const canManage = ctx.role !== "cashier";

  return (
    <>
      <PageHeader title={`${o.name} · ${o.code}`} />
      <Notice error={error} ok={ok} />

      <Card title="Pengaturan">
        <form action={updateOutlet} className="grid gap-4">
          <input type="hidden" name="id" value={o.id} />
          <fieldset disabled={!isOwner} className="grid gap-4 sm:grid-cols-2">
            <Field label="Nama outlet" name="name" defaultValue={o.name} required />
            <Field label="Telepon" name="phone" defaultValue={o.phone ?? ""} />
            <div className="sm:col-span-2"><Field label="Alamat" name="address" defaultValue={o.address ?? ""} /></div>
            <Field label="Pajak (%)" name="tax_rate" inputMode="decimal" defaultValue={Number(o.tax_rate)} hint="PB1 restoran umumnya 10%." />
            <Field label="Service charge (%)" name="service_rate" inputMode="decimal" defaultValue={Number(o.service_rate)} />
            <Check label="Harga menu sudah termasuk pajak" name="tax_inclusive" defaultChecked={o.tax_inclusive} />
            <Field label="Diskon maksimal kasir (%)" name="max_cashier_discount_pct" inputMode="decimal" defaultValue={Number(o.max_cashier_discount_pct)} />
            <SelectField label="Pembulatan tunai" name="cash_rounding" defaultValue={String(o.cash_rounding)}>
              <option value="0">Tidak dibulatkan</option>
              <option value="100">Rp100</option>
              <option value="500">Rp500</option>
              <option value="1000">Rp1.000</option>
            </SelectField>
            <SelectField label="Ukuran struk" name="paper_size" defaultValue={o.paper_size}>
              <option value="58mm">58 mm</option>
              <option value="80mm">80 mm</option>
              <option value="a4">A4</option>
            </SelectField>
            <TextArea label="Kepala struk" name="receipt_header" defaultValue={o.receipt_header ?? ""} />
            <TextArea label="Kaki struk" name="receipt_footer" defaultValue={o.receipt_footer ?? ""} placeholder="Terima kasih!" />
          </fieldset>
          {isOwner ? <div><Submit>Simpan</Submit></div> : <p className="text-sm text-mute">Hanya pemilik yang bisa mengubah pengaturan outlet.</p>}
        </form>
      </Card>

      <Card title="Terminal kasir" className="mt-6">
        <p className="mb-3 text-sm text-mute">Setiap perangkat kasir punya kode sendiri. Kode ini ikut di nomor struk.</p>
        {terminals.length > 0 ? (
          <table className={table}>
            <thead><tr><th>Kode</th><th>Nama</th></tr></thead>
            <tbody>{terminals.map((t) => <tr key={t.id}><td className="font-mono">{t.code}</td><td>{t.name}</td></tr>)}</tbody>
          </table>
        ) : (
          <p className="text-sm text-mute">Belum ada terminal.</p>
        )}
        {canManage && (
          <form action={addTerminal} className="mt-4 grid gap-4 sm:grid-cols-[7rem_1fr_auto] sm:items-end">
            <input type="hidden" name="outlet_id" value={o.id} />
            <Field label="Kode" name="code" placeholder="T1" maxLength={4} required />
            <Field label="Nama" name="name" placeholder="Kasir depan" required />
            <Submit>Tambah terminal</Submit>
          </form>
        )}
      </Card>
    </>
  );
}
