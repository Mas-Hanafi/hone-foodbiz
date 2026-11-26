"use server";

import { z } from "zod";
import { dbError, done, fail, id, optionalText, parse } from "@/lib/form";
import { getContext } from "@/lib/session";

const qty = z
  .string()
  .trim()
  .transform((s) => Number(s.replace(",", ".")))
  .pipe(z.number("invalid").min(0, "invalid").max(1_000_000, "invalid"));

const movement = z.object({
  outlet_id: id,
  product_id: id,
  mode: z.enum(["restock", "opname"], "invalid"),
  qty,
  note: optionalText,
});

/** Restock adds the quantity; stock opname records the difference between the physical count and the ledger. */
export async function moveStock(formData: FormData) {
  const input = parse(movement, formData, "/app/stok");
  const back = `/app/stok?outlet=${input.outlet_id}`;
  const ctx = await getContext();
  if (ctx.role === "cashier") fail(back, "forbidden");

  let delta = input.qty;
  if (input.mode === "opname") {
    const { data } = await ctx.supabase
      .from("stock_balances")
      .select("qty")
      .eq("outlet_id", input.outlet_id)
      .eq("product_id", input.product_id)
      .maybeSingle();
    delta = input.qty - Number(data?.qty ?? 0);
    if (delta === 0) done(back, "stockNoChange");
  } else if (delta <= 0) {
    fail(back, "invalid");
  }

  const { error } = await ctx.supabase.from("stock_movements").insert({
    business_id: ctx.businessId,
    outlet_id: input.outlet_id,
    product_id: input.product_id,
    qty_delta: delta,
    kind: input.mode === "opname" ? "adjustment" : "restock",
    note: input.note ?? (input.mode === "opname" ? `Stock opname: hitung fisik ${input.qty}` : null),
  });
  if (error) fail(back, dbError(error));
  done(back, "stockSaved");
}
