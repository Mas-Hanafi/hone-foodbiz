"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import {
  backTo, checkbox, dbError, done, fail, id, ids, optionalId, optionalRupiah, optionalText, parse, rupiah, text,
} from "@/lib/form";
import { getContext } from "@/lib/session";

const CATALOG = "/app/catalog";
const MODIFIERS = "/app/catalog/modifiers";
const productPath = (productId: string) => `/app/catalog/${productId}`;

// Every write goes through the user's session; RLS limits catalog writes to owner/manager.

export async function addCategory(formData: FormData) {
  const ctx = await getContext();
  const input = parse(z.object({ name: text() }), formData, CATALOG);
  const { error } = await ctx.supabase.from("categories").insert({ business_id: ctx.businessId, ...input });
  if (error) fail(CATALOG, dbError(error));
  done(CATALOG, "created");
}

export async function deleteCategory(formData: FormData) {
  const ctx = await getContext();
  const input = parse(z.object({ id }), formData, CATALOG);
  const { data, error } = await ctx.supabase.from("categories").delete().eq("id", input.id).select("id");
  if (error) fail(CATALOG, dbError(error));
  if (!data?.length) fail(CATALOG, "forbidden");
  done(CATALOG, "deleted"); // products keep existing with no category
}

const productFields = {
  name: text(),
  category_id: optionalId,
  price: rupiah,
  cost_price: optionalRupiah,
  sku: optionalText,
  track_stock: checkbox,
};

export async function addProduct(formData: FormData) {
  const ctx = await getContext();
  const input = parse(z.object(productFields), formData, CATALOG);
  const { data, error } = await ctx.supabase
    .from("products")
    .insert({ business_id: ctx.businessId, ...input })
    .select("id")
    .single();
  if (error) fail(CATALOG, dbError(error));
  redirect(`${productPath(data.id)}?ok=created`);
}

export async function updateProduct(formData: FormData) {
  const ctx = await getContext();
  const back = backTo(formData, "id", CATALOG);
  const { id: productId, ...values } = parse(z.object({ id, ...productFields, active: checkbox }), formData, back);
  const { data, error } = await ctx.supabase.from("products").update(values).eq("id", productId).select("id");
  if (error) fail(back, dbError(error));
  if (!data?.length) fail(back, "forbidden");
  done(back, "saved");
}

export async function addVariant(formData: FormData) {
  const ctx = await getContext();
  const back = backTo(formData, "product_id", CATALOG);
  const input = parse(z.object({ product_id: id, name: text(), price: rupiah }), formData, back);
  const { error } = await ctx.supabase.from("product_variants").insert({ business_id: ctx.businessId, ...input });
  if (error) fail(back, dbError(error));
  done(back, "created");
}

export async function deleteVariant(formData: FormData) {
  const ctx = await getContext();
  const back = backTo(formData, "product_id", CATALOG);
  const input = parse(z.object({ id, product_id: id }), formData, back);
  const { data, error } = await ctx.supabase.from("product_variants").delete().eq("id", input.id).select("id");
  if (error) fail(back, dbError(error));
  if (!data?.length) fail(back, "forbidden");
  done(back, "deleted"); // past sales keep the variant name in their snapshot
}

export async function setProductModifiers(formData: FormData) {
  const ctx = await getContext();
  const back = backTo(formData, "product_id", CATALOG);
  const input = parse(z.object({ product_id: id, modifier_ids: ids }), formData, back);
  // ponytail: delete + insert is two statements, not one transaction. Worst case a failed insert
  // leaves the product with no modifiers until saved again; move to an RPC if that ever matters.
  const { error: delError } = await ctx.supabase.from("product_modifiers").delete().eq("product_id", input.product_id);
  if (delError) fail(back, dbError(delError));
  if (input.modifier_ids.length > 0) {
    const rows = input.modifier_ids.map((modifierId) => ({
      business_id: ctx.businessId, product_id: input.product_id, modifier_id: modifierId,
    }));
    const { error } = await ctx.supabase.from("product_modifiers").insert(rows);
    if (error) fail(back, dbError(error));
  }
  done(back, "saved");
}

export async function addModifier(formData: FormData) {
  const ctx = await getContext();
  const input = parse(z.object({ name: text(), price: rupiah }), formData, MODIFIERS);
  const { error } = await ctx.supabase.from("modifiers").insert({ business_id: ctx.businessId, ...input });
  if (error) fail(MODIFIERS, dbError(error));
  done(MODIFIERS, "created");
}

export async function setModifierActive(formData: FormData) {
  const ctx = await getContext();
  const input = parse(z.object({ id, active: checkbox }), formData, MODIFIERS);
  const { data, error } = await ctx.supabase.from("modifiers").update({ active: input.active }).eq("id", input.id).select("id");
  if (error) fail(MODIFIERS, dbError(error));
  if (!data?.length) fail(MODIFIERS, "forbidden");
  done(MODIFIERS, "saved");
}
