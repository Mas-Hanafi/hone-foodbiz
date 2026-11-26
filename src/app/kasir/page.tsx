import Link from "next/link";
import { ArrowLeft, MonitorSmartphone, Store } from "lucide-react";
import { Submit } from "@/components/submit-button";
import { Card, EmptyState, Field, Notice, flash } from "@/components/ui";
import { rupiah } from "@/lib/format";
import { loadCatalog, loadOpenShift, loadTerminal, terminalFromCookie } from "@/lib/pos-data";
import { getContext } from "@/lib/session";
import { chooseTerminal, forgetTerminal, openShift } from "./actions";
import { PosScreen } from "./pos-screen";

export const metadata = { title: "Kasir" };

export default async function KasirPage({ searchParams }: PageProps<"/kasir">) {
  const ctx = await getContext();
  const { error, ok } = await flash(searchParams);
  const terminalId = await terminalFromCookie();
  const pos = terminalId ? await loadTerminal(ctx, terminalId) : null;

  if (!pos) {
    const [{ data: terminals }, { data: outlets }] = await Promise.all([
      ctx.supabase.from("terminals").select("id, code, name, outlet_id").order("code"),
      ctx.supabase.from("outlets").select("id, code, name").order("code"),
    ]);
    const list = (terminals ?? []) as { id: string; code: string; name: string; outlet_id: string }[];
    return (
      <Shell title="Perangkat ini kasir yang mana?">
        <Notice error={error} ok={ok} />
        <p className="mb-6 text-on-surface-variant">Pilih sekali saja. Perangkat ini akan mengingatnya.</p>
        {list.length === 0 ? (
          <EmptyState icon={<MonitorSmartphone className="size-6" />} title="Belum ada terminal">
            Tambahkan terminal di halaman outlet dulu. <Link href="/app/outlets" className="font-bold text-primary underline">Buka outlet</Link>
          </EmptyState>
        ) : (
          <div className="grid gap-6">
            {((outlets ?? []) as { id: string; code: string; name: string }[]).map((o) => {
              const own = list.filter((t) => t.outlet_id === o.id);
              if (own.length === 0) return null;
              return (
                <section key={o.id}>
                  <h2 className="mb-3 flex items-center gap-2 text-lg font-bold"><Store className="size-5 text-primary" aria-hidden />{o.name}</h2>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {own.map((t) => (
                      <form key={t.id} action={chooseTerminal}>
                        <input type="hidden" name="terminal_id" value={t.id} />
                        <button type="submit" className="press flex w-full items-center gap-4 rounded-(--radius-card) bg-tertiary-container p-5 text-left text-on-tertiary-container">
                          <span className="grid size-12 place-items-center rounded-2xl bg-surface-lowest/70 font-mono font-bold">{t.code}</span>
                          <span>
                            <span className="block text-lg font-extrabold">{t.name}</span>
                            <span className="text-sm opacity-85">{o.code}-{t.code}</span>
                          </span>
                        </button>
                      </form>
                    ))}
                  </div>
                </section>
              );
            })}
          </div>
        )}
      </Shell>
    );
  }

  const shift = await loadOpenShift(ctx, pos.terminal.id);
  if (!shift) {
    return (
      <Shell title="Buka shift" subtitle={`${pos.outlet.name} · ${pos.terminal.name}`}>
        <Notice error={error} ok={ok} />
        <Card className="max-w-md">
          <form action={openShift} className="grid gap-4">
            <Field label="Modal awal di laci" name="opening_float" prefix="Rp" inputMode="numeric" defaultValue="0" required hint="Uang tunai di laci sebelum jualan dimulai." />
            <Submit className="w-full">Buka shift</Submit>
          </form>
        </Card>
        <form action={forgetTerminal} className="mt-4">
          <button type="submit" className="text-sm font-bold text-primary underline">Ganti terminal</button>
        </form>
      </Shell>
    );
  }

  const catalog = await loadCatalog(ctx, pos.outlet.id);
  const openedAt = new Intl.DateTimeFormat("id-ID", { hour: "2-digit", minute: "2-digit", timeZone: pos.outlet.timezone }).format(new Date(shift.opened_at));

  return (
    <div className="flex h-dvh flex-col">
      <header className="flex items-center gap-3 border-b border-outline-variant/60 bg-surface-low px-3 py-2 sm:px-5">
        <Link href="/app" aria-label="Kembali ke beranda" className="press grid size-11 place-items-center rounded-full hover:bg-surface-container">
          <ArrowLeft className="size-5" aria-hidden />
        </Link>
        <div className="min-w-0 flex-1">
          <p className="truncate font-display text-lg font-extrabold">{pos.outlet.name}</p>
          <p className="truncate text-xs text-on-surface-variant">{pos.terminal.name} · {ctx.displayName} · shift sejak {openedAt} · modal {rupiah(shift.opening_float)}</p>
        </div>
        <Link href="/app/transaksi" className="press hidden rounded-full px-4 py-2 text-sm font-bold text-primary hover:bg-primary/8 sm:block">Riwayat</Link>
        <Link href="/kasir/shift" className="press rounded-full border border-outline px-4 py-2 text-sm font-bold text-primary hover:bg-primary/8">Shift</Link>
      </header>
      <PosScreen
        terminalId={pos.terminal.id}
        catalog={catalog}
        outlet={pos.outlet}
        discountCap={ctx.role === "cashier" ? pos.outlet.max_cashier_discount_pct : null}
        initialMessage={error ? undefined : ok}
      />
    </div>
  );
}

function Shell({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-8">
      <Link href="/app" className="mb-6 inline-flex items-center gap-2 text-sm font-bold text-primary"><ArrowLeft className="size-4" aria-hidden />Beranda</Link>
      <h1 className="text-[1.9rem] leading-[1.05] sm:text-4xl font-extrabold tracking-tight">{title}</h1>
      {subtitle && <p className="mt-1 mb-6 text-on-surface-variant">{subtitle}</p>}
      <div className={subtitle ? "" : "mt-4"}>{children}</div>
    </main>
  );
}
