"use server";

import { z } from "zod";
import { dbError, done, fail, parse } from "@/lib/form";
import { getContext } from "@/lib/session";

const BACK = "/app/akun";

export async function setPin(formData: FormData) {
  const ctx = await getContext();
  if (ctx.role === "cashier") fail(BACK, "forbidden");
  const { pin } = parse(
    z.object({ pin: z.string().regex(/^\d{6}$/, "pin"), confirm: z.string() }).refine((v) => v.pin === v.confirm, { message: "pinMismatch" }),
    formData,
    BACK,
  );
  const { error } = await ctx.supabase.rpc("set_my_pin", { p_pin: pin });
  if (error) fail(BACK, dbError(error));
  done(BACK, "pinSaved");
}
