"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { dbError, fail, parse, text } from "@/lib/form";
import { requireUser } from "@/lib/session";

const schema = z.object({
  business_name: text(),
  outlet_name: text(),
  outlet_code: z.string().trim().toUpperCase().regex(/^[A-Z0-9]{2,8}$/, "outletCode"),
  display_name: text(),
});

export async function createBusiness(formData: FormData) {
  const input = parse(schema, formData, "/onboarding");
  const { supabase } = await requireUser();
  const { error } = await supabase.rpc("create_business", {
    p_name: input.business_name,
    p_outlet_name: input.outlet_name,
    p_outlet_code: input.outlet_code,
    p_display_name: input.display_name,
  });
  if (error) fail("/onboarding", dbError(error));
  redirect("/app");
}
