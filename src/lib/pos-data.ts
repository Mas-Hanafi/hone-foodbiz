import "server-only";
import { cookies } from "next/headers";
import type { AppContext } from "./session";

export const TERMINAL_COOKIE = "pos_terminal";

/** The terminal this browser was set up as (chosen once per device). */
export async function terminalFromCookie(): Promise<string | null> {
  return (await cookies()).get(TERMINAL_COOKIE)?.value ?? null;
}

export type PosOutlet = {
  id: string; code: string; name: string; timezone: string;
  tax_rate: number; tax_inclusive: boolean; service_rate: number; cash_rounding: number; max_cashier_discount_pct: number;
};
export type PosTerminal = { id: string; code: string; name: string; outlet_id: string };
export type PosModifier = { id: string; name: string; price: number };
export type PosVariant = { id: string; name: string; price: number };
export type PosProduct = {
  id: string; name: string; categoryId: string | null; price: number; trackStock: boolean;
  variants: PosVariant[]; modifiers: PosModifier[];
};
export type PosCatalog = { categories: { id: string; name: string }[]; products: PosProduct[] };

type Row = Record<string, unknown>;
const num = (v: unknown) => Number(v ?? 0);

export async function loadTerminal(ctx: AppContext, terminalId: string) {
  const { data: t } = await ctx.supabase.from("terminals").select("id, code, name, outlet_id").eq("id", terminalId).maybeSingle();
  if (!t) return null;
  const { data: o } = await ctx.supabase
    .from("outlets")
    .select("id, code, name, timezone, tax_rate, tax_inclusive, service_rate, cash_rounding, max_cashier_discount_pct")
    .eq("id", t.outlet_id)
    .maybeSingle();
  if (!o) return null;
  const outlet: PosOutlet = {
    id: o.id, code: o.code, name: o.name, timezone: o.timezone,
    tax_rate: num(o.tax_rate), tax_inclusive: Boolean(o.tax_inclusive), service_rate: num(o.service_rate), cash_rounding: num(o.cash_rounding),
    max_cashier_discount_pct: num(o.max_cashier_discount_pct),
  };
  return { terminal: t as PosTerminal, outlet };
}

export async function loadOpenShift(ctx: AppContext, terminalId: string) {
  const { data } = await ctx.supabase
    .from("shifts")
    .select("id, cashier_id, opened_at, opening_float")
    .eq("terminal_id", terminalId)
    .is("closed_at", null)
    .maybeSingle();
  return data as { id: string; cashier_id: string; opened_at: string; opening_float: string } | null;
}

/** Active products with the outlet's prices, variants and allowed add-ons. */
export async function loadCatalog(ctx: AppContext, outletId: string): Promise<PosCatalog> {
  const db = ctx.supabase;
  const [cats, products, variants, modifiers, links, prices] = await Promise.all([
    db.from("categories").select("id, name").order("sort").order("name"),
    db.from("products").select("id, name, category_id, price, track_stock").eq("active", true).order("name"),
    db.from("product_variants").select("id, product_id, name, price").eq("active", true).order("sort").order("price"),
    db.from("modifiers").select("id, name, price").eq("active", true).order("name"),
    db.from("product_modifiers").select("product_id, modifier_id"),
    db.from("outlet_prices").select("product_id, variant_id, price").eq("outlet_id", outletId),
  ]);
  const override = new Map<string, number>();
  ((prices.data ?? []) as Row[]).forEach((p) => override.set(`${p.product_id}:${p.variant_id ?? ""}`, num(p.price)));
  const modById = new Map(((modifiers.data ?? []) as Row[]).map((m) => [m.id as string, { id: m.id as string, name: m.name as string, price: num(m.price) }]));

  const result = ((products.data ?? []) as Row[]).map((p): PosProduct => {
    const id = p.id as string;
    return {
      id,
      name: p.name as string,
      categoryId: (p.category_id as string | null) ?? null,
      price: override.get(`${id}:`) ?? num(p.price),
      trackStock: Boolean(p.track_stock),
      variants: ((variants.data ?? []) as Row[])
        .filter((v) => v.product_id === id)
        .map((v) => ({ id: v.id as string, name: v.name as string, price: override.get(`${id}:${v.id}`) ?? num(v.price) })),
      modifiers: ((links.data ?? []) as Row[])
        .filter((l) => l.product_id === id && modById.has(l.modifier_id as string))
        .map((l) => modById.get(l.modifier_id as string)!),
    };
  });
  return { categories: (cats.data ?? []) as { id: string; name: string }[], products: result };
}
