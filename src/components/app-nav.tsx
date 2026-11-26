"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChartColumn, House, Plus, ReceiptText, ShoppingCart, Store, UsersRound, UtensilsCrossed } from "lucide-react";
import type { LucideIcon } from "lucide-react";

type Item = { href: string; label: string; icon: LucideIcon };

const HOME: Item = { href: "/app", label: "Beranda", icon: House };
const SALES: Item = { href: "/app/transaksi", label: "Transaksi", icon: ReceiptText };
const CATALOG: Item = { href: "/app/catalog", label: "Katalog", icon: UtensilsCrossed };
const OUTLETS: Item = { href: "/app/outlets", label: "Outlet", icon: Store };
const STAFF: Item = { href: "/app/staff", label: "Staf", icon: UsersRound };
const KASIR: Item = { href: "/kasir", label: "Kasir", icon: ShoppingCart };
const REPORTS: Item = { href: "/app/laporan", label: "Laporan", icon: ChartColumn };
const ADD_HREF = "/app/catalog?tambah=1#tambah-menu";

const isActive = (path: string, href: string) => (href === "/app" ? path === "/app" : path.startsWith(href));

/** M3 navigation rail on wide screens (add FAB + Kasir item); on phones a bar whose loud centre button opens the cashier. */
export function AppNav({ showStaff, showReports }: { showStaff: boolean; showReports: boolean }) {
  const path = usePathname();
  const railItems = [HOME, KASIR, SALES, ...(showReports ? [REPORTS] : []), CATALOG, OUTLETS, ...(showStaff ? [STAFF] : [])];
  // M3 navigation bar holds at most five; Staf is reached from Beranda's quick actions on phones.
  const items = [HOME, SALES, CATALOG, OUTLETS];

  return (
    <>
      <nav aria-label="Navigasi utama" className="sticky top-0 hidden h-dvh w-24 shrink-0 flex-col items-center gap-3 bg-surface-low py-5 md:flex">
        <Link
          href={ADD_HREF}
          aria-label="Tambah menu"
          className="press mb-4 grid size-14 place-items-center rounded-2xl bg-primary-container text-on-primary-container shadow-card hover:shadow-raised"
        >
          <Plus className="size-6" aria-hidden />
        </Link>
        {railItems.map((item) => (
          <RailLink key={item.href} item={item} active={isActive(path, item.href)} />
        ))}
      </nav>

      <nav
        aria-label="Navigasi utama"
        className="fixed inset-x-0 bottom-0 z-30 flex items-end justify-around border-t border-outline-variant/60 bg-surface-low px-2 pt-2 pb-[max(0.75rem,env(safe-area-inset-bottom))] md:hidden"
      >
        {items.slice(0, 2).map((item) => (
          <BarLink key={item.href} item={item} active={isActive(path, item.href)} />
        ))}
        <Link
          href={KASIR.href}
          className="press -mt-7 grid justify-items-center gap-1 text-xs font-bold"
        >
          <span className="grid size-14 place-items-center rounded-2xl bg-primary text-on-primary shadow-raised">
            <ShoppingCart className="size-7" aria-hidden />
          </span>
          Kasir
        </Link>
        {items.slice(2).map((item) => (
          <BarLink key={item.href} item={item} active={isActive(path, item.href)} />
        ))}
      </nav>
    </>
  );
}

function Indicator({ item, active }: { item: Item; active: boolean }) {
  const Icon = item.icon;
  return (
    <span
      className={`grid h-8 w-14 place-items-center rounded-full transition-colors duration-200 ${
        active ? "bg-secondary-container text-on-secondary-container" : "text-on-surface-variant"
      }`}
    >
      <Icon className="size-5" strokeWidth={active ? 2.4 : 2} aria-hidden />
    </span>
  );
}

function RailLink({ item, active }: { item: Item; active: boolean }) {
  return (
    <Link href={item.href} aria-current={active ? "page" : undefined} className="press grid justify-items-center gap-1 py-1 text-xs font-bold">
      <Indicator item={item} active={active} />
      <span className={active ? "text-on-surface" : "text-on-surface-variant"}>{item.label}</span>
    </Link>
  );
}

function BarLink({ item, active }: { item: Item; active: boolean }) {
  return (
    <Link href={item.href} aria-current={active ? "page" : undefined} className="press grid min-w-16 justify-items-center gap-1 text-xs font-bold">
      <Indicator item={item} active={active} />
      <span className={active ? "text-on-surface" : "text-on-surface-variant"}>{item.label}</span>
    </Link>
  );
}
