import { notFound } from "next/navigation";
import { ArrowLeft, CircleCheck, Plus } from "lucide-react";
import { ButtonLink } from "@/components/ui";
import { rupiah } from "@/lib/format";
import { getContext } from "@/lib/session";
import { PrintButton } from "./print-button";

export const metadata = { title: "Struk" };

type Sale = {
  id: string; outlet_id: string; receipt_no: string; order_type: string; subtotal: string; discount_total: string; service_rate: string; service_total: string;
  tax_rate: string; tax_inclusive: boolean; tax_total: string; rounding: string; total: string; cashier_id: string; created_at: string; status: string;
};
type Item = { product_name: string; variant_name: string | null; modifiers: { name: string; price: number }[]; qty: string; unit_price: string; line_total: string };
type Payment = { method: string; amount: string; tendered: string; change: string };
type Outlet = { name: string; address: string | null; phone: string | null; receipt_header: string | null; receipt_footer: string | null; paper_size: string; timezone: string };

const METHOD_LABEL: Record<string, string> = { cash: "Tunai", qris: "QRIS", transfer: "Transfer" };
const PAGE: Record<string, string> = {
  "58mm": "@page { margin: 0 } .receipt { width: 58mm; font-size: 11px }",
  "80mm": "@page { margin: 0 } .receipt { width: 80mm; font-size: 12px }",
  a4: "@page { size: A4; margin: 15mm } .receipt { width: 100%; font-size: 13px }",
};

export default async function StrukPage({ params, searchParams }: PageProps<"/kasir/struk/[id]">) {
  const { id } = await params;
  const sp = await searchParams;
  const ctx = await getContext();
  const db = ctx.supabase;
  const { data: sale } = await db.from("sales_with_status").select("*").eq("id", id).maybeSingle();
  if (!sale) notFound();
  const s = sale as Sale;
  const [{ data: items }, { data: payments }, { data: outlet }, { data: cashier }] = await Promise.all([
    db.from("sale_items").select("product_name, variant_name, modifiers, qty, unit_price, line_total").eq("sale_id", id),
    db.from("payments").select("method, amount, tendered, change").eq("sale_id", id),
    db.from("outlets").select("name, address, phone, receipt_header, receipt_footer, paper_size, timezone").eq("id", s.outlet_id).single(),
    db.from("memberships").select("display_name").eq("user_id", s.cashier_id).limit(1).maybeSingle(),
  ]);
  const o = outlet as Outlet;
  const pays = (payments ?? []) as Payment[];
  const lines = (items ?? []) as Item[];
  const change = pays.reduce((sum, p) => sum + Number(p.change), 0);
  const when = new Intl.DateTimeFormat("id-ID", { dateStyle: "short", timeStyle: "short", timeZone: o.timezone }).format(new Date(s.created_at));
  const isNew = sp.baru === "1";

  return (
    <main className="mx-auto grid w-full max-w-4xl gap-6 px-4 py-6 sm:px-8 md:grid-cols-[1fr_auto] md:items-start">
      <style>{`${PAGE[o.paper_size] ?? PAGE["58mm"]}
        @media print { body * { visibility: hidden } .receipt, .receipt * { visibility: visible } .receipt { position: absolute; left: 0; top: 0; box-shadow: none; border-radius: 0; padding: 3mm } }`}</style>

      <div className="grid content-start gap-4 print:hidden">
        <ButtonLink href="/kasir" look="text" className="-ml-3 justify-self-start"><ArrowLeft className="size-4" aria-hidden />Kasir</ButtonLink>
        {isNew ? (
          <section className="grid gap-2 rounded-(--radius-card) bg-tertiary-container p-6 text-on-tertiary-container">
            <CircleCheck className="size-10" aria-hidden />
            <h1 className="text-3xl font-extrabold">Transaksi tersimpan</h1>
            {change > 0 && <p className="num font-display text-4xl font-extrabold">Kembalian {rupiah(change)}</p>}
            <p className="num text-sm opacity-85">{s.receipt_no}</p>
          </section>
        ) : (
          <h1 className="text-3xl font-extrabold">Struk {s.receipt_no}</h1>
        )}
        {s.status !== "paid" && (
          <p className="rounded-2xl bg-error-container px-4 py-3 text-sm font-bold text-on-error-container">
            Status: {s.status === "voided" ? "dibatalkan (void)" : s.status === "refunded" ? "direfund penuh" : "direfund sebagian"}
          </p>
        )}
        <div className="flex flex-wrap gap-2">
          {isNew && <ButtonLink href="/kasir"><Plus className="size-4" aria-hidden />Transaksi baru</ButtonLink>}
          <PrintButton look={isNew ? "outlined" : "filled"} />
        </div>
        <p className="text-sm text-on-surface-variant">Ukuran kertas mengikuti pengaturan outlet. Di dialog cetak, pilih printer thermal atau &quot;Simpan sebagai PDF&quot;.</p>
      </div>

      <article aria-label="Struk" className="receipt mx-auto w-[58mm] max-w-full rounded-2xl bg-white p-4 font-mono text-[11px] leading-snug text-black shadow-raised">
        <header className="text-center">
          <p className="text-[1.15em] font-bold uppercase">{ctx.businessName}</p>
          <p>{o.name}</p>
          {o.receipt_header && <p className="whitespace-pre-line">{o.receipt_header}</p>}
          {o.address && <p>{o.address}</p>}
          {o.phone && <p>{o.phone}</p>}
        </header>
        <Hr />
        <p>{s.receipt_no}</p>
        <p>{when} · {(cashier?.display_name as string | undefined) ?? "Kasir"} · {s.order_type === "dine_in" ? "Makan di sini" : "Bungkus"}</p>
        <Hr />
        {lines.map((l, i) => (
          <div key={i} className="mb-1">
            <p>{l.product_name}{l.variant_name ? ` (${l.variant_name})` : ""}</p>
            {l.modifiers.map((m) => <p key={m.name} className="pl-2">+ {m.name}</p>)}
            <Pair left={`${Number(l.qty)} x ${fmt(l.unit_price)}`} right={fmt(l.line_total)} />
          </div>
        ))}
        <Hr />
        <Pair left="Subtotal" right={fmt(s.subtotal)} />
        {Number(s.discount_total) > 0 && <Pair left="Diskon" right={`-${fmt(s.discount_total)}`} />}
        {Number(s.service_total) > 0 && <Pair left={`Service ${Number(s.service_rate)}%`} right={fmt(s.service_total)} />}
        {Number(s.tax_total) > 0 && <Pair left={`PB1 ${Number(s.tax_rate)}%${s.tax_inclusive ? " (termasuk)" : ""}`} right={fmt(s.tax_total)} />}
        {Number(s.rounding) !== 0 && <Pair left="Pembulatan" right={fmt(s.rounding)} />}
        <Pair left="TOTAL" right={fmt(s.total)} bold />
        {pays.map((p, i) => <Pair key={i} left={METHOD_LABEL[p.method] ?? p.method} right={fmt(p.tendered)} />)}
        {change > 0 && <Pair left="Kembali" right={fmt(change)} />}
        <Hr />
        <p className="text-center whitespace-pre-line">{o.receipt_footer || "Terima kasih!"}</p>
      </article>
    </main>
  );
}

const fmt = (v: string | number) => new Intl.NumberFormat("id-ID").format(Number(v));

function Hr() {
  return <hr className="my-1.5 border-0 border-t border-dashed border-black" />;
}

function Pair({ left, right, bold = false }: { left: string; right: string; bold?: boolean }) {
  return (
    <p className={`flex justify-between gap-2 ${bold ? "font-bold" : ""}`}>
      <span>{left}</span>
      <span className="tabular-nums">{right}</span>
    </p>
  );
}
