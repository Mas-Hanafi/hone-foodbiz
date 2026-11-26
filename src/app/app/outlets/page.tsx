import Link from "next/link";
import { ChevronRight, MonitorSmartphone, Store } from "lucide-react";
import { Submit } from "@/components/submit-button";
import { Card, Field, Notice, PageHeader, StatusChip, flash } from "@/components/ui";
import { getContext } from "@/lib/session";
import { addOutlet } from "./actions";

export const metadata = { title: "Outlet" };

type OutletRow = { id: string; code: string; name: string; address: string | null; tax_rate: string; service_rate: string };

const TONES = ["bg-primary-container text-on-primary-container", "bg-tertiary-container text-on-tertiary-container", "bg-secondary-container text-on-secondary-container"];

export default async function OutletsPage({ searchParams }: PageProps<"/app/outlets">) {
  const ctx = await getContext();
  const { error, ok } = await flash(searchParams);
  const [{ data }, { data: termRows }] = await Promise.all([
    ctx.supabase.from("outlets").select("id, code, name, address, tax_rate, service_rate").order("code"),
    ctx.supabase.from("terminals").select("outlet_id"),
  ]);
  const outlets = (data ?? []) as OutletRow[];
  const terminalsPer = new Map<string, number>();
  ((termRows ?? []) as { outlet_id: string }[]).forEach((t) => terminalsPer.set(t.outlet_id, (terminalsPer.get(t.outlet_id) ?? 0) + 1));

  return (
    <>
      <PageHeader title="Outlet" description="Setiap cabang punya pajak, struk, dan terminal kasirnya sendiri." />
      <Notice error={error} ok={ok} />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {outlets.map((o, i) => {
          const terminals = terminalsPer.get(o.id) ?? 0;
          return (
            <Link key={o.id} href={`/app/outlets/${o.id}`} className={`press grid gap-5 rounded-(--radius-card) p-5 ${TONES[i % TONES.length]}`}>
              <div className="flex items-start justify-between gap-3">
                <span className="grid size-12 place-items-center rounded-2xl bg-surface-lowest/70" aria-hidden>
                  <Store className="size-6" />
                </span>
                <span className="rounded-lg bg-surface-lowest/80 px-2.5 py-1 font-mono text-sm font-bold tracking-wider">{o.code}</span>
              </div>
              <div>
                <h2 className="text-2xl font-extrabold">{o.name}</h2>
                <p className="mt-0.5 line-clamp-1 text-sm opacity-80">{o.address ?? "Alamat belum diisi"}</p>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-sm font-bold">
                <span className="num rounded-lg bg-surface-lowest/60 px-2.5 py-1">Pajak {Number(o.tax_rate)}%</span>
                <span className="num rounded-lg bg-surface-lowest/60 px-2.5 py-1">Service {Number(o.service_rate)}%</span>
                <span className="flex items-center gap-1 rounded-lg bg-surface-lowest/60 px-2.5 py-1">
                  <MonitorSmartphone className="size-4" aria-hidden />
                  {terminals ? `${terminals} terminal` : "Belum ada terminal"}
                </span>
                <ChevronRight className="ml-auto size-5 opacity-70" aria-hidden />
              </div>
            </Link>
          );
        })}
      </div>

      {ctx.role === "owner" && (
        <Card id="tambah-outlet" title="Tambah outlet" className="mt-6 scroll-mt-6">
          <form action={addOutlet} className="grid gap-4 sm:grid-cols-[1fr_12rem_auto] sm:items-end">
            <Field label="Nama outlet" name="name" placeholder="Yogyakarta" required />
            <Field label="Kode (2–8 huruf/angka)" name="code" placeholder="YOG" maxLength={8} required autoCapitalize="characters" />
            <Submit>Tambah outlet</Submit>
          </form>
        </Card>
      )}
      {ctx.role !== "owner" && (
        <p className="mt-6 flex items-center gap-2 text-sm text-on-surface-variant">
          <StatusChip>Info</StatusChip> Hanya pemilik yang bisa menambah outlet.
        </p>
      )}
    </>
  );
}
