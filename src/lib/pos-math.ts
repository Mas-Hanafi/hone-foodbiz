// Money math for a sale, in whole rupiah. Used by the POS screen (live estimate) and the server
// (authoritative). Must satisfy the sales CHECK:
//   total = subtotal - discount_total + service_total + (tax_inclusive ? 0 : tax_total) + rounding

export type Method = "cash" | "qris" | "transfer";

export type TotalsInput = {
  lines: { unitPrice: number; qty: number }[];
  discountPct?: number; // order discount, percent of subtotal
  serviceRate: number; // percent
  taxRate: number; // percent
  taxInclusive: boolean;
  cashRounding: number; // 0, 100, 500, 1000
  method: Method;
};

export type Totals = { subtotal: number; discount: number; service: number; tax: number; rounding: number; total: number };

export function computeTotals(input: TotalsInput): Totals {
  const subtotal = input.lines.reduce((sum, l) => sum + l.unitPrice * l.qty, 0);
  const discount = Math.round((subtotal * Math.min(Math.max(input.discountPct ?? 0, 0), 100)) / 100);
  const net = subtotal - discount; // discount comes off before service and tax
  const service = Math.round((net * input.serviceRate) / 100);
  const base = net + service; // PB1 is charged on food plus service
  const rate = input.taxRate / 100;
  const tax = input.taxInclusive ? Math.round(base - base / (1 + rate)) : Math.round(base * rate);
  const beforeRounding = base + (input.taxInclusive ? 0 : tax);
  const step = input.cashRounding;
  const rounding = input.method === "cash" && step > 0 ? Math.round(beforeRounding / step) * step - beforeRounding : 0;
  return { subtotal, discount, service, tax, rounding, total: beforeRounding + rounding };
}

export type PaymentLine = { method: Method; amount: number; tendered: number };

/** Cash rounding only applies when the whole sale is paid in cash. */
export const roundingMethod = (payments: { method: Method }[]): Method =>
  payments.length === 1 ? payments[0].method : "transfer";

/**
 * Validates payments against the total and normalises them for record_sale.
 * A single payment always covers the total; a split must add up exactly. At most one cash line,
 * and only cash may be over-tendered (that is the change).
 */
export function settlePayments(total: number, payments: PaymentLine[]): { ok: true; payments: PaymentLine[] } | { ok: false; message: string } {
  if (payments.length === 0) return { ok: false, message: "Pilih metode bayar." };
  if (payments.filter((p) => p.method === "cash").length > 1) return { ok: false, message: "Tunai hanya boleh satu baris." };
  const lines = payments.length === 1 ? [{ ...payments[0], amount: total }] : payments;
  if (lines.some((p) => !Number.isInteger(p.amount) || p.amount <= 0)) return { ok: false, message: "Setiap pembayaran harus lebih dari Rp0." };
  const sum = lines.reduce((s, p) => s + p.amount, 0);
  if (sum !== total) return { ok: false, message: `Pembayaran Rp${sum.toLocaleString("id-ID")} belum sama dengan total Rp${total.toLocaleString("id-ID")}.` };
  const normalised = lines.map((p) => ({ ...p, tendered: p.method === "cash" ? p.tendered : p.amount }));
  if (normalised.some((p) => p.tendered < p.amount)) return { ok: false, message: "Uang tunai yang diterima kurang." };
  return { ok: true, payments: normalised };
}

/** Exact amount plus the next common banknote totals above it, at most four. */
export function suggestTendered(total: number): number[] {
  if (total <= 0) return [];
  const options = new Set<number>([total]);
  for (const note of [5000, 10000, 20000, 50000, 100000]) {
    const up = Math.ceil(total / note) * note;
    if (up > total) options.add(up);
    if (options.size >= 4) break;
  }
  return [...options].sort((a, b) => a - b).slice(0, 4);
}

/** Receipt number: {OUTLET}-{TERMINAL}-{YYYYMMDD}-{NNNN}. */
export function receiptNo(outletCode: string, terminalCode: string, businessDate: string, seq: number): string {
  return `${outletCode}-${terminalCode}-${businessDate.replaceAll("-", "")}-${String(seq).padStart(4, "0")}`;
}

/** Calendar date (YYYY-MM-DD) in the outlet's time zone. */
export function businessDate(now: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}
