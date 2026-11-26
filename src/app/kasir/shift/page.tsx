import { ArrowLeft, CircleCheck, TriangleAlert } from "lucide-react";
import { Submit } from "@/components/submit-button";
import { ButtonLink, Card, Field, Notice, flash } from "@/components/ui";
import { rupiah } from "@/lib/format";
import { loadOpenShift, loadTerminal, terminalFromCookie } from "@/lib/pos-data";
import { getContext } from "@/lib/session";
import { closeShift } from "../actions";

export const metadata = { title: "Tutup shift" };

type ClosedShift = { opening_float: string; counted_cash: string; expected_cash: string; opened_at: string; closed_at: string };

export default async function ShiftPage({ searchParams }: PageProps<"/kasir/shift">) {
  const ctx = await getContext();
  const sp = await searchParams;
  const { error } = await flash(searchParams);
  const closedId = typeof sp.tutup === "string" ? sp.tutup : null;

  if (closedId) {
    const { data } = await ctx.supabase.from("shifts").select("opening_float, counted_cash, expected_cash, opened_at, closed_at").eq("id", closedId).maybeSingle();
    const s = data as ClosedShift | null;
    if (s?.closed_at) {
      const diff = Number(s.counted_cash) - Number(s.expected_cash);
      return (
        <Page>
          <section className={`grid gap-4 rounded-(--radius-card) p-6 ${diff < 0 ? "bg-error-container text-on-error-container" : "bg-tertiary-container text-on-tertiary-container"}`}>
            {diff < 0 ? <TriangleAlert className="size-10" aria-hidden /> : <CircleCheck className="size-10" aria-hidden />}
            <h1 className="text-3xl font-extrabold">{diff < 0 ? "Shift ditutup, kas kurang" : "Shift ditutup"}</h1>
            <dl className="num grid gap-2 text-lg">
              <Pair label="Seharusnya di laci" value={rupiah(s.expected_cash)} />
              <Pair label="Dihitung" value={rupiah(s.counted_cash)} />
              <Pair label={diff === 0 ? "Selisih" : diff > 0 ? "Lebih" : "Kurang"} value={rupiah(Math.abs(diff))} strong />
            </dl>
          </section>
          <div className="mt-5 flex flex-wrap gap-2">
            <ButtonLink href="/kasir">Buka shift baru</ButtonLink>
            <ButtonLink href="/app" look="outlined">Ke beranda</ButtonLink>
          </div>
        </Page>
      );
    }
  }

  const terminalId = await terminalFromCookie();
  const pos = terminalId ? await loadTerminal(ctx, terminalId) : null;
  const shift = pos ? await loadOpenShift(ctx, pos.terminal.id) : null;
  if (!pos || !shift) {
    return (
      <Page>
        <h1 className="text-3xl font-extrabold">Tidak ada shift terbuka</h1>
        <ButtonLink href="/kasir" className="mt-5">Ke kasir</ButtonLink>
      </Page>
    );
  }

  const { data: sales } = await ctx.supabase.from("sales_with_status").select("id, total, status").eq("shift_id", shift.id);
  const live = ((sales ?? []) as { id: string; total: string; status: string }[]).filter((s) => s.status !== "voided");
  const { data: cash } = live.length
    ? await ctx.supabase.from("payments").select("amount").eq("method", "cash").in("sale_id", live.map((s) => s.id))
    : { data: [] };
  const cashIn = ((cash ?? []) as { amount: string }[]).reduce((sum, p) => sum + Number(p.amount), 0);
  const revenue = live.reduce((sum, s) => sum + Number(s.total), 0);

  return (
    <Page>
      <h1 className="text-[1.9rem] leading-[1.05] sm:text-4xl font-extrabold tracking-tight">Tutup shift</h1>
      <p className="mt-1 mb-6 text-on-surface-variant">{pos.outlet.name} · {pos.terminal.name}</p>
      <Notice error={error} />
      <div className="grid gap-5 md:grid-cols-2">
        <Card tone="secondary">
          <dl className="num grid gap-2">
            <Pair label="Transaksi" value={String(live.length)} />
            <Pair label="Omzet" value={rupiah(revenue)} />
            <Pair label="Modal awal" value={rupiah(shift.opening_float)} />
            <Pair label="Tunai masuk" value={rupiah(cashIn)} />
          </dl>
          <p className="mt-4 text-sm opacity-85">Angka &quot;seharusnya di laci&quot; dihitung server saat shift ditutup, termasuk refund dan kas keluar.</p>
        </Card>
        <Card>
          <form action={closeShift} className="grid gap-4">
            <input type="hidden" name="shift_id" value={shift.id} />
            <Field label="Uang tunai yang dihitung di laci" name="counted" prefix="Rp" inputMode="numeric" required autoFocus />
            <Submit className="w-full">Tutup shift</Submit>
          </form>
        </Card>
      </div>
    </Page>
  );
}

function Page({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-8">
      <ButtonLink href="/kasir" look="text" className="-ml-3 mb-4"><ArrowLeft className="size-4" aria-hidden />Kasir</ButtonLink>
      {children}
    </main>
  );
}

function Pair({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className={`flex justify-between gap-4 ${strong ? "border-t border-current/20 pt-2 font-extrabold" : ""}`}>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}
