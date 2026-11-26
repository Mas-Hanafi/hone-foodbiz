import type { ReactNode } from "react";
import { ReceiptText, Store, UtensilsCrossed } from "lucide-react";
import { BrandLockup } from "@/components/brand";

// Only what the product does today (PRODUCT.md): offline sales are a later milestone.
const FACTS = [
  { icon: Store, text: "Satu akun untuk banyak outlet" },
  { icon: UtensilsCrossed, text: "Menu dengan varian dan tambahan" },
  { icon: ReceiptText, text: "Kasir dengan struk 58 mm, 80 mm, dan A4" },
];

export function AuthShell({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <main className="grid flex-1 grid-rows-[auto_1fr] lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] lg:grid-rows-none">
      <section className="flex flex-col justify-between gap-8 bg-primary-container px-6 py-6 text-on-primary-container sm:px-10 lg:min-h-dvh lg:py-12">
        <div>
          <p><BrandLockup /></p>
          <p className="mt-1 text-sm opacity-85 lg:hidden">Kasir dan catatan warung, rapi dari hari pertama.</p>
        </div>
        <div className="hidden lg:block">
          <p className="max-w-md font-display text-5xl leading-[1.05] font-extrabold tracking-tight">
            Kasir dan catatan warung, rapi dari hari pertama.
          </p>
          <ul className="mt-10 grid gap-3">
            {FACTS.map(({ icon: Icon, text }, i) => (
              <li key={text} className="flex items-center gap-3 text-lg font-semibold">
                <span
                  aria-hidden
                  className={`grid size-11 place-items-center rounded-2xl ${
                    ["bg-surface-lowest", "bg-secondary-container text-on-secondary-container", "bg-tertiary-container text-on-tertiary-container"][i]
                  }`}
                >
                  <Icon className="size-5" />
                </span>
                {text}
              </li>
            ))}
          </ul>
          <p className="mt-6 text-sm opacity-80">Mode offline, riwayat transaksi, dan void menyusul di rilis berikutnya.</p>
        </div>
        <p className="hidden text-sm opacity-80 lg:block">Open source, lisensi MIT. Data milik usahamu sendiri.</p>
      </section>

      <section className="flex items-start justify-center px-4 py-8 sm:px-8 lg:items-center">
        <div className="w-full max-w-md">
          <h1 className="text-3xl font-extrabold tracking-tight">{title}</h1>
          {description && <p className="mt-2 text-on-surface-variant">{description}</p>}
          <div className="mt-7">{children}</div>
        </div>
      </section>
    </main>
  );
}
