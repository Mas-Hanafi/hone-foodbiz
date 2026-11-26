import Link from "next/link";
import { ArrowRight, Check, ChevronDown, MonitorSmartphone, Percent, Plus, ShoppingCart, Store, UserPlus } from "lucide-react";
import type { ReactNode } from "react";
import { ButtonLink, Card, IconTile, PageHeader, type Tone } from "@/components/ui";
import { getContext } from "@/lib/session";

export const metadata = { title: "Beranda" };

type Outlet = { id: string; code: string; name: string; tax_rate: string; service_rate: string; receipt_footer: string | null };
type Step = { done: boolean; label: string; detail: string; href: string; action: string };

const OUTLET_TONES = [
  "bg-primary-container text-on-primary-container",
  "bg-tertiary-container text-on-tertiary-container",
  "bg-secondary-container text-on-secondary-container",
];

export default async function DashboardPage() {
  const ctx = await getContext();
  const db = ctx.supabase;
  const count = async (q: PromiseLike<{ count: number | null }>) => (await q).count ?? 0;
  const [{ data: outletRows }, { data: termRows }, products, staff] = await Promise.all([
    db.from("outlets").select("id, code, name, tax_rate, service_rate, receipt_footer").order("code"),
    db.from("terminals").select("outlet_id"),
    count(db.from("products").select("id", { count: "exact", head: true }).eq("active", true)),
    count(db.from("memberships").select("id", { count: "exact", head: true }).eq("active", true)),
  ]);
  const outlets = (outletRows ?? []) as Outlet[];
  const terminalsPer = new Map<string, number>();
  ((termRows ?? []) as { outlet_id: string }[]).forEach((t) => terminalsPer.set(t.outlet_id, (terminalsPer.get(t.outlet_id) ?? 0) + 1));
  const terminals = [...terminalsPer.values()].reduce((a, b) => a + b, 0);
  const configured = outlets.some((o) => Number(o.tax_rate) > 0 || Number(o.service_rate) > 0 || o.receipt_footer);
  const isOwner = ctx.role === "owner";
  const firstOutlet = outlets[0]?.id;

  const steps: Step[] = [
    { done: outlets.length > 0, label: "Buat outlet pertama", detail: `${outlets.length} outlet`, href: "/app/outlets#tambah-outlet", action: "Tambah outlet" },
    { done: configured, label: "Atur pajak dan struk", detail: "PB1, service, kaki struk", href: firstOutlet ? `/app/outlets/${firstOutlet}` : "/app/outlets", action: "Atur outlet" },
    { done: terminals > 0, label: "Daftarkan terminal kasir", detail: `${terminals} terminal`, href: firstOutlet ? `/app/outlets/${firstOutlet}` : "/app/outlets", action: "Tambah terminal" },
    { done: products > 0, label: "Masukkan menu", detail: `${products} menu aktif`, href: "/app/catalog?tambah=1#tambah-menu", action: "Tambah menu" },
    ...(isOwner ? [{ done: staff > 1, label: "Tambahkan staf", detail: "Kasir dan manajer punya akun sendiri", href: "/app/staff#tambah-staf", action: "Tambah staf" }] : []),
  ];
  const done = steps.filter((s) => s.done);
  const pending = steps.filter((s) => !s.done);
  const [next, ...later] = pending;

  return (
    <>
      <PageHeader
        size="lg"
        title={`Halo, ${ctx.displayName}`}
        description={next ? "Beberapa langkah lagi sampai usahamu siap jualan." : "Semua siap. Saatnya jualan."}
      >
        <ButtonLink href="/kasir" look={next ? "tonal" : "filled"}>
          <ShoppingCart className="size-4" aria-hidden />Buka kasir
        </ButtonLink>
      </PageHeader>

      <div className="grid gap-5 lg:grid-cols-[1.35fr_1fr]">
        <Card tone={next ? "primary" : "tertiary"} title={next ? "Siapkan usaha" : "Usaha siap jalan"} className="self-start">
          <div className="mb-5 flex items-center gap-3">
            <div
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={steps.length}
              aria-valuenow={done.length}
              aria-label="Langkah persiapan selesai"
              className="h-2.5 flex-1 overflow-hidden rounded-full bg-surface-lowest/70"
            >
              <div className="grow-in h-full rounded-full bg-current opacity-80" style={{ width: `${(done.length / steps.length) * 100}%` }} />
            </div>
            <span className="num text-sm font-extrabold">{done.length} dari {steps.length}</span>
          </div>

          {next && (
            <div className="pb-5">
              <p className="font-display text-3xl font-extrabold">{next.label}</p>
              <p className="mt-1 opacity-85">{next.detail}</p>
              <ButtonLink href={next.href} className="mt-4">
                {next.action} <ArrowRight className="size-4" aria-hidden />
              </ButtonLink>
            </div>
          )}

          {later.length > 0 && (
            <ul className="grid gap-1 border-t border-on-primary-container/15 pt-2">
              {later.map((s) => (
                <li key={s.label}>
                  <Link href={s.href} className="press flex min-h-12 items-center gap-3 rounded-2xl px-2 hover:bg-surface-lowest/50">
                    <span aria-hidden className="size-6 shrink-0 rounded-full border-2 border-current opacity-70" />
                    <span className="flex-1 font-bold">{s.label}</span>
                    <span className="sr-only">belum</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}

          {done.length > 0 && (
            <details className="group border-t border-on-primary-container/15 pt-2">
              <summary className="press flex min-h-12 items-center gap-3 rounded-2xl px-2 font-bold hover:bg-surface-lowest/50">
                <span aria-hidden className="grid size-6 place-items-center rounded-full bg-on-primary-container/15">
                  <Check className="size-4" strokeWidth={3} />
                </span>
                <span className="flex-1">{done.length} langkah selesai</span>
                <ChevronDown className="size-5 transition-transform duration-200 group-open:rotate-180" aria-hidden />
              </summary>
              <ul className="grid gap-0.5 pt-1 pl-11 text-sm">
                {done.map((s) => (
                  <li key={s.label}>
                    <Link href={s.href} className="flex min-h-10 items-center justify-between gap-3 rounded-xl px-2 hover:bg-surface-lowest/50">
                      <span className="font-semibold opacity-80">{s.label}</span>
                      <span className="opacity-70">{s.detail}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </details>
          )}
        </Card>

        <div className="grid content-start gap-5">
          <Card title="Aksi cepat">
            <div className="grid grid-cols-4 gap-1">
              <QuickAction href="/app/catalog?tambah=1#tambah-menu" icon={<Plus className="size-5" />} tone="primary" label="Menu" />
              <QuickAction href="/app/outlets#tambah-outlet" icon={<Store className="size-5" />} tone="secondary" label="Outlet" />
              <QuickAction href={firstOutlet ? `/app/outlets/${firstOutlet}` : "/app/outlets"} icon={<MonitorSmartphone className="size-5" />} tone="tertiary" label="Terminal" />
              {isOwner ? (
                <QuickAction href="/app/staff#tambah-staf" icon={<UserPlus className="size-5" />} tone="secondary" label="Staf" />
              ) : (
                <QuickAction href="/app/catalog/modifiers" icon={<Percent className="size-5" />} tone="secondary" label="Tambahan" />
              )}
            </div>
          </Card>

          <section aria-labelledby="outlet-heading" className="grid gap-3">
            <div className="flex items-center justify-between px-1">
              <h2 id="outlet-heading" className="text-xl font-bold">Outlet</h2>
              <Link href="/app/outlets" className="text-sm font-bold text-primary underline">Semua</Link>
            </div>
            {outlets.map((o, i) => {
              const t = terminalsPer.get(o.id) ?? 0;
              return (
                <Link key={o.id} href={`/app/outlets/${o.id}`} className={`press flex items-center gap-4 rounded-(--radius-card) p-4 ${OUTLET_TONES[i % OUTLET_TONES.length]}`}>
                  <span aria-hidden className="grid size-12 shrink-0 place-items-center rounded-2xl bg-surface-lowest/70 font-mono text-sm font-bold">{o.code}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-lg font-extrabold">{o.name}</span>
                    <span className="num block text-sm opacity-85">
                      {t ? `${t} terminal` : "Belum ada terminal"} · Pajak {Number(o.tax_rate)}%
                    </span>
                  </span>
                  <ArrowRight className="size-5 opacity-70" aria-hidden />
                </Link>
              );
            })}
          </section>
        </div>
      </div>
    </>
  );
}

function QuickAction({ href, icon, tone, label }: { href: string; icon: ReactNode; tone: Tone; label: string }) {
  return (
    <Link href={href} className="press grid justify-items-center gap-2 rounded-2xl py-2 text-sm font-bold hover:bg-surface-container">
      <IconTile icon={icon} tone={tone} size="lg" />
      {label}
    </Link>
  );
}
