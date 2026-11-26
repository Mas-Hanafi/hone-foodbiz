import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Ban, ChevronDown, Printer, Undo2 } from "lucide-react";
import type { ReactNode } from "react";
import { Submit } from "@/components/submit-button";
import { ButtonLink, Card, Field, Notice, PageHeader, SelectField, StatusChip, flash } from "@/components/ui";
import { rupiah } from "@/lib/format";
import { METHOD_LABEL, SALE_STATUS } from "@/lib/sale-status";
import { getContext } from "@/lib/session";
import { refundSale, voidSale } from "../actions";

export const metadata = { title: "Detail transaksi" };

type Sale = {
  id: string; outlet_id: string; shift_id: string; receipt_no: string; order_type: string; created_at: string; status: string;
  subtotal: string; discount_total: string; service_total: string; tax_total: string; tax_inclusive: boolean; rounding: string; total: string; refunded_amount: string;
};
type Item = { product_name: string; variant_name: string | null; modifiers: { name: string }[]; qty: string; line_total: string };
type Payment = { method: string; amount: string; tendered: string; change: string };
type Refund = { kind: string; amount: string; method: string | null; reason: string; approved_by: string; created_at: string };
type Approver = { user_id: string; display_name: string };

export default async function TransaksiDetail({ params, searchParams }: PageProps<"/app/transaksi/[id]">) {
  const { id } = await params;
  const ctx = await getContext();
  const { error, ok } = await flash(searchParams);
  const db = ctx.supabase;
  const { data: sale } = await db.from("sales_with_status").select("*").eq("id", id).maybeSingle();
  if (!sale) notFound();
  const s = sale as Sale;
  const [{ data: items }, { data: payments }, { data: refunds }, { data: shift }, { data: approvers }, { data: outlet }] = await Promise.all([
    db.from("sale_items").select("product_name, variant_name, modifiers, qty, line_total").eq("sale_id", id),
    db.from("payments").select("method, amount, tendered, change").eq("sale_id", id),
    db.from("refunds").select("kind, amount, method, reason, approved_by, created_at").eq("sale_id", id).order("created_at"),
    db.from("shifts").select("closed_at").eq("id", s.shift_id).maybeSingle(),
    db.rpc("list_approvers", { p_outlet: s.outlet_id }),
    db.from("outlets").select("name, timezone").eq("id", s.outlet_id).single(),
  ]);
  const pays = (payments ?? []) as Payment[];
  const backs = (refunds ?? []) as Refund[];
  const people = (approvers ?? []) as Approver[];
  const nameOf = new Map(people.map((p) => [p.user_id, p.display_name]));
  const tz = (outlet?.timezone as string) ?? "Asia/Jakarta";
  const fmtTime = (iso: string) => new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short", timeZone: tz }).format(new Date(iso));
  const remaining = Number(s.total) - Number(s.refunded_amount);
  const canVoid = s.status === "paid" && !shift?.closed_at;
  const canRefund = s.status !== "voided" && remaining > 0;
  const st = SALE_STATUS[s.status] ?? SALE_STATUS.paid;

  const approverFields = people.length === 0 ? (
    <p className="rounded-2xl bg-secondary-container px-4 py-3 text-sm text-on-secondary-container">
      Belum ada manajer atau pemilik dengan PIN untuk outlet ini. Atur PIN di halaman <Link href="/app/akun" className="font-bold underline">Akun</Link>.
    </p>
  ) : (
    <>
      <SelectField label="Disetujui oleh" name="approver" required>
        {people.map((p) => <option key={p.user_id} value={p.user_id}>{p.display_name}</option>)}
      </SelectField>
      <Field label="PIN manajer" name="pin" type="password" inputMode="numeric" autoComplete="off" minLength={6} maxLength={6} pattern="\d{6}" required />
    </>
  );

  return (
    <>
      <ButtonLink href="/app/transaksi" look="text" className="-ml-3 mb-2"><ArrowLeft className="size-4" aria-hidden />Transaksi</ButtonLink>
      <PageHeader title={s.receipt_no} description={`${outlet?.name ?? ""} · ${fmtTime(s.created_at)} · ${s.order_type === "dine_in" ? "Makan di sini" : "Bungkus"}`}>
        <StatusChip tone={st.tone}>{st.label}</StatusChip>
      </PageHeader>
      <Notice error={error} ok={ok} />

      <div className="grid gap-6 lg:grid-cols-[1fr_24rem]">
        <Card className="self-start">
          <ul className="mb-4 grid">
            {((items ?? []) as Item[]).map((it, i) => (
              <li key={i} className="flex justify-between gap-3 border-b border-outline-variant/60 py-2.5 last:border-0">
                <span>
                  <span className="font-bold">{Number(it.qty)}× {it.product_name}{it.variant_name ? ` (${it.variant_name})` : ""}</span>
                  {it.modifiers.length > 0 && <span className="block text-sm text-on-surface-variant">+ {it.modifiers.map((m) => m.name).join(", ")}</span>}
                </span>
                <span className="num font-bold">{rupiah(it.line_total)}</span>
              </li>
            ))}
          </ul>
          <dl className="num grid gap-1 border-t border-outline-variant pt-3 text-sm">
            <Line label="Subtotal" value={rupiah(s.subtotal)} />
            {Number(s.discount_total) > 0 && <Line label="Diskon" value={rupiah(-Number(s.discount_total))} />}
            {Number(s.service_total) > 0 && <Line label="Service" value={rupiah(s.service_total)} />}
            {Number(s.tax_total) > 0 && <Line label={`PB1${s.tax_inclusive ? " (termasuk)" : ""}`} value={rupiah(s.tax_total)} />}
            {Number(s.rounding) !== 0 && <Line label="Pembulatan" value={rupiah(s.rounding)} />}
            <Line label="Total" value={rupiah(s.total)} strong />
            {pays.map((p, i) => <Line key={i} label={`${METHOD_LABEL[p.method] ?? p.method}${Number(p.change) > 0 ? `, kembali ${rupiah(p.change)}` : ""}`} value={rupiah(p.amount)} />)}
            {Number(s.refunded_amount) > 0 && <Line label="Sudah dikembalikan" value={rupiah(-Number(s.refunded_amount))} />}
          </dl>
          {backs.length > 0 && (
            <div className="mt-5 grid gap-2">
              <h2 className="text-lg font-bold">Riwayat pembatalan</h2>
              {backs.map((r, i) => (
                <p key={i} className="rounded-2xl bg-error-container px-4 py-3 text-sm text-on-error-container">
                  <span className="font-bold">{r.kind === "void" ? "Void" : `Refund ${METHOD_LABEL[r.method ?? ""] ?? ""}`} {rupiah(r.amount)}</span>
                  {" · "}{fmtTime(r.created_at)} · disetujui {nameOf.get(r.approved_by) ?? "manajer"}
                  <span className="block opacity-90">Alasan: {r.reason}</span>
                </p>
              ))}
            </div>
          )}
          <div className="mt-5">
            <ButtonLink href={`/kasir/struk/${s.id}`} look="outlined"><Printer className="size-4" aria-hidden />Lihat dan cetak struk</ButtonLink>
          </div>
        </Card>

        <div className="grid content-start gap-4">
          {canVoid && (
            <Action icon={<Ban className="size-5" aria-hidden />} title="Batalkan transaksi (void)" hint="Untuk salah input di shift yang masih buka. Stok dikembalikan.">
              <form action={voidSale} className="grid gap-3">
                <input type="hidden" name="sale_id" value={s.id} />
                <Field label="Alasan" name="reason" placeholder="Salah input menu" required />
                {approverFields}
                {people.length > 0 && <Submit look="danger">Void {rupiah(s.total)}</Submit>}
              </form>
            </Action>
          )}
          {canRefund && (
            <Action icon={<Undo2 className="size-5" aria-hidden />} title="Refund" hint={`Kembalikan uang, sebagian atau penuh. Sisa yang bisa dikembalikan ${rupiah(remaining)}.`}>
              <form action={refundSale} className="grid gap-3">
                <input type="hidden" name="sale_id" value={s.id} />
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Jumlah" name="amount" prefix="Rp" inputMode="numeric" defaultValue={new Intl.NumberFormat("id-ID").format(remaining)} required />
                  <SelectField label="Dikembalikan lewat" name="method" defaultValue={pays[0]?.method ?? "cash"}>
                    <option value="cash">Tunai</option>
                    <option value="qris">QRIS</option>
                    <option value="transfer">Transfer</option>
                  </SelectField>
                </div>
                <Field label="Alasan" name="reason" placeholder="Pesanan tidak sesuai" required />
                {approverFields}
                {people.length > 0 && <Submit look="danger">Catat refund</Submit>}
              </form>
            </Action>
          )}
          {!canVoid && !canRefund && (
            <p className="rounded-2xl bg-surface-container px-4 py-3 text-sm text-on-surface-variant">Tidak ada aksi lagi untuk transaksi ini.</p>
          )}
        </div>
      </div>
    </>
  );
}

function Action({ icon, title, hint, children }: { icon: ReactNode; title: string; hint: string; children: ReactNode }) {
  return (
    <details className="group rounded-(--radius-card) bg-surface-lowest shadow-card">
      <summary className="press flex min-h-16 items-center gap-3 rounded-(--radius-card) px-5">
        <span className="text-error">{icon}</span>
        <span className="flex-1">
          <span className="block font-bold">{title}</span>
          <span className="block text-xs text-on-surface-variant">{hint}</span>
        </span>
        <ChevronDown className="size-5 text-on-surface-variant transition-transform duration-200 group-open:rotate-180" aria-hidden />
      </summary>
      <div className="px-5 pb-5">{children}</div>
    </details>
  );
}

function Line({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className={`flex justify-between gap-3 ${strong ? "mt-1 font-display text-xl font-extrabold" : "text-on-surface-variant"}`}>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}
