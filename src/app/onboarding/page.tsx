import { redirect } from "next/navigation";
import { AuthShell } from "@/components/auth-shell";
import { Submit } from "@/components/submit-button";
import { Field, Notice, flash } from "@/components/ui";
import { requireUser } from "@/lib/session";
import { createBusiness } from "./actions";

export const metadata = { title: "Buat usaha" };

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
    <AuthShell title="Buat usaha pertamamu" description="Satu menit saja. Pajak, struk, dan menu bisa diatur sesudahnya.">
      <Notice error={error} />
      <form action={createBusiness} className="grid gap-4">
        <Field label="Nama kamu" name="display_name" defaultValue={metaName} autoComplete="name" required />
        <Field label="Nama usaha" name="business_name" placeholder="Dapur Senja" required />
        <div className="grid grid-cols-[1fr_7.5rem] gap-3">
          <Field label="Outlet pertama" name="outlet_name" placeholder="Jakarta" required />
          <Field label="Kode" name="outlet_code" placeholder="JKT" maxLength={8} autoCapitalize="characters" required />
        </div>
        <p className="-mt-1 rounded-2xl bg-surface-container px-4 py-3 text-sm text-on-surface-variant">
          Kode outlet muncul di nomor struk, mis. <span className="num font-bold text-on-surface">JKT-T1-20261126-0001</span>.
        </p>
        <Submit className="mt-2 w-full">Buat usaha</Submit>
      </form>
    </AuthShell>
  );
}
