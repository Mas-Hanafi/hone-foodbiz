"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle, Minus, Plus, Search, ShoppingBag, Trash2, X } from "lucide-react";
import { buttonClass } from "@/components/ui";
import { rupiah } from "@/lib/format";
import { computeTotals, suggestTendered, type Method } from "@/lib/pos-math";
import type { PosCatalog, PosOutlet, PosProduct } from "@/lib/pos-data";
import { messageText } from "@/lib/messages";
import { recordSale } from "./actions";

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

export function PosScreen({ catalog, outlet, discountCap, initialMessage }: {
  catalog: PosCatalog; outlet: PosOutlet; discountCap: number | null; initialMessage?: string;
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
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const optionsRef = useRef<HTMLDialogElement>(null);
  const cartRef = useRef<HTMLDialogElement>(null);
  const payRef = useRef<HTMLDialogElement>(null);
  const saleId = useRef<string>(crypto.randomUUID());

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
  const due = totalsFor(method);
  const itemCount = lines.reduce((s, l) => s + l.qty, 0);
  const change = method === "cash" ? tendered - due.total : 0;

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
    setTendered(totalsFor("cash").total);
    payRef.current?.showModal();
  }

  function pay() {
    setError(null);
    startTransition(async () => {
      const result = await recordSale({
        id: saleId.current,
        orderType,
        method,
        discountPct,
        tendered: method === "cash" ? tendered : due.total,
        lines: lines.map((l) => ({ productId: l.productId, variantId: l.variantId, modifierIds: l.modifierIds, qty: l.qty })),
      });
      if (!result.ok) return setError(result.message);
      router.push(`/kasir/struk/${result.id}?baru=1`);
    });
  }

  const cart = (
    <CartPanel
      lines={lines}
      orderType={orderType}
      setOrderType={setOrderType}
      setQty={setQty}
      clear={() => { setLines([]); setDiscountPct(0); }}
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
          {initialMessage && messageText(initialMessage) && (
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

          {error && <p role="alert" className="rounded-2xl bg-error-container px-4 py-3 text-sm font-semibold text-on-error-container">{error}</p>}

          <button
            type="button"
            onClick={pay}
            disabled={pending || (method === "cash" && change < 0)}
            className={buttonClass("filled", "min-h-14 w-full text-lg")}
          >
            {pending && <LoaderCircle className="size-5 animate-spin" aria-hidden />}
            Selesai
          </button>
        </div>
      </Sheet>
    </div>
  );
}

function CartPanel({ lines, orderType, setOrderType, setQty, clear, discountPct, setDiscountPct, discountCap, totals, outlet, onPay }: {
  lines: Line[];
  orderType: "takeaway" | "dine_in";
  setOrderType: (t: "takeaway" | "dine_in") => void;
  setQty: (key: string, qty: number) => void;
  clear: () => void;
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
          <button type="button" onClick={clear} aria-label="Kosongkan keranjang" className="press grid size-11 place-items-center rounded-full text-on-surface-variant hover:bg-error-container hover:text-on-error-container">
            <Trash2 className="size-5" aria-hidden />
          </button>
        )}
      </div>

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
