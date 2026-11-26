import Link from "next/link";
import { Card, Field, Notice, PageHeader, Submit, flash, table } from "@/components/ui";
import { getContext } from "@/lib/session";
import { addOutlet } from "./actions";

type OutletRow = { id: string; code: string; name: string; tax_rate: string; service_rate: string };

export default async function OutletsPage({ searchParams }: PageProps<"/app/outlets">) {
  const ctx = await getContext();
  const { error, ok } = await flash(searchParams);
  const { data } = await ctx.supabase.from("outlets").select("id, code, name, tax_rate, service_rate").order("code");
  const outlets = (data ?? []) as OutletRow[];

  return (
    <>
      <PageHeader title="Outlet" />
      <Notice error={error} ok={ok} />
      <Card>
        <div className="overflow-x-auto">
          <table className={table}>
            <thead><tr><th>Kode</th><th>Nama</th><th>Pajak</th><th>Service</th></tr></thead>
            <tbody>
              {outlets.map((o) => (
                <tr key={o.id}>
                  <td className="font-mono">{o.code}</td>
                  <td><Link href={`/app/outlets/${o.id}`} className="font-medium underline">{o.name}</Link></td>
                  <td className="tabular-nums">{Number(o.tax_rate)}%</td>
                  <td className="tabular-nums">{Number(o.service_rate)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {ctx.role === "owner" && (
        <Card title="Tambah outlet" className="mt-6">
          <form action={addOutlet} className="grid gap-4 sm:grid-cols-[1fr_8rem_auto] sm:items-end">
            <Field label="Nama" name="name" placeholder="Yogyakarta" required />
            <Field label="Kode" name="code" placeholder="YOG" maxLength={8} required />
            <Submit>Tambah</Submit>
          </form>
        </Card>
      )}
    </>
  );
}
