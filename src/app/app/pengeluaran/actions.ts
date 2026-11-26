"use server";

import { z } from "zod";
import { checkbox, dbError, done, fail, id, optionalText, parse, rupiah, text } from "@/lib/form";
import { loadOpenShift, loadTerminal, terminalFromCookie } from "@/lib/pos-data";
import { getContext } from "@/lib/session";

const BACK = "/app/pengeluaran";

const expense = z.object({
  outlet_id: id,
  category: text("name"),
  amount: rupiah,
  spent_on: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "invalid"),
  note: optionalText,
  from_drawer: checkbox,
});

export async function addExpense(formData: FormData) {
  const input = parse(expense, formData, BACK);
  if (input.amount <= 0) fail(BACK, "price");
  const ctx = await getContext();

  let shiftId: string | null = null;
  if (input.from_drawer) {
    // Paid from the cash drawer: tie it to this device's open shift so expected cash drops.
    const terminalId = await terminalFromCookie();
    const pos = terminalId ? await loadTerminal(ctx, terminalId) : null;
    const shift = pos && pos.outlet.id === input.outlet_id ? await loadOpenShift(ctx, pos.terminal.id) : null;
    if (!shift) fail(BACK, "drawerShift");
    shiftId = shift.id;
  }

  const { error } = await ctx.supabase.from("expenses").insert({
    id: crypto.randomUUID(),
    business_id: ctx.businessId,
    outlet_id: input.outlet_id,
    shift_id: shiftId,
    category: input.category,
    amount: input.amount,
    spent_on: input.spent_on,
    note: input.note,
  });
  if (error) fail(BACK, dbError(error));
  done(BACK, "expenseSaved");
}
