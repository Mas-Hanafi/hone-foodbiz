import "server-only";
import { redirect } from "next/navigation";
import { z } from "zod";
import type { MessageKey } from "./messages";

const withParam = (path: string, name: string, value: string) => `${path}${path.includes("?") ? "&" : "?"}${name}=${value}`;

export function fail(path: string, key: MessageKey): never {
  redirect(withParam(path, "error", key));
}

export function done(path: string, key: MessageKey): never {
  redirect(withParam(path, "ok", key));
}

/** Parses FormData with a zod schema whose messages are MessageKeys; redirects back on failure. */
export function parse<S extends z.ZodType>(schema: S, formData: FormData, back: string): z.infer<S> {
  const raw: Record<string, string | string[]> = {};
  for (const [k, v] of formData.entries()) {
    if (typeof v !== "string") continue;
    const prev = raw[k];
    raw[k] = prev === undefined ? v : [prev, v].flat();
  }
  const result = schema.safeParse(raw);
  if (!result.success) fail(back, (result.error.issues[0]?.message as MessageKey) ?? "invalid");
  return result.data;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Page to return to on a validation error: `${base}/${id}` when the form carries a valid id, else `base`. */
export function backTo(formData: FormData, field: string, base: string): string {
  const value = formData.get(field);
  return typeof value === "string" && UUID.test(value) ? `${base}/${value}` : base;
}

export function dbError(error: { code?: string }): MessageKey {
  switch (error.code) {
    case "23505": return "duplicate";
    case "42501": return "forbidden";
    case "23503": return "missing";
    case "23514":
    case "22P02": return "invalid";
    default: return "generic";
  }
}

// ── field schemas (messages are MessageKeys) ──
export const text = (key: MessageKey = "name") => z.string().trim().min(1, key);
export const optionalText = z.string().trim().optional().transform((v) => v || null);
export const id = z.uuid("invalid");
export const optionalId = z.union([z.literal(""), z.uuid("invalid")]).optional().transform((v) => v || null);
export const checkbox = z.string().optional().transform((v) => v === "on");
export const rupiah = z
  .string()
  .trim()
  .regex(/^\d[\d.]*$/, "price")
  .transform((s) => Number(s.replace(/\./g, "")));
export const optionalRupiah = z
  .string()
  .trim()
  .optional()
  .refine((s) => !s || /^\d[\d.]*$/.test(s), "price")
  .transform((s) => (s ? Number(s.replace(/\./g, "")) : null));
export const percent = z
  .string()
  .trim()
  .transform((s) => Number(s.replace(",", ".")))
  .pipe(z.number("percent").min(0, "percent").max(100, "percent"));
export const ids = z
  .union([z.uuid("invalid"), z.array(z.uuid("invalid"))])
  .optional()
  .transform((v) => (v ? [v].flat() : []));
