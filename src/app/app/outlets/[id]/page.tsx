import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { ArrowLeft, MonitorSmartphone, Plus } from "lucide-react";
import { Submit } from "@/components/submit-button";
import {
  ButtonLink, Card, Field, Notice, PageHeader, SelectField, Switch, TextArea, flash,
} from "@/components/ui";
import { getContext } from "@/lib/session";
import { addTerminal, updateOutlet } from "../actions";

export const metadata = { title: "Pengaturan outlet" };

type Outlet = {
  id: string; code: string; name: string; address: string | null; phone: string | null;
  tax_rate: string; tax_inclusive: boolean; service_rate: string; max_cashier_discount_pct: string;
  cash_rounding: number; paper_size: string; receipt_header: string | null; receipt_footer: string | null;
};
type Terminal = { id: string; code: string; name: string };

function Group({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  return (
    <fieldset className="grid gap-4 border-t border-outline-variant pt-6 first:border-0 first:pt-0 md:grid-cols-[14rem_1fr] md:gap-8">
      <legend className="contents">
        <span className="block">
          <span className="block font-display text-lg font-bold">{title}</span>
          <span className="block text-sm text-on-surface-variant">{description}</span>
        </span>
      </legend>
      <div className="grid gap-4 sm:grid-cols-2">{children}</div>
    </fieldset>
  );
}

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
      <ButtonLink href="/app/outlets" look="text" className="-ml-3 mb-2">
        <ArrowLeft className="size-4" aria-hidden /> Semua outlet
      </ButtonLink>
      <PageHeader title={o.name} description={`Kode ${o.code}. Kode ini muncul di setiap nomor struk outlet ini.`} />
      <Notice error={error} ok={ok} />

      <div className="grid gap-6 xl:grid-cols-[1fr_22rem]">
        <Card>
          <form action={updateOutlet} className="grid gap-6">
            <input type="hidden" name="id" value={o.id} />
            <fieldset disabled={!isOwner} className="grid gap-6">
              <Group title="Identitas" description="Tampil di kepala struk.">
                <Field label="Nama outlet" name="name" defaultValue={o.name} required />
                <Field label="Telepon" name="phone" type="tel" defaultValue={o.phone ?? ""} placeholder="0812…" />
                <Field label="Alamat" name="address" defaultValue={o.address ?? ""} className="sm:col-span-2" />
              </Group>
              <Group title="Pajak & biaya" description="Dipakai kasir saat menghitung total.">
                <Field label="Pajak (%)" name="tax_rate" inputMode="decimal" defaultValue={Number(o.tax_rate)} hint="PB1 restoran umumnya 10%." />
                <Field label="Service charge (%)" name="service_rate" inputMode="decimal" defaultValue={Number(o.service_rate)} />
                <div className="sm:col-span-2">
                  <Switch label="Harga menu sudah termasuk pajak" hint="Pajak tidak ditambahkan lagi di struk." name="tax_inclusive" defaultChecked={o.tax_inclusive} />
                </div>
                <Field label="Diskon maksimal kasir (%)" name="max_cashier_discount_pct" inputMode="decimal" defaultValue={Number(o.max_cashier_discount_pct)} hint="Di atas ini butuh manajer." />
                <SelectField label="Pembulatan tunai" name="cash_rounding" defaultValue={String(o.cash_rounding)}>
                  <option value="0">Tidak dibulatkan</option>
                  <option value="100">Ke Rp100 terdekat</option>
                  <option value="500">Ke Rp500 terdekat</option>
                  <option value="1000">Ke Rp1.000 terdekat</option>
                </SelectField>
              </Group>
              <Group title="Struk" description="Ukuran kertas dan teks tambahan.">
                <SelectField label="Ukuran kertas" name="paper_size" defaultValue={o.paper_size}>
                  <option value="58mm">Thermal 58 mm</option>
                  <option value="80mm">Thermal 80 mm</option>
                  <option value="a4">A4 (invoice)</option>
                </SelectField>
                <span className="hidden sm:block" />
                <TextArea label="Kepala struk" name="receipt_header" defaultValue={o.receipt_header ?? ""} placeholder="Jl. Contoh No. 1" />
                <TextArea label="Kaki struk" name="receipt_footer" defaultValue={o.receipt_footer ?? ""} placeholder="Terima kasih!" />
              </Group>
            </fieldset>
            {isOwner ? (
              <div className="flex justify-end border-t border-outline-variant pt-5">
                <Submit>Simpan pengaturan</Submit>
              </div>
            ) : (
              <p className="text-sm text-on-surface-variant">Hanya pemilik yang bisa mengubah pengaturan outlet.</p>
            )}
          </form>
        </Card>

        <Card title="Terminal kasir" tone="tertiary" className="self-start">
          <p className="mb-4 text-sm opacity-85">Setiap HP atau tablet kasir punya kode sendiri, mis. T1. Kode ikut di nomor struk.</p>
          {terminals.length > 0 ? (
            <ul className="mb-5 grid">
              {terminals.map((t) => (
                <li key={t.id} className="flex min-h-14 items-center gap-3 border-b border-on-tertiary-container/15 last:border-0">
                  <MonitorSmartphone className="size-5 opacity-80" aria-hidden />
                  <span className="flex-1 font-bold">{t.name}</span>
                  <span className="font-mono text-sm font-bold">{o.code}-{t.code}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mb-5 rounded-2xl border border-dashed border-on-tertiary-container/40 px-4 py-4 text-sm font-semibold">
              Belum ada terminal. Tambahkan minimal satu agar kasir bisa membuka shift.
            </p>
          )}
          {canManage && (
            <form action={addTerminal} className="grid gap-3">
              <input type="hidden" name="outlet_id" value={o.id} />
              <div className="grid grid-cols-[6rem_1fr] gap-3">
                <Field label="Kode" name="code" placeholder="T1" maxLength={4} required autoCapitalize="characters" />
                <Field label="Nama" name="name" placeholder="Kasir depan" required />
              </div>
              <Submit look="outlined"><Plus className="size-4" aria-hidden />Tambah terminal</Submit>
            </form>
          )}
        </Card>
      </div>
    </>
  );
}
