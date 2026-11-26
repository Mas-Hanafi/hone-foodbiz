// Money math for a sale, in whole rupiah. Used by the POS screen (live estimate) and the server
// (authoritative). Must satisfy the sales CHECK:
//   total = subtotal - discount_total + service_total + (tax_inclusive ? 0 : tax_total) + rounding

export type Method = "cash" | "qris" | "transfer";

export type TotalsInput = {
  lines: { unitPrice: number; qty: number }[];
  serviceRate: number; // percent
  taxRate: number; // percent
  taxInclusive: boolean;
  cashRounding: number; // 0, 100, 500, 1000
  method: Method;
};

export type Totals = { subtotal: number; service: number; tax: number; rounding: number; total: number };

export function computeTotals(input: TotalsInput): Totals {
  const subtotal = input.lines.reduce((sum, l) => sum + l.unitPrice * l.qty, 0);
  const service = Math.round((subtotal * input.serviceRate) / 100);
  const base = subtotal + service; // PB1 is charged on food plus service
  const rate = input.taxRate / 100;
  const tax = input.taxInclusive ? Math.round(base - base / (1 + rate)) : Math.round(base * rate);
  const beforeRounding = base + (input.taxInclusive ? 0 : tax);
  const step = input.cashRounding;
  const rounding = input.method === "cash" && step > 0 ? Math.round(beforeRounding / step) * step - beforeRounding : 0;
  return { subtotal, service, tax, rounding, total: beforeRounding + rounding };
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
