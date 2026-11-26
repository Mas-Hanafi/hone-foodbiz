import { redirect } from "next/navigation";
import { AuthShell } from "@/components/auth-shell";
import { Field, Notice, Submit, flash } from "@/components/ui";
import { requireUser } from "@/lib/session";
import { createBusiness } from "./actions";

export default async function OnboardingPage({ searchParams }: PageProps<"/onboarding">) {
  const { supabase, userId, metaName } = await requireUser();
  const { count } = await supabase
    .from("memberships")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("active", true);
  if (count) redirect("/app");

  const { error } = await flash(searchParams);
  return (
    <AuthShell title="Buat usaha pertamamu">
      <Notice error={error} />
      <form action={createBusiness} className="grid gap-4">
        <Field label="Nama kamu" name="display_name" defaultValue={metaName} required />
        <Field label="Nama usaha" name="business_name" placeholder="Dapur Senja" required />
        <div className="grid grid-cols-[1fr_7rem] gap-3">
          <Field label="Outlet pertama" name="outlet_name" placeholder="Jakarta" required />
          <Field label="Kode" name="outlet_code" placeholder="JKT" maxLength={8} required />
        </div>
        <p className="-mt-2 text-xs text-mute">Kode outlet muncul di nomor struk, mis. JKT-T1-20261126-0001.</p>
        <Submit>Buat usaha</Submit>
      </form>
    </AuthShell>
  );
}
