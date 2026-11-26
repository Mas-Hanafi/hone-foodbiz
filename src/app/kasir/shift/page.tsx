import { ArrowLeft, CircleCheck, TriangleAlert } from "lucide-react";
import { Submit } from "@/components/submit-button";
import { ButtonLink, Card, Field, Notice, SelectField, flash } from "@/components/ui";
import { rupiah } from "@/lib/format";
import { loadOpenShift, loadTerminal, terminalFromCookie } from "@/lib/pos-data";
import { getContext } from "@/lib/session";
import { closeShift, moveCash } from "../actions";

export const metadata = { title: "Tutup shift" };

type ClosedShift = { opening_float: string; counted_cash: string; expected_cash: string; opened_at: string; closed_at: string };

export default async function ShiftPage({ searchParams }: PageProps<"/kasir/shift">) {
  const ctx = await getContext();
  const sp = await searchParams;
  const { error, ok } = await flash(searchParams);
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
  const { data: moveRows } = await ctx.supabase
    .from("cash_movements")
    .select("id, direction, amount, reason, created_at")
    .eq("shift_id", shift.id)
    .order("created_at");
  const moves = (moveRows ?? []) as { id: string; direction: "in" | "out"; amount: string; reason: string; created_at: string }[];
  const movedNet = moves.reduce((sum, m) => sum + (m.direction === "in" ? 1 : -1) * Number(m.amount), 0);
  const { data: refundRows } = await ctx.supabase
    .from("refunds")
    .select("amount")
    .eq("shift_id", shift.id)
    .eq("kind", "refund")
    .eq("method", "cash");
  const cashRefunds = ((refundRows ?? []) as { amount: string }[]).reduce((sum, r) => sum + Number(r.amount), 0);
  const { data: expenseRows } = await ctx.supabase.from("expenses").select("amount").eq("shift_id", shift.id);
  const drawerExpenses = ((expenseRows ?? []) as { amount: string }[]).reduce((sum, e) => sum + Number(e.amount), 0);
  const hhmm = (iso: string) => new Intl.DateTimeFormat("id-ID", { timeStyle: "short", timeZone: pos.outlet.timezone }).format(new Date(iso));

  return (
    <Page>
      <h1 className="text-[1.9rem] leading-[1.05] sm:text-4xl font-extrabold tracking-tight">Tutup shift</h1>
      <p className="mt-1 mb-6 text-on-surface-variant">{pos.outlet.name} · {pos.terminal.name}</p>
      <Notice error={error} ok={ok} />
      <div className="grid gap-5 md:grid-cols-2">
        <Card tone="secondary">
          <dl className="num grid gap-2">
            <Pair label="Transaksi" value={String(live.length)} />
            <Pair label="Omzet" value={rupiah(revenue)} />
            <Pair label="Modal awal" value={rupiah(shift.opening_float)} />
            <Pair label="Tunai dari penjualan" value={rupiah(cashIn)} />
            <Pair label="Refund tunai" value={rupiah(-cashRefunds)} />
            <Pair label="Kas masuk/keluar" value={rupiah(movedNet)} />
            <Pair label="Pengeluaran dari laci" value={rupiah(-drawerExpenses)} />
          </dl>
          <p className="mt-4 text-sm opacity-85">Angka &quot;seharusnya di laci&quot; dihitung server saat shift ditutup, termasuk refund, kas keluar, dan pengeluaran dari laci.</p>
        </Card>
        <Card>
          <form action={closeShift} className="grid gap-4">
            <input type="hidden" name="shift_id" value={shift.id} />
            <Field label="Uang tunai yang dihitung di laci" name="counted" prefix="Rp" inputMode="numeric" required autoFocus />
            <Submit className="w-full">Tutup shift</Submit>
          </form>
        </Card>
      </div>

      <Card title="Kas masuk dan keluar" className="mt-5">
        <p className="mb-4 text-sm text-on-surface-variant">Uang tunai yang masuk atau keluar laci di luar penjualan, mis. beli es batu atau tambah uang kecil.</p>
        {moves.length > 0 && (
          <ul className="mb-5 grid">
            {moves.map((m) => (
              <li key={m.id} className="flex min-h-12 items-center gap-3 border-b border-outline-variant/60 last:border-0">
                <span className="num w-12 text-sm text-on-surface-variant">{hhmm(m.created_at)}</span>
                <span className="flex-1 font-bold">{m.reason}</span>
                <span className={`num font-extrabold ${m.direction === "out" ? "text-error" : "text-tertiary"}`}>
                  {rupiah((m.direction === "in" ? 1 : -1) * Number(m.amount))}
                </span>
              </li>
            ))}
          </ul>
        )}
        <form action={moveCash} className="grid gap-3 sm:grid-cols-[9rem_10rem_1fr_auto] sm:items-end">
          <SelectField label="Jenis" name="direction" defaultValue="out">
            <option value="out">Kas keluar</option>
            <option value="in">Kas masuk</option>
          </SelectField>
          <Field label="Jumlah" name="amount" prefix="Rp" inputMode="numeric" required />
          <Field label="Alasan" name="reason" placeholder="Beli es batu" required />
          <Submit look="outlined">Catat</Submit>
        </form>
      </Card>
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
