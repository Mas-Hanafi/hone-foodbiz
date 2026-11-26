import { ChevronDown, UserPlus } from "lucide-react";
import { Submit } from "@/components/submit-button";
import { Card, Field, Notice, PageHeader, SelectField, StatusChip, Switch, flash, type Tone } from "@/components/ui";
import { ROLE_LABEL, getContext, type Role } from "@/lib/session";
import { addStaff, updateStaff } from "./actions";

export const metadata = { title: "Staf" };

type Member = { id: string; display_name: string; email: string | null; role: Role; outlet_id: string | null; active: boolean };
type Outlet = { id: string; code: string; name: string };

const ROLE_TONE: Record<Role, Tone> = { owner: "primary", manager: "secondary", cashier: "tertiary" };
const AVATAR: Record<Role, string> = {
  owner: "bg-primary-container text-on-primary-container",
  manager: "bg-secondary-container text-on-secondary-container",
  cashier: "bg-tertiary-container text-on-tertiary-container",
};

const initials = (name: string) => name.split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase();

export default async function StaffPage({ searchParams }: PageProps<"/app/staff">) {
  const ctx = await getContext();
  const { error, ok } = await flash(searchParams);
  if (ctx.role !== "owner") {
    return (<><PageHeader title="Staf" /><Notice error="forbidden" /></>);
  }

  const [{ data: memberRows }, { data: outletRows }] = await Promise.all([
    ctx.supabase.from("memberships").select("id, display_name, email, role, outlet_id, active").order("role").order("display_name"),
    ctx.supabase.from("outlets").select("id, code, name").order("code"),
  ]);
  const members = (memberRows ?? []) as Member[];
  const outlets = (outletRows ?? []) as Outlet[];
  const outletName = new Map(outlets.map((o) => [o.id, `${o.code} · ${o.name}`]));
  const outletOptions = outlets.map((o) => <option key={o.id} value={o.id}>{o.code} · {o.name}</option>);

  return (
    <>
      <PageHeader title="Staf" description="Setiap orang punya akun sendiri. Peran menentukan apa yang bisa mereka ubah." />
      <Notice error={error} ok={ok} />

      <div className="grid gap-6 lg:grid-cols-[1fr_24rem]">
        <Card title={`Tim (${members.length})`} className="self-start">
          <ul className="grid gap-1">
            {members.map((m) => {
              const row = (
                <>
                  <span aria-hidden className={`grid size-11 shrink-0 place-items-center rounded-full text-sm font-extrabold ${AVATAR[m.role]} ${m.active ? "" : "opacity-50"}`}>
                    {initials(m.display_name)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className={`block truncate font-bold ${m.active ? "" : "text-on-surface-variant line-through"}`}>{m.display_name}</span>
                    <span className="block truncate text-sm text-on-surface-variant">
                      {m.role === "owner" ? "Semua outlet" : outletName.get(m.outlet_id ?? "") ?? "—"} · {m.email}
                    </span>
                  </span>
                  <StatusChip tone={m.active ? ROLE_TONE[m.role] : "surface"}>{m.active ? ROLE_LABEL[m.role] : "Nonaktif"}</StatusChip>
                </>
              );
              if (m.role === "owner") {
                return <li key={m.id} className="flex min-h-16 items-center gap-4 rounded-2xl px-3 py-2.5">{row}</li>;
              }
              return (
                <li key={m.id}>
                  <details className="group rounded-2xl open:bg-surface-low">
                    <summary className="press flex min-h-16 items-center gap-4 rounded-2xl px-3 py-2.5 hover:bg-surface-container">
                      {row}
                      <ChevronDown className="size-5 text-on-surface-variant transition-transform duration-200 group-open:rotate-180" aria-hidden />
                      <span className="sr-only">Ubah</span>
                    </summary>
                    <form action={updateStaff} className="grid gap-4 px-3 pt-2 pb-4 sm:grid-cols-2">
                      <input type="hidden" name="id" value={m.id} />
                      <SelectField label="Peran" name="role" defaultValue={m.role}>
                        <option value="cashier">{ROLE_LABEL.cashier}</option>
                        <option value="manager">{ROLE_LABEL.manager}</option>
                      </SelectField>
                      <SelectField label="Outlet" name="outlet_id" defaultValue={m.outlet_id ?? ""}>{outletOptions}</SelectField>
                      <Switch label="Akun aktif" hint="Nonaktif = tidak bisa masuk." name="active" defaultChecked={m.active} />
                      <div className="flex justify-end"><Submit look="tonal">Simpan</Submit></div>
                    </form>
                  </details>
                </li>
              );
            })}
          </ul>
        </Card>

        <Card id="tambah-staf" title="Tambah staf" tone="secondary" className="scroll-mt-6 self-start">
          <p className="mb-4 text-sm opacity-90">
            Kamu yang menentukan kata sandi awal. Berikan langsung ke staf, lalu minta mereka menggantinya.
          </p>
          <form action={addStaff} className="grid gap-4">
            <Field label="Nama" name="display_name" autoComplete="off" required />
            <Field label="Email" name="email" type="email" autoComplete="off" required />
            <Field label="Kata sandi awal" name="password" type="password" autoComplete="new-password" minLength={8} required hint="Minimal 8 karakter." />
            <div className="grid grid-cols-2 gap-3">
              <SelectField label="Peran" name="role" defaultValue="cashier">
                <option value="cashier">{ROLE_LABEL.cashier}</option>
                <option value="manager">{ROLE_LABEL.manager}</option>
              </SelectField>
              <SelectField label="Outlet" name="outlet_id" required>{outletOptions}</SelectField>
            </div>
            <Submit><UserPlus className="size-4" aria-hidden />Tambah staf</Submit>
          </form>
        </Card>
      </div>
    </>
  );
}
