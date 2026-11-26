"use server";

import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkbox, dbError, done, fail, id, parse, text } from "@/lib/form";
import { getContext } from "@/lib/session";

const BACK = "/app/staff";
const staffRole = z.enum(["manager", "cashier"], "invalid");

const newStaff = z.object({
  display_name: text(),
  email: z.email("email"),
  password: z.string().min(8, "password"),
  role: staffRole,
  outlet_id: id,
});

export async function addStaff(formData: FormData) {
  const ctx = await getContext();
  if (ctx.role !== "owner") fail(BACK, "forbidden"); // checked before the service-role client is touched
  const input = parse(newStaff, formData, BACK);
  const admin = createAdminClient();
  if (!admin) fail(BACK, "noServiceKey");

  const { data: created, error: authError } = await admin.auth.admin.createUser({
    email: input.email,
    password: input.password,
    email_confirm: true,
    user_metadata: { display_name: input.display_name },
  });
  if (authError || !created.user) fail(BACK, authError?.code === "email_exists" ? "emailTaken" : "generic");

  // Membership goes through the owner's own session, so RLS decides.
  const { error } = await ctx.supabase.from("memberships").insert({
    business_id: ctx.businessId,
    outlet_id: input.outlet_id,
    user_id: created.user.id,
    role: input.role,
    display_name: input.display_name,
    email: input.email,
  });
  if (error) {
    await admin.auth.admin.deleteUser(created.user.id); // no orphan login without access
    fail(BACK, dbError(error));
  }
  done(BACK, "created");
}

const staffUpdate = z.object({ id, role: staffRole, outlet_id: id, active: checkbox });

export async function updateStaff(formData: FormData) {
  const ctx = await getContext();
  if (ctx.role !== "owner") fail(BACK, "forbidden");
  const { id: membershipId, ...values } = parse(staffUpdate, formData, BACK);
  const { data, error } = await ctx.supabase
    .from("memberships")
    .update(values)
    .eq("id", membershipId)
    .neq("role", "owner")
    .select("id");
  if (error) fail(BACK, dbError(error));
  if (!data?.length) fail(BACK, "forbidden");
  done(BACK, "saved");
}
