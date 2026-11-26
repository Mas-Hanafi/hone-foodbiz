import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "./supabase/server";

export type Role = "owner" | "manager" | "cashier";

export const ROLE_LABEL: Record<Role, string> = {
  owner: "Pemilik",
  manager: "Manajer",
  cashier: "Kasir",
};

type MembershipRow = { business_id: string; outlet_id: string | null; role: Role; display_name: string };

/** Signed-in user or redirect to /login. getClaims() verifies the JWT, unlike getSession(). */
export const requireUser = cache(async () => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) redirect("/login");
  return {
    supabase,
    userId: data.claims.sub,
    email: typeof data.claims.email === "string" ? data.claims.email : "",
    metaName: String((data.claims.user_metadata as { display_name?: string } | undefined)?.display_name ?? ""),
  };
});

/** User + business + role, or redirect to /onboarding when the user has no business yet. */
export const getContext = cache(async () => {
  const { supabase, userId } = await requireUser();
  const { data, error } = await supabase
    .from("memberships")
    .select("business_id, outlet_id, role, display_name")
    .eq("user_id", userId)
    .eq("active", true);
  if (error) throw new Error(`memberships: ${error.message}`);
  const rows = (data ?? []) as MembershipRow[];
  if (rows.length === 0) redirect("/onboarding");

  // ponytail: the UI works on the first business only; the schema already supports several.
  const businessId = rows[0].business_id;
  const mine = rows.filter((r) => r.business_id === businessId);
  const role: Role = mine.some((r) => r.role === "owner")
    ? "owner"
    : mine.some((r) => r.role === "manager")
      ? "manager"
      : "cashier";
  const { data: business } = await supabase.from("businesses").select("name").eq("id", businessId).single();

  return {
    supabase,
    userId,
    businessId,
    businessName: (business?.name as string | undefined) ?? "",
    role,
    displayName: mine[0].display_name,
  };
});

export type AppContext = Awaited<ReturnType<typeof getContext>>;
