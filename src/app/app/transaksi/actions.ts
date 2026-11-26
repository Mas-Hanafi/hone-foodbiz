"use server";

import { z } from "zod";
import { backTo, done, fail, parse, rupiah, text } from "@/lib/form";
import type { MessageKey } from "@/lib/messages";
import { loadOpenShift, loadTerminal, terminalFromCookie } from "@/lib/pos-data";
import { getContext } from "@/lib/session";

const BASE = "/app/transaksi";

const approval = {
  sale_id: z.uuid("invalid"),
  approver: z.uuid("approval"),
  pin: z.string().regex(/^\d{6}$/, "pin"),
  reason: text("reason"),
};

function refundError(error: { code?: string; message?: string }): MessageKey {
  const m = error.message ?? "";
  if (m.includes("approval failed")) return "approval";
  if (m.includes("already voided")) return "alreadyVoided";
  if (m.includes("shift is closed")) return "shiftClosedVoid";
  if (m.includes("refund amount")) return "refundAmount";
  if (error.code === "42501") return "forbidden";
  return "generic";
}

export async function voidSale(formData: FormData) {
  const back = backTo(formData, "sale_id", BASE);
  const input = parse(z.object(approval), formData, back);
  const ctx = await getContext();
  const { error } = await ctx.supabase.rpc("record_refund", {
    p_id: crypto.randomUUID(),
    p_sale_id: input.sale_id,
    p_kind: "void",
    p_amount: null,
    p_method: null,
    p_shift_id: null,
    p_reason: input.reason,
    p_approver: input.approver,
    p_pin: input.pin,
  });
  if (error) fail(back, refundError(error));
  done(back, "voided");
}

export async function refundSale(formData: FormData) {
  const back = backTo(formData, "sale_id", BASE);
  const input = parse(
    z.object({ ...approval, amount: rupiah, method: z.enum(["cash", "qris", "transfer"], "invalid") }),
    formData,
    back,
  );
  const ctx = await getContext();
  let shiftId: string | null = null;
  if (input.method === "cash") {
    // Cash goes back out of this device's drawer, so it needs this terminal's open shift.
    const terminalId = await terminalFromCookie();
    const pos = terminalId ? await loadTerminal(ctx, terminalId) : null;
    const shift = pos ? await loadOpenShift(ctx, pos.terminal.id) : null;
    if (!shift) fail(back, "needShift");
    shiftId = shift.id;
  }
  const { error } = await ctx.supabase.rpc("record_refund", {
    p_id: crypto.randomUUID(),
    p_sale_id: input.sale_id,
    p_kind: "refund",
    p_amount: input.amount,
    p_method: input.method,
    p_shift_id: shiftId,
    p_reason: input.reason,
    p_approver: input.approver,
    p_pin: input.pin,
  });
  if (error) fail(back, refundError(error));
  done(back, "refunded");
}
