"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CloudOff, LoaderCircle, Minus, PauseCircle, Plus, Search, ShoppingBag, Trash2, X } from "lucide-react";
import { buttonClass } from "@/components/ui";
import { rupiah } from "@/lib/format";
import { computeTotals, suggestTendered, type Method } from "@/lib/pos-math";
import type { PosCatalog, PosOutlet, PosProduct } from "@/lib/pos-data";
import { messageText } from "@/lib/messages";
import { flushQueue, readQueue, writeQueue, type QueuedSale, type SendOutcome } from "@/lib/sale-queue";
import { recordSale, type SaleInput } from "./actions";

const SYNC_EVERY_MS = 30_000;

async function sendSale(input: SaleInput): Promise<SendOutcome> {
  try {
    const result = await recordSale(input);
    return result.ok ? { ok: true } : { ok: false, message: result.message };
  } catch {
    return "offline"; // the request never got an answer
  }
}

type Line = {
  key: string;
  productId: string;
  variantId: string | null;
  modifierIds: string[];
  name: string;
  detail: string;
  unitPrice: number;
  qty: number;
};

const TONES = [
  "bg-primary-container text-on-primary-container",
  "bg-tertiary-container text-on-tertiary-container",
  "bg-secondary-container text-on-secondary-container",
];
const METHODS: { id: Method; label: string }[] = [
  { id: "cash", label: "Tunai" },
  { id: "qris", label: "QRIS" },
  { id: "transfer", label: "Transfer" },
];

const lineKey = (productId: string, variantId: string | null, modifierIds: string[]) =>
  [productId, variantId ?? "", [...modifierIds].sort().join(",")].join("|");

export function PosScreen({ terminalId, catalog, outlet, discountCap, initialMessage }: {
  terminalId: string; catalog: PosCatalog; outlet: PosOutlet; discountCap: number | null; initialMessage?: string;
}) {
  const router = useRouter();
  const [lines, setLines] = useState<Line[]>([]);
  const [category, setCategory] = useState<string>("");
  const [query, setQuery] = useState("");
  const [orderType, setOrderType] = useState<"takeaway" | "dine_in">("takeaway");
  const [discountPct, setDiscountPct] = useState(0);
  const [picking, setPicking] = useState<PosProduct | null>(null);
  const [method, setMethod] = useState<Method>("cash");
  const [tendered, setTendered] = useState(0);
  const [split, setSplit] = useState(false);
  const [splitRows, setSplitRows] = useState<{ method: Method; amount: number }[]>([]);
  const [tableLabel, setTableLabel] = useState("");
  const [held, setHeld] = useState<HeldOrder[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const optionsRef = useRef<HTMLDialogElement>(null);
  const cartRef = useRef<HTMLDialogElement>(null);
  const payRef = useRef<HTMLDialogElement>(null);
  const heldRef = useRef<HTMLDialogElement>(null);
  const saleId = useRef<string>(crypto.randomUUID());
  const heldKey = `pos-held:${outlet.id}`;
  const queueRef = useRef<HTMLDialogElement>(null);
  const [queue, setQueue] = useState<QueuedSale<SaleInput>[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const pendingRef = useRef<QueuedSale<SaleInput>[]>([]);
  const syncingRef = useRef(false);

  const storeQueue = useCallback((next: QueuedSale<SaleInput>[]) => {
    pendingRef.current = next;
    setQueue(next);
    return writeQueue(terminalId, next);
  }, [terminalId]);

  const sync = useCallback(async () => {
    if (syncingRef.current || !pendingRef.current.some((q) => !q.error)) return;
    syncingRef.current = true;
    setSyncing(true);
    const snapshot = pendingRef.current;
    const { queue: rest, sent } = await flushQueue(snapshot, sendSale);
    // Sales queued while this run was busy are kept after the ones it already handled.
    const added = pendingRef.current.filter((q) => !snapshot.some((s) => s.input.id === q.input.id));
    storeQueue([...rest, ...added]);
    syncingRef.current = false;
    setSyncing(false);
    if (sent) setNotice(`${sent} transaksi offline sudah terkirim.`);
  }, [storeQueue]);

  useEffect(() => {
    pendingRef.current = readQueue<SaleInput>(terminalId);
    setQueue(pendingRef.current);
    void sync();
    const onOnline = () => void sync();
    window.addEventListener("online", onOnline);
    const timer = setInterval(() => void sync(), SYNC_EVERY_MS);
    return () => {
      window.removeEventListener("online", onOnline);
      clearInterval(timer);
    };
  }, [terminalId, sync]);

  // ponytail: held orders live on this device only (localStorage); a shared table board needs a server table.
  useEffect(() => {
    try {
      setHeld(JSON.parse(localStorage.getItem(heldKey) ?? "[]") as HeldOrder[]);
    } catch {
      setHeld([]);
    }
  }, [heldKey]);

  function storeHeld(next: HeldOrder[]) {
    setHeld(next);
    try {
      localStorage.setItem(heldKey, JSON.stringify(next));
    } catch {
      // Storage full or blocked: the list still works for this session.
    }
  }

  function resetCart() {
    setLines([]);
    setDiscountPct(0);
    setTableLabel("");
    setOrderType("takeaway");
  }

  function holdOrder() {
    const time = new Intl.DateTimeFormat("id-ID", { timeStyle: "short" }).format(new Date());
    storeHeld([
      ...held,
      { id: crypto.randomUUID(), label: tableLabel.trim() || `Pesanan ${time}`, tableLabel, orderType, discountPct, lines, savedAt: Date.now() },
    ]);
    resetCart();
    cartRef.current?.close();
  }

  function resumeOrder(order: HeldOrder) {
    setLines(order.lines);
    setDiscountPct(order.discountPct);
    setTableLabel(order.tableLabel);
    setOrderType(order.orderType);
    storeHeld(held.filter((h) => h.id !== order.id));
    heldRef.current?.close();
  }

  const toneOf = useMemo(() => new Map(catalog.categories.map((c, i) => [c.id, TONES[i % TONES.length]])), [catalog.categories]);
  const qtyOf = (productId: string) => lines.filter((l) => l.productId === productId).reduce((s, l) => s + l.qty, 0);
  const shown = catalog.products.filter(
    (p) => (!category || p.categoryId === category) && p.name.toLowerCase().includes(query.trim().toLowerCase()),
  );

  const totalsFor = (m: Method) =>
    computeTotals({
      lines: lines.map((l) => ({ unitPrice: l.unitPrice, qty: l.qty })),
      discountPct,
      serviceRate: outlet.service_rate, taxRate: outlet.tax_rate, taxInclusive: outlet.tax_inclusive, cashRounding: outlet.cash_rounding,
      method: m,
    });
  const preview = totalsFor("transfer"); // before cash rounding
  const due = split ? preview : totalsFor(method);
  const itemCount = lines.reduce((s, l) => s + l.qty, 0);
  const change = !split && method === "cash" ? tendered - due.total : 0;
  const splitLeft = due.total - splitRows.reduce((s, r) => s + r.amount, 0);
  const canPay = split ? splitLeft === 0 && splitRows.every((r) => r.amount > 0) : method !== "cash" || change >= 0;

  function add(product: PosProduct, variantId: string | null = null, modifierIds: string[] = [], qty = 1) {
    const variant = product.variants.find((v) => v.id === variantId);
    const mods = product.modifiers.filter((m) => modifierIds.includes(m.id));
    const key = lineKey(product.id, variantId, modifierIds);
    setLines((prev) => {
      const found = prev.find((l) => l.key === key);
      if (found) return prev.map((l) => (l.key === key ? { ...l, qty: l.qty + qty } : l));
      return [
        ...prev,
        {
          key, productId: product.id, variantId, modifierIds, qty,
          name: product.name,
          detail: [variant?.name, ...mods.map((m) => m.name)].filter(Boolean).join(", "),
          unitPrice: (variant?.price ?? product.price) + mods.reduce((s, m) => s + m.price, 0),
        },
      ];
    });
  }

  function tap(product: PosProduct) {
    if (product.variants.length === 0 && product.modifiers.length === 0) return add(product);
    setPicking(product);
    optionsRef.current?.showModal();
  }

  const setQty = (key: string, qty: number) =>
    setLines((prev) => (qty <= 0 ? prev.filter((l) => l.key !== key) : prev.map((l) => (l.key === key ? { ...l, qty } : l))));

  function openPay() {
    cartRef.current?.close();
    setError(null);
    setMethod("cash");
    setSplit(false);
    setTendered(totalsFor("cash").total);
    payRef.current?.showModal();
  }

  function startSplit() {
    setSplit(true);
    setSplitRows([{ method: "cash", amount: 0 }, { method: "qris", amount: preview.total }]);
  }

  function pay() {
    setError(null);
    const payments = split
      ? splitRows.map((r) => ({ method: r.method, amount: r.amount, tendered: r.amount }))
      : [{ method, amount: due.total, tendered: method === "cash" ? tendered : due.total }];
    const input: SaleInput = {
      id: saleId.current,
      orderType,
      tableLabel: tableLabel.trim() || undefined,
      payments,
      discountPct,
      createdAt: new Date().toISOString(),
      lines: lines.map((l) => ({ productId: l.productId, variantId: l.variantId, modifierIds: l.modifierIds, qty: l.qty })),
    };
    const changeDue = change;
    const totalDue = due.total;
    startTransition(async () => {
      const outcome = await sendSale(input);
      if (outcome === "offline") {
        // No answer from the server: keep the sale on this device and finish it here.
        const saved = storeQueue([...pendingRef.current, { input, total: totalDue, queuedAt: Date.now() }]);
        if (!saved) return setError("Tidak ada koneksi dan memori perangkat penuh. Transaksi belum tersimpan.");
        saleId.current = crypto.randomUUID();
        resetCart();
        payRef.current?.close();
        setNotice(`Offline: ${rupiah(totalDue)} disimpan di perangkat dan dikirim otomatis saat online.${changeDue > 0 ? ` Kembalian ${rupiah(changeDue)}.` : ""}`);
        return;
      }
      if (!outcome.ok) return setError(outcome.message);
      router.push(`/kasir/struk/${input.id}?baru=1`);
    });
  }

  const cart = (
    <CartPanel
      lines={lines}
      orderType={orderType}
      setOrderType={setOrderType}
      setQty={setQty}
      clear={resetCart}
      tableLabel={tableLabel}
      setTableLabel={setTableLabel}
      onHold={holdOrder}
      discountPct={discountPct}
      setDiscountPct={setDiscountPct}
      discountCap={discountCap}
      totals={preview}
      outlet={outlet}
      onPay={openPay}
    />
  );

  return (
    <div className="grid min-h-0 flex-1 lg:grid-cols-[1fr_24rem]">
      <section className="flex min-h-0 flex-col">
        <div className="grid gap-3 px-3 pt-3 sm:px-5 sm:pt-4">
          {notice && (
            <p role="status" className="rounded-2xl bg-tertiary-container px-4 py-3 text-sm font-semibold text-on-tertiary-container">{notice}</p>
          )}
          {!notice && initialMessage && messageText(initialMessage) && (
            <p role="status" className="rounded-2xl bg-tertiary-container px-4 py-3 text-sm font-semibold text-on-tertiary-container">{messageText(initialMessage)}</p>
          )}
          <label className="relative block">
            <span className="sr-only">Cari menu</span>
            <Search className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-on-surface-variant" aria-hidden />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Cari menu…"
              className="min-h-12 w-full rounded-full border border-outline bg-surface-lowest pr-4 pl-12 text-base focus:border-primary focus:ring-2 focus:ring-primary/30 focus:outline-none"
            />
          </label>
          <nav aria-label="Kategori" className="flex gap-2 overflow-x-auto pb-1">
            {queue.length > 0 && (
              <button
                type="button"
                onClick={() => queueRef.current?.showModal()}
                className={`press flex min-h-10 shrink-0 items-center gap-2 rounded-xl px-4 text-sm font-bold ${queue.some((q) => q.error) ? "bg-error-container text-on-error-container" : "bg-secondary-container text-on-secondary-container"}`}
              >
                {syncing ? <LoaderCircle className="size-4 animate-spin" aria-hidden /> : <CloudOff className="size-4" aria-hidden />}
                Belum terkirim <span className="num">{queue.length}</span>
              </button>
            )}
            {held.length > 0 && (
              <button
                type="button"
                onClick={() => heldRef.current?.showModal()}
                className="press flex min-h-10 shrink-0 items-center gap-2 rounded-xl bg-tertiary-container px-4 text-sm font-bold text-on-tertiary-container"
              >
                <PauseCircle className="size-4" aria-hidden />Tersimpan <span className="num">{held.length}</span>
              </button>
            )}
            <Chip active={!category} onClick={() => setCategory("")}>Semua</Chip>
            {catalog.categories.map((c) => (
              <Chip key={c.id} active={category === c.id} onClick={() => setCategory(c.id)}>{c.name}</Chip>
            ))}
          </nav>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-3 pt-2 pb-28 sm:px-5 lg:pb-6">
          {shown.length === 0 ? (
            <p className="py-16 text-center text-on-surface-variant">
              {catalog.products.length === 0 ? "Belum ada menu aktif. Tambahkan di Katalog." : "Tidak ada menu yang cocok."}
            </p>
          ) : (
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
              {shown.map((p) => {
                const qty = qtyOf(p.id);
                const tone = p.categoryId ? toneOf.get(p.categoryId) : "bg-surface-high text-on-surface-variant";
                const hasOptions = p.variants.length > 0 || p.modifiers.length > 0;
                return (
                  <li key={p.id}>
                    <button
                      type="button"
                      onClick={() => tap(p)}
                      className={`press relative grid w-full gap-3 rounded-(--radius-card) bg-surface-lowest p-3 text-left shadow-card ${qty ? "ring-2 ring-primary" : ""}`}
                    >
                      <span aria-hidden className={`grid aspect-[4/3] place-items-center rounded-2xl font-display text-4xl font-extrabold ${tone}`}>
                        {p.name.charAt(0).toUpperCase()}
                      </span>
                      <span>
                        <span className="line-clamp-2 font-bold leading-snug">{p.name}</span>
                        <span className="num mt-0.5 flex items-center justify-between text-sm text-on-surface-variant">
                          {rupiah(p.price)}
                          {hasOptions && <span className="text-xs font-bold text-primary">Pilihan</span>}
                        </span>
                      </span>
                      {qty > 0 && (
                        <span className="num absolute top-2 right-2 grid min-w-7 place-items-center rounded-full bg-primary px-2 py-0.5 text-sm font-extrabold text-on-primary" aria-label={`${qty} di keranjang`}>
                          {qty}
                        </span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </section>

      <aside className="hidden min-h-0 border-l border-outline-variant/60 bg-surface-low lg:flex lg:flex-col">{cart}</aside>

      {/* Phone and tablet: sticky cart bar */}
      <div className="fixed inset-x-0 bottom-0 z-20 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] lg:hidden">
        <button
          type="button"
          disabled={lines.length === 0}
          onClick={() => cartRef.current?.showModal()}
          className="press flex min-h-14 w-full items-center gap-3 rounded-2xl bg-primary px-5 text-on-primary shadow-raised disabled:bg-surface-high disabled:text-on-surface-variant disabled:shadow-none"
        >
          <ShoppingBag className="size-5" aria-hidden />
          <span className="flex-1 text-left font-bold">{lines.length ? `${itemCount} item` : "Keranjang kosong"}</span>
          {lines.length > 0 && <span className="num font-extrabold">{rupiah(preview.total)}</span>}
        </button>
      </div>

      <Sheet refObj={cartRef} label="Keranjang">{cart}</Sheet>

      <Sheet refObj={optionsRef} label={picking?.name ?? "Pilihan menu"}>
        {picking && (
          <OptionsForm
            key={picking.id}
            product={picking}
            onCancel={() => optionsRef.current?.close()}
            onAdd={(variantId, modifierIds, qty) => {
              add(picking, variantId, modifierIds, qty);
              optionsRef.current?.close();
            }}
          />
        )}
      </Sheet>

      <Sheet refObj={payRef} label="Pembayaran">
        <div className="grid gap-5 p-5 sm:p-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-bold text-on-surface-variant">Total bayar</p>
              <p className="num font-display text-5xl font-extrabold">{rupiah(due.total)}</p>
              {due.rounding !== 0 && <p className="num text-sm text-on-surface-variant">Termasuk pembulatan {rupiah(due.rounding)}</p>}
            </div>
            <CloseButton onClick={() => payRef.current?.close()} />
          </div>

          {split ? (
            <div className="grid gap-3">
              {splitRows.map((row, i) => (
                <div key={i} className="grid grid-cols-[8.5rem_1fr_auto] items-center gap-2">
                  <select
                    aria-label={`Metode ${i + 1}`}
                    value={row.method}
                    onChange={(e) => setSplitRows((rows) => rows.map((r, j) => (j === i ? { ...r, method: e.target.value as Method } : r)))}
                    className="min-h-12 rounded-(--radius-field) border border-outline bg-surface-lowest px-3 font-bold"
                  >
                    {METHODS.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
                  </select>
                  <span className="relative block">
                    <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center font-bold text-on-surface-variant">Rp</span>
                    <input
                      aria-label={`Jumlah ${i + 1}`}
                      inputMode="numeric"
                      value={row.amount ? new Intl.NumberFormat("id-ID").format(row.amount) : ""}
                      onChange={(e) => {
                        const amount = Number(e.target.value.replace(/\D/g, "")) || 0;
                        setSplitRows((rows) => {
                          const next = rows.map((r, j) => (j === i ? { ...r, amount } : r));
                          const last = next.length - 1;
                          if (i === last) return next;
                          // Editing an earlier row: the last row takes whatever is left.
                          const others = next.reduce((s, r, j) => (j === last ? s : s + r.amount), 0);
                          return next.map((r, j) => (j === last ? { ...r, amount: Math.max(due.total - others, 0) } : r));
                        });
                      }}
                      className="num min-h-12 w-full rounded-(--radius-field) border border-outline bg-surface-lowest pr-3 pl-10 text-lg font-bold focus:border-primary focus:outline-none"
                    />
                  </span>
                  <button
                    type="button"
                    aria-label={`Hapus pembayaran ${i + 1}`}
                    disabled={splitRows.length <= 2}
                    onClick={() => setSplitRows((rows) => rows.filter((_, j) => j !== i))}
                    className="press grid size-11 place-items-center rounded-full hover:bg-surface-container disabled:opacity-30"
                  >
                    <X className="size-4" aria-hidden />
                  </button>
                </div>
              ))}
              <div className="flex flex-wrap items-center justify-between gap-2">
                {splitRows.length < 3 && (
                  <button type="button" onClick={() => setSplitRows((rows) => [...rows, { method: "transfer", amount: Math.max(splitLeft, 0) }])} className="press min-h-10 rounded-full px-3 text-sm font-bold text-primary hover:bg-primary/8">
                    + Metode lain
                  </button>
                )}
                <p className={`num ml-auto rounded-xl px-3 py-2 text-sm font-extrabold ${splitLeft === 0 ? "bg-tertiary-container text-on-tertiary-container" : "bg-error-container text-on-error-container"}`}>
                  {splitLeft === 0 ? "Pas" : splitLeft > 0 ? `Sisa ${rupiah(splitLeft)}` : `Lebih ${rupiah(-splitLeft)}`}
                </p>
              </div>
              <p className="text-xs text-on-surface-variant">Bagian tunai dibayar pas; pembulatan tunai tidak berlaku saat dibagi.</p>
              <button type="button" onClick={() => setSplit(false)} className="press justify-self-start text-sm font-bold text-primary underline">Bayar dengan satu metode</button>
            </div>
          ) : (
          <>
          <div role="radiogroup" aria-label="Metode bayar" className="grid grid-cols-3 gap-1 rounded-full bg-surface-container p-1">
            {METHODS.map((m) => (
              <button
                key={m.id}
                type="button"
                role="radio"
                aria-checked={method === m.id}
                onClick={() => { setMethod(m.id); setTendered(totalsFor(m.id).total); }}
                className={`press min-h-11 rounded-full text-sm font-bold ${method === m.id ? "bg-secondary-container text-on-secondary-container shadow-card" : "text-on-surface-variant"}`}
              >
                {m.label}
              </button>
            ))}
          </div>

          {method === "cash" ? (
            <div className="grid gap-3">
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {suggestTendered(due.total).map((v, i) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setTendered(v)}
                    className={`press num min-h-12 rounded-2xl border text-sm font-bold ${tendered === v ? "border-transparent bg-secondary-container text-on-secondary-container" : "border-outline"}`}
                  >
                    {i === 0 ? "Uang pas" : rupiah(v)}
                  </button>
                ))}
              </div>
              <label className="grid gap-1.5 text-sm">
                <span className="font-bold">Uang diterima</span>
                <span className="relative block">
                  <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center font-bold text-on-surface-variant">Rp</span>
                  <input
                    inputMode="numeric"
                    value={tendered ? new Intl.NumberFormat("id-ID").format(tendered) : ""}
                    onChange={(e) => setTendered(Number(e.target.value.replace(/\D/g, "")) || 0)}
                    className="num min-h-12 w-full rounded-(--radius-field) border border-outline bg-surface-lowest pr-4 pl-11 text-lg font-bold focus:border-primary focus:ring-2 focus:ring-primary/30 focus:outline-none"
                  />
                </span>
              </label>
              <p className={`num flex items-center justify-between rounded-2xl px-4 py-3 text-lg font-extrabold ${change >= 0 ? "bg-tertiary-container text-on-tertiary-container" : "bg-error-container text-on-error-container"}`}>
                <span>{change >= 0 ? "Kembalian" : "Kurang"}</span>
                <span>{rupiah(Math.abs(change))}</span>
              </p>
            </div>
          ) : (
            <p className="rounded-2xl bg-surface-container px-4 py-3 text-sm text-on-surface-variant">
              Pastikan dana {method === "qris" ? "QRIS" : "transfer"} sudah masuk sebelum menekan Selesai. Pencatatan masih manual.
            </p>
          )}
          <button type="button" onClick={startSplit} className="press justify-self-start text-sm font-bold text-primary underline">Bagi pembayaran (mis. tunai + QRIS)</button>
          </>
          )}

          {error && <p role="alert" className="rounded-2xl bg-error-container px-4 py-3 text-sm font-semibold text-on-error-container">{error}</p>}

          <button
            type="button"
            onClick={pay}
            disabled={pending || !canPay}
            className={buttonClass("filled", "min-h-14 w-full text-lg")}
          >
            {pending && <LoaderCircle className="size-5 animate-spin" aria-hidden />}
            Selesai
          </button>
        </div>
      </Sheet>

      <Sheet refObj={queueRef} label="Transaksi belum terkirim">
        <div className="grid gap-4 p-5 sm:p-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-2xl font-extrabold">Belum terkirim</h2>
              <p className="text-sm text-on-surface-variant">Sudah dibayar dan tersimpan di perangkat ini. Dikirim otomatis saat koneksi kembali; jangan hapus data browser.</p>
            </div>
            <CloseButton onClick={() => queueRef.current?.close()} />
          </div>
          <ul className="grid">
            {queue.map((q) => (
              <li key={q.input.id} className="flex min-h-16 items-center gap-3 border-b border-outline-variant/60 last:border-0">
                <span className="min-w-0 flex-1">
                  <span className="num block font-bold">{rupiah(q.total)} · {new Intl.DateTimeFormat("id-ID", { timeStyle: "short" }).format(new Date(q.queuedAt))}</span>
                  <span className={`block text-sm ${q.error ? "text-error" : "text-on-surface-variant"}`}>{q.error ?? "Menunggu koneksi"}</span>
                </span>
                {q.error && (
                  <button
                    type="button"
                    onClick={() => { if (confirm("Hapus transaksi ini dari antrean? Catat manual bila uang sudah diterima.")) storeQueue(queue.filter((x) => x.input.id !== q.input.id)); }}
                    className={buttonClass("outlined", "min-h-11 px-4")}
                  >
                    Hapus
                  </button>
                )}
              </li>
            ))}
          </ul>
          <button type="button" disabled={syncing} onClick={() => void sync()} className={buttonClass("tonal", "w-full")}>
            {syncing ? "Mengirim..." : "Kirim sekarang"}
          </button>
        </div>
      </Sheet>

      <Sheet refObj={heldRef} label="Pesanan tersimpan">
        <div className="grid gap-4 p-5 sm:p-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-2xl font-extrabold">Pesanan tersimpan</h2>
              <p className="text-sm text-on-surface-variant">Hanya di perangkat ini. Lanjutkan untuk membayar.</p>
            </div>
            <CloseButton onClick={() => heldRef.current?.close()} />
          </div>
          {lines.length > 0 && (
            <p className="rounded-2xl bg-secondary-container px-4 py-3 text-sm text-on-secondary-container">Keranjang sedang terisi. Simpan atau kosongkan dulu sebelum melanjutkan pesanan lain.</p>
          )}
          <ul className="grid">
            {held.map((h) => {
              const count = h.lines.reduce((s, l) => s + l.qty, 0);
              const sum = h.lines.reduce((s, l) => s + l.unitPrice * l.qty, 0);
              return (
                <li key={h.id} className="flex min-h-16 items-center gap-3 border-b border-outline-variant/60 last:border-0">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-bold">{h.label}</span>
                    <span className="num block text-sm text-on-surface-variant">
                      {count} item · {rupiah(sum)} · {new Intl.DateTimeFormat("id-ID", { timeStyle: "short" }).format(new Date(h.savedAt))}
                    </span>
                  </span>
                  <button type="button" aria-label={`Hapus ${h.label}`} onClick={() => storeHeld(held.filter((x) => x.id !== h.id))} className="press grid size-11 place-items-center rounded-full text-on-surface-variant hover:bg-error-container hover:text-on-error-container">
                    <Trash2 className="size-4" aria-hidden />
                  </button>
                  <button type="button" disabled={lines.length > 0} onClick={() => resumeOrder(h)} className={buttonClass("tonal", "min-h-11 px-4")}>
                    Lanjutkan
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      </Sheet>
    </div>
  );
}

type HeldOrder = {
  id: string; label: string; tableLabel: string; orderType: "takeaway" | "dine_in"; discountPct: number; lines: Line[]; savedAt: number;
};

function CartPanel({ lines, orderType, setOrderType, setQty, clear, tableLabel, setTableLabel, onHold, discountPct, setDiscountPct, discountCap, totals, outlet, onPay }: {
  lines: Line[];
  orderType: "takeaway" | "dine_in";
  setOrderType: (t: "takeaway" | "dine_in") => void;
  setQty: (key: string, qty: number) => void;
  clear: () => void;
  tableLabel: string;
  setTableLabel: (v: string) => void;
  onHold: () => void;
  discountPct: number;
  setDiscountPct: (pct: number) => void;
  discountCap: number | null;
  totals: ReturnType<typeof computeTotals>;
  outlet: PosOutlet;
  onPay: () => void;
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex items-center gap-2 p-4">
        <div role="radiogroup" aria-label="Jenis pesanan" className="grid flex-1 grid-cols-2 gap-1 rounded-full bg-surface-container p-1">
          {([["takeaway", "Bungkus"], ["dine_in", "Makan di sini"]] as const).map(([id, label]) => (
            <button
              key={id}
              type="button"
              role="radio"
              aria-checked={orderType === id}
              onClick={() => setOrderType(id)}
              className={`press min-h-10 rounded-full text-sm font-bold ${orderType === id ? "bg-secondary-container text-on-secondary-container shadow-card" : "text-on-surface-variant"}`}
            >
              {label}
            </button>
          ))}
        </div>
        {lines.length > 0 && (
          <>
            <button type="button" onClick={onHold} aria-label="Simpan pesanan untuk nanti" title="Simpan untuk nanti" className="press grid size-11 place-items-center rounded-full text-on-surface-variant hover:bg-tertiary-container hover:text-on-tertiary-container">
              <PauseCircle className="size-5" aria-hidden />
            </button>
            <button type="button" onClick={clear} aria-label="Kosongkan keranjang" className="press grid size-11 place-items-center rounded-full text-on-surface-variant hover:bg-error-container hover:text-on-error-container">
              <Trash2 className="size-5" aria-hidden />
            </button>
          </>
        )}
      </div>
      <label className="mx-4 mb-1 block">
        <span className="sr-only">Meja atau nama pelanggan</span>
        <input
          value={tableLabel}
          onChange={(e) => setTableLabel(e.target.value)}
          maxLength={40}
          placeholder={orderType === "dine_in" ? "Meja, mis. 5" : "Nama pelanggan (opsional)"}
          className="min-h-11 w-full rounded-(--radius-field) border border-outline-variant bg-surface-lowest px-3 text-sm focus:border-primary focus:outline-none"
        />
      </label>

      <ul className="min-h-0 flex-1 overflow-y-auto px-4">
        {lines.length === 0 && <li className="py-12 text-center text-sm text-on-surface-variant">Ketuk menu untuk menambahkan.</li>}
        {lines.map((l) => (
          <li key={l.key} className="grid grid-cols-[1fr_auto] items-center gap-x-3 gap-y-1 border-b border-outline-variant/60 py-3 last:border-0">
            <span className="min-w-0">
              <span className="block truncate font-bold">{l.name}</span>
              {l.detail && <span className="block truncate text-xs text-on-surface-variant">{l.detail}</span>}
              <span className="num block text-xs text-on-surface-variant">{rupiah(l.unitPrice)}</span>
            </span>
            <span className="num text-right font-extrabold">{rupiah(l.unitPrice * l.qty)}</span>
            <span className="col-span-2 flex items-center gap-1">
              <Stepper label={`Kurangi ${l.name}`} onClick={() => setQty(l.key, l.qty - 1)}><Minus className="size-4" /></Stepper>
              <span className="num w-8 text-center font-bold">{l.qty}</span>
              <Stepper label={`Tambah ${l.name}`} onClick={() => setQty(l.key, l.qty + 1)}><Plus className="size-4" /></Stepper>
            </span>
          </li>
        ))}
      </ul>

      <div className="grid gap-1.5 border-t border-outline-variant/60 p-4 text-sm">
        <Row label="Subtotal" value={totals.subtotal} />
        {lines.length > 0 && (
          <div className="flex items-center justify-between gap-2 py-1">
            <span className="text-on-surface-variant">
              Diskon{discountCap !== null && <span className="block text-xs">maks. {discountCap}% untuk kasir</span>}
            </span>
            <span className="flex items-center gap-1">
              {[0, 5, 10].filter((p) => discountCap === null || p <= discountCap).map((p) => (
                <button
                  key={p}
                  type="button"
                  aria-pressed={discountPct === p}
                  onClick={() => setDiscountPct(p)}
                  className={`press num min-h-9 rounded-lg px-2.5 text-xs font-bold ${discountPct === p ? "bg-secondary-container text-on-secondary-container" : "border border-outline"}`}
                >
                  {p ? `${p}%` : "Tanpa"}
                </button>
              ))}
              <label className="relative">
                <span className="sr-only">Diskon persen lain</span>
                <input
                  inputMode="decimal"
                  value={[0, 5, 10].includes(discountPct) ? "" : String(discountPct)}
                  placeholder="%"
                  onChange={(e) => {
                    const v = Math.min(Number(e.target.value.replace(",", ".")) || 0, discountCap ?? 100);
                    setDiscountPct(Math.max(0, v));
                  }}
                  className="num min-h-9 w-14 rounded-lg border border-outline bg-surface-lowest px-2 text-center text-xs font-bold focus:border-primary focus:outline-none"
                />
              </label>
            </span>
          </div>
        )}
        {totals.discount > 0 && <Row label={`Potongan ${discountPct}%`} value={-totals.discount} />}
        {outlet.service_rate > 0 && <Row label={`Service ${outlet.service_rate}%`} value={totals.service} />}
        {outlet.tax_rate > 0 && <Row label={`PB1 ${outlet.tax_rate}%${outlet.tax_inclusive ? " (termasuk)" : ""}`} value={totals.tax} />}
        <p className="num mt-1 flex items-baseline justify-between font-display text-2xl font-extrabold">
          <span>Total</span>
          <span>{rupiah(totals.total)}</span>
        </p>
        <button type="button" onClick={onPay} disabled={lines.length === 0} className={buttonClass("filled", "mt-2 min-h-14 w-full text-lg")}>
          Bayar {lines.length > 0 && rupiah(totals.total)}
        </button>
      </div>
    </div>
  );
}

function OptionsForm({ product, onCancel, onAdd }: {
  product: PosProduct;
  onCancel: () => void;
  onAdd: (variantId: string | null, modifierIds: string[], qty: number) => void;
}) {
  // The product's own price is the default size; variants are the alternatives (e.g. Jumbo).
  const sizes = [{ id: null, name: "Biasa", price: product.price }, ...product.variants];
  const [variantId, setVariantId] = useState<string | null>(null);
  const [mods, setMods] = useState<string[]>([]);
  const [qty, setQty] = useState(1);
  const base = product.variants.find((v) => v.id === variantId)?.price ?? product.price;
  const unit = base + product.modifiers.filter((m) => mods.includes(m.id)).reduce((s, m) => s + m.price, 0);

  return (
    <div className="grid gap-5 p-5 sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <h2 className="text-2xl font-extrabold">{product.name}</h2>
        <CloseButton onClick={onCancel} />
      </div>
      {product.variants.length > 0 && (
        <fieldset className="grid gap-2">
          <legend className="mb-2 text-sm font-bold text-on-surface-variant">Ukuran</legend>
          {sizes.map((v) => (
            <label key={v.id ?? "base"} className={`press flex min-h-12 cursor-pointer items-center justify-between rounded-2xl border px-4 font-bold ${variantId === v.id ? "border-transparent bg-secondary-container text-on-secondary-container" : "border-outline"}`}>
              <span className="flex items-center gap-3">
                <input type="radio" name="variant" className="size-4 accent-primary" checked={variantId === v.id} onChange={() => setVariantId(v.id)} />
                {v.name}
              </span>
              <span className="num">{rupiah(v.price)}</span>
            </label>
          ))}
        </fieldset>
      )}
      {product.modifiers.length > 0 && (
        <fieldset>
          <legend className="mb-2 text-sm font-bold text-on-surface-variant">Tambahan</legend>
          <div className="flex flex-wrap gap-2">
            {product.modifiers.map((m) => {
              const on = mods.includes(m.id);
              return (
                <button
                  key={m.id}
                  type="button"
                  aria-pressed={on}
                  onClick={() => setMods((prev) => (on ? prev.filter((x) => x !== m.id) : [...prev, m.id]))}
                  className={`press min-h-11 rounded-xl border px-4 text-sm font-bold ${on ? "border-transparent bg-primary text-on-primary" : "border-outline"}`}
                >
                  {m.name} +{rupiah(m.price)}
                </button>
              );
            })}
          </div>
        </fieldset>
      )}
      <div className="flex items-center justify-between gap-3">
        <span className="flex items-center gap-1">
          <Stepper label="Kurangi jumlah" onClick={() => setQty((q) => Math.max(1, q - 1))}><Minus className="size-4" /></Stepper>
          <span className="num w-10 text-center text-lg font-extrabold">{qty}</span>
          <Stepper label="Tambah jumlah" onClick={() => setQty((q) => q + 1)}><Plus className="size-4" /></Stepper>
        </span>
        <button type="button" onClick={() => onAdd(variantId, mods, qty)} className={buttonClass("filled", "flex-1")}>
          Tambah · <span className="num">{rupiah(unit * qty)}</span>
        </button>
      </div>
    </div>
  );
}

function Sheet({ refObj, label, children }: { refObj: React.RefObject<HTMLDialogElement | null>; label: string; children: React.ReactNode }) {
  return (
    <dialog
      ref={refObj}
      aria-label={label}
      onClick={(e) => { if (e.target === e.currentTarget) e.currentTarget.close(); }}
      className="m-auto max-h-[90dvh] w-[min(34rem,calc(100%-2rem))] overflow-y-auto rounded-(--radius-card) bg-surface-low text-on-surface shadow-raised backdrop:bg-black/45 max-sm:mb-0 max-sm:w-full max-sm:max-w-none max-sm:rounded-b-none"
    >
      {children}
    </dialog>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`press min-h-10 shrink-0 rounded-xl px-4 text-sm font-bold whitespace-nowrap ${active ? "bg-secondary-container text-on-secondary-container" : "border border-outline text-on-surface-variant"}`}
    >
      {children}
    </button>
  );
}

function Stepper({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" aria-label={label} onClick={onClick} className="press grid size-10 place-items-center rounded-full border border-outline hover:bg-surface-container">
      {children}
    </button>
  );
}

function CloseButton({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" aria-label="Tutup" onClick={onClick} className="press grid size-11 shrink-0 place-items-center rounded-full hover:bg-surface-container">
      <X className="size-5" aria-hidden />
    </button>
  );
}

function Row({ label, value }: { label: string; value: number }) {
  return (
    <p className="num flex justify-between text-on-surface-variant">
      <span>{label}</span>
      <span>{rupiah(value)}</span>
    </p>
  );
}
