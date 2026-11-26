"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { dbError, done, fail, parse, rupiah } from "@/lib/form";
import { TERMINAL_COOKIE, loadCatalog, loadOpenShift, loadTerminal, terminalFromCookie } from "@/lib/pos-data";
import { businessDate, computeTotals, receiptNo, roundingMethod, settlePayments } from "@/lib/pos-math";
import { getContext } from "@/lib/session";

const POS = "/kasir";

export async function chooseTerminal(formData: FormData) {
  const { terminal_id } = parse(z.object({ terminal_id: z.uuid("noTerminal") }), formData, POS);
  const ctx = await getContext();
  if (!(await loadTerminal(ctx, terminal_id))) fail(POS, "noTerminal");
  (await cookies()).set(TERMINAL_COOKIE, terminal_id, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 365 });
  redirect(POS);
}

export async function forgetTerminal() {
  (await cookies()).delete(TERMINAL_COOKIE);
  redirect(POS);
}

export async function openShift(formData: FormData) {
  const { opening_float } = parse(z.object({ opening_float: rupiah }), formData, POS);
  const ctx = await getContext();
  const terminalId = await terminalFromCookie();
  const pos = terminalId ? await loadTerminal(ctx, terminalId) : null;
  if (!pos) fail(POS, "noTerminal");
  const { error } = await ctx.supabase.from("shifts").insert({
    id: crypto.randomUUID(),
    business_id: ctx.businessId,
    outlet_id: pos.outlet.id,
    terminal_id: pos.terminal.id,
    cashier_id: ctx.userId,
    opening_float,
  });
  if (error) fail(POS, dbError(error));
  done(POS, "shiftOpened");
}

export async function closeShift(formData: FormData) {
  const { shift_id, counted } = parse(z.object({ shift_id: z.uuid("invalid"), counted: rupiah }), formData, `${POS}/shift`);
  const ctx = await getContext();
  const { error } = await ctx.supabase.rpc("close_shift", { p_shift_id: shift_id, p_counted: counted });
  if (error) fail(`${POS}/shift`, dbError(error));
  redirect(`${POS}/shift?tutup=${shift_id}`);
}

export async function moveCash(formData: FormData) {
  const back = `${POS}/shift`;
  const input = parse(
    z.object({ direction: z.enum(["in", "out"], "invalid"), amount: rupiah, reason: z.string().trim().min(1, "reason") }),
    formData,
    back,
  );
  if (input.amount <= 0) fail(back, "price");
  const ctx = await getContext();
  const terminalId = await terminalFromCookie();
  const pos = terminalId ? await loadTerminal(ctx, terminalId) : null;
  const shift = pos ? await loadOpenShift(ctx, pos.terminal.id) : null;
  if (!pos || !shift) fail(back, "noShift");
  const { error } = await ctx.supabase.from("cash_movements").insert({
    id: crypto.randomUUID(),
    business_id: ctx.businessId,
    outlet_id: pos.outlet.id,
    shift_id: shift.id,
    direction: input.direction,
    amount: input.amount,
    reason: input.reason,
  });
  if (error) fail(back, dbError(error));
  done(back, "cashMoved");
}

// ── sale ──
const saleInput = z.object({
  id: z.uuid(),
  orderType: z.enum(["takeaway", "dine_in"]),
  tableLabel: z.string().trim().max(40).optional(),
  payments: z
    .array(z.object({ method: z.enum(["cash", "qris", "transfer"]), amount: z.number().int().nonnegative(), tendered: z.number().int().nonnegative() }))
    .min(1)
    .max(3),
  discountPct: z.number().min(0).max(100),
  lines: z
    .array(
      z.object({
        productId: z.uuid(),
        variantId: z.uuid().nullable(),
        modifierIds: z.array(z.uuid()).max(20),
        qty: z.number().int().min(1).max(999),
        note: z.string().trim().max(120).optional(),
      }),
    )
    .min(1)
    .max(100),
});

export type SaleInput = z.infer<typeof saleInput>;
export type SaleResult = { ok: true; id: string } | { ok: false; message: string };

/** Prices come from the database, never from the browser; the client only says what and how many. */
export async function recordSale(raw: SaleInput): Promise<SaleResult> {
  const parsed = saleInput.safeParse(raw);
  if (!parsed.success) return { ok: false, message: "Data transaksi tidak valid." };
  const input = parsed.data;
  const ctx = await getContext();
  const terminalId = await terminalFromCookie();
  const pos = terminalId ? await loadTerminal(ctx, terminalId) : null;
  if (!pos) return { ok: false, message: "Terminal belum dipilih." };
  const shift = await loadOpenShift(ctx, pos.terminal.id);
  if (!shift) return { ok: false, message: "Shift belum dibuka." };

  const catalog = await loadCatalog(ctx, pos.outlet.id);
  const byId = new Map(catalog.products.map((p) => [p.id, p]));
  const items = [];
  for (const line of input.lines) {
    const product = byId.get(line.productId);
    if (!product) return { ok: false, message: "Ada menu yang sudah tidak aktif. Muat ulang layar kasir." };
    const variant = line.variantId ? product.variants.find((v) => v.id === line.variantId) : undefined;
    if (line.variantId && !variant) return { ok: false, message: `Varian ${product.name} sudah berubah. Muat ulang.` };
    const mods = line.modifierIds.map((id) => product.modifiers.find((m) => m.id === id));
    if (mods.some((m) => !m)) return { ok: false, message: `Tambahan ${product.name} sudah berubah. Muat ulang.` };
    const unitPrice = (variant?.price ?? product.price) + mods.reduce((s, m) => s + m!.price, 0);
    items.push({
      product_id: product.id,
      variant_id: variant?.id ?? null,
      product_name: product.name,
      variant_name: variant?.name ?? null,
      modifiers: mods.map((m) => ({ name: m!.name, price: m!.price })),
      qty: line.qty,
      unit_price: unitPrice,
      discount: 0,
      line_total: unitPrice * line.qty,
      note: line.note || null,
    });
  }

  const o = pos.outlet;
  // Cashier discount cap is enforced here; managers and owners are not capped.
  if (ctx.role === "cashier" && input.discountPct > o.max_cashier_discount_pct) {
    return { ok: false, message: `Diskon kasir maksimal ${o.max_cashier_discount_pct}%. Minta manajer untuk diskon lebih besar.` };
  }
  const totals = computeTotals({
    lines: items.map((i) => ({ unitPrice: i.unit_price, qty: i.qty })),
    discountPct: input.discountPct,
    serviceRate: o.service_rate, taxRate: o.tax_rate, taxInclusive: o.tax_inclusive, cashRounding: o.cash_rounding,
    method: roundingMethod(input.payments),
  });
  if (totals.total <= 0) return { ok: false, message: "Total harus lebih dari Rp0." };
  const settled = settlePayments(totals.total, input.payments);
  if (!settled.ok) return { ok: false, message: settled.message };

  const now = new Date();
  const date = businessDate(now, o.timezone);
  const prefix = receiptNo(o.code, pos.terminal.code, date, 0).slice(0, -4);
  const { data: last } = await ctx.supabase
    .from("sales")
    .select("receipt_no")
    .eq("terminal_id", pos.terminal.id)
    .eq("business_date", date)
    .order("receipt_no", { ascending: false })
    .limit(1)
    .maybeSingle();
  let seq = last ? Number(String(last.receipt_no).slice(prefix.length)) + 1 : 1;

  // ponytail: numbering reads the last receipt then inserts; two devices sharing one terminal code
  // can collide, so retry a few times. The offline queue (M4) numbers on the device instead.
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const { error } = await ctx.supabase.rpc("record_sale", {
      p: {
        id: input.id,
        outlet_id: o.id,
        terminal_id: pos.terminal.id,
        shift_id: shift.id,
        receipt_no: receiptNo(o.code, pos.terminal.code, date, seq),
        business_date: date,
        created_at: now.toISOString(),
        order_type: input.orderType,
        table_label: input.tableLabel || null,
        discount_total: totals.discount,
        tax_rate: o.tax_rate,
        tax_inclusive: o.tax_inclusive,
        tax_total: totals.tax,
        service_rate: o.service_rate,
        service_total: totals.service,
        rounding: totals.rounding,
        total: totals.total,
        items,
        payments: settled.payments,
      },
    });
    if (!error) return { ok: true, id: input.id };
    if (error.code !== "23505") return { ok: false, message: "Transaksi gagal disimpan. Coba lagi." };
    seq += 1;
  }
  return { ok: false, message: "Nomor struk bentrok. Coba lagi." };
}
