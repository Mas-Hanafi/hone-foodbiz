"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { checkbox, dbError, done, fail, id, optionalText, parse, percent, text } from "@/lib/form";
import { getContext } from "@/lib/session";

const outletCode = z.string().trim().toUpperCase().regex(/^[A-Z0-9]{2,8}$/, "outletCode");

export async function addOutlet(formData: FormData) {
  const back = "/app/outlets";
  const ctx = await getContext();
  if (ctx.role !== "owner") fail(back, "forbidden");
  const input = parse(z.object({ name: text(), code: outletCode }), formData, back);
  const { data, error } = await ctx.supabase
    .from("outlets")
    .insert({ business_id: ctx.businessId, ...input })
    .select("id")
    .single();
  if (error) fail(back, dbError(error));
  redirect(`/app/outlets/${data.id}?ok=created`);
}

const settings = z.object({
  id,
  name: text(),
  address: optionalText,
  phone: optionalText,
  tax_rate: percent,
  tax_inclusive: checkbox,
  service_rate: percent,
  max_cashier_discount_pct: percent,
  cash_rounding: z.enum(["0", "100", "500", "1000"], "invalid").transform(Number),
  paper_size: z.enum(["58mm", "80mm", "a4"], "invalid"),
  receipt_header: optionalText,
  receipt_footer: optionalText,
});

export async function updateOutlet(formData: FormData) {
  const { id: outletId, ...values } = parse(settings, formData, "/app/outlets");
  const back = `/app/outlets/${outletId}`;
  const ctx = await getContext();
  // RLS lets only the owner update; an empty result means no access.
  const { data, error } = await ctx.supabase.from("outlets").update(values).eq("id", outletId).select("id");
  if (error) fail(back, dbError(error));
  if (!data?.length) fail(back, "forbidden");
  done(back, "saved");
}

const terminal = z.object({
  outlet_id: id,
  code: z.string().trim().toUpperCase().regex(/^[A-Z0-9]{1,4}$/, "terminalCode"),
  name: text(),
});

export async function addTerminal(formData: FormData) {
  const input = parse(terminal, formData, "/app/outlets");
  const back = `/app/outlets/${input.outlet_id}`;
  const ctx = await getContext();
  const { error } = await ctx.supabase.from("terminals").insert({ business_id: ctx.businessId, ...input });
  if (error) fail(back, dbError(error));
  done(back, "created");
}
