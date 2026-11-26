import { Card, Field, Notice, PageHeader, SelectField, Submit, flash, table } from "@/components/ui";
import { ROLE_LABEL, getContext, type Role } from "@/lib/session";
import { addStaff, updateStaff } from "./actions";

type Member = { id: string; display_name: string; email: string | null; role: Role; outlet_id: string | null; active: boolean };
type Outlet = { id: string; code: string; name: string };

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
  const outletOptions = outlets.map((o) => <option key={o.id} value={o.id}>{o.code} · {o.name}</option>);

  return (
    <>
      <PageHeader title="Staf" />
      <Notice error={error} ok={ok} />

      <Card>
        <div className="overflow-x-auto">
          <table className={table}>
            <thead><tr><th>Nama</th><th>Peran</th><th>Outlet</th><th>Aktif</th><th /></tr></thead>
            <tbody>
              {members.map((m) =>
                m.role === "owner" ? (
                  <tr key={m.id}>
                    <td><p className="font-medium">{m.display_name}</p><p className="text-xs text-mute">{m.email}</p></td>
                    <td>{ROLE_LABEL.owner}</td><td className="text-mute">Semua outlet</td><td>Ya</td><td />
                  </tr>
                ) : (
                  <tr key={m.id} className={m.active ? "" : "text-mute"}>
                    <td><p className="font-medium">{m.display_name}</p><p className="text-xs text-mute">{m.email}</p></td>
                    <td colSpan={4}>
                      <form action={updateStaff} className="flex flex-wrap items-center gap-3">
                        <input type="hidden" name="id" value={m.id} />
                        <select name="role" defaultValue={m.role} aria-label="Peran" className="rounded-lg border border-line bg-surface px-2 py-1.5">
                          <option value="manager">{ROLE_LABEL.manager}</option>
                          <option value="cashier">{ROLE_LABEL.cashier}</option>
                        </select>
                        <select name="outlet_id" defaultValue={m.outlet_id ?? ""} aria-label="Outlet" className="rounded-lg border border-line bg-surface px-2 py-1.5">
                          {outletOptions}
                        </select>
                        <label className="flex items-center gap-1.5"><input type="checkbox" name="active" defaultChecked={m.active} className="size-4 accent-foreground" />Aktif</label>
                        <Submit tone="quiet">Simpan</Submit>
                      </form>
                    </td>
                  </tr>
                ),
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <Card title="Tambah staf" className="mt-6">
        <p className="mb-4 text-sm text-mute">
          Kamu yang menentukan kata sandi awal. Berikan ke staf secara langsung, lalu minta mereka menggantinya.
        </p>
        <form action={addStaff} className="grid gap-4 sm:grid-cols-2">
          <Field label="Nama" name="display_name" required />
          <Field label="Email" name="email" type="email" autoComplete="off" required />
          <Field label="Kata sandi awal" name="password" type="password" autoComplete="new-password" minLength={8} required />
          <SelectField label="Peran" name="role" defaultValue="cashier">
            <option value="cashier">{ROLE_LABEL.cashier}</option>
            <option value="manager">{ROLE_LABEL.manager}</option>
          </SelectField>
          <SelectField label="Outlet" name="outlet_id" required>{outletOptions}</SelectField>
          <div className="sm:col-span-2"><Submit>Tambah staf</Submit></div>
        </form>
      </Card>
    </>
  );
}
